import { useEffect } from 'react';
import { AppState } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../lib/supabase';
import { queryClient } from '../lib/query-client';
import { usePhotoQueueStore } from '../stores/photo-queue-store';

async function uploadFromPath(localPath: string, storagePath: string): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(localPath, { encoding: FileSystem.EncodingType.Base64 });
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const { error } = await supabase.storage
    .from('intervention-photos')
    .upload(storagePath, bytes, { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;

  const { data, error: signError } = await supabase.storage
    .from('intervention-photos')
    .createSignedUrl(storagePath, 3600);
  if (signError) throw signError;
  return data.signedUrl;
}

function isNetworkError(e: any): boolean {
  return e?.message?.includes('Network request failed') || e?.message?.includes('fetch');
}

// Ref globale pour appeler processQueue depuis n'importe où
let _processQueue: (() => Promise<void>) | null = null;
export function getProcessQueue() { return _processQueue; }

export function usePhotoQueue() {
  const { loadQueue, removeFromQueue, removeChecklistItem, removeCompletion, removeStart, setProcessing } = usePhotoQueueStore();

  async function processQueue() {
    if (usePhotoQueueStore.getState().isProcessing) return;
    const state = usePhotoQueueStore.getState();
    if (state.queue.length === 0 && state.checklistQueue.length === 0 && state.completionQueue.length === 0 && state.startQueue.length === 0) return;

    setProcessing(true);
    const affectedInterventions = new Set<string>();

    // 1. Photos EN PREMIER (les RPCs start/complete peuvent en avoir besoin)
    for (const item of state.queue) {
      try {
        console.log('[queue] uploading photo:', item.type, 'for', item.interventionId);
        const storagePath = `${item.interventionId}/${item.type}/${item.userId}_${Date.now()}.jpg`;
        const url = await uploadFromPath(item.localPath, storagePath);
        const { error } = await supabase.rpc('provider_add_intervention_photo', {
          p_intervention_id: item.interventionId,
          p_url: url,
          p_type: item.type,
          ...(item.label ? { p_label: item.label } : {}),
        });
        if (error) throw error;
        await removeFromQueue(item.id);
        await FileSystem.deleteAsync(item.localPath, { idempotent: true });
        affectedInterventions.add(item.interventionId);
        console.log('[queue] photo uploaded OK');
      } catch (e: any) {
        console.log('[queue] photo error:', e?.message);
        if (isNetworkError(e)) { setProcessing(false); return; }
        await removeFromQueue(item.id);
      }
    }

    // 2. Checklist
    for (const item of state.checklistQueue) {
      try {
        const { error } = await supabase.rpc('provider_update_checklist', {
          p_intervention_id: item.interventionId,
          p_item_id: item.itemId,
          p_checked: item.checked,
        });
        if (error) throw error;
        await removeChecklistItem(item.id);
        affectedInterventions.add(item.interventionId);
      } catch (e) {
        if (isNetworkError(e)) { setProcessing(false); return; }
        await removeChecklistItem(item.id);
      }
    }

    // 3. Starts
    for (const interventionId of state.startQueue) {
      try {
        console.log('[queue] starting intervention:', interventionId);
        const { error } = await supabase.rpc('provider_start_mission', {
          p_intervention_id: interventionId,
        });
        console.log('[queue] start result:', error ? error.message : 'OK');
        if (error) throw error;
        await removeStart(interventionId);
        affectedInterventions.add(interventionId);
      } catch (e: any) {
        console.log('[queue] start error:', e?.message);
        if (isNetworkError(e)) { setProcessing(false); return; }
        await removeStart(interventionId);
      }
    }

    // 4. Completions
    for (const interventionId of state.completionQueue) {
      try {
        console.log('[queue] completing intervention:', interventionId);
        const { error } = await supabase.rpc('provider_complete_intervention', {
          p_intervention_id: interventionId,
        });
        console.log('[queue] complete result:', error ? error.message : 'OK');
        if (error) throw error;
        await removeCompletion(interventionId);
        affectedInterventions.add(interventionId);
      } catch (e: any) {
        console.log('[queue] complete error:', e?.message);
        if (isNetworkError(e)) { setProcessing(false); return; }
        await removeCompletion(interventionId);
      }
    }

    // Invalider le cache pour toutes les missions modifiées
    if (affectedInterventions.size > 0) {
      console.log('[queue] sync done, invalidating', affectedInterventions.size, 'missions');
      queryClient.invalidateQueries({ queryKey: ['provider-missions'] });
      queryClient.invalidateQueries({ queryKey: ['provider-dashboard'] });
      for (const id of affectedInterventions) {
        queryClient.invalidateQueries({ queryKey: ['provider-mission', id] });
        queryClient.invalidateQueries({ queryKey: ['provider-mission-photos', id] });
      }
    }

    setProcessing(false);
  }

  useEffect(() => {
    loadQueue().then(processQueue);

    // Retour au premier plan
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') processQueue();
    });

    // Polling toutes les 5s tant que la queue n'est pas vide
    const interval = setInterval(() => {
      const s = usePhotoQueueStore.getState();
      const hasItems = s.queue.length > 0 || s.checklistQueue.length > 0 ||
        s.completionQueue.length > 0 || s.startQueue.length > 0;
      if (hasItems && !s.isProcessing) processQueue();
    }, 5000);

    return () => {
      sub.remove();
      clearInterval(interval);
    };
  }, []);

  // Enregistrer la ref globale
  _processQueue = processQueue;

  return { processQueue };
}

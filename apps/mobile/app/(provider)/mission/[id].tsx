import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  Alert, Modal, Image, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator } from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { useProviderMissionDetail, useProviderMissionPhotos } from '../../../hooks/use-provider-missions';
import { useAuthStore } from '../../../stores/auth-store';
import { usePhotoQueueStore } from '../../../stores/photo-queue-store';

const MIN_PHOTOS = 5;

function codesVisible(scheduledDate: string, scheduledTime: string): boolean {
  const [h, m] = scheduledTime.split(':').map(Number);
  const scheduled = new Date(`${scheduledDate}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`);
  const threshold = new Date(scheduled.getTime() - 30 * 60 * 1000);
  return new Date() >= threshold;
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

async function uploadCompressedUri(interventionId: string, compressedUri: string, type: 'before' | 'after' | 'damage', userId: string): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(compressedUri, { encoding: FileSystem.EncodingType.Base64 });
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const path = `${interventionId}/${type}/${userId}_${Date.now()}.jpg`;
  const { error } = await supabase.storage
    .from('intervention-photos')
    .upload(path, bytes, { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;

  const { data, error: signError } = await supabase.storage
    .from('intervention-photos')
    .createSignedUrl(path, 3600);
  if (signError) throw signError;
  return data.signedUrl;
}

export default function MissionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useAuthStore((s) => s.userId);
  const queryClient = useQueryClient();
  const { data: mission, isLoading, error: missionError, refetch: refetchMission } = useProviderMissionDetail(id);
  console.log('[mission-detail] id:', id, 'isLoading:', isLoading, 'error:', missionError?.message, 'status:', mission?.status);
  const { data: photos = [], refetch: refetchPhotos } = useProviderMissionPhotos(id);

  const [actionLoading, setActionLoading] = useState(false);
  const [showRefuseModal, setShowRefuseModal] = useState(false);
  const [showDamageModal, setShowDamageModal] = useState(false);
  const [damageDescription, setDamageDescription] = useState('');
  const [pendingPhotos, setPendingPhotos] = useState<{ localUri: string; type: 'before' | 'after' }[]>([]);

  const { addToQueue, addChecklistItem: addToChecklistQueue, addCompletion, addStart: addStartQueue } = usePhotoQueueStore();
  const allQueue = usePhotoQueueStore((s) => s.queue);
  const offlineQueue = allQueue.filter((q) => q.interventionId === id);

  if (isLoading) return (
    <SafeAreaView className="flex-1 bg-white items-center justify-center">
      <ActivityIndicator color="#1A3A3A" />
    </SafeAreaView>
  );
  if (!mission) return (
    <SafeAreaView className="flex-1 bg-white items-center justify-center px-6">
      <Text className="text-text-secondary mb-4">Mission introuvable</Text>
      <TouchableOpacity onPress={() => refetchMission()} className="h-12 px-6 rounded-xl bg-primary items-center justify-center mb-3">
        <Text className="text-white text-sm font-semibold">Réessayer</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.back()} className="h-12 items-center justify-center">
        <Text className="text-sm text-text-secondary">← Retour</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );

  const prop = mission.properties as any;
  const status = mission.status;
  const showCodes = codesVisible(mission.scheduled_date, String(mission.scheduled_time));

  // Le rapport ne peut être démarré que le jour J à partir de l'heure de checkout du logement
  const checkoutTime = prop?.checkout_time || '10:00';
  const [coH, coM] = checkoutTime.split(':').map(Number);
  const checkoutDate = new Date(`${mission.scheduled_date}T${String(coH).padStart(2,'0')}:${String(coM).padStart(2,'0')}:00`);
  const canStartReport = new Date() >= checkoutDate;
  const photosBefore = photos.filter((p) => p.type === 'before');
  const photosAfter = photos.filter((p) => p.type === 'after');
  const photosDamage = photos.filter((p) => p.type === 'damage');
  const pendingBefore = pendingPhotos.filter((p) => p.type === 'before');
  const pendingAfter = pendingPhotos.filter((p) => p.type === 'after');
  const offlineBefore = offlineQueue.filter((q) => q.type === 'before');
  const offlineAfter = offlineQueue.filter((q) => q.type === 'after');
  const offlineDamage = offlineQueue.filter((q) => q.type === 'damage');
  const totalBefore = photosBefore.length + pendingBefore.length + offlineBefore.length;
  const totalAfter = photosAfter.length + pendingAfter.length + offlineAfter.length;
  const checklist: { id: string; label: string; done: boolean }[] = Array.isArray(mission.checklist) ? mission.checklist as any : [];

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey: ['provider-missions'] });
    await queryClient.invalidateQueries({ queryKey: ['provider-mission', id] });
  }

  async function handleAccept() {
    console.log('[mission] handleAccept id:', id, 'status:', status);
    setActionLoading(true);
    const { error } = await supabase.rpc('provider_accept_mission', { p_intervention_id: id });
    console.log('[mission] accept result:', error ? error.message : 'OK');
    setActionLoading(false);
    if (error) { Alert.alert('Erreur', error.message); return; }
    // Mise à jour optimiste du cache (pas de suppression)
    queryClient.setQueryData(['provider-mission', id], (old: any) =>
      old ? { ...old, status: 'accepted' } : old
    );
    queryClient.invalidateQueries({ queryKey: ['provider-missions'] });
    queryClient.invalidateQueries({ queryKey: ['provider-dashboard'] });
  }

  async function handleRefuse() {
    setShowRefuseModal(false);
    setActionLoading(true);
    const { error } = await supabase.rpc('provider_refuse_mission', { p_intervention_id: id });
    setActionLoading(false);
    if (error) { Alert.alert('Erreur', error.message); return; }
    await invalidate();
    router.replace('/(provider)/missions');
  }

  async function handleStart() {
    console.log('[mission] handleStart id:', id, 'status:', status, 'totalBefore:', totalBefore);
    if (totalBefore < MIN_PHOTOS) {
      Alert.alert('Photos requises', `Prenez au moins ${MIN_PHOTOS} photos avant de démarrer.`);
      return;
    }
    setActionLoading(true);
    try {
      const { error } = await supabase.rpc('provider_start_mission', { p_intervention_id: id });
      if (error) throw error;
      await invalidate();
    } catch (e: any) {
      const isNetwork = e?.message?.includes('Network request failed') || e?.message?.includes('fetch');
      if (isNetwork) {
        queryClient.setQueryData(['provider-mission', id], (old: any) =>
          old ? { ...old, status: 'in_progress', started_at: new Date().toISOString() } : old
        );
        await addStartQueue(id);
        Alert.alert('Rapport sauvegardé', 'Il sera pris en compte lorsque vous aurez du réseau.');
      } else {
        Alert.alert('Erreur', e.message);
      }
    } finally {
      setActionLoading(false);
    }
  }

  async function handleComplete() {
    if (totalAfter < MIN_PHOTOS) {
      Alert.alert('Photos requises', `Prenez au moins ${MIN_PHOTOS} photos après pour terminer.`);
      return;
    }
    const unchecked = checklist.filter((i) => !i.done);
    if (unchecked.length > 0) {
      Alert.alert('Checklist incomplète', `${unchecked.length} élément(s) non coché(s).`);
      return;
    }
    setActionLoading(true);
    try {
      const { error } = await supabase.rpc('provider_complete_intervention', { p_intervention_id: id });
      if (error) throw error;
      await invalidate();
      router.replace('/(provider)/missions');
    } catch (e: any) {
      const isNetwork = e?.message?.includes('Network request failed') || e?.message?.includes('fetch');
      if (isNetwork) {
        await addCompletion(id);
        Alert.alert(
          'Rapport sauvegardé',
          'Il sera pris en compte lorsque vous aurez du réseau.',
          [{ text: 'OK', onPress: () => router.replace('/(provider)/missions') }]
        );
      } else {
        Alert.alert('Erreur', e.message);
      }
    } finally {
      setActionLoading(false);
    }
  }

  async function handleToggleChecklist(itemId: string, current: boolean) {
    // Mise à jour optimiste immédiate
    const queryKey = ['provider-mission', id];
    queryClient.setQueryData(queryKey, (old: any) => {
      if (!old) return old;
      return {
        ...old,
        checklist: (old.checklist as any[]).map((item: any) =>
          item.id === itemId ? { ...item, done: !current } : item
        ),
      };
    });
    try {
      const { error } = await supabase.rpc('provider_update_checklist', {
        p_intervention_id: id,
        p_item_id: itemId,
        p_checked: !current,
      });
      if (error) throw error;
    } catch (e: any) {
      const isNetwork = e?.message?.includes('Network request failed') || e?.message?.includes('fetch');
      if (isNetwork) {
        // Hors ligne → garder l'optimistic update, mettre en queue
        await addToChecklistQueue({ interventionId: id, itemId, checked: !current });
      } else {
        // Erreur réelle → rollback
        queryClient.setQueryData(queryKey, (old: any) => {
          if (!old) return old;
          return {
            ...old,
            checklist: (old.checklist as any[]).map((item: any) =>
              item.id === itemId ? { ...item, done: current } : item
            ),
          };
        });
        Alert.alert('Erreur', e.message);
      }
    }
  }

  async function handleAddPhoto(type: 'before' | 'after') {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 1,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets[0]) return;

    const localUri = result.assets[0].uri;
    // Affichage immédiat
    setPendingPhotos((prev) => [...prev, { localUri, type }]);

    try {
      // Compresser d'abord (toujours possible, même hors ligne)
      const image = await ImageManipulator.manipulate(localUri)
        .resize({ width: 1024 })
        .renderAsync();
      const compressed = await image.saveAsync({ compress: 0.5 });

      // Copie permanente dans le dossier de l'app pour survie hors ligne
      const persistPath = `${FileSystem.documentDirectory}photo_${Date.now()}.jpg`;
      await FileSystem.copyAsync({ from: compressed.uri, to: persistPath });

      try {
        const url = await uploadCompressedUri(id, compressed.uri, type, userId!);
        const { error: rpcError } = await supabase.rpc('provider_add_intervention_photo', {
          p_intervention_id: id,
          p_url: url,
          p_type: type,
        });
        if (rpcError) throw rpcError;
        await FileSystem.deleteAsync(persistPath, { idempotent: true });
      } catch {
        await addToQueue({ interventionId: id, localPath: persistPath, type, userId: userId! });
      }

      setPendingPhotos((prev) => prev.filter((p) => p.localUri !== localUri));
      await refetchPhotos();
    } catch (e: any) {
      setPendingPhotos((prev) => prev.filter((p) => p.localUri !== localUri));
      Alert.alert('Erreur', e.message);
    }
  }

  async function handleAddDamagePhoto() {
    if (!damageDescription.trim()) {
      Alert.alert('Description requise', 'Décrivez le dégât avant de prendre une photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 1,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets[0]) return;

    const label = damageDescription.trim();
    const localUri = result.assets[0].uri;

    // Compression rapide
    const image = await ImageManipulator.manipulate(localUri)
      .resize({ width: 1024 })
      .renderAsync();
    const compressed = await image.saveAsync({ compress: 0.5 });

    const persistPath = `${FileSystem.documentDirectory}damage_${Date.now()}.jpg`;
    await FileSystem.copyAsync({ from: compressed.uri, to: persistPath });

    // Essayer upload direct, sinon queue
    try {
      const url = await uploadCompressedUri(id, compressed.uri, 'damage', userId!);
      const { error } = await supabase.rpc('provider_add_intervention_photo', {
        p_intervention_id: id,
        p_url: url,
        p_type: 'damage',
        p_label: label,
      });
      if (error) throw error;
      await FileSystem.deleteAsync(persistPath, { idempotent: true });
      await refetchPhotos();
    } catch {
      await addToQueue({ interventionId: id, localPath: persistPath, type: 'damage', userId: userId!, label });
    }

    Alert.alert(
      'Photo ajoutée',
      'Ajouter une autre photo de ce dégât ?',
      [
        { text: 'Oui', style: 'default' },
        { text: 'Terminer', onPress: () => { setDamageDescription(''); setShowDamageModal(false); } },
      ]
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 60 }}>

        <TouchableOpacity onPress={() => router.back()} className="mb-6 w-11 h-11 justify-center">
          <Text className="text-2xl text-text-primary">←</Text>
        </TouchableOpacity>

        <Text className="text-xl font-bold text-text-primary mb-1">{prop?.internal_name}</Text>
        <Text className="text-sm text-text-secondary mb-1">{prop?.address}, {prop?.city}</Text>
        <Text className="text-sm text-text-secondary mb-6">
          📅 {formatDate(mission.scheduled_date)} · {String(mission.scheduled_time).slice(0,5)}
        </Text>

        {/* Rémunération */}
        <View className="bg-primary/5 rounded-xl px-4 py-3 mb-6">
          <Text className="text-base font-bold text-primary">{Number(mission.provider_payout).toFixed(2).replace('.', ',')}€</Text>
          <Text className="text-xs text-text-secondary">Votre rémunération pour cette mission</Text>
        </View>

        {/* Codes d'accès */}
        <View className="bg-bg-light rounded-xl px-4 py-4 mb-6">
          <Text className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">Accès au logement</Text>
          {showCodes ? (
            <View className="gap-2">
              {prop?.access_code_encrypted && (
                <View className="flex-row items-center gap-2">
                  <Text className="text-xs text-text-secondary w-20">Code accès</Text>
                  <Text className="text-sm font-mono font-semibold text-text-primary">— chiffré —</Text>
                </View>
              )}
              {prop?.address && (
                <Text className="text-sm text-text-primary">{prop.address}</Text>
              )}
            </View>
          ) : (
            <View className="flex-row items-center gap-2">
              <Text className="text-lg">🔒</Text>
              <Text className="text-xs text-text-secondary">Codes visibles 30 min avant l'intervention</Text>
            </View>
          )}
        </View>

        {/* Bandeau photos offline en attente */}
        {offlineQueue.length > 0 && (
          <View className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 mb-6 flex-row items-center justify-between">
            <View>
              <Text className="text-xs font-semibold text-orange-800">
                {offlineQueue.length} photo{offlineQueue.length > 1 ? 's' : ''} en attente d'upload
              </Text>
              <Text className="text-xs text-orange-600">Sera synchronisé dès que le réseau revient</Text>
            </View>
            <Text className="text-lg">📤</Text>
          </View>
        )}

        {/* Note propriétaire */}
        {mission.owner_reminder ? (
          <View className="bg-orange-50 rounded-xl px-4 py-3 mb-6">
            <Text className="text-xs font-semibold text-orange-800 mb-1">Note du propriétaire</Text>
            <Text className="text-sm text-orange-700">{mission.owner_reminder}</Text>
          </View>
        ) : null}

        {/* Photos avant */}
        {((status === 'accepted' && canStartReport) || status === 'in_progress' || status === 'completed') && (
          <View className="mb-6">
            <Text className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">
              Photos avant ({totalBefore}/{MIN_PHOTOS} min)
            </Text>
            <View className="flex-row flex-wrap gap-2 mb-2">
              {photosBefore.map((p) => (
                <Image key={p.id} source={{ uri: p.url }} style={{ width: 76, height: 76 }} className="rounded-lg bg-bg-light" />
              ))}
              {pendingBefore.map((p) => (
                <View key={p.localUri} style={{ width: 76, height: 76 }} className="rounded-lg bg-bg-light overflow-hidden">
                  <Image source={{ uri: p.localUri }} style={{ width: 76, height: 76 }} />
                  <View className="absolute inset-0 items-center justify-center bg-black/30">
                    <ActivityIndicator color="#fff" size="small" />
                  </View>
                </View>
              ))}
              {offlineBefore.map((q) => (
                <View key={q.id} style={{ width: 76, height: 76 }} className="rounded-lg overflow-hidden">
                  <Image source={{ uri: q.localPath }} style={{ width: 76, height: 76 }} />
                  <View className="absolute inset-0 items-center justify-center bg-black/40">
                    <Text className="text-white text-lg">🕐</Text>
                  </View>
                </View>
              ))}
            </View>
            {status === 'accepted' && (
              <TouchableOpacity onPress={() => handleAddPhoto('before')}
                className="h-10 rounded-lg border border-dashed border-border items-center justify-center">
                <Text className="text-sm text-text-secondary">+ Ajouter une photo avant</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Checklist */}
        {status === 'in_progress' && checklist.length > 0 && (
          <View className="mb-6">
            <Text className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">
              Checklist ({checklist.filter((i) => i.done).length}/{checklist.length})
            </Text>
            <View className="gap-2">
              {checklist.map((item) => (
                <TouchableOpacity key={item.id} onPress={() => handleToggleChecklist(item.id, item.done)}
                  className={`flex-row items-center gap-3 rounded-xl px-4 py-3 border ${item.done ? 'border-primary bg-primary/5' : 'border-border bg-white'}`}>
                  <View className={`w-5 h-5 rounded border-2 items-center justify-center ${item.done ? 'border-primary bg-primary' : 'border-border'}`}>
                    {item.done && <Text className="text-white text-xs font-bold">✓</Text>}
                  </View>
                  <Text className={`text-sm flex-1 ${item.done ? 'text-primary font-medium' : 'text-text-primary'}`}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Signalement de dégâts */}
        {(status === 'in_progress' || status === 'completed') && (
          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                Dégâts signalés ({photosDamage.length})
              </Text>
              {status === 'in_progress' && (
                <TouchableOpacity onPress={() => setShowDamageModal(true)}
                  className="flex-row items-center gap-1 bg-red-50 border border-red-200 rounded-lg px-3 py-1">
                  <Text className="text-xs font-semibold text-red-700">+ Signaler un dégât</Text>
                </TouchableOpacity>
              )}
            </View>
            {photosDamage.length === 0 && offlineDamage.length === 0 ? (
              <Text className="text-xs text-text-secondary italic">Aucun dégât signalé</Text>
            ) : (
              <View className="gap-3">
                {photosDamage.map((p) => (
                  <View key={p.id} className="rounded-xl overflow-hidden border border-red-200">
                    <Image source={{ uri: p.url }} style={{ width: '100%', height: 180 }} resizeMode="cover" />
                    {p.label && (
                      <View className="bg-red-50 px-3 py-2">
                        <Text className="text-xs font-semibold text-red-800">Description</Text>
                        <Text className="text-sm text-red-700 mt-1">{p.label}</Text>
                      </View>
                    )}
                  </View>
                ))}
                {offlineDamage.map((q) => (
                  <View key={q.id} className="rounded-xl overflow-hidden border border-orange-300">
                    <Image source={{ uri: q.localPath }} style={{ width: '100%', height: 180 }} resizeMode="cover" />
                    <View className="absolute top-2 right-2 bg-black/50 rounded-full px-2 py-1">
                      <Text className="text-white text-xs">🕐 Hors ligne</Text>
                    </View>
                    {q.label && (
                      <View className="bg-orange-50 px-3 py-2">
                        <Text className="text-xs font-semibold text-orange-800">Description</Text>
                        <Text className="text-sm text-orange-700 mt-1">{q.label}</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Photos après */}
        {status === 'in_progress' && (
          <View className="mb-8">
            <Text className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">
              Photos après ({totalAfter}/{MIN_PHOTOS} min)
            </Text>
            <View className="flex-row flex-wrap gap-2 mb-2">
              {photosAfter.map((p) => (
                <Image key={p.id} source={{ uri: p.url }} style={{ width: 76, height: 76 }} className="rounded-lg bg-bg-light" />
              ))}
              {pendingAfter.map((p) => (
                <View key={p.localUri} style={{ width: 76, height: 76 }} className="rounded-lg bg-bg-light overflow-hidden">
                  <Image source={{ uri: p.localUri }} style={{ width: 76, height: 76 }} />
                  <View className="absolute inset-0 items-center justify-center bg-black/30">
                    <ActivityIndicator color="#fff" size="small" />
                  </View>
                </View>
              ))}
              {offlineAfter.map((q) => (
                <View key={q.id} style={{ width: 76, height: 76 }} className="rounded-lg overflow-hidden">
                  <Image source={{ uri: q.localPath }} style={{ width: 76, height: 76 }} />
                  <View className="absolute inset-0 items-center justify-center bg-black/40">
                    <Text className="text-white text-lg">🕐</Text>
                  </View>
                </View>
              ))}
            </View>
            <TouchableOpacity onPress={() => handleAddPhoto('after')}
              className="h-10 rounded-lg border border-dashed border-border items-center justify-center">
              <Text className="text-sm text-text-secondary">+ Ajouter une photo après</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Actions */}
        {status === 'assigned' && (
          <View className="gap-3">
            <TouchableOpacity onPress={handleAccept} disabled={actionLoading}
              className={`h-14 rounded-btn items-center justify-center ${actionLoading ? 'bg-text-muted' : 'bg-primary'}`}>
              {actionLoading ? <ActivityIndicator color="#fff" /> : <Text className="text-white text-base font-semibold">Accepter la mission</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowRefuseModal(true)} disabled={actionLoading}
              className="h-12 items-center justify-center border border-border rounded-btn">
              <Text className="text-sm text-danger">Refuser</Text>
            </TouchableOpacity>
          </View>
        )}

        {status === 'accepted' && canStartReport && (
          <TouchableOpacity onPress={handleStart} disabled={actionLoading}
            className={`h-14 rounded-btn items-center justify-center ${actionLoading ? 'bg-text-muted' : 'bg-primary'}`}>
            {actionLoading ? <ActivityIndicator color="#fff" /> : <Text className="text-white text-base font-semibold">Démarrer l'intervention</Text>}
          </TouchableOpacity>
        )}

        {status === 'accepted' && !canStartReport && (
          <View className="bg-bg-light rounded-xl px-4 py-4 items-center">
            <Text className="text-sm font-medium text-text-secondary">Intervention disponible le</Text>
            <Text className="text-sm font-bold text-text-primary mt-1">
              {formatDate(mission.scheduled_date)} à {checkoutTime}
            </Text>
          </View>
        )}

        {status === 'in_progress' && (
          <TouchableOpacity onPress={handleComplete} disabled={actionLoading}
            className={`h-14 rounded-btn items-center justify-center ${actionLoading ? 'bg-text-muted' : 'bg-green-600'}`}>
            {actionLoading ? <ActivityIndicator color="#fff" /> : <Text className="text-white text-base font-semibold">Terminer l'intervention ✓</Text>}
          </TouchableOpacity>
        )}

        {status === 'completed' && (
          <View className="h-14 rounded-btn items-center justify-center bg-green-50 border border-green-200">
            <Text className="text-green-700 text-base font-semibold">Mission terminée ✓</Text>
          </View>
        )}

      </ScrollView>

      {/* Modal confirmation refus */}
      <Modal visible={showRefuseModal} transparent animationType="fade" onRequestClose={() => setShowRefuseModal(false)}>
        <View className="flex-1 justify-center items-center bg-black/50 px-6">
          <View className="bg-white rounded-2xl px-6 py-6 w-full">
            <Text className="text-lg font-bold text-text-primary mb-2">Refuser la mission ?</Text>
            <Text className="text-sm text-text-secondary mb-6">
              La mission repassera en attente et sera proposée à un autre prestataire.
            </Text>
            <TouchableOpacity onPress={handleRefuse}
              className="h-14 bg-danger rounded-btn items-center justify-center mb-3">
              <Text className="text-white text-base font-semibold">Confirmer le refus</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowRefuseModal(false)} className="h-12 items-center justify-center">
              <Text className="text-sm text-text-secondary">Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal signalement dégât */}
      <Modal visible={showDamageModal} transparent animationType="slide" onRequestClose={() => setShowDamageModal(false)}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-2xl px-6 pt-6 pb-10">
            <View className="w-10 h-1 rounded-full bg-border self-center mb-6" />
            <Text className="text-lg font-bold text-text-primary mb-1">Signaler un dégât</Text>
            <Text className="text-sm text-text-secondary mb-4">
              Décrivez le dégât puis prenez une photo.
            </Text>
            <TextInput
              value={damageDescription}
              onChangeText={setDamageDescription}
              placeholder="Ex: Tache sur le canapé, carreau fissuré..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
              className="border border-border rounded-xl px-4 py-3 text-sm text-text-primary mb-4"
              style={{ minHeight: 80, textAlignVertical: 'top' }}
            />
            <TouchableOpacity
              onPress={handleAddDamagePhoto}
              disabled={!damageDescription.trim()}
              className={`h-14 rounded-btn items-center justify-center mb-3 ${
                !damageDescription.trim() ? 'bg-text-muted' : 'bg-red-600'
              }`}>
              <Text className="text-white text-base font-semibold">📷 Prendre une photo</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setShowDamageModal(false); setDamageDescription(''); }}
              className="h-12 items-center justify-center">
              <Text className="text-sm text-text-secondary">Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

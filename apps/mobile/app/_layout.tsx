import '../global.css';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider, focusManager, dehydrate, hydrate } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../hooks/use-auth';
import { usePhotoQueue } from '../hooks/use-photo-queue';
import { queryClient } from '../lib/query-client';

const CACHE_KEY = 'rq-cache-v1';

// Persiste le cache sur disque (throttled)
let saveTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleCache() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      const dehydrated = dehydrate(queryClient);
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(dehydrated));
    } catch {}
  }, 2000);
}

// Hydrate depuis AsyncStorage au démarrage
async function loadCache() {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw) hydrate(queryClient, JSON.parse(raw));
  } catch {}
}

function RootLayoutInner() {
  useAuth();
  usePhotoQueue(); // Traitement queue offline (photos, checklist, completions) — toujours actif

  useEffect(() => {
    // Auto-refresh quand l'app revient au premier plan
    const sub = AppState.addEventListener('change', (state) => {
      focusManager.setFocused(state === 'active');
    });
    // Sauvegarder le cache à chaque changement
    const unsub = queryClient.getQueryCache().subscribe(scheduleCache);
    return () => {
      sub.remove();
      unsub();
    };
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadCache().finally(() => setReady(true));
  }, []);

  if (!ready) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <RootLayoutInner />
    </QueryClientProvider>
  );
}

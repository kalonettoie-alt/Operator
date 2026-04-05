import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import type { Database } from '@deltom/shared';

const CHUNK_SIZE = 1800; // sous la limite de 2048 bytes

const ChunkedSecureStore = {
  async getItem(key: string): Promise<string | null> {
    const countStr = await SecureStore.getItemAsync(`${key}_n`);
    if (countStr) {
      const count = parseInt(countStr, 10);
      const chunks = await Promise.all(
        Array.from({ length: count }, (_, i) =>
          SecureStore.getItemAsync(`${key}_${i}`)
        )
      );
      if (chunks.some((c) => c === null)) return null;
      return chunks.join('');
    }
    return SecureStore.getItemAsync(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    if (value.length <= CHUNK_SIZE) {
      await SecureStore.setItemAsync(key, value);
      return;
    }
    const chunks: string[] = [];
    for (let i = 0; i < value.length; i += CHUNK_SIZE) {
      chunks.push(value.slice(i, i + CHUNK_SIZE));
    }
    await Promise.all([
      ...chunks.map((chunk, i) => SecureStore.setItemAsync(`${key}_${i}`, chunk)),
      SecureStore.setItemAsync(`${key}_n`, String(chunks.length)),
      SecureStore.deleteItemAsync(key),
    ]);
  },

  async removeItem(key: string): Promise<void> {
    const countStr = await SecureStore.getItemAsync(`${key}_n`);
    if (countStr) {
      const count = parseInt(countStr, 10);
      await Promise.all([
        ...Array.from({ length: count }, (_, i) =>
          SecureStore.deleteItemAsync(`${key}_${i}`)
        ),
        SecureStore.deleteItemAsync(`${key}_n`),
      ]);
    }
    await SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient<Database>(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: ChunkedSecureStore,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

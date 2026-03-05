// Client Supabase pour le NAVIGATEUR
// - Utilise uniquement les clés NEXT_PUBLIC_* (accessibles côté client)
// - Respecte les règles RLS (Row Level Security) de Supabase
// - À utiliser dans tous les composants "use client"
//
// NOTE : le lock personnalisé remplace le Web Locks API natif de gotrue-js.
// Le Web Locks API s'orpheline quand React Strict Mode monte/démonte les
// composants deux fois, causant "Lock was not released within 5000ms" et
// des chargements infinis. L'implémentation ci-dessous résout l'appel
// immédiatement sans lock exclusif — acceptable car les refreshs de token
// simultanés sont rares et gérés côté serveur Supabase.

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

export const supabase = createBrowserClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      // Clé de stockage dédiée pour éviter les conflits avec d'autres apps Supabase
      storageKey: 'deltom-auth',
      flowType: 'pkce',
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
      // Remplace le Web Lock API par une résolution immédiate (sans blocage)
      // pour éviter les timeouts avec React Strict Mode
      lock: async (_name, _acquireTimeout, fn) => {
        return await fn();
      },
    },
  }
);

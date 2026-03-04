// Client Supabase pour le NAVIGATEUR
// - Utilise uniquement les clés NEXT_PUBLIC_* (accessibles côté client)
// - Respecte les règles RLS (Row Level Security) de Supabase
// - À utiliser dans tous les composants "use client"

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

export const supabase = createBrowserClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

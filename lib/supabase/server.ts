// Client Supabase pour le SERVEUR
// - Utilise la SUPABASE_SERVICE_ROLE_KEY (bypass RLS — accès total)
// - À utiliser UNIQUEMENT dans /app/api/ et les Server Components
// - JAMAIS importer ce fichier dans un composant "use client"

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

export function createServerClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

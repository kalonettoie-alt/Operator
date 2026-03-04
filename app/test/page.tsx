"use client";

// Page de test — À SUPPRIMER avant la mise en production
// Vérifie que les clients Supabase sont correctement configurés

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function TestPage() {
  const [clientStatus, setClientStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [clientError, setClientError] = useState<string | null>(null);
  const [serviceRoleExposed, setServiceRoleExposed] = useState(false);

  useEffect(() => {
    // Test 1 : vérifier que le client navigateur peut se connecter à Supabase
    async function testClientConnection() {
      try {
        // Simple ping : on demande la session en cours (pas besoin de table)
        const { error } = await supabase.auth.getSession();
        if (error) throw error;
        setClientStatus('ok');
      } catch (err) {
        setClientStatus('error');
        setClientError(err instanceof Error ? err.message : 'Erreur inconnue');
      }
    }

    // Test 2 : vérifier que la service_role_key n'est PAS accessible côté client
    // Elle ne doit jamais apparaître dans process.env côté navigateur
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    setServiceRoleExposed(!!serviceRoleKey);

    testClientConnection();
  }, []);

  return (
    <div style={{ fontFamily: 'monospace', padding: '2rem', maxWidth: '600px' }}>
      <h1>Tests de configuration Supabase</h1>

      <hr />

      {/* Test 1 : connexion client navigateur */}
      <div style={{ marginTop: '1rem' }}>
        <strong>Test 1 — Client navigateur (anon key + RLS)</strong>
        <p>
          {clientStatus === 'loading' && '⏳ Connexion en cours...'}
          {clientStatus === 'ok' && '✅ Supabase client OK'}
          {clientStatus === 'error' && `❌ Erreur : ${clientError}`}
        </p>
      </div>

      {/* Test 2 : vérification que la service_role_key n'est pas exposée */}
      <div style={{ marginTop: '1rem' }}>
        <strong>Test 2 — Service role key NON exposée côté client</strong>
        <p>
          {serviceRoleExposed
            ? '❌ PROBLÈME : SUPABASE_SERVICE_ROLE_KEY est accessible côté client !'
            : '✅ SUPABASE_SERVICE_ROLE_KEY est invisible côté client (normal)'}
        </p>
      </div>

      {/* Variables publiques disponibles */}
      <div style={{ marginTop: '1rem' }}>
        <strong>Variables publiques disponibles</strong>
        <p>
          NEXT_PUBLIC_SUPABASE_URL :{' '}
          {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ présente' : '❌ manquante'}
        </p>
        <p>
          NEXT_PUBLIC_SUPABASE_ANON_KEY :{' '}
          {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ présente' : '❌ manquante'}
        </p>
      </div>

      <hr style={{ marginTop: '2rem' }} />
      <p style={{ color: 'gray', fontSize: '0.8rem' }}>
        ⚠️ Cette page est uniquement pour le développement. Supprimer avant la mise en production.
      </p>
    </div>
  );
}

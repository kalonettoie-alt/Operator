"use client";

// Page de test — À SUPPRIMER avant la mise en production
// Vérifie que Supabase et Sentry sont correctement configurés

import { useEffect, useState } from 'react';
import * as Sentry from '@sentry/nextjs';
import { supabase } from '@/lib/supabase/client';

export default function TestPage() {
  const [clientStatus, setClientStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [clientError, setClientError] = useState<string | null>(null);
  const [serviceRoleExposed, setServiceRoleExposed] = useState(false);
  const [sentryStatus, setSentryStatus] = useState<'idle' | 'sent' | 'no-dsn'>('idle');

  useEffect(() => {
    // Test 1 : vérifier que le client navigateur peut se connecter à Supabase
    async function testClientConnection() {
      try {
        const { error } = await supabase.auth.getSession();
        if (error) throw error;
        setClientStatus('ok');
      } catch (err) {
        setClientStatus('error');
        setClientError(err instanceof Error ? err.message : 'Erreur inconnue');
      }
    }

    // Test 2 : vérifier que la service_role_key n'est PAS accessible côté client
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    setServiceRoleExposed(!!serviceRoleKey);

    testClientConnection();
  }, []);

  // Test 3 : envoyer une erreur volontaire à Sentry
  function testerSentry() {
    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
    if (!dsn) {
      setSentryStatus('no-dsn');
      return;
    }
    try {
      throw new Error('[TEST] Erreur volontaire Deltom Operator V3 — Sentry fonctionne !');
    } catch (err) {
      Sentry.captureException(err);
      setSentryStatus('sent');
    }
  }

  return (
    <div style={{ fontFamily: 'monospace', padding: '2rem', maxWidth: '600px' }}>
      <h1>Tests de configuration</h1>

      <hr />

      {/* Test 1 : connexion client navigateur Supabase */}
      <div style={{ marginTop: '1.5rem' }}>
        <strong>Test 1 — Client navigateur Supabase (anon key + RLS)</strong>
        <p>
          {clientStatus === 'loading' && '⏳ Connexion en cours...'}
          {clientStatus === 'ok' && '✅ Supabase client OK'}
          {clientStatus === 'error' && `❌ Erreur : ${clientError}`}
        </p>
      </div>

      {/* Test 2 : vérification que la service_role_key n'est pas exposée */}
      <div style={{ marginTop: '1.5rem' }}>
        <strong>Test 2 — Service role key NON exposée côté client</strong>
        <p>
          {serviceRoleExposed
            ? '❌ PROBLÈME : SUPABASE_SERVICE_ROLE_KEY est accessible côté client !'
            : '✅ SUPABASE_SERVICE_ROLE_KEY est invisible côté client (normal)'}
        </p>
      </div>

      {/* Variables publiques disponibles */}
      <div style={{ marginTop: '1.5rem' }}>
        <strong>Variables d&apos;environnement publiques</strong>
        <p>NEXT_PUBLIC_SUPABASE_URL : {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ présente' : '❌ manquante'}</p>
        <p>NEXT_PUBLIC_SUPABASE_ANON_KEY : {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ présente' : '❌ manquante'}</p>
        <p>NEXT_PUBLIC_SENTRY_DSN : {process.env.NEXT_PUBLIC_SENTRY_DSN ? '✅ présente' : '⚠️ manquante (Sentry désactivé)'}</p>
      </div>

      {/* Test 3 : Sentry */}
      <div style={{ marginTop: '1.5rem' }}>
        <strong>Test 3 — Sentry (monitoring d&apos;erreurs)</strong>
        <p style={{ marginBottom: '0.5rem' }}>
          {sentryStatus === 'idle' && 'Clique sur le bouton pour envoyer une erreur test à Sentry.'}
          {sentryStatus === 'sent' && '✅ Erreur envoyée à Sentry ! Vérifie ton dashboard sur sentry.io'}
          {sentryStatus === 'no-dsn' && '⚠️ NEXT_PUBLIC_SENTRY_DSN manquante — ajoute-la dans .env.local'}
        </p>
        <button
          onClick={testerSentry}
          style={{
            padding: '0.5rem 1rem',
            background: '#e74c3c',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontFamily: 'monospace',
          }}
        >
          🔴 Tester Sentry
        </button>
      </div>

      <hr style={{ marginTop: '2rem' }} />
      <p style={{ color: 'gray', fontSize: '0.8rem' }}>
        ⚠️ Cette page est uniquement pour le développement. Supprimer avant la mise en production.
      </p>
    </div>
  );
}

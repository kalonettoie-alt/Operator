// Fichier d'instrumentation Next.js — requis par @sentry/nextjs (nouvelle API)
// Initialise Sentry côté serveur ET edge runtime

import * as Sentry from '@sentry/nextjs';

// Hook requis pour capturer les erreurs des Server Components imbriqués
export const onRequestError = Sentry.captureRequestError;

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Serveur Node.js (API Routes, Server Components)
    const { init } = await import('@sentry/nextjs');
    init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 0.1,
      debug: false,
    });
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // Edge Runtime (middleware)
    const { init } = await import('@sentry/nextjs');
    init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 0.1,
      debug: false,
    });
  }
}

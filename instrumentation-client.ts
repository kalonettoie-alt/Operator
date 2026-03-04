// Configuration Sentry côté NAVIGATEUR
// S'exécute dans le browser — capture les erreurs React/JS côté client

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Taux d'échantillonnage des performances (0.1 = 10% des transactions)
  tracesSampleRate: 0.1,

  // Activer le replay de session uniquement en production
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,

  // Désactiver les logs Sentry en développement
  debug: false,
});

// Hook requis pour instrumenter les navigations (transitions de route)
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

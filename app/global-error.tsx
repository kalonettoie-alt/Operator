"use client";

// Gestionnaire d'erreurs global pour le App Router Next.js
// Capture les erreurs de rendu React et les envoie à Sentry

import * as Sentry from '@sentry/nextjs';
import NextError from 'next/error';
import { useEffect } from 'react';

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        {/* Affiche la page d'erreur Next.js par défaut */}
        <NextError statusCode={0} />
      </body>
    </html>
  );
}

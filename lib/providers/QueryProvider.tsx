"use client";

// QueryProvider — enveloppe l'application avec le client TanStack Query.
// Séparé dans son propre fichier pour ne pas transformer app/layout.tsx en Client Component.

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // useState garantit qu'un seul QueryClient est créé par session navigateur
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Pas de refetch automatique au focus de la fenêtre (UX moins agressive)
            refetchOnWindowFocus: false,
            // Retry 2 fois en cas d'erreur réseau (couvre les timeouts auth transitoires)
            retry: 2,
            // 1 seconde entre chaque retry
            retryDelay: 1000,
            // Cache de 60 secondes par défaut
            staleTime: 60_000,
          },
        },
      })
  );

  console.log('[QUERYPROVIDER] render');

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

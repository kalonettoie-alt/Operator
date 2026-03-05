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
            // Retry 1 fois en cas d'erreur réseau
            retry: 1,
            // Cache de 5 minutes par défaut
            staleTime: 5 * 60 * 1000,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

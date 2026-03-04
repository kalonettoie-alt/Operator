# CLAUDE.md — Règles obligatoires pour Claude Code

Ce fichier est lu automatiquement par Claude Code à chaque session.
Il contient les règles ABSOLUES du projet. Ne jamais les contourner.

## IDENTITÉ DU PROJET

- **Nom** : Deltom Operator V3
- **Stack** : Next.js 15 (App Router) + TypeScript + Tailwind CSS + Supabase + Stripe
- **Déploiement** : Vercel (auto-deploy depuis GitHub)
- Le fondateur ne sait PAS coder. Le code doit être simple, lisible, commenté.

---

## RÈGLES ABSOLUES (ne jamais enfreindre)

### Sécurité

- JAMAIS de clé secrète dans le code source (pas de hardcoded API keys)
- JAMAIS utiliser `SUPABASE_SERVICE_ROLE_KEY` côté client (uniquement dans `/app/api/`)
- JAMAIS utiliser `STRIPE_SECRET_KEY` côté client (uniquement dans `/app/api/`)
- TOUJOURS vérifier `CRON_SECRET` dans les API Routes cron
- TOUJOURS vérifier la signature Stripe dans le webhook
- Les variables sans `NEXT_PUBLIC_` ne doivent JAMAIS être importées dans un composant client

### TypeScript

- JAMAIS utiliser `any` — toujours typer explicitement
- JAMAIS utiliser `@ts-ignore` ou `@ts-expect-error`
- TOUJOURS utiliser les types générés depuis Supabase (`types/database.ts`)
- TOUJOURS lancer `npm run build` après chaque modification pour vérifier qu'il n'y a aucune erreur TypeScript

### React / Next.js

- JAMAIS utiliser `window.location.reload()` — utiliser `invalidateQueries()` de TanStack Query
- JAMAIS utiliser `alert()` — utiliser le système de toast (Sonner)
- JAMAIS utiliser `console.log()` en production — utiliser Sentry pour le tracking d'erreurs
- JAMAIS utiliser `useEffect` pour du data fetching — utiliser `useQuery` de TanStack Query
- TOUJOURS mettre `"use client"` en haut des composants qui utilisent des hooks React (`useState`, `useEffect`, `useQuery`, etc.)
- TOUJOURS mettre les composants serveur par défaut (pas de `"use client"` sauf si nécessaire)
- JAMAIS mélanger Server Components et Client Components dans le même fichier

### Base de données

- JAMAIS faire d'UPDATE direct depuis le frontend pour les actions prestataire — toujours passer par les RPC
- JAMAIS modifier le schéma DB sans mettre à jour `types/database.ts` (relancer `supabase gen types`)
- TOUJOURS utiliser les CHECK constraints pour les champs de statut
- TOUJOURS ajouter des index sur les colonnes utilisées dans les WHERE et les JOIN

### Gestion d'erreurs

- TOUJOURS wrapper les appels Supabase dans un try/catch
- TOUJOURS afficher un toast d'erreur à l'utilisateur en cas d'échec
- TOUJOURS envoyer l'erreur à Sentry (`captureException`)
- JAMAIS ignorer silencieusement une erreur (pas de catch vide)

### Formulaires

- TOUJOURS utiliser React Hook Form + Zod pour les formulaires
- TOUJOURS valider côté client ET côté serveur (double validation)
- TOUJOURS afficher les messages d'erreur sur les champs concernés (pas de message générique)

### Photos / Storage

- TOUJOURS compresser les images avant upload (`browser-image-compression`, max 1200px, qualité 80%)
- TOUJOURS uploader dans le bon dossier Storage : `etat-lieux/{interventionId}/`, `interventions/{interventionId}/`, `degats/{interventionId}/`
- TOUJOURS générer un nom de fichier unique (UUID + extension)

---

## CONVENTIONS DE CODE

### Nommage

- Fichiers composants : **PascalCase** (`LogementForm.tsx`, `StatusBadge.tsx`)
- Fichiers hooks : **camelCase** avec préfixe `use` (`useInterventions.ts`, `useAuth.ts`)
- Fichiers utilitaires : **camelCase** (`finance.ts`, `dates.ts`, `images.ts`)
- Variables et fonctions : **camelCase**
- Types et interfaces : **PascalCase** (`Intervention`, `Profile`, `CreateLogementInput`)
- Constantes : **UPPER_SNAKE_CASE** (`INTERVENTION_STATUSES`, `MAX_UPLOAD_SIZE`)
- Colonnes DB : **snake_case** (`prix_prestataire_ht`, `client_id`)

### Structure d'un hook TanStack Query

```typescript
// lib/hooks/useLogements.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import type { Logement, CreateLogementInput } from '@/types/database';

// Clé de cache standardisée
const QUERY_KEY = 'logements';

// Hook de lecture
export function useLogements(clientId?: string) {
  return useQuery({
    queryKey: [QUERY_KEY, { clientId }],
    queryFn: async () => {
      let query = supabase
        .from('logements')
        .select('*, client:profiles!client_id(id, full_name)')
        .order('name');

      if (clientId) query = query.eq('client_id', clientId);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

// Hook de mutation (création)
export function useCreateLogement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateLogementInput) => {
      const { data, error } = await supabase
        .from('logements')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}
```

### Structure d'un composant page

```typescript
// app/admin/logements/page.tsx
"use client";

import { useLogements } from '@/lib/hooks/useLogements';
import { Loader } from '@/components/ui/Loader';
import { EmptyState } from '@/components/ui/EmptyState';

export default function LogementsPage() {
  const { data: logements, isLoading, error } = useLogements();

  if (isLoading) return <Loader />;
  if (error) return <div>Erreur de chargement</div>;
  if (!logements?.length) return <EmptyState message="Aucun logement" />;

  return (
    <div>
      {/* contenu */}
    </div>
  );
}
```

### Structure d'une API Route

```typescript
// app/api/cron/sync-ical/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import * as Sentry from '@sentry/nextjs';

export async function POST(request: NextRequest) {
  try {
    // 1. Vérifier l'authentification
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Client Supabase serveur (service_role)
    const supabase = createServerClient();

    // 3. Logique métier
    // ...

    // 4. Retour succès
    return NextResponse.json({ success: true });

  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### Structure d'un formulaire

```typescript
// Toujours : schéma Zod + React Hook Form + toast
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

const schema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  prix_prestataire_ht: z.number().min(0, 'Le prix doit être positif'),
});

type FormData = z.infer<typeof schema>;

export function MonFormulaire() {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', prix_prestataire_ht: 0 },
  });

  const onSubmit = async (data: FormData) => {
    try {
      // appel mutation
      toast.success('Enregistré avec succès');
    } catch (error) {
      toast.error('Erreur lors de l\'enregistrement');
      Sentry.captureException(error);
    }
  };

  return <form onSubmit={form.handleSubmit(onSubmit)}>{/* champs */}</form>;
}
```

---

## PATTERNS OBLIGATOIRES

### Gestion des statuts (source de vérité unique)

```typescript
// types/enums.ts — SEULE source de vérité pour les statuts
export const INTERVENTION_STATUSES = {
  A_ATTRIBUER: 'a_attribuer',
  ASSIGNEE: 'assignee',
  ACCEPTEE: 'acceptee',
  REFUSEE: 'refusee',
  EN_COURS: 'en_cours',
  TERMINEE: 'terminee',
  ANNULEE: 'annulee',
} as const;

export type InterventionStatus = typeof INTERVENTION_STATUSES[keyof typeof INTERVENTION_STATUSES];

// JAMAIS écrire un statut en string directement dans le code :
// ❌ if (status === 'terminee')
// ✅ if (status === INTERVENTION_STATUSES.TERMINEE)
```

### Calculs financiers (centralisés, testés)

```typescript
// lib/utils/finance.ts — SEUL endroit pour les calculs financiers
// JAMAIS dupliquer ces calculs dans les composants

export function calculateInterventionGain(intervention: Intervention): number {
  const blanchisserie = intervention.blanchisserie_incluse
    ? (intervention.prix_blanchisserie ?? 0)
    : 0;
  return (intervention.prix_client_ttc ?? 0) + blanchisserie - (intervention.prix_prestataire_ht ?? 0);
}

// Chaque fonction DOIT avoir un test correspondant dans __tests__/finance.test.ts
```

### Dates (centralisées)

```typescript
// lib/utils/dates.ts — SEUL endroit pour le formatage des dates
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

// JAMAIS formater une date manuellement dans un composant
// ❌ new Date(date).toLocaleDateString()
// ✅ formatDate(date)
```

---

## TESTS OBLIGATOIRES

### Quels fichiers DOIVENT avoir des tests

- `lib/utils/finance.ts` → `lib/utils/__tests__/finance.test.ts`
- `lib/utils/assignment.ts` → `lib/utils/__tests__/assignment.test.ts`
- `lib/utils/dates.ts` → `lib/utils/__tests__/dates.test.ts`

### Format des tests

```typescript
// lib/utils/__tests__/finance.test.ts
import { describe, it, expect } from 'vitest';
import { calculateInterventionGain } from '../finance';

describe('calculateInterventionGain', () => {
  it('calcule le gain sans blanchisserie', () => {
    const intervention = {
      prix_client_ttc: 80,
      prix_prestataire_ht: 50,
      blanchisserie_incluse: false,
      prix_blanchisserie: 0,
    };
    expect(calculateInterventionGain(intervention)).toBe(30);
  });

  it('calcule le gain avec blanchisserie', () => {
    const intervention = {
      prix_client_ttc: 80,
      prix_prestataire_ht: 50,
      blanchisserie_incluse: true,
      prix_blanchisserie: 15,
    };
    expect(calculateInterventionGain(intervention)).toBe(45);
  });

  it('gère les valeurs nulles', () => {
    const intervention = {
      prix_client_ttc: null,
      prix_prestataire_ht: null,
      blanchisserie_incluse: false,
      prix_blanchisserie: null,
    };
    expect(calculateInterventionGain(intervention)).toBe(0);
  });
});
```

### Quand lancer les tests

- AVANT chaque commit : `npm run test`
- AVANT chaque déploiement : `npm run build && npm run test`
- APRÈS chaque modification de `finance.ts`, `assignment.ts`, ou `dates.ts`

---

## CE QUI N'EST PAS DANS LE SCOPE

Ne JAMAIS implémenter ces features (elles sont prévues pour la V4) :

- Notifications push
- GPS / géolocalisation
- Application mobile native
- Multi-admin
- Stripe Connect (paiement automatique des prestataires)

Si le fondateur demande l'une de ces features, rappeler qu'elles sont prévues pour la V4.

---

## ORDRE DE PRIORITÉ EN CAS DE DOUTE

1. **Sécurité** (les données ne fuient pas, les clés sont protégées)
2. **Correction** (les calculs sont justes, les statuts sont cohérents)
3. **Simplicité** (le code est simple et lisible)
4. **Performance** (le code est rapide)
5. **Esthétique** (le code est élégant)

En cas de conflit entre ces priorités, toujours choisir celle qui est plus haut dans la liste.

---

## CHECKLIST AVANT CHAQUE COMMIT

- [ ] `npm run build` passe sans erreur
- [ ] `npm run test` passe (si des tests existent)
- [ ] Aucun `console.log` dans le code
- [ ] Aucun `any` dans TypeScript
- [ ] Aucune clé secrète dans le code source
- [ ] Les erreurs sont capturées par Sentry
- [ ] Les messages utilisateur sont en français

---

## ERREURS FRÉQUENTES À ÉVITER (Claude Code fait souvent ces erreurs)

### 1. Oublier "use client"

```typescript
// ❌ ERREUR : utiliser useState/useEffect/useQuery sans "use client"
import { useState } from 'react';
export default function Page() { ... }

// ✅ CORRECT :
"use client";
import { useState } from 'react';
export default function Page() { ... }
```

### 2. Importer un module serveur côté client

```typescript
// ❌ ERREUR : importer le client Supabase serveur dans un composant client
import { createServerClient } from '@/lib/supabase/server';

// ✅ CORRECT : utiliser le client navigateur côté client
import { supabase } from '@/lib/supabase/client';
```

### 3. Oublier de gérer le state loading

```typescript
// ❌ ERREUR : pas de loading state
export default function Page() {
  const { data } = useLogements();
  return <div>{data.map(...)}</div>; // CRASH si data est undefined
}

// ✅ CORRECT : toujours gérer loading + error + empty
export default function Page() {
  const { data, isLoading, error } = useLogements();
  if (isLoading) return <Loader />;
  if (error) return <ErrorDisplay error={error} />;
  if (!data?.length) return <EmptyState message="Aucun logement" />;
  return <div>{data.map(...)}</div>;
}
```

### 4. Ne pas invalider le cache après une mutation

```typescript
// ❌ ERREUR : la liste ne se met pas à jour après création
const mutation = useMutation({
  mutationFn: async (input) => { ... },
});

// ✅ CORRECT : invalider le cache pour rafraîchir la liste
const mutation = useMutation({
  mutationFn: async (input) => { ... },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['logements'] });
    toast.success('Logement créé');
  },
  onError: (error) => {
    toast.error('Erreur lors de la création');
    Sentry.captureException(error);
  },
});
```

### 5. Utiliser des strings au lieu des enums

```typescript
// ❌ ERREUR : string magique
if (intervention.status === 'terminee') { ... }

// ✅ CORRECT : utiliser l'enum
import { INTERVENTION_STATUSES } from '@/types/enums';
if (intervention.status === INTERVENTION_STATUSES.TERMINEE) { ... }
```

### 6. Ne pas protéger les API Routes

```typescript
// ❌ ERREUR : API Route cron sans vérification
export async function POST(request: NextRequest) {
  // n'importe qui peut appeler cette route !
  const supabase = createServerClient();
  ...
}

// ✅ CORRECT : toujours vérifier le CRON_SECRET
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  ...
}
```

### 7. Oublier ON DELETE CASCADE sur les FK enfants

```sql
-- ❌ ERREUR : supprimer une invoice laisse des invoice_lines orphelines
CREATE TABLE invoice_lines (
  invoice_id uuid REFERENCES invoices(id), -- pas de CASCADE
);

-- ✅ CORRECT :
CREATE TABLE invoice_lines (
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
);
```

### 8. Mauvais ordre d'import des composants shadcn/ui

```typescript
// ❌ ERREUR : import depuis un path inexistant
import { Button } from 'shadcn/ui';

// ✅ CORRECT : import depuis le dossier components/ui local
import { Button } from '@/components/ui/button';
```

### 9. Ne pas typer les réponses Supabase

```typescript
// ❌ ERREUR : data est "any"
const { data } = await supabase.from('interventions').select('*');

// ✅ CORRECT : typage explicite
import type { Database } from '@/types/database';
type Intervention = Database['public']['Tables']['interventions']['Row'];
const { data } = await supabase.from('interventions').select('*').returns<Intervention[]>();
```

### 10. Oublier l'encodage français dans les PDFs et emails

```typescript
// ❌ ERREUR : caractères spéciaux cassés
const description = "Ménage standard";

// ✅ CORRECT : toujours utiliser UTF-8, tester avec des accents
// Vérifier que les PDF, emails et toasts affichent correctement : é, è, ê, à, ç, ù, ô
```

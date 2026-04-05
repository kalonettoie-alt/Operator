# CLAUDE.md – Règles Claude Code

## Stack
Node ≥20 · pnpm ≥9 · Expo SDK 52 · RN 0.76 · TypeScript 5.4 · Supabase CLI · Next.js 14 App Router · NativeWind 4 · Stripe RN

## Architecture
```
apps/mobile/        → Expo Router : (auth) (client) (provider) (admin)
apps/web-guest/     → Next.js SSR voyageur + paiement formation
packages/shared/    → types/ schemas/ constants/
supabase/           → migrations/ functions/ seeds/
```

## Conventions
- Fichiers : kebab-case | Composants : PascalCase | Hooks : useCamelCase
- Stores : camelCaseStore | Tables SQL : snake_case | RPCs : role_action
- Edge Functions : kebab-case | Branches : feature/fix/chore | Commits : feat/fix/chore/refactor

## Règles absolues
1. **Mutations → RPC uniquement** — jamais `.insert()/.update()/.delete()` côté client
2. **React Query** pour tous les SELECT. Zustand uniquement pour `authStore` + `offlineStore`
3. **Pagination** — `PAGE_SIZE = 20`, `.range(page*20, (page+1)*20-1)`
4. **Guards de rôle** dans chaque `_layout.tsx`, redirect `/login` si non autorisé
5. **RPCs admin** — `IF NOT is_admin() THEN RAISE EXCEPTION`
6. **Photos** — compression 1024px/0.7/WebP, `Promise.all()` upload parallèle, retry×3
7. **Chiffrement** — AES-256-GCM côté Edge Function (`save-property-data`), jamais mobile
8. **Voyageur Realtime** — Broadcast `guest:{token}` (pas postgres_changes — anonyme sans JWT)
9. **Edge Functions** — `handleCors()` en premier, `try/catch` + Sentry
10. **Types** — `supabase gen types` après chaque migration

## Interdits
❌ localStorage/sessionStorage/window/document · ❌ packages browser-only
❌ ScrollView+FlatList imbriqués · ❌ Image sans width+height
❌ Clé AES ou STRIPE_SECRET dans EXPO_PUBLIC_* · ❌ getPublicUrl() sur bucket privé
❌ INSERT/UPDATE direct depuis mobile · ❌ IBAN en base · ❌ mot "abonnement"
❌ Facture en double (check invoice_runs) · ❌ Payout avant SEPA confirmé

## Commandes
```bash
pnpm install
pnpm turbo dev --filter=mobile          # Simulateur
pnpm turbo dev --filter=web-guest       # localhost:3001
supabase start && supabase db push
supabase gen types typescript --local > packages/shared/src/types/database.ts
supabase functions serve
eas build --platform all --profile development
eas build --platform all --profile production
eas update --branch production          # OTA
```

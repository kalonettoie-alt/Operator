# PROGRESS.md – Deltom V4
> Mise à jour : Avril 2026

## ✅ Phase 0 — Setup
- ✅ Git + Turborepo + pnpm-workspace.yaml
- ✅ apps/mobile (Expo SDK 54, NativeWind v4, Expo Router v4)
- ✅ apps/web-guest (Next.js 14 App Router)
- ✅ packages/shared (types, constants, schemas)
- ✅ Supabase config.toml + migrations 001–012
- ✅ eas.json (dev / preview / prod)
- ✅ `database.ts` généré

## ✅ Phase 1 — Auth + Navigation
- ✅ `useAuth` hook — JWT → rôle, fallback SELECT profiles
- ✅ Session persistante + refresh au retour background
- ✅ `login.tsx` — email + mot de passe + rate limit 5 tentatives
- ✅ `forgot-password.tsx` — reset par email
- ✅ `register/step-1 à step-4` — inscription client
- ✅ Guards de rôle dans chaque `_layout.tsx`
- ✅ Migration 013 — RPC `client_update_profile`
- ✅ `index.tsx` avec état loading (pas de flash login)

## ✅ Phase 2 — Client onboarding + Logements
- ✅ Dashboard client (KPIs + bandeau SEPA + interventions récentes + liste logements)
- ✅ Hooks `useClientProfile` / `useClientProperties` / `useClientActiveInterventions`
- ✅ Création logement multi-étapes (adresse, type, détails, rapport photo, iCal)
- ✅ Prix dynamique selon type + offre
- ✅ Migration 016 — pricing, migration 017 — détails logement
- ✅ Écran interventions client (À venir / Terminées, prix correct)

## ✅ Phase 3 — iCal sync
- ✅ Edge Function `sync-ical` (parse, pricing, checklist, guest_name)
- ✅ Cron pg_cron toutes les 15min
- ✅ Détection annulations + protection doublons
- ✅ Bloquer sync si client sans SEPA (migration 018/020)
- ✅ Interventions créées en status `pending`

## ✅ Phase 4 — Prestataire onboarding (partiel)
- ✅ Inscription prestataire dans l'app (5 étapes : info perso → SIRET/statut → compétences/zones → récap → contrat)
- ✅ Store Zustand multi-étapes `provider-register-store`
- ✅ `handle_new_user` trigger mis à jour pour lire `role` des metadata
- ✅ RPC `provider_save_details`
- ✅ Lien inscription prestataire depuis login
- ✅ Interface prestataire accessible immédiatement (message pending dans dashboard)
- ⬜ Stripe Connect Express
- ⬜ Formation/certification/kit (web Next.js)
- ⬜ Vérification SIRET API INSEE
- ⬜ Activation automatique (3 conditions)

## ✅ Phase 5 — Cycle mission
- ✅ Liste missions prestataire (En cours / Historique / En attente de connexion)
- ✅ Détail mission (rémunération, codes accès 30min avant, note propriétaire)
- ✅ Accepter / Refuser mission (RPCs)
- ✅ Démarrer intervention (min 5 photos avant)
- ✅ Checklist cochable avec mise à jour optimiste
- ✅ Photos après (min 5) + signalement dégâts (multi-photos + description)
- ✅ Complétion mission (vérifie checklist + photos)
- ✅ Compression photos 1024px/0.5 via ImageManipulator
- ✅ Upload via RPC `provider_add_intervention_photo` (pas d'INSERT direct)
- ✅ Signed URLs pour bucket privé
- ✅ Mode offline complet :
  - Queue AsyncStorage (photos, checklist, start, complete, dégâts)
  - Miniatures locales visibles avec overlay 🕐
  - Polling 10s pour sync automatique au retour réseau
  - Invalidation cache React Query après sync
  - Section "En attente de connexion" dans la liste missions
  - Alerte "Rapport sauvegardé" pour actions critiques
- ✅ Cache React Query persisté sur disque (offline lite — données visibles sans réseau)
- ✅ Auto-refresh via `focusManager` + `AppState`

## ✅ Phase 6 — Admin (mini)
- ✅ Layout admin avec Tabs (Dashboard, Prestataires, Interventions)
- ✅ Liste prestataires avec badges statut + modal activation/suspension
- ✅ Liste interventions toutes statuts (À assigner / En cours / Historique)
- ✅ Modal assignation prestataire
- ✅ RPCs `admin_activate_provider`, `admin_assign_provider`
- ⬜ Dashboard KPIs (commission Deltom)
- ⬜ Dispatch auto (Edge Function scoring)
- ⬜ Validation documents prestataires
- ⬜ Pages clients / properties / calendar

## ⬜ À venir
- Phase 7 → Page voyageur + Realtime + Early check-in
- Phase 8 → Facturation SEPA
- Phase 9 → Payouts prestataires Stripe Connect
- Phase 10 → Notifications push
- Phase 11 → Polish + Tests + Soumission stores

## 🐛 Bugs connus
Aucun bug bloquant.

## 📋 Décisions clés
| Décision | Raison |
|----------|--------|
| Stripe Connect Express | Éviter 3-4 sem de dev KYC |
| Formation paiement web | Éviter commission Apple 30% |
| "Frais de gestion" (pas "abonnement") | Conformité App Store |
| Realtime voyageur via Broadcast | Anonyme sans JWT, RLS impossible |
| Auth prestataire étape 1 | Upload auth requis dès étape 2 |
| Payouts J+15 | Attendre confirmation SEPA |
| 1 table profiles en V1 | Moins de jointures, refactor V2 |
| Offline lite (cache persisté) | Pas de vrai sync bidirectionnel, juste cache + queue |
| Queue offline polling 10s | Pas besoin de NetInfo, simple et efficace |
| Min 5 photos avant/après | État des lieux fiable |
| Photos dégâts avec description | Preuve pour litiges propriétaire |

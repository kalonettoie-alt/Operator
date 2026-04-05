# PLAN D'ACTION – Deltom V4
> Règle absolue : aucune phase ne commence si la précédente a un critère de succès non validé.

## Phases

| # | Phase | Durée | Statut |
|---|-------|-------|--------|
| 0 | Setup monorepo + Supabase | 1 sem | 🚧 En cours |
| 1 | Auth + Profiles + Navigation + Guards | 1-2 sem | ⬜ |
| 2 | Client onboarding + Création logement | 2 sem | ⬜ |
| 3 | iCal sync + Création auto interventions | 1-2 sem | ⬜ |
| 4 | Prestataire onboarding complet | 2-3 sem | ⬜ |
| 5 | Cycle mission prestataire | 3 sem | ⬜ |
| 6 | Admin dashboard + Assignation + Validation | 2 sem | ⬜ |
| 7 | Page voyageur + Realtime + Early check-in | 2 sem | ⬜ |
| 8 | Facturation commissionnaire + SEPA | 2 sem | ⬜ |
| 9 | Payouts prestataires Stripe Connect | 1 sem | ⬜ |
| 10 | Notifications push | 1 sem | ⬜ |
| 11 | Polish + Tests + Soumission stores | 2 sem | ⬜ |

---

## Phase 0 — Setup 🚧

**Tâches restantes**
- [ ] `pnpm install` — installer toutes les dépendances
- [ ] `supabase start` + `supabase db push` — appliquer les migrations 001–012
- [ ] `supabase gen types` — générer database.ts
- [ ] Vérifier app Expo sur simulateur iOS + Android

**Critères de succès**
- [ ] `supabase start` sans erreur
- [ ] 12 migrations appliquées sans erreur
- [ ] `database.ts` généré avec les tables
- [ ] App Expo démarre (écran login placeholder)
- [ ] Next.js démarre sur localhost:3001

---

## Phase 1 — Auth + Navigation

**Tâches**
- Configurer Auth Hook dans dashboard Supabase (custom_access_token_hook)
- `useAuth` hook — JWT → rôle, fallback SELECT profiles
- Écran `login.tsx` — email + mot de passe + rate limit 5 tentatives
- Écrans `register/` step-1 à 4 — inscription client
- `forgot-password.tsx`
- Session persistante + refresh au retour background

**Critères**
- [ ] Client s'inscrit steps 1-4 ✓
- [ ] JWT contient `user_role = 'client'`
- [ ] Client redirigé si accès (admin) ou (provider)
- [ ] Session survive fermeture/réouverture app
- [ ] Message après 5 tentatives échouées

---

## Phase 2 — Client onboarding + Logements

**Tâches**
- Edge Function `save-property-data` (chiffrement AES codes accès)
- Écrans `properties/create/` step-1 à 5 (adresse Google Places, type, détails, rapport photo, iCal)
- Prix dynamique selon type+offre
- Test URL iCal
- IBAN/SEPA Stripe Elements (skippable)
- Dashboard client KPIs + liste logements
- Bandeau IBAN manquant

**Critères**
- [ ] Logement créé en 5 étapes
- [ ] Prix change dynamiquement
- [ ] Codes chiffrés AES en base (vérifier SQL)
- [ ] URL iCal testable (X réservations ou "invalide")
- [ ] IBAN jamais en base
- [ ] Bandeau si sepa_mandate_active = false

---

## Phase 3 — iCal sync

**Tâches**
- Edge Function `sync-ical` complète (parse, calculatePricing, buildChecklist, extractGuestName)
- Détection annulations, protection doublons
- Cron toutes les 15min Europe/Paris
- Bloquer sync si client sans SEPA

**Critères**
- [ ] Feed iCal Airbnb parsé correctement
- [ ] Interventions créées en status `pending` avec bon prix
- [ ] guest_token = UUID complet
- [ ] Pas de doublon si même UID
- [ ] Annulation iCal → réservation annulée
- [ ] Spécificities → items checklist corrects
- [ ] Pas de sync sans SEPA actif

---

## Phase 4 — Prestataire onboarding

**Tâches**
- Admin crée le prestataire (RPC) → email invitation
- Steps 1-8 : Auth → documents/SIRET → compétences/zones → Stripe Connect → contrat → formation → certification → kit
- Edge Functions : `verify-siret`, `create-provider-account`
- Page web formation/paiement (Next.js + Stripe Checkout)
- Activation automatique si 3 conditions remplies

**Critères**
- [ ] Email invitation envoyé
- [ ] Prestataire crée son compte Auth (step 1)
- [ ] Trigger lie compte Auth au profil existant (pas de doublon)
- [ ] SIRET vérifié API INSEE
- [ ] Stripe Connect Express complet
- [ ] Formation débloquée après paiement web
- [ ] Certification : score calculé, min 80%
- [ ] is_active = true quand docs + certif + kit OK

---

## Phase 5 — Cycle mission

**Tâches**
- Dashboard prestataire + liste missions (Aujourd'hui / À venir / Historique)
- Détail mission + owner_reminder + codes masqués → débloqués 30min avant
- Accepter/Refuser RPCs
- PhotoCapture : caméra + galerie + compression + upload parallèle
- Écran in-progress : timer + checklist cochable
- Photos après + spécifiques + dégâts
- Complétion (vérifie checklist + photos)
- Mode offline MMKV + useOfflineSync

**Critères**
- [ ] Accepter → status `accepted`
- [ ] Refuser → status `pending`, provider_id = null
- [ ] Codes visibles 30min avant seulement
- [ ] 10 photos < 15s, chaque photo ≤ 200Ko
- [ ] Complétion impossible si checklist incomplète ou < 2 photos après
- [ ] Offline : photos en queue, checklist cochable, sync au retour réseau

---

## Phase 6 — Admin

**Tâches**
- Dashboard 4 KPIs (commission uniquement, pas CA brut)
- Moteur dispatch scoring (Edge Function `dispatch-engine`, cron horaire)
- Modal assignation manuelle
- Validation documents prestataires → activation automatique
- Pages clients / providers / properties / ical-sources / calendar

**Critères**
- [ ] KPI = commission Deltom (pas CA brut)
- [ ] Dispatch auto assigne le meilleur score
- [ ] Override manuel fonctionne
- [ ] Validation documents → activation si 3 conditions OK

---

## Phase 7 — Page voyageur

**Tâches**
- Edge Function `get-guest-data` (token vérifié, données filtrées)
- Page Next.js `guest/[token]` SSR — 7 états visuels
- Broadcast Realtime progression checklist
- Cron transitions temporelles
- Early check-in : demande → admin → paiement Stripe Checkout → webhook
- Notation 1-5 étoiles → moyenne prestataire
- Bouton appel hôte (uniquement quand instructions visibles)

**Critères**
- [ ] 7 états affichés selon date+statut
- [ ] Barre progression avance en temps réel
- [ ] Instructions visibles seulement à l'heure check-in (ou early payé)
- [ ] Codes déchiffrés côté serveur (pas dans HTML initial)
- [ ] Early check-in flow complet fonctionne
- [ ] Note → moyenne prestataire mise à jour
- [ ] Pas de zoom possible

---

## Phase 8 — Facturation SEPA

**Tâches**
- Edge Function `generate-invoices` + idempotence `invoice_runs`
- Numérotation séquentielle (nextval)
- Calcul TVA 0% auto-entrepreneur + mention légale
- PaymentIntent SEPA créé automatiquement
- Templates HTML factures (provision + commission)
- Webhooks Stripe : succeeded/failed/mandate.updated
- Crons 16 du mois + 1er du mois

**Critères**
- [ ] Montants corrects (provision + commission)
- [ ] Numérotation sans trou
- [ ] Cron 2× → pas de doublons (invoice_runs)
- [ ] SEPA webhook → factures `paid` + payouts `ready_to_transfer`
- [ ] Webhook 2× → pas de double traitement
- [ ] Mandat révoqué → notif client + admin

---

## Phase 9 — Payouts

**Tâches**
- Page admin payouts (liste par prestataire)
- RPC `admin_validate_payout` → Stripe Transfer
- Webhook `transfer.paid` → payout `paid` + notif prestataire

**Critères**
- [ ] Payouts apparaissent uniquement après SEPA confirmé
- [ ] Admin valide → Transfer Stripe créé
- [ ] Prestataire notifié + voit "Payé ✓"

---

## Phase 10 — Notifications push

**Tâches**
- `usePushNotifications` hook (permission + token)
- Table `notification_tokens` + RPC upsert
- Edge Function `send-notification` (batch Expo Push API)
- Gestion tokens morts (`DeviceNotRegistered` → is_active = false)
- Implémenter les 20+ types de notifications

**Critères**
- [ ] Push reçu sur iPhone réel
- [ ] Push reçu sur Android réel
- [ ] Tokens morts désactivés automatiquement

---

## Phase 11 — Polish + Soumission

**Tâches**
- Tests tous les flows par rôle
- Vérifier touch targets 44×44pt, safe areas, iPhone SE
- Pages web : deltom.fr/privacy · /terms · /support
- Compte de test Apple Review
- EAS Build production + screenshots
- EAS Submit iOS + Android

**Critères**
- [ ] Tous les flows testés et validés
- [ ] 3 pages web accessibles publiquement
- [ ] App acceptée App Store
- [ ] App acceptée Play Store

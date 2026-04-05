# PRD.md – Deltom Operator V4

## Problème
Gestion manuelle de 8 tâches répétitives : sync check-outs iCal, assignation prestataires, suivi interventions, rapports photo, facturation, vérification autofactures, virements, onboarding clients.

## Personas

| Persona | Besoin clé | Critère de succès |
|---------|-----------|-------------------|
| **Client propriétaire** | Déléguer tout le ménage, recevoir rapports + factures auto | "Je ne touche à rien" |
| **Prestataire** | Missions régulières, instructions claires, paiement fiable J+15 | "Je reçois et je suis payé" |
| **Voyageur** | Savoir quand le logement est prêt, codes d'accès, early check-in | Lien web, pas d'app |
| **Admin (Deltom)** | Dashboard complet, alertes temps réel, override sur tout | Superviser sans intervenir manuellement |

## User Stories P0 (MVP obligatoire)

**Client** — inscription 3 étapes · IBAN Stripe (skippable) · ajout logement 5 étapes · prix dynamique · test URL iCal · dashboard KPIs · liste logements · rapport intervention · liste factures

**Prestataire** — invitation email · création compte Auth étape 1 · SIRET vérifié INSEE · upload documents · Stripe Connect Express · contrat + autofacturation · formation (paiement web) · certification 80% · kit Operator · écran d'attente validation

**Mission** — notification push · détail mission · accepter/refuser · codes débloqués 30min avant · photos AVANT ≥2 · checklist temps réel · photos APRÈS ≥2 · complétion (vérif checklist+photos)

**Admin** — 4 KPIs (commission Deltom, pas CA brut) · dispatch auto scoring · override manuel · validation documents · gestion iCal · liste factures SEPA · validation payouts

**Voyageur** — lien web sans compte · progression temps réel · instructions à l'heure check-in · early check-in (4 créneaux 15-45€) · note 1-5 étoiles

**Automatisations** — sync iCal toutes les 15min · création interventions auto · dispatch auto · factures 2×/mois · SEPA auto · payouts après confirmation SEPA · annulations iCal

## Stack

| Couche | Tech |
|--------|------|
| Mobile | React Native Expo SDK 52 |
| Web | Next.js 14 App Router (voyageur + formation) |
| Backend | Supabase (Auth, PostgreSQL, Storage, Realtime, Edge Functions) |
| Paiements | Stripe Connect Express + SEPA |
| Emails | Resend |
| Push | Expo Notifications + FCM/APNs |
| Monorepo | Turborepo + pnpm |
| Monitoring | Sentry |

## Métriques cibles
Démarrage app < 3s · Upload 10 photos < 15s (4G) · Photo ≤ 200 Ko · Dashboard < 2s · 60 fps

## Hors scope V1
Chat in-app · Multi-langue · Analytics graphiques · Inscription prestataire publique · PDF natif · Dark mode · Indisponibilités prestataire

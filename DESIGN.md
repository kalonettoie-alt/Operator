# DESIGN.md – Deltom Operator V4

**Style : Professionnel. Épuré. Fiable.**

## Couleurs

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#1A3A3A` | CTA principaux, headers, bottom nav actif |
| `primary-light` | `#2C4F4F` | Cartes KPI, hover |
| `accent-gold` | `#8B7D3C` | Badges URGENT/PRÉVU, KPI satisfaction |
| `bg-light` | `#F5F5F5` | Fond cartes, inputs |
| `bg-cream` | `#F8F6F0` | Encart owner_reminder |
| `text-secondary` | `#6B7280` | Labels, sous-titres |
| `text-muted` | `#9CA3AF` | Placeholders, tertiaire |
| `success` | `#10B981` | Accepter, badge Terminée |
| `danger` | `#EF4444` | Refuser, badge Urgent |
| `warning` | `#F59E0B` | En attente, deadline early check-in |
| `info` | `#3B82F6` | En cours, progression |
| `border` | `#E5E7EB` | Bordures, séparateurs |

## Typographie
Police système (SF Pro iOS / Roboto Android). Pas de font custom V1.

| Usage | Taille | Poids |
|-------|--------|-------|
| Titre page | 28-32px | Bold 700 |
| Titre section | 20-24px | Semibold 600 |
| Body | 14-16px | Regular 400 |
| Label uppercase | 11-12px | Medium 500 |
| KPI chiffre | 32-48px | Bold 700 |
| Timer | 48px | Bold 700 monospace |

## Composants clés

**Cartes** — border-radius 16px, shadow `0 1px 3px rgba(0,0,0,0.08)`, padding 16-20px

**CTA bouton** — height 52-56px, border-radius 12px, 16px Semibold, fond `primary`, full-width mobile prestataire

**Accepter/Refuser** — height 52px full-width, success/danger, 12px gap entre les deux

**Badges statut**
```
ASSIGNÉE → doré clair / accent-gold   EN ATTENTE → orange / warning
EN COURS → bleu / info                TERMINÉE   → vert / success
URGENT   → danger fond blanc          PRÉVU      → gris / text-secondary
```

**Inputs** — height 44-48px, border-radius 10px, fond bg-light, label uppercase 11px au-dessus, focus → bordure primary

**Bottom nav** — 4 tabs, icône outline→filled, texte 10px, fond blanc, séparateur border en haut

## UX critiques
- **Touch targets** ≥ 44×44pt partout (Apple HIG)
- **Safe areas** — `SafeAreaView` partout, respecter encoche + Home Indicator
- **Chargement** — skeleton loader (jamais spinner) sur listes et dashboards
- **Formulaires** — validation Zod blur, scroll vers 1ère erreur, `KeyboardAvoidingView`
- **Offline** — bandeau ambre "Vous êtes hors connexion", toast vert au retour réseau
- **Toasts** — 3 secondes, swipe pour fermer
- **Viewport voyageur** — `maximum-scale=1, user-scalable=no`

**Encart owner_reminder** — fond bg-cream, bordure gauche 3px accent-gold, icône 💡, au-dessus de la checklist

**Timer** — `00:24:15` monospace 48px centré, sous : "● Le voyageur suit votre progression"

**Codes d'accès** — `••••••` jusqu'à 30min avant, puis monospace fond bg-light

// lib/stripe/frontend.ts
//
// Chargement de Stripe.js côté navigateur.
// Utilise NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (clé publique, safe dans le bundle).
// Pattern singleton : Stripe.js n'est chargé qu'une seule fois.
//
// Usage dans un composant "use client" :
//   import { getStripePromise } from '@/lib/stripe/frontend';
//   const stripe = await getStripePromise();
//   await stripe.confirmSepaDebitSetup(clientSecret, { ... });

import { loadStripe, type Stripe } from "@stripe/stripe-js";

let stripePromise: Promise<Stripe | null> | null = null;

/**
 * Retourne l'instance Stripe.js (chargée une seule fois).
 * Lance une erreur si NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY est absent.
 */
export function getStripePromise(): Promise<Stripe | null> {
  if (stripePromise) return stripePromise;

  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!key) {
    console.error(
      "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY manquante — configurer dans .env.local et Vercel"
    );
    return Promise.resolve(null);
  }

  stripePromise = loadStripe(key);
  return stripePromise;
}

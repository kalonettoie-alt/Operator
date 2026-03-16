// lib/stripe/client.ts
//
// Client Stripe — SERVEUR UNIQUEMENT.
// Ne jamais importer ce fichier dans un composant client ("use client").
// Utilise STRIPE_SECRET_KEY qui n'est jamais exposée au navigateur.
//
// Usage :
//   import { getStripe } from '@/lib/stripe/client';
//   const stripe = getStripe();
//   const paymentIntent = await stripe.paymentIntents.create({ ... });

import Stripe from "stripe";

// Instance singleton — initialisée à la première utilisation (lazy)
let _stripe: Stripe | null = null;

/**
 * Retourne le client Stripe initialisé.
 * Lance une erreur si STRIPE_SECRET_KEY n'est pas configurée.
 * À n'appeler que dans des API Routes (jamais côté client).
 */
export function getStripe(): Stripe {
  if (_stripe) return _stripe;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY manquante — ajouter la variable dans .env.local et dans les variables d'environnement Vercel"
    );
  }

  // En développement, forcer le mode test pour éviter toute erreur sur la prod
  if (process.env.NODE_ENV !== "production" && !key.startsWith("sk_test_")) {
    throw new Error(
      "STRIPE_SECRET_KEY doit commencer par 'sk_test_' en développement — ne jamais utiliser la clé live localement"
    );
  }

  _stripe = new Stripe(key, {
    // Version de l'API Stripe fixée pour éviter les breaking changes silencieux
    apiVersion: "2026-02-25.clover",
    // Nom de l'application affiché dans les logs Stripe Dashboard
    appInfo: {
      name:    "Deltom Operator",
      version: "3.0.0",
    },
    // Timeout réseau (ms)
    timeout: 10000,
  });

  return _stripe;
}

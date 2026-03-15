import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // node-ical doit rester en module Node.js natif (non bundlé par webpack)
  // pour éviter l'erreur "BigInt is not a function" lors du build.
  serverExternalPackages: ["node-ical"],
};

export default withSentryConfig(nextConfig, {
  // Organisation et projet Sentry (optionnel — pour l'upload des source maps)
  // org: "ton-organisation",
  // project: "deltom-operator-v3",

  // Désactiver les logs de build Sentry
  silent: true,

  // Route tunnel pour éviter les bloqueurs de pub
  tunnelRoute: "/monitoring",

  // Masquer les source maps côté client (sécurité)
  sourcemaps: {
    disable: true,
  },
});

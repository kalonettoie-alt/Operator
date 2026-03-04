"use client";

// Page d'accueil — temporaire pour valider l'étape 1.2
// Affiche le profil chargé et un bouton de déconnexion.
// Sera remplacée par le tableau de bord complet à l'étape suivante.

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { Button } from "@/components/ui/button";

// Libellés lisibles pour chaque rôle
const ROLE_LABELS: Record<string, string> = {
  admin: "Administrateur",
  client: "Client",
  prestataire: "Prestataire",
};

export default function Home() {
  const router = useRouter();
  const { user, profile, isLoading, signOut } = useAuth();

  // Redirige vers /login si l'utilisateur n'est pas connecté
  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [isLoading, user, router]);

  // Chargement initial
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500">Chargement...</p>
      </div>
    );
  }

  // Non connecté (redirection en cours)
  if (!user || !profile) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center space-y-6">

        {/* Titre temporaire */}
        <h1 className="text-3xl font-bold text-gray-900">
          Deltom Operator V3
        </h1>

        {/* Informations du profil — validation étape 1.2 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-8 py-6 space-y-2">
          <p className="text-xl font-semibold text-gray-800">
            Bonjour {profile.full_name ?? profile.email}
          </p>
          <p className="text-sm font-medium text-indigo-600 uppercase tracking-wide">
            {ROLE_LABELS[profile.role] ?? profile.role}
          </p>
          <p className="text-xs text-gray-400">{profile.email}</p>
        </div>

        {/* Bouton de déconnexion */}
        <Button variant="outline" onClick={signOut}>
          Se déconnecter
        </Button>

      </div>
    </div>
  );
}

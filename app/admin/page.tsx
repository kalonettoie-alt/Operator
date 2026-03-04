"use client";

// Dashboard Admin — page minimale de validation (étape 1.3)
// Sera enrichi aux étapes suivantes.

import { useAuth } from "@/lib/hooks/useAuth";
import { Button } from "@/components/ui/button";

export default function AdminDashboardPage() {
  const { profile, signOut } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Admin</h1>
        <p className="text-green-600 font-semibold text-lg">OK</p>
        {profile && (
          <p className="text-sm text-gray-500">
            Connecté en tant que <span className="font-medium">{profile.full_name ?? profile.email}</span>
          </p>
        )}
        <Button variant="outline" size="sm" onClick={signOut}>
          Se déconnecter
        </Button>
      </div>
    </div>
  );
}

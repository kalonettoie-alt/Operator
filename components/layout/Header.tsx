"use client";

// Header — barre supérieure fixe (visible sur tous les écrans).
// Affiche le logo, le nom de l'utilisateur connecté et le bouton de déconnexion.

import Image from "next/image";
import { LogOut } from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import { Button } from "@/components/ui/button";

export function Header() {
  const { profile, signOut } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-20 flex items-center justify-between px-4 md:px-6">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <Image
          src="/logo-deltom.png"
          alt="Deltom"
          height={40}
          width={40}
          className="object-contain"
          priority
        />
        <span className="text-xs font-medium text-gray-400 hidden sm:block">
          Operator V3
        </span>
      </div>

      {/* Utilisateur + déconnexion */}
      <div className="flex items-center gap-3">
        {profile && (
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-sm font-medium text-gray-800 leading-tight">
              {profile.full_name ?? profile.email}
            </span>
            <span className="text-xs text-gray-400 capitalize leading-tight">
              {profile.role}
            </span>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className="text-gray-500 hover:text-gray-900 gap-1.5"
        >
          <LogOut className="size-4" />
          <span className="hidden sm:inline text-sm">Déconnexion</span>
        </Button>
      </div>
    </header>
  );
}

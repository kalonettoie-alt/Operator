"use client";

// Hook d'authentification global
// Fournit : user (Supabase Auth), profile (table profiles), isLoading, signOut
// À utiliser dans tous les composants qui ont besoin de l'identité de l'utilisateur.

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import * as Sentry from "@sentry/nextjs";

import { supabase } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/types/database";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthContextType {
  /** Utilisateur Supabase Auth (null si non connecté) */
  user: User | null;
  /** Profil métier chargé depuis la table profiles */
  profile: Profile | null;
  /** Vrai pendant le chargement initial de la session */
  isLoading: boolean;
  /** Déconnecte l'utilisateur et redirige vers /login */
  signOut: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  isLoading: true,
  signOut: async () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Charge le profil métier depuis la table profiles
  async function loadProfile(userId: string): Promise<Profile | null> {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        Sentry.captureException(error, {
          extra: { context: "loadProfile", userId },
        });
        return null;
      }

      return data;
    } catch (err) {
      Sentry.captureException(err, {
        extra: { context: "loadProfile", userId },
      });
      return null;
    }
  }

  useEffect(() => {
    // 1. Chargement de la session existante au démarrage
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        const userProfile = await loadProfile(currentUser.id);
        setProfile(userProfile);
      }

      setIsLoading(false);
    });

    // 2. Écoute des changements d'état d'authentification (login / logout)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        const userProfile = await loadProfile(currentUser.id);
        setProfile(userProfile);
      } else {
        setProfile(null);
      }

      setIsLoading(false);
    });

    // Nettoyage de l'abonnement au démontage
    return () => subscription.unsubscribe();
  }, []);

  // Déconnexion + redirection
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      router.push("/login");
    } catch (err) {
      Sentry.captureException(err, { extra: { context: "signOut" } });
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Accède au contexte d'authentification.
 * Doit être utilisé à l'intérieur d'un composant enfant de <AuthProvider>.
 */
export function useAuth(): AuthContextType {
  return useContext(AuthContext);
}

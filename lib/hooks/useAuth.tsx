"use client";

// Hook d'authentification global
// Fournit : user (Supabase Auth), profile (table profiles), isLoading, signOut
// À utiliser dans tous les composants qui ont besoin de l'identité de l'utilisateur.

import { createContext, useContext, useEffect, useRef, useState } from "react";
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

  // Ref pour accéder à la valeur courante de user dans les callbacks async
  // (évite le bug de stale closure dans visibilitychange et onAuthStateChange)
  const userRef = useRef<User | null>(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

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
    // Garde contre les mises à jour d'état après démontage.
    // Nécessaire car React Strict Mode monte les composants deux fois —
    // sans ce flag, getSession() (async) peut appeler setIsLoading(false)
    // sur un composant déjà démonté, laissant isLoading = true indéfiniment.
    let isMounted = true;

    // 1. Chargement de la session existante au démarrage (source de vérité initiale)
    //
    // IMPORTANT : le .catch() est obligatoire.
    // En React Strict Mode + PKCE, deux appels getSession() sont lancés en parallèle.
    // Le second peut rejeter (code PKCE déjà consommé par le premier). Sans .catch(),
    // setIsLoading(false) n'est jamais appelé → chargement infini.
    supabase.auth.getSession()
      .then(async ({ data: { session }, error }) => {
        if (!isMounted) return;

        if (error) {
          // Erreur attendue en Strict Mode (code PKCE déjà échangé) — pas critique
          Sentry.captureException(error, { extra: { context: "getSession" } });
        }

        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          const userProfile = await loadProfile(currentUser.id);
          if (!isMounted) return;
          setProfile(userProfile);
        }

        setIsLoading(false);
      })
      .catch((err) => {
        // Garantit que isLoading passe à false même en cas de rejet inattendu
        if (!isMounted) return;
        Sentry.captureException(err, { extra: { context: "getSession" } });
        setIsLoading(false);
      });

    // 2. Écoute des changements d'état ULTÉRIEURS (login / logout / refresh)
    //
    // On ignore INITIAL_SESSION : il est déjà géré par getSession() ci-dessus.
    // L'écouter ici aussi causerait une double exécution et des conflits de state
    // en React Strict Mode.
    //
    // On ne met à jour user que si l'id a changé — évite les re-renders
    // en cascade provoqués par un objet User différent mais même utilisateur
    // (stale closure corrigé via userRef).
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      console.log('[AUTH-EVENT]', event, 'user changed:', session?.user?.id !== userRef.current?.id);
      if (event === "INITIAL_SESSION") return; // géré par getSession() plus haut

      const newUserId = session?.user?.id;
      const currentUserId = userRef.current?.id;

      // Si c'est le même user (ex: SIGNED_IN au retour d'onglet), on ne fait RIEN.
      // Zéro setState — évite les re-renders en cascade inutiles.
      if (newUserId === currentUserId && event !== "SIGNED_OUT") {
        console.log('[AUTH] same user, skipping all setState');
        return;
      }

      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        const userProfile = await loadProfile(currentUser.id);
        if (!isMounted) return;
        setProfile(userProfile);
      } else {
        setProfile(null);
      }
    });

    // Nettoyage au démontage : désabonnement + flag pour stopper les callbacks async
    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Filet de sécurité : si isLoading est toujours true après 5s (TOKEN_REFRESHED
  // bloqué, réseau lent, cas non anticipé), force le déblocage.
  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, 5000);
    return () => clearTimeout(timeout);
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

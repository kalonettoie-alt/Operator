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
    // Garde contre les mises à jour d'état après démontage.
    // Nécessaire car React Strict Mode monte les composants deux fois —
    // sans ce flag, getSession() (async) peut appeler setIsLoading(false)
    // sur un composant déjà démonté, laissant isLoading = true indéfiniment.
    let isMounted = true;

    // ── [DIAGNOSTIC] ──────────────────────────────────────────────────────────
    console.log('[AUTH] 1. useEffect mounted');
    // ─────────────────────────────────────────────────────────────────────────

    // 1. Chargement de la session existante au démarrage (source de vérité initiale)
    //
    // IMPORTANT : le .catch() est obligatoire.
    // En React Strict Mode + PKCE, deux appels getSession() sont lancés en parallèle.
    // Le second peut rejeter (code PKCE déjà consommé par le premier). Sans .catch(),
    // setIsLoading(false) n'est jamais appelé → chargement infini.

    // ── [DIAGNOSTIC] ──────────────────────────────────────────────────────────
    console.log('[AUTH] 2. calling getSession...');
    // ─────────────────────────────────────────────────────────────────────────

    supabase.auth.getSession()
      .then(async ({ data: { session }, error }) => {
        if (!isMounted) return;

        // ── [DIAGNOSTIC] ────────────────────────────────────────────────────
        console.log('[AUTH] 3. getSession result:', session ? 'session found' : 'no session', 'error:', error);
        // ────────────────────────────────────────────────────────────────────

        if (error) {
          // Erreur attendue en Strict Mode (code PKCE déjà échangé) — pas critique
          Sentry.captureException(error, { extra: { context: "getSession" } });
        }

        const currentUser = session?.user ?? null;
        // ── [DIAGNOSTIC] ──────────────────────────────────────────────────
        console.log('[AUTH] setUser called, user id:', user?.id, '→', currentUser?.id, '(context: getSession)');
        // ──────────────────────────────────────────────────────────────────
        setUser(currentUser);

        if (currentUser) {
          const userProfile = await loadProfile(currentUser.id);
          if (!isMounted) return;
          // ── [DIAGNOSTIC] ────────────────────────────────────────────────
          console.log('[AUTH] setProfile called (context: getSession)', userProfile ? 'profile found' : 'null');
          // ──────────────────────────────────────────────────────────────────
          setProfile(userProfile);
        }

        // ── [DIAGNOSTIC] ────────────────────────────────────────────────────
        console.log('[AUTH] setIsLoading:', false, '(context: getSession success)');
        // ────────────────────────────────────────────────────────────────────
        setIsLoading(false);

        // ── [DIAGNOSTIC] ────────────────────────────────────────────────────
        console.log('[AUTH] 4. isLoading set to false');
        // ────────────────────────────────────────────────────────────────────
      })
      .catch((err) => {
        // Garantit que isLoading passe à false même en cas de rejet inattendu
        if (!isMounted) return;
        Sentry.captureException(err, { extra: { context: "getSession" } });
        // ── [DIAGNOSTIC] ────────────────────────────────────────────────────
        console.log('[AUTH] setIsLoading:', false, '(context: getSession catch)');
        // ────────────────────────────────────────────────────────────────────
        setIsLoading(false);

        // ── [DIAGNOSTIC] ────────────────────────────────────────────────────
        console.log('[AUTH] 4. isLoading set to false (via catch)', err);
        // ────────────────────────────────────────────────────────────────────
      });

    // 2. Écoute des changements d'état ULTÉRIEURS (login / logout / refresh)
    //
    // On ignore INITIAL_SESSION : il est déjà géré par getSession() ci-dessus.
    // L'écouter ici aussi causerait une double exécution et des conflits de state
    // en React Strict Mode (sub_A reçoit l'event mais isMounted_A est déjà false,
    // et sub_B ne le reçoit jamais car il est tiré une seule fois).
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // ── [DIAGNOSTIC] ──────────────────────────────────────────────────────
      console.log('[AUTH] 5. onAuthStateChange event:', event, 'isMounted:', isMounted);
      if (event === 'SIGNED_OUT') {
        // La stack trace va révéler qui déclenche le SIGNED_OUT :
        // - Supabase interne (token refresh échoué) → sera dans la lib @supabase/auth-js
        // - Appel explicite → sera dans notre code
        console.trace('[AUTH] SIGNED_OUT triggered — stack trace:');
        console.log('[AUTH] SIGNED_OUT session at time of event:', session);
      }
      // ──────────────────────────────────────────────────────────────────────

      if (!isMounted) return;
      if (event === "INITIAL_SESSION") return; // géré par getSession() plus haut

      const currentUser = session?.user ?? null;
      // ── [DIAGNOSTIC] ────────────────────────────────────────────────────
      console.log('[AUTH] setUser called, user id:', user?.id, '→', currentUser?.id, '(context: onAuthStateChange', event, ')');
      // ──────────────────────────────────────────────────────────────────────
      setUser(currentUser);

      if (currentUser) {
        const userProfile = await loadProfile(currentUser.id);
        if (!isMounted) return;
        // ── [DIAGNOSTIC] ──────────────────────────────────────────────────
        console.log('[AUTH] setProfile called (context: onAuthStateChange', event, ')', userProfile ? 'profile found' : 'null');
        // ──────────────────────────────────────────────────────────────────
        setProfile(userProfile);
      } else {
        // ── [DIAGNOSTIC] ──────────────────────────────────────────────────
        console.log('[AUTH] setProfile called (context: onAuthStateChange', event, ') → null');
        // ──────────────────────────────────────────────────────────────────
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
      // ── [DIAGNOSTIC] ──────────────────────────────────────────────────
      console.log('[AUTH] setIsLoading:', false, '(context: 5s safety timeout fired ⚠️)');
      // ──────────────────────────────────────────────────────────────────
      setIsLoading(false);
    }, 5000);
    return () => clearTimeout(timeout);
  }, []);

  // Quand l'utilisateur revient sur l'onglet, re-vérifie la session.
  // Nécessaire car TOKEN_REFRESHED peut bloquer isLoading si le refresh
  // échoue silencieusement pendant que l'onglet était en arrière-plan.
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        // ── [DIAGNOSTIC] ──────────────────────────────────────────────────
        console.log('[AUTH] visibilitychange → visible, re-checking session...');
        // ──────────────────────────────────────────────────────────────────
        supabase.auth
          .getSession()
          .then(({ data: { session } }) => {
            // ── [DIAGNOSTIC] ──────────────────────────────────────────────
            console.log('[AUTH] setUser called, user id:', user?.id, '→', session?.user?.id, '(context: visibilitychange)');
            console.log('[AUTH] setIsLoading:', false, '(context: visibilitychange)');
            // ──────────────────────────────────────────────────────────────
            setUser(session?.user ?? null);
            setIsLoading(false);
          })
          .catch(() => {
            // ── [DIAGNOSTIC] ──────────────────────────────────────────────
            console.log('[AUTH] setIsLoading:', false, '(context: visibilitychange catch)');
            // ──────────────────────────────────────────────────────────────
            setIsLoading(false);
          });
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
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

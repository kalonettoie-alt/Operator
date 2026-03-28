// Middleware de protection des routes
// Exécuté côté Edge (sans Node.js) avant chaque requête.
//
// Règles :
//   1. Non connecté → /login
//   2. Connecté + / ou /login → /{role} (dashboard du rôle)
//   3. Connecté + /admin/* mais rôle ≠ admin → /{role}
//   4. Connecté + /client/* mais rôle ≠ client → /{role}
//   5. Connecté + /prestataire/* mais rôle ≠ prestataire → /{role}

import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import type { UserRole } from '@/types/enums';

// Dashboard par rôle
const ROLE_DASHBOARDS: Record<UserRole, string> = {
  admin: '/admin',
  client: '/client',
  prestataire: '/prestataire',
};

// Préfixe de route → rôle requis
const PROTECTED_PREFIXES: Record<string, UserRole> = {
  '/admin': 'admin',
  '/client': 'client',
  '/prestataire': 'prestataire',
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Réponse par défaut (pass-through) — peut être remplacée par un redirect
  let supabaseResponse = NextResponse.next({ request });

  // Client Supabase SSR avec gestion des cookies de session
  // On utilise la clé anon (publique) — le middleware ne bypass PAS le RLS
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Appliquer les cookies sur la requête ET la réponse (pour le refresh du JWT)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Récupère l'utilisateur depuis le JWT (vérification serveur, pas localStorage)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ── 1. Non connecté ──────────────────────────────────────────────────────────
  if (!user) {
    // Déjà sur /login → laisser passer
    if (pathname === '/login') return supabaseResponse;

    // Toute autre route → /login
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // ── 2. Connecté → charger le rôle depuis profiles ───────────────────────────
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = profile?.role as UserRole | undefined;

  // Profil introuvable (incohérence DB) → /login
  if (!role) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  const dashboard = ROLE_DASHBOARDS[role];

  // ── 3. Connecté + /login ou / → dashboard du rôle ──────────────────────────
  if (pathname === '/login' || pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = dashboard;
    return NextResponse.redirect(url);
  }

  // ── 4. Vérification du rôle sur les routes protégées ────────────────────────
  for (const [prefix, requiredRole] of Object.entries(PROTECTED_PREFIXES)) {
    if (pathname.startsWith(prefix) && role !== requiredRole) {
      const url = request.nextUrl.clone();
      url.pathname = dashboard;
      return NextResponse.redirect(url);
    }
  }

  // Route autorisée → laisser passer
  return supabaseResponse;
}

// Le middleware s'applique à toutes les routes sauf :
// - Fichiers statiques Next.js (_next/static, _next/image)
// - Favicon
// - Routes API (elles gèrent leur propre auth)
// - Tunnel Sentry (/monitoring)
// - Fichiers publics (images, svg, etc.)
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|api|monitoring|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};

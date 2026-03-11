// Layout de l'espace Admin.
// Composant serveur : encapsule les composants de navigation (Sidebar, Header, BottomNav)
// qui sont eux-mêmes des composants client.
// Le middleware garantit que seuls les utilisateurs avec le rôle "admin" atteignent ce layout.

import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ── [DIAGNOSTIC] Server Component → log visible dans le TERMINAL, pas la console navigateur
  console.log('[ADMIN-LAYOUT] render');
  // ────────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Barre supérieure fixe */}
      <Header />

      {/* Sidebar desktop (fixed, visible à partir de md) */}
      <Sidebar role="admin" />

      {/* Contenu principal : marge gauche pour la sidebar (desktop) + padding top pour le header */}
      <main className="md:ml-64 pt-16 pb-20 md:pb-0 min-h-screen">
        {children}
      </main>

      {/* Navigation mobile (cachée sur desktop) */}
      <BottomNav role="admin" />
    </div>
  );
}

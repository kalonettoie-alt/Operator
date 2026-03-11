// Layout de l'espace Prestataire.
// Composant serveur : encapsule les composants de navigation (Sidebar, Header, BottomNav).
// Le middleware garantit que seuls les utilisateurs avec le rôle "prestataire" atteignent ce layout.

import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";

export default function PrestataireLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ── [DIAGNOSTIC] Server Component → log visible dans le TERMINAL, pas la console navigateur
  console.log('[PRESTA-LAYOUT] render');
  // ────────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Sidebar role="prestataire" />
      <main className="md:ml-64 pt-16 pb-20 md:pb-0 min-h-screen">
        {children}
      </main>
      <BottomNav role="prestataire" />
    </div>
  );
}

// Layout de l'espace Client.
// Composant serveur : encapsule les composants de navigation (Sidebar, Header, BottomNav).
// Le middleware garantit que seuls les utilisateurs avec le rôle "client" atteignent ce layout.

import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Sidebar role="client" />
      <main className="md:ml-64 pt-16 pb-20 md:pb-0 min-h-screen">
        {children}
      </main>
      <BottomNav role="client" />
    </div>
  );
}

"use client";

// Layout de l'espace Prestataire — TEMPORAIREMENT CLIENT COMPONENT pour debug logs
import { useAuth } from "@/lib/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";

export default function PrestataireLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoading, user } = useAuth();
  console.log('[PAGE] prestataire layout render, isLoading:', isLoading, 'user:', !!user);

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

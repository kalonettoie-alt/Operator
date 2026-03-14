"use client";

// Layout de l'espace Admin — TEMPORAIREMENT CLIENT COMPONENT pour debug logs
import { useAuth } from "@/lib/hooks/useAuth";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoading, user } = useAuth();
  console.log('[PAGE] admin layout render, isLoading:', isLoading, 'user:', !!user);

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

import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/hooks/useAuth";
import { QueryProvider } from "@/lib/providers/QueryProvider";

export const metadata: Metadata = {
  title: "Deltom Operator V3",
  description: "Application de gestion de conciergerie locative",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // ── [DIAGNOSTIC] Server Component → log visible dans le TERMINAL, pas la console navigateur
  console.log('[LAYOUT] render');
  // ────────────────────────────────────────────────────────────────────────────

  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange>
          {/* QueryProvider — TanStack Query (cache, invalidation, mutations) */}
          <QueryProvider>
            {/* AuthProvider rend user, profile et signOut accessibles partout */}
            <AuthProvider>
              {children}
            </AuthProvider>
          </QueryProvider>
          {/* Toast global — accessible via toast() depuis n'importe quel composant */}
          <Toaster position="bottom-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}

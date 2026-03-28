import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/hooks/useAuth";
import { QueryProvider } from "@/lib/providers/QueryProvider";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";

export const metadata: Metadata = {
  title: "Deltom Operator V3",
  description: "Application de gestion de conciergerie locative",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/* PWA — manifest + meta pour installation sur Android */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1A3A3A" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
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
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}

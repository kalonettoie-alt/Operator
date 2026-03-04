"use client";

// BottomNav — navigation mobile (visible uniquement sur les petits écrans).
// Affiche les 5 premiers items du rôle (les plus importants).
// La Sidebar prend le relais à partir de md.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./Sidebar";
import type { UserRole } from "@/types/database";

// Nombre maximum d'items affichés dans la barre de navigation mobile
const MAX_MOBILE_ITEMS = 5;

interface BottomNavProps {
  role: UserRole;
}

export function BottomNav({ role }: BottomNavProps) {
  const pathname = usePathname();
  // On garde uniquement les premiers items pour ne pas surcharger la barre mobile
  const items = NAV_ITEMS[role].slice(0, MAX_MOBILE_ITEMS);
  const dashboardHref = `/${role}`;

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-white border-t border-gray-200 z-20">
      <div className="flex items-stretch h-16">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === dashboardHref
              ? pathname === dashboardHref
              : pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors",
                isActive
                  ? "text-blue-700"
                  : "text-gray-500 hover:text-gray-900"
              )}
            >
              <Icon
                className={cn(
                  "size-5",
                  isActive ? "text-blue-700" : "text-gray-400"
                )}
              />
              <span className="leading-none truncate px-1">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

"use client";

// Sidebar — navigation desktop (md et au-delà).
// Reçoit le rôle en prop depuis le layout de chaque espace (admin/client/prestataire).
// Les items de navigation sont définis ici et exportés pour réutilisation dans BottomNav.

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Home,
  Wrench,
  Calendar,
  History,
  Calculator,
  BarChart2,
  Building2,
  ClipboardList,
  CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/enums";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

// ─── Items de navigation par rôle ─────────────────────────────────────────────

export const NAV_ITEMS: Record<UserRole, NavItem[]> = {
  admin: [
    { label: "Dashboard",      href: "/admin",                  icon: LayoutDashboard },
    { label: "Clients",        href: "/admin/clients",           icon: Users           },
    { label: "Prestataires",   href: "/admin/prestataires",      icon: Briefcase       },
    { label: "Logements",      href: "/admin/logements",         icon: Home            },
    { label: "Interventions",  href: "/admin/interventions",     icon: Wrench          },
    { label: "Calendrier",     href: "/admin/calendrier",        icon: Calendar        },
    { label: "Historique",     href: "/admin/historique",        icon: History         },
    { label: "Estimations",    href: "/admin/estimations",       icon: Calculator      },
    { label: "Simulations",   href: "/admin/simulations",        icon: BarChart2       },
  ],
  client: [
    { label: "Dashboard",      href: "/client",                  icon: LayoutDashboard },
    { label: "Mes logements",  href: "/client/logements",        icon: Building2       },
    { label: "Interventions",  href: "/client/interventions",    icon: Wrench          },
    { label: "Calendrier",     href: "/client/calendrier",       icon: Calendar        },
    { label: "Historique",     href: "/client/historique",       icon: History         },
  ],
  prestataire: [
    { label: "Dashboard",      href: "/prestataire",             icon: LayoutDashboard },
    { label: "Mes missions",   href: "/prestataire/missions",    icon: ClipboardList   },
    { label: "Planning",       href: "/prestataire/planning",    icon: CalendarDays    },
    { label: "Historique",     href: "/prestataire/historique",  icon: History         },
  ],
};

// ─── Composant ────────────────────────────────────────────────────────────────

interface SidebarProps {
  role: UserRole;
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const items = NAV_ITEMS[role];
  // Préfixe du dashboard du rôle (ex: "/admin") — utilisé pour l'exact match
  const dashboardHref = `/${role}`;

  return (
    <aside className="hidden md:flex fixed left-0 top-16 bottom-0 w-64 flex-col bg-white border-r border-gray-200 z-10">
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          // Actif si : correspond exactement au dashboard OU commence par le href (sous-pages)
          const isActive =
            item.href === dashboardHref
              ? pathname === dashboardHref
              : pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

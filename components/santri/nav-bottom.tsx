"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard,
  CreditCard,
  History,
  Bell,
  User,
} from "lucide-react";

export function SantriNavBottom() {
  const pathname = usePathname();

  const routes = [
    {
      href: "/santri/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      active: pathname === "/santri/dashboard",
    },
    {
      href: "/santri/pembayaran",
      label: "Pembayaran",
      icon: CreditCard,
      active: pathname === "/santri/pembayaran",
    },
    {
      href: "/santri/riwayat-pembayaran",
      label: "Riwayat",
      icon: History,
      active: pathname === "/santri/riwayat-pembayaran",
    },
    {
      href: "/santri/notifikasi",
      label: "Notifikasi",
      icon: Bell,
      active: pathname === "/santri/notifikasi",
    },
    {
      href: "/santri/profil",
      label: "Profil",
      icon: User,
      active: pathname === "/santri/profil",
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background md:hidden">
      <div className="flex h-16 items-center justify-around">
        {routes.map((route) => (
          <Link
            key={route.href}
            href={route.href}
            className={cn(
              "flex flex-col items-center justify-center gap-1 px-3 py-2 text-sm font-medium transition-colors hover:text-primary",
              route.active ? "text-primary" : "text-muted-foreground"
            )}
          >
            <route.icon className="h-5 w-5" />
            <span className="text-xs">{route.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
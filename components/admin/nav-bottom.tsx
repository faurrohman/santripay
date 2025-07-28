"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  Home,
  Users,
  Receipt,
  History,
  Bell,
  Settings,
} from "lucide-react";

export function AdminNavBottom() {
  const pathname = usePathname();

  const routes = [
    {
      href: "/admin/dashboard",
      label: "Beranda",
      icon: Home,
      active: pathname === "/admin/dashboard",
    },
    {
      href: "/admin/santri",
      label: "Santri",
      icon: Users,
      active: pathname === "/admin/santri",
    },
    {
      href: "/admin/tagihan",
      label: "Tagihan",
      icon: Receipt,
      active: pathname === "/admin/tagihan",
    },
    {
      href: "/admin/transaksi",
      label: "Transaksi",
      icon: History,
      active: pathname === "/admin/transaksi",
    },
    {
      href: "/admin/notifikasi",
      label: "Notifikasi",
      icon: Bell,
      active: pathname === "/admin/notifikasi",
    },
    {
      href: "/admin/pengaturan",
      label: "Pengaturan",
      icon: Settings,
      active: pathname === "/admin/pengaturan",
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
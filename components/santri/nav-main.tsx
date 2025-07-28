"use client"

import {
  BarChart3,
  CreditCard,
  History,
  LayoutDashboard,
  User,
  Bell,
  type LucideIcon,
} from "lucide-react"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface NavItem {
  title: string
  url: string
  icon: LucideIcon
  isActive?: boolean
  badge?: {
    count: number
    type: 'default' | 'warning' | 'error'
  }
}

export function NavMain() {
  const pathname = usePathname()

  // Fetch notifikasi untuk mendapatkan jumlah yang belum dibaca
  const { data: notifikasi = [] } = useQuery({
    queryKey: ["notifikasi"],
    queryFn: async () => {
      const response = await fetch("/api/notifikasi")
      if (!response.ok) {
        throw new Error("Gagal mengambil notifikasi")
      }
      return response.json()
    },
  })

  // Hitung notifikasi berdasarkan jenis
  const getNotificationBadge = () => {
    const unreadNotif = notifikasi.filter((n: any) => !n.isRead)
    const count = unreadNotif.length

    if (count === 0) return undefined;

    // Cek apakah ada notifikasi dengan tipe error (pembayaran ditolak)
    const hasError = unreadNotif.some((n: any) => n.type === 'error')
    if (hasError) {
      return { count, type: 'error' as const }
    }

    // Cek apakah ada notifikasi dengan tipe warning (tagihan baru)
    const hasWarning = unreadNotif.some((n: any) => n.type === 'warning')
    if (hasWarning) {
      return { count, type: 'warning' as const }
    }

    return { count, type: 'default' as const }
  }

  const notificationBadge = getNotificationBadge()

  const items: NavItem[] = [
    {
      title: "Dashboard",
      url: "/santri/dashboard",
      icon: LayoutDashboard,
      isActive: pathname === "/santri/dashboard",
    },
    {
      title: "Pembayaran",
      url: "/santri/pembayaran",
      icon: CreditCard,
      isActive: pathname === "/santri/pembayaran",
    },
    {
      title: "Riwayat Pembayaran",
      url: "/santri/riwayat-pembayaran",
      icon: History,
      isActive: pathname === "/santri/riwayat-pembayaran",
    },
    {
      title: "Notifikasi",
      url: "/santri/notifikasi",
      icon: Bell,
      isActive: pathname === "/santri/notifikasi",
      badge: notificationBadge,
    },
    {
      title: "Profil",
      url: "/santri/profil",
      icon: User,
      isActive: pathname === "/santri/profil",
    },
  ]

  const getBadgeColor = (type: 'default' | 'warning' | 'error') => {
    switch (type) {
      case 'error':
        return 'bg-red-100 text-red-800'
      case 'warning':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-blue-100 text-blue-800'
    }
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Menu</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton asChild data-active={item.isActive}>
              <Link href={item.url} className="relative">
                <item.icon />
                <span>{item.title}</span>
                {item.badge && item.badge.count > 0 && (
                  <Badge 
                    variant="secondary" 
                    className={cn(
                      "absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0",
                      getBadgeColor(item.badge.type)
                    )}
                  >
                    {item.badge.count}
                  </Badge>
                )}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
} 
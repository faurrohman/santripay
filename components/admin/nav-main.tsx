"use client"

import {
  BarChart3,
  BookOpen,
  CreditCard,
  LayoutDashboard,
  School,
  Settings2,
  Book,
  Users,
  Bell,
  ChevronsUpDown,
  type LucideIcon,
  Calendar,
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
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
import React from "react"

interface NavItem {
  title: string
  url: string
  icon: LucideIcon
  isActive?: boolean
}

export function NavMain() {
  const pathname = usePathname()
  // State open/close per grup (kecuali utama)
  const [openDataMaster, setOpenDataMaster] = React.useState(true)
  const [openTransaksi, setOpenTransaksi] = React.useState(true)
  const [openLainnya, setOpenLainnya] = React.useState(true)

  // Kelompok menu
  const utama = [
    {
      title: "Dashboard",
      url: "/admin/dashboard",
      icon: LayoutDashboard,
      isActive: pathname === "/admin/dashboard",
    },
  ]
  const dataMaster = [
    {
      title: "Santri",
      url: "/admin/santri",
      icon: Users,
      isActive: pathname.startsWith("/admin/santri"),
    },
    {
      title: "Kelas",
      url: "/admin/kelas",
      icon: School,
      isActive: pathname.startsWith("/admin/kelas"),
    },
    {
      title: "Tahun Ajaran",
      url: "/admin/tahun-ajaran",
      icon: Calendar,
      isActive: pathname.startsWith("/admin/tahun-ajaran"),
    },
    {
      title: "Jenis Tagihan",
      url: "/admin/jenis-tagihan",
      icon: BookOpen,
      isActive: pathname.startsWith("/admin/jenis-tagihan"),
    },
  ]
  const transaksi = [
    {
      title: "Pembayaran",
      url: "/admin/pembayaran",
      icon: CreditCard,
      isActive: pathname.startsWith("/admin/pembayaran"),
    },
    {
      title: "Transaksi",
      url: "/admin/transaksi",
      icon: BarChart3,
      isActive: pathname.startsWith("/admin/transaksi"),
    },
    {
    title: "laporan",
    url: "/admin/laporan",
    icon: Book,
    isActive: pathname.startsWith("/admin/laporan"),
    },
    {
      title: "Naik Kelas",
      url: "/admin/naik-kelas",
      icon: School,
      isActive: pathname.startsWith("/admin/naik-kelas"),
    },
  ]
  const lainnya = [
    {
      title: "Notifikasi",
      url: "/admin/notifikasi",
      icon: Bell,
      isActive: pathname.startsWith("/admin/notifikasi"),
    },
    {
      title: "Pengaturan",
      url: "/admin/pengaturan",
      icon: Settings2,
      isActive: pathname.startsWith("/admin/pengaturan"),
    },
  ]

  return (
    <>
      {/* Utama selalu terbuka, tidak collapsible */}
      <SidebarGroup>
        <SidebarGroupLabel className="flex-1 select-none">Utama</SidebarGroupLabel>
        <SidebarMenu>
          {utama.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild data-active={item.isActive}>
                <Link href={item.url}>
                  <item.icon />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroup>
      {/* Data Master */}
      <Collapsible open={openDataMaster} onOpenChange={setOpenDataMaster}>
        <SidebarGroup>
          <div className="flex items-center justify-between pr-2">
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="flex-1 cursor-pointer select-none flex items-center justify-between">
                Data Master
                <ChevronsUpDown className={`ml-2 transition-transform ${openDataMaster ? '' : 'rotate-180'}`} size={16} />
              </SidebarGroupLabel>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <SidebarMenu>
              {dataMaster.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild data-active={item.isActive}>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </CollapsibleContent>
        </SidebarGroup>
      </Collapsible>
      {/* Transaksi */}
      <Collapsible open={openTransaksi} onOpenChange={setOpenTransaksi}>
        <SidebarGroup>
          <div className="flex items-center justify-between pr-2">
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="flex-1 cursor-pointer select-none flex items-center justify-between">
                Transaksi
                <ChevronsUpDown className={`ml-2 transition-transform ${openTransaksi ? '' : 'rotate-180'}`} size={16} />
              </SidebarGroupLabel>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <SidebarMenu>
              {transaksi.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild data-active={item.isActive}>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </CollapsibleContent>
        </SidebarGroup>
      </Collapsible>
      {/* Lainnya */}
      <Collapsible open={openLainnya} onOpenChange={setOpenLainnya}>
        <SidebarGroup>
          <div className="flex items-center justify-between pr-2">
            <CollapsibleTrigger asChild>
              <SidebarGroupLabel className="flex-1 cursor-pointer select-none flex items-center justify-between">
                Lainnya
                <ChevronsUpDown className={`ml-2 transition-transform ${openLainnya ? '' : 'rotate-180'}`} size={16} />
              </SidebarGroupLabel>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <SidebarMenu>
              {lainnya.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild data-active={item.isActive}>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </CollapsibleContent>
        </SidebarGroup>
      </Collapsible>
    </>
  )
} 
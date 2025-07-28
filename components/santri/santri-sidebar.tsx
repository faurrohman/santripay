"use client";

import * as React from "react"
import { School } from "lucide-react"
import Image from 'next/image';

import { NavMain } from "@/components/santri/nav-main"
import { NavUser } from "@/components/santri/nav-user"
import { SantriNavBottom } from "@/components/santri/nav-bottom"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"

function SidebarHeaderContent() {
  const { state } = useSidebar()
  
  return (
    <div className="flex items-center justify-center gap-3 px-4 py-4">
      <Image src="/favicon.ico" alt="DUPay Logo" width={40} height={40} className="shrink-0 rounded" />
      {state === "expanded" && (
        <span className="font-bold text-2xl truncate text-blue-700">DUPay</span>
      )}
    </div>
  )
}

export function SantriSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <>
      <Sidebar collapsible="icon" className="hidden md:block" {...props}>
        <SidebarHeader>
          <SidebarHeaderContent />
        </SidebarHeader>
        <SidebarContent>
          <NavMain />
        </SidebarContent>
        <SidebarFooter>
          <NavUser />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SantriNavBottom />
    </>
  )
} 
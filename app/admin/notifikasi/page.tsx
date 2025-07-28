"use client"

import { Bell, ArrowLeft, Menu, CheckCircle2 } from "lucide-react"
import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import { id } from "date-fns/locale"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { AppSidebar } from "@/components/admin/app-sidebar"
import Link from "next/link"
import { Separator } from "@/components/ui/separator"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton";

interface Notifikasi {
  id: string
  title: string
  message: string
  type: string
  isRead: boolean
  createdAt: string
  tagihan?: {
    id: string
    amount: number
    dueDate: string
    jenisTagihan: {
      name: string
    }
  }
}

export default function NotifikasiPage() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const router = useRouter()

  const { data: notifikasi = [], isLoading } = useQuery<Notifikasi[]>({
    queryKey: ["notifikasi-admin"],
    queryFn: async () => {
      const response = await fetch("/api/notifikasi/admin", {
        credentials: "include"
      })
      if (!response.ok) {
        throw new Error("Gagal mengambil notifikasi")
      }
      return response.json()
    },
  })

  const markAsRead = useMutation({
    mutationFn: async ({ id, isRead }: { id: string; isRead: boolean }) => {
      const response = await fetch("/api/notifikasi/admin", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ id, isRead }),
      })
      if (!response.ok) {
        throw new Error("Gagal memperbarui notifikasi")
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifikasi-admin"] })
      toast.success("Notifikasi diperbarui")
    },
    onError: () => {
      toast.error("Gagal memperbarui notifikasi")
    },
  })

  const unreadCount = notifikasi?.filter((n) => !n.isRead).length || 0

  return (
    <div className="flex flex-col flex-1 gap-4 p-4 pt-0 mt-6 max-w-[1400px] mx-auto w-full pb-8">
      <header className="flex h-14 shrink-0 items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0">
              <AppSidebar />
            </SheetContent>
          </Sheet>
          <Separator orientation="vertical" className="h-8 hidden md:block" />
          <div className="flex flex-col">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/admin/dashboard">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Notifikasi</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="flex items-center gap-2">
              <h2 className="text-3xl font-bold tracking-tight">Notifikasi</h2>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  {unreadCount} Baru
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                notifikasi.forEach((n) => {
                  if (!n.isRead) {
                    markAsRead.mutate({ id: n.id, isRead: true })
                  }
                })
              }}
            >
              Tandai semua dibaca
            </Button>
          )}
          <Button onClick={() => router.push("/admin/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali ke Dashboard
          </Button>
        </div>
      </header>
      
      <div className="flex-1 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Daftar Notifikasi</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-16rem)]">
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-start gap-4 rounded-lg border p-4">
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-40 mb-2" />
                        <Skeleton className="h-4 w-64" />
                        <Skeleton className="h-3 w-24 mt-2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : notifikasi.length === 0 ? (
                <div className="flex h-full items-center justify-center py-10">
                  <p className="text-sm text-muted-foreground">Tidak ada notifikasi</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {notifikasi.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        "flex items-start gap-4 rounded-lg border p-4",
                        !item.isRead && "bg-muted"
                      )}
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <p className="text-sm font-medium leading-none">{item.title}</p>
                            <p className="text-sm text-muted-foreground">{item.message}</p>
                          </div>
                          {!item.isRead && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsRead.mutate({ id: item.id, isRead: true })}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        {item.tagihan && (
                          <div className="mt-2 p-2 bg-white rounded-md border">
                            <p className="text-sm font-medium">Detail Tagihan:</p>
                            <p className="text-sm text-muted-foreground">
                              Jenis: {item.tagihan.jenisTagihan.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Jumlah: Rp {Number(item.tagihan.amount).toLocaleString("id-ID")}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Jatuh Tempo: {new Date(item.tagihan.dueDate).toLocaleDateString("id-ID")}
                            </p>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(item.createdAt), {
                            addSuffix: true,
                            locale: id,
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 
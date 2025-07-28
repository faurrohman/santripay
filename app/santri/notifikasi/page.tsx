"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Menu, Bell, AlertCircle, Receipt } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet"
import { SantriSidebar } from "@/components/santri/santri-sidebar"
import { Separator } from "@/components/ui/separator"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatDistanceToNow } from "date-fns"
import { id } from "date-fns/locale"
import { cn } from "@/lib/utils"

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
  }
}

export default function NotifikasiSantriPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(true)

  const { data: notifikasi = [], isLoading } = useQuery<Notifikasi[]>({
    queryKey: ["notifikasi"],
    queryFn: async () => {
      const response = await fetch("/api/notifikasi")
      if (!response.ok) {
        throw new Error("Gagal mengambil notifikasi")
      }
      return response.json()
    },
  })

  const unreadCount = notifikasi.filter(n => !n.isRead).length

  useEffect(() => {
    if (!isLoading) {
      setLoading(false)
    }
  }, [isLoading])

  const markAsRead = useMutation({
    mutationFn: async ({ id, isRead }: { id: string; isRead: boolean }) => {
      const response = await fetch("/api/notifikasi", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, isRead }),
      })
      if (!response.ok) {
        throw new Error("Gagal memperbarui notifikasi")
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifikasi"] })
      toast.success("Notifikasi diperbarui")
    },
    onError: () => {
      toast.error("Gagal memperbarui notifikasi")
    },
  })

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'tagihan':
        return <Receipt className="h-5 w-5 text-yellow-600" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />
      default:
        return <Bell className="h-5 w-5 text-blue-600" />
    }
  }

  const getNotificationStyle = (type: string) => {
    switch (type) {
      case 'tagihan':
        return 'bg-yellow-50 border-yellow-200'
      case 'error':
        return 'bg-red-50 border-red-200'
      default:
        return 'bg-blue-50 border-blue-200'
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Memuat data...</div>
  }

  return (
    <div className="flex flex-col flex-1 gap-4 p-4 pt-0 mt-6">
      <header className="flex h-14 shrink-0 items-center justify-between">
        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0">
              <SantriSidebar />
            </SheetContent>
          </Sheet>
          <Separator orientation="vertical" className="h-8 hidden md:block" />
          <div className="flex items-center gap-2">
            <Bell className="h-6 w-6" />
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Notifikasi</h2>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                {unreadCount} Baru
              </Badge>
            )}
          </div>
        </div>
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
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Notifikasi</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-16rem)]">
            {notifikasi.length === 0 ? (
              <div className="flex h-32 items-center justify-center">
                <p className="text-sm text-muted-foreground">Tidak ada notifikasi</p>
              </div>
            ) : (
              <div className="space-y-4">
                {notifikasi.map((n) => (
                  <div
                    key={n.id}
                    className={cn(
                      "flex items-start gap-4 rounded-lg border p-4",
                      !n.isRead && "bg-muted",
                      getNotificationStyle(n.type)
                    )}
                  >
                    <div className="mt-1">
                      {getNotificationIcon(n.type)}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium leading-none">{n.title}</p>
                        {!n.isRead && (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                            Baru
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{n.message}</p>
                      {n.tagihan && (
                        <div className="mt-2 p-2 bg-white rounded-md border">
                          <p className="text-sm font-medium">Detail Tagihan:</p>
                          <p className="text-sm text-muted-foreground">
                            Jumlah: Rp {Number(n.tagihan.amount).toLocaleString("id-ID")}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Jatuh Tempo: {new Date(n.tagihan.dueDate).toLocaleDateString("id-ID")}
                          </p>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(n.createdAt), {
                          addSuffix: true,
                          locale: id,
                        })}
                      </p>
                    </div>
                    {!n.isRead && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsRead.mutate({ id: n.id, isRead: true })}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
} 
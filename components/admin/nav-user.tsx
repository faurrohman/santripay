"use client"

import { LogOut, Settings, User, Moon, Sun, Bell } from "lucide-react"
import { signOut, useSession } from "next-auth/react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useTheme } from "next-themes"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { formatDistanceToNow } from "date-fns"
import { id } from "date-fns/locale"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

interface Notifikasi {
  id: string
  title: string
  message: string
  type: string
  isRead: boolean
  createdAt: string
}

export function NavUser() {
  const { isMobile } = useSidebar()
  const { data: session } = useSession()
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const queryClient = useQueryClient()

  // Query untuk mendapatkan preferensi notifikasi user
  const { data: userPreferences } = useQuery({
    queryKey: ["user-preferences"],
    queryFn: async () => {
      const response = await fetch("/api/user/preferences")
      if (!response.ok) {
        throw new Error("Gagal mengambil preferensi user")
      }
      return response.json()
    },
  })

  // State untuk notifikasi
  const [notifications, setNotifications] = useState(userPreferences?.receiveAppNotifications ?? true)
  const [emailNotifications, setEmailNotifications] = useState(userPreferences?.receiveEmailNotifications ?? true)

  // Mutation untuk update preferensi notifikasi
  const updateNotificationPreferences = useMutation({
    mutationFn: async ({ 
      receiveAppNotifications, 
      receiveEmailNotifications 
    }: { 
      receiveAppNotifications: boolean
      receiveEmailNotifications: boolean 
    }) => {
      const response = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          receiveAppNotifications,
          receiveEmailNotifications,
        }),
      })
      if (!response.ok) {
        throw new Error("Gagal memperbarui preferensi notifikasi")
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-preferences"] })
      toast.success("Preferensi notifikasi diperbarui")
    },
    onError: () => {
      toast.error("Gagal memperbarui preferensi notifikasi")
    },
  })

  // Query untuk notifikasi
  const { data: notifikasi, isLoading } = useQuery<Notifikasi[]>({
    queryKey: ["notifikasi-admin"],
    queryFn: async () => {
      const response = await fetch("/api/notifikasi/admin")
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

  // Handler untuk update preferensi notifikasi
  const handleNotificationChange = (type: 'app' | 'email', value: boolean) => {
    if (type === 'app') {
      setNotifications(value)
      updateNotificationPreferences.mutate({
        receiveAppNotifications: value,
        receiveEmailNotifications: emailNotifications,
      })
    } else {
      setEmailNotifications(value)
      updateNotificationPreferences.mutate({
        receiveAppNotifications: notifications,
        receiveEmailNotifications: value,
      })
    }
  }

  if (!session?.user) {
    return null;
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg">
              <div className="relative">
                <Avatar className="size-9 border-2 border-border transition-all duration-200 hover:border-primary">
                  <AvatarImage 
                    src={session.user.image || ""} 
                    alt={session.user.name || ""} 
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {session.user.name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white ring-2 ring-background">
                    {unreadCount}
                  </div>
                )}
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{session.user.name || "Admin"}</span>
                  <span className="truncate text-xs">{session.user.email || "admin@example.com"}</span>
              </div>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Akun
            </DropdownMenuLabel>
              <DropdownMenuItem 
                className="gap-2 p-2"
                onClick={() => router.push("/admin/profil")}
              >
              <User className="size-4" />
              <span>Profil</span>
            </DropdownMenuItem>
              <Dialog>
                <DialogTrigger asChild>
                  <DropdownMenuItem 
                    className="gap-2 p-2"
                    onSelect={(e) => {
                      e.preventDefault();
                    }}
                  >
              <Settings className="size-4" />
              <span>Pengaturan</span>
                  </DropdownMenuItem>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-semibold">Pengaturan</DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground">
                      Kelola preferensi akun Anda di sini.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-6 py-4">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Moon className="size-4" />
                        <h4 className="text-sm font-medium">Tampilan</h4>
                      </div>
                      <div className="grid gap-4">
                        <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <Label className="text-base">Mode Gelap</Label>
                            <p className="text-sm text-muted-foreground">
                              Ubah tampilan aplikasi ke mode gelap
                            </p>
                          </div>
                          <Switch
                            id="theme"
                            checked={theme === "dark"}
                            onCheckedChange={(checked) => {
                              setTheme(checked ? "dark" : "light")
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    <Separator />
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Bell className="size-4" />
                        <h4 className="text-sm font-medium">Notifikasi</h4>
                      </div>
                      <div className="grid gap-4">
                        <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <Label className="text-base">Notifikasi Aplikasi</Label>
                            <p className="text-sm text-muted-foreground">
                              Terima notifikasi di dalam aplikasi
                            </p>
                          </div>
                          <Switch
                            id="notifications"
                            checked={notifications}
                            onCheckedChange={(checked) => handleNotificationChange('app', checked)}
                          />
                        </div>
                        <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <Label className="text-base">Notifikasi Email</Label>
                            <p className="text-sm text-muted-foreground">
                              Terima notifikasi melalui email
                            </p>
                          </div>
                          <Switch
                            id="email-notifications"
                            checked={emailNotifications}
                            onCheckedChange={(checked) => handleNotificationChange('email', checked)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-muted-foreground text-xs">
                Notifikasi
              </DropdownMenuLabel>
              <DropdownMenuItem 
                className="gap-2 p-2"
                onClick={() => router.push("/admin/notifikasi")}
              >
                <Bell className="size-4" />
                <span>Lihat Semua Notifikasi</span>
                {unreadCount > 0 && (
                  <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-xs text-white">
                    {unreadCount}
                  </span>
                )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <DropdownMenuItem 
                  className="gap-2 p-2 text-red-600 focus:text-red-600 focus:bg-red-50"
                  onSelect={(e) => {
                    e.preventDefault();
                  }}
                >
              <LogOut className="size-4" />
              <span>Keluar</span>
            </DropdownMenuItem>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Apakah Anda yakin ingin keluar?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Anda akan keluar dari sistem. Anda perlu login kembali untuk mengakses sistem.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => signOut()}
                    className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                  >
                    Keluar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  )
} 
"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Menu, User, Mail, Phone, MapPin, School, Moon, Sun, Bell, Settings, LogOut } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { SantriSidebar } from "@/components/santri/santri-sidebar";
import { Separator } from "@/components/ui/separator";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTheme } from "next-themes";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface SantriProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  kelas?: string;
  nis?: string;
  avatar?: string;
}

export default function ProfilPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<SantriProfile | null>(null);
  const [formData, setFormData] = useState<Partial<SantriProfile>>({});
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();

  // Query untuk mendapatkan preferensi notifikasi user
  const { data: userPreferences } = useQuery({
    queryKey: ["user-preferences"],
    queryFn: async () => {
      const response = await fetch("/api/user/preferences");
      if (!response.ok) {
        throw new Error("Gagal mengambil preferensi user");
      }
      return response.json();
    },
  });

  // State untuk notifikasi
  const [notifications, setNotifications] = useState(userPreferences?.receiveAppNotifications ?? true);
  const [emailNotifications, setEmailNotifications] = useState(userPreferences?.receiveEmailNotifications ?? true);

  // Mutation untuk update preferensi notifikasi
  const updateNotificationPreferences = useMutation({
    mutationFn: async ({ 
      receiveAppNotifications, 
      receiveEmailNotifications 
    }: { 
      receiveAppNotifications: boolean;
      receiveEmailNotifications: boolean;
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
      });
      if (!response.ok) {
        throw new Error("Gagal memperbarui preferensi notifikasi");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-preferences"] });
      toast.success("Preferensi notifikasi diperbarui");
    },
    onError: () => {
      toast.error("Gagal memperbarui preferensi notifikasi");
    },
  });

  // Handler untuk update preferensi notifikasi
  const handleNotificationChange = (type: 'app' | 'email', value: boolean) => {
    if (type === 'app') {
      setNotifications(value);
      updateNotificationPreferences.mutate({
        receiveAppNotifications: value,
        receiveEmailNotifications: emailNotifications,
      });
    } else {
      setEmailNotifications(value);
      updateNotificationPreferences.mutate({
        receiveAppNotifications: notifications,
        receiveEmailNotifications: value,
      });
    }
  };

  useEffect(() => {
    if (session?.user) {
      fetchProfile();
    }
  }, [session]);

  const fetchProfile = async () => {
    try {
      const response = await fetch("/api/santri/profile");
      if (!response.ok) throw new Error("Gagal mengambil data profil");
      const data = await response.json();
      setProfile(data.data);
      setFormData(data.data);
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Gagal mengambil data profil");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/santri/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Gagal memperbarui profil");
      }

      toast.success("Profil berhasil diperbarui");
      fetchProfile(); // Refresh data
    } catch (error: any) {
      toast.error(error.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  if (!profile) {
    return <div className="flex items-center justify-center min-h-screen">Memuat data...</div>;
  }

  return (
    <div className="flex flex-col flex-1 gap-4 p-4 pt-0 mt-6 max-w-[1400px] mx-auto w-full">
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
              <SantriSidebar />
            </SheetContent>
          </Sheet>
          <Separator orientation="vertical" className="h-8 hidden md:block" />
          <div className="flex flex-col">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Profil</h2>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
         
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="hidden md:flex">
                <Settings className="mr-2 h-4 w-4" />
                Pengaturan
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Pengaturan</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
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
                          setTheme(checked ? "dark" : "light");
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
                <Separator />
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <LogOut className="size-4" />
                    <h4 className="text-sm font-medium">Akun</h4>
                  </div>
                  <Button 
                    variant="destructive" 
                    className="w-full"
                    onClick={() => signOut({ callbackUrl: "/auth/login" })}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Keluar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="md:hidden">
                <Settings className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Pengaturan</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
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
                        id="theme-mobile"
                        checked={theme === "dark"}
                        onCheckedChange={(checked) => {
                          setTheme(checked ? "dark" : "light");
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
                        id="notifications-mobile"
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
                        id="email-notifications-mobile"
                        checked={emailNotifications}
                        onCheckedChange={(checked) => handleNotificationChange('email', checked)}
                      />
                    </div>
                  </div>
                </div>
                <Separator />
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <LogOut className="size-4" />
                    <h4 className="text-sm font-medium">Akun</h4>
                  </div>
                  <Button 
                    variant="destructive" 
                    className="w-full"
                    onClick={() => signOut({ callbackUrl: "/auth/login" })}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Keluar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>
      <div className="flex-1 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Informasi Profil */}
          <Card className="w-full lg:col-span-1">
            <CardHeader>
              <CardTitle>Informasi Profil</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center gap-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={profile.avatar} alt={profile.name} />
                  <AvatarFallback>{getInitials(profile.name)}</AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <h3 className="text-xl font-semibold">{profile.name}</h3>
                  <p className="text-sm text-muted-foreground">{profile.email}</p>
                </div>
              </div>
              <Separator />
              <div className="grid gap-4">
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <School className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Kelas</p>
                    <p className="text-sm text-muted-foreground">{profile.kelas || "-"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <User className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">NIS</p>
                    <p className="text-sm text-muted-foreground">{profile.nis || "-"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <Phone className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Telepon</p>
                    <p className="text-sm text-muted-foreground">{profile.phone || "-"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <MapPin className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Alamat</p>
                    <p className="text-sm text-muted-foreground">{profile.address || "-"}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Form Edit Profil */}
          <Card className="w-full lg:col-span-2">
            <CardHeader>
              <CardTitle>Edit Profil</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nama Lengkap</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="Masukkan nama lengkap"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      placeholder="Masukkan email"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Nomor Telepon</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      placeholder="Masukkan nomor telepon"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Alamat</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) =>
                        setFormData({ ...formData, address: e.target.value })
                      }
                      placeholder="Masukkan alamat"
                    />
                  </div>
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {loading ? "Menyimpan..." : "Simpan Perubahan"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 
"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { AppSidebar } from "@/components/admin/app-sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTheme } from "next-themes";
import { Skeleton } from "@/components/ui/skeleton";

interface PengaturanResponse {
  data: {
    receiveAppNotifications: boolean;
    receiveEmailNotifications: boolean;
  };
}

const pengaturanSchema = z.object({
  receiveAppNotifications: z.boolean(),
  receiveEmailNotifications: z.boolean(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Password saat ini harus diisi"),
  newPassword: z.string().min(8, "Password baru minimal 8 karakter"),
  confirmPassword: z.string().min(1, "Konfirmasi password harus diisi"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Password baru dan konfirmasi password tidak cocok",
  path: ["confirmPassword"],
});

type PengaturanFormValues = z.infer<typeof pengaturanSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

export default function PengaturanPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const { theme, setTheme } = useTheme();

  const form = useForm<PengaturanFormValues>({
    resolver: zodResolver(pengaturanSchema),
    defaultValues: {
      receiveAppNotifications: true,
      receiveEmailNotifications: true,
    },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const { data: pengaturan, isLoading: isLoadingPengaturan } = useQuery<PengaturanResponse>({
    queryKey: ["pengaturan"],
    queryFn: async () => {
      const response = await fetch("/api/admin/pengaturan");
      if (!response.ok) {
        throw new Error("Gagal mengambil data pengaturan");
      }
      return response.json();
    },
  });

  // Update form values when data is loaded
  React.useEffect(() => {
    if (pengaturan?.data) {
      form.reset({
        receiveAppNotifications: pengaturan.data.receiveAppNotifications,
        receiveEmailNotifications: pengaturan.data.receiveEmailNotifications,
      });
      setLoading(false);
    }
  }, [pengaturan, form]);

  const updatePengaturan = useMutation({
    mutationFn: async (data: PengaturanFormValues) => {
      const response = await fetch("/api/admin/pengaturan", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error("Gagal memperbarui pengaturan");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pengaturan"] });
      toast.success("Pengaturan berhasil diperbarui");
    },
    onError: () => {
      toast.error("Gagal memperbarui pengaturan");
    },
  });

  const onSubmit = (data: PengaturanFormValues) => {
    updatePengaturan.mutate(data);
  };

  const updatePassword = useMutation({
    mutationFn: async (data: PasswordFormValues) => {
      const response = await fetch("/api/admin/pengaturan/password", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error("Gagal memperbarui password");
      }
      return response.json();
    },
    onSuccess: () => {
      passwordForm.reset();
      toast.success("Password berhasil diperbarui");
    },
    onError: () => {
      toast.error("Gagal memperbarui password");
    },
  });

  const onPasswordSubmit = (data: PasswordFormValues) => {
    updatePassword.mutate(data);
  };

  if (loading || isLoadingPengaturan) {
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
                    <BreadcrumbPage>Pengaturan</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
              <h2 className="text-3xl font-bold tracking-tight">Pengaturan</h2>
            </div>
          </div>
        </header>
        <div className="flex-1 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Pengaturan Notifikasi</CardTitle>
                <CardDescription>
                  Atur preferensi notifikasi untuk akun admin Anda
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6 py-6">
                  <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <Skeleton className="h-4 w-32 mb-2" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-6 w-12 rounded-full" />
                  </div>
                  <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <Skeleton className="h-4 w-32 mb-2" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-6 w-12 rounded-full" />
                  </div>
                  <Skeleton className="h-10 w-full rounded-md mt-4" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Ganti Password</CardTitle>
                <CardDescription>
                  Perbarui password akun admin Anda
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 py-6">
                  <Skeleton className="h-10 w-full rounded-md" />
                  <Skeleton className="h-10 w-full rounded-md" />
                  <Skeleton className="h-10 w-full rounded-md" />
                  <Skeleton className="h-10 w-full rounded-md mt-4" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

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
                  <BreadcrumbPage>Pengaturan</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <h2 className="text-3xl font-bold tracking-tight">Pengaturan</h2>
          </div>
        </div>
      </header>
    
      <div className="flex-1 space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Pengaturan Notifikasi</CardTitle>
              <CardDescription>
                Atur preferensi notifikasi untuk akun admin Anda
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6 py-6">
                <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <div className="text-base font-medium">
                      Mode Gelap
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Aktifkan mode gelap untuk tampilan yang lebih nyaman di malam hari
                    </div>
                  </div>
                  <Switch
                    checked={theme === "dark"}
                    onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                  />
                </div>
              </div>
           
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="receiveAppNotifications"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Notifikasi Aplikasi
                          </FormLabel>
                          <FormDescription>
                            Terima notifikasi melalui aplikasi
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="receiveEmailNotifications"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Notifikasi Email
                          </FormLabel>
                          <FormDescription>
                            Terima notifikasi melalui email
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full">
                    Simpan Pengaturan
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ganti Password</CardTitle>
              <CardDescription>
                Perbarui password akun admin Anda
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password Saat Ini</FormLabel>
                        <FormControl>
                          <input
                            type="password"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password Baru</FormLabel>
                        <FormControl>
                          <input
                            type="password"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Konfirmasi Password Baru</FormLabel>
                        <FormControl>
                          <input
                            type="password"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full">
                    Ganti Password
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
          
        </div>

   


          <Card>
            <CardHeader>
              <CardTitle>Informasi Sistem</CardTitle>
              <CardDescription>
                Informasi tentang sistem DU Pay
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Versi</p>
                    <p className="text-sm text-muted-foreground">1.0.0</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Status</p>
                    <p className="text-sm text-muted-foreground">Aktif</p>
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-medium">Deskripsi</p>
                  <p className="text-sm text-muted-foreground">
                    DUPay adalah sistem manajemen pembayaran pada pesantren Darul 'Ulum Majenang yang membantu mengelola tagihan dan pembayaran santri secara efisien.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
  );
} 
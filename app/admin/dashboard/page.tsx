"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { ModeToggle } from "@/components/ui/mode-toggle";

import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  CreditCard, 
  Receipt, 
  Wallet,
  Menu,
  Bell,
  Users,
  Building2,
  Loader2,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { AppSidebar } from "@/components/admin/app-sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useQuery } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";

interface Statistik {
  totalSantri: number;
  totalTagihan: number;
  totalDibayar: number;
  totalMenunggu: number;
  totalTerlambat: number;
}

interface Transaksi {
  id: string;
  amount: number;
  status: string;
  paymentDate: string;
  santri: {
    name: string;
  };
  tagihan: {
    jenisTagihan: {
      name: string;
    };
  };
}

interface Notifikasi {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export default function DashboardAdminPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const { data: statistikResponse, isLoading: isLoadingStatistik } = useQuery({
    queryKey: ["statistik"],
    queryFn: async () => {
      const response = await fetch("/api/admin/statistik");
      if (!response.ok) {
        throw new Error("Gagal mengambil data statistik");
      }
      return response.json();
    },
  });

  const { data: transaksiResponse, isLoading: isLoadingTransaksi } = useQuery({
    queryKey: ["transaksi"],
    queryFn: async () => {
      const response = await fetch("/api/admin/transaksi");
      if (!response.ok) {
        throw new Error("Gagal mengambil data transaksi");
      }
      return response.json();
    },
  });

  const { data: notifikasi = [], isLoading: isLoadingNotifikasi } = useQuery<Notifikasi[]>({
    queryKey: ["notifikasi-admin"],
    queryFn: async () => {
      const response = await fetch("/api/notifikasi/admin");
      if (!response.ok) {
        throw new Error("Gagal mengambil notifikasi");
      }
      return response.json();
    },
  });

  useEffect(() => {
    if (!isLoadingStatistik && !isLoadingTransaksi && !isLoadingNotifikasi) {
      setLoading(false);
    }
  }, [isLoadingStatistik, isLoadingTransaksi, isLoadingNotifikasi]);

  const statistik = statistikResponse?.data || {
    totalSantri: 0,
    totalTagihan: 0,
    totalDibayar: 0,
    totalMenunggu: 0,
    totalTerlambat: 0,
  };
  const transaksi = transaksiResponse?.data || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "Menunggu";
      case "approved":
        return "Disetujui";
      case "rejected":
        return "Ditolak";
      case "overdue":
        return "Terlambat";
      default:
        return status;
    }
  };

  if (loading) {
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
                    <BreadcrumbPage>Dashboard</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
              <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            </div>
          </div>
        </header>
        <div className="flex-1 space-y-6">
          {/* Statistik Cards Skeleton */}
          <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-5">
            {[...Array(5)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-4 rounded-full" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
          {/* Tabel Transaksi Skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40 mb-2" />
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr>
                      <th className="px-2 py-2 text-left">Santri</th>
                      <th className="px-2 py-2 text-left">Jenis Tagihan</th>
                      <th className="px-2 py-2 text-left">Jumlah</th>
                      <th className="px-2 py-2 text-left">Tanggal</th>
                      <th className="px-2 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...Array(5)].map((_, i) => (
                      <tr key={i} className="border-b">
                        <td className="px-2 py-2"><Skeleton className="h-4 w-32" /></td>
                        <td className="px-2 py-2"><Skeleton className="h-4 w-32" /></td>
                        <td className="px-2 py-2"><Skeleton className="h-4 w-20" /></td>
                        <td className="px-2 py-2"><Skeleton className="h-4 w-24" /></td>
                        <td className="px-2 py-2"><Skeleton className="h-4 w-20" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
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
                  <BreadcrumbPage>Dashboard</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          </div>
        </div>

        <div className="flex items-center gap-4">
        <ModeToggle />

          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className="relative border-2 border-border transition-all duration-200 hover:border-primary"
              >
                <div className="relative">
                  <Bell className="mr-2 h-4 w-4" />
                  {notifikasi.filter((n) => !n.isRead).length > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-2 -right-2 h-4 min-w-4 px-1 font-medium"
                    >
                      {notifikasi.filter((n) => !n.isRead).length}
                    </Badge>
                  )}
                </div>
                Notifikasi
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <div className="flex items-center justify-between p-4 border-b">
                <h4 className="font-medium">Notifikasi</h4>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => router.push("/admin/notifikasi")}
                >
                  Lihat Semua
                </Button>
              </div>
              <ScrollArea className="h-[300px]">
                {notifikasi.length === 0 ? (
                  <div className="flex h-full items-center justify-center py-10">
                    <p className="text-sm text-muted-foreground">Tidak ada notifikasi</p>
                  </div>
                ) : (
                  <div className="grid gap-1 p-2">
                    {notifikasi.slice(0, 5).map((item) => (
                      <div
                        key={item.id}
                        className={cn(
                          "flex cursor-pointer flex-col items-start gap-1 rounded-lg p-3 transition-colors hover:bg-accent hover:text-accent-foreground",
                          !item.isRead && "bg-muted"
                        )}
                        onClick={() => router.push("/admin/notifikasi")}
                      >
                        <div className="flex w-full items-start justify-between gap-2">
                          <div className="space-y-1">
                            <p className="text-sm font-medium leading-none">
                              {item.title}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {item.message}
                            </p>
                          </div>
                          {!item.isRead && (
                            <span className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(item.createdAt), {
                            addSuffix: true,
                            locale: id,
                          })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </PopoverContent>
          </Popover>
        </div>
      </header>

      <div className="flex-1 space-y-6">
        {/* Statistik Cards */}
        <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Santri</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold truncate max-w-full overflow-hidden whitespace-nowrap">
                {statistik.totalSantri}
              </div>
              <p className="text-xs text-muted-foreground">
                Jumlah santri aktif
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tagihan</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold truncate max-w-full overflow-hidden whitespace-nowrap">
                {new Intl.NumberFormat("id-ID", {
                  style: "currency",
                  currency: "IDR",
                }).format(statistik.totalTagihan)}
              </div>
              <p className="text-xs text-muted-foreground">
                Total tagihan keseluruhan
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Dibayar</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500 truncate max-w-full overflow-hidden whitespace-nowrap">
                {new Intl.NumberFormat("id-ID", {
                  style: "currency",
                  currency: "IDR",
                }).format(statistik.totalDibayar)}
              </div>
              <p className="text-xs text-muted-foreground">
                Tagihan yang sudah dibayar
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Menunggu Pembayaran</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500 truncate max-w-full overflow-hidden whitespace-nowrap">
                {new Intl.NumberFormat("id-ID", {
                  style: "currency",
                  currency: "IDR",
                }).format(statistik.totalMenunggu)}
              </div>
              <p className="text-xs text-muted-foreground">
                Tagihan yang menunggu pembayaran
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tagihan Terlambat</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500 truncate max-w-full overflow-hidden whitespace-nowrap">
                {new Intl.NumberFormat("id-ID", {
                  style: "currency",
                  currency: "IDR",
                }).format(statistik.totalTerlambat)}
              </div>
              <p className="text-xs text-muted-foreground">
                Tagihan yang sudah jatuh tempo
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Transaksi Terbaru */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Transaksi Terbaru</CardTitle>
              <Button variant="outline" size="sm" onClick={() => router.push("/admin/transaksi")}>
                Lihat Semua
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Santri</TableHead>
                    <TableHead>Jenis Tagihan</TableHead>
                    <TableHead>Jumlah</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transaksi.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">
                        Belum ada transaksi
                      </TableCell>
                    </TableRow>
                  ) : (
                    transaksi.slice(0, 5).map((t: Transaksi) => (
                      <TableRow key={t.id}>
                        <TableCell>
                          {new Date(t.paymentDate).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </TableCell>
                        <TableCell>{t.santri.name}</TableCell>
                        <TableCell>{t.tagihan.jenisTagihan.name}</TableCell>
                        <TableCell>
                          {new Intl.NumberFormat("id-ID", {
                            style: "currency",
                            currency: "IDR",
                          }).format(Number(t.amount))}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(t.status)}>
                            {getStatusText(t.status)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
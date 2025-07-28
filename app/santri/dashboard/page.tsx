"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ModeToggle } from "@/components/ui/mode-toggle";
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
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SantriSidebar } from "@/components/santri/santri-sidebar";
import { Separator } from "@/components/ui/separator";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Tagihan {
  id: string;
  amount: number;
  status: string;
  dueDate: string;
  jenisTagihan: {
    id: string;
    name: string;
  };
}

interface Transaksi {
  id: string;
  amount: number;
  status: string;
  paymentDate: string;
  tagihan: {
    id: string;
    jenisTagihan: {
      name: string;
    };
  };
}

interface Statistik {
  totalTagihan: number;
  totalDibayar: number;
  totalMenunggu: number;
}

interface Notifikasi {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  tagihan?: {
    id: string;
    amount: number;
    dueDate: string;
  };
}

export default function DashboardSantriPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);

  const { data: tagihanResponse, isLoading: isLoadingTagihan } = useQuery({
    queryKey: ["tagihan"],
    queryFn: async () => {
      const response = await fetch("/api/tagihan/santri");
      if (!response.ok) {
        throw new Error("Gagal mengambil data tagihan");
      }
      return response.json();
    },
  });

  const { data: transaksiResponse, isLoading: isLoadingTransaksi } = useQuery({
    queryKey: ["transaksi"],
    queryFn: async () => {
      const response = await fetch("/api/transaksi/santri");
      if (!response.ok) {
        throw new Error("Gagal mengambil data transaksi");
      }
      return response.json();
    },
  });

  const { data: notifikasi = [], isLoading: isLoadingNotifikasi } = useQuery<Notifikasi[]>({
    queryKey: ["notifikasi"],
    queryFn: async () => {
      const response = await fetch("/api/notifikasi");
      if (!response.ok) {
        throw new Error("Gagal mengambil notifikasi");
      }
      return response.json();
    },
  });

  useEffect(() => {
    if (!isLoadingTagihan && !isLoadingTransaksi && !isLoadingNotifikasi) {
      setLoading(false);
    }
  }, [isLoadingTagihan, isLoadingTransaksi, isLoadingNotifikasi]);

  const markAsRead = useMutation({
    mutationFn: async ({ id, isRead }: { id: string; isRead: boolean }) => {
      const response = await fetch("/api/notifikasi", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, isRead }),
      });
      if (!response.ok) {
        throw new Error("Gagal memperbarui notifikasi");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifikasi"] });
      toast.success("Notifikasi diperbarui");
    },
    onError: () => {
      toast.error("Gagal memperbarui notifikasi");
    },
  });

  const calculateStatistik = (tagihan: Tagihan[], transaksi: Transaksi[]): Statistik => {
    const totalTagihan = tagihan?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
    const totalDibayar = transaksi
      ?.filter(t => t.status === "approved")
      .reduce((sum, t) => sum + Number(t.amount), 0) || 0;
    const totalMenunggu = tagihan
      ?.filter(t => t.status === "pending")
      .reduce((sum, t) => sum + Number(t.amount), 0) || 0;
    
    return {
      totalTagihan,
      totalDibayar,
      totalMenunggu,
    };
  };

  const tagihan = tagihanResponse?.data || [];
  const transaksi = transaksiResponse?.data || [];
  const statistik = calculateStatistik(tagihan, transaksi);

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

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'tagihan':
        return <Receipt className="h-5 w-5 text-yellow-600" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Bell className="h-5 w-5 text-blue-600" />;
    }
  };

  const getNotificationStyle = (type: string) => {
    switch (type) {
      case 'tagihan':
        return 'bg-yellow-50 border-yellow-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  // Fungsi untuk mengecek apakah tagihan sudah memiliki transaksi
  const hasTransaction = (tagihanId: string) => {
    return transaksi.some(
      (t: Transaksi) => t.tagihan.id === tagihanId && (t.status === "pending" || t.status === "approved")
    );
  };

  const getStatusBadge = (status: string, hasExistingTransaction: boolean, dueDate: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDateObj = new Date(dueDate);
    dueDateObj.setHours(0, 0, 0, 0);
    const isOverdue = dueDateObj < today && status === "pending";
    
    if (status === "paid") {
      return (
        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
          Terbayar
        </Badge>
      );
    }
    if (hasExistingTransaction) {
      return (
        <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
          Menunggu Konfirmasi
        </Badge>
      );
    }
    if (isOverdue) {
      return (
        <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
          Terlambat
        </Badge>
      );
    }
    return null;
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Memuat data...</div>;
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
              <SantriSidebar />
            </SheetContent>
          </Sheet>
          <Separator orientation="vertical" className="h-8 hidden md:block" />
          <div className="flex flex-col">
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <ModeToggle />
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="hidden md:flex">
                <Bell className="mr-2 h-4 w-4" />
                Notifikasi
                {notifikasi.filter((n) => !n.isRead).length > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {notifikasi.filter((n) => !n.isRead).length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Notifikasi</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    notifikasi.forEach((n) => {
                      if (!n.isRead) {
                        markAsRead.mutate({ id: n.id, isRead: true });
                      }
                    });
                  }}
                >
                  Tandai semua dibaca
                </Button>
              </div>
              <ScrollArea className="h-72">
                {notifikasi.length === 0 ? (
                  <div className="flex h-72 items-center justify-center">
                    <p className="text-sm text-muted-foreground">Tidak ada notifikasi</p>
                  </div>
                ) : (
                  <div className="space-y-4 p-4">
                    {notifikasi.map((item) => (
                      <div
                        key={item.id}
                        className={cn(
                          "flex cursor-pointer flex-col items-start gap-1 rounded-lg p-3 transition-colors hover:bg-accent hover:text-accent-foreground",
                          !item.isRead && "bg-muted"
                        )}
                        onClick={() => {
                          if (!item.isRead) {
                            markAsRead.mutate({ id: item.id, isRead: true });
                          }
                        }}
                      >
                        <div className="flex w-full items-start justify-between gap-2">
                          <div className="space-y-1">
                            <p className="text-sm font-medium leading-none">
                              {item.title}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {item.message}
                            </p>
                          <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(item.createdAt), {
                              addSuffix: true,
                              locale: id,
                            })}
                          </p>
                        </div>
                          {!item.isRead && (
                            <span className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
                          )}
                        </div>
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
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tagihan</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
              Rp {statistik.totalTagihan.toLocaleString("id-ID")}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Dibayar</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
            <div className="text-2xl font-bold">
              Rp {statistik.totalDibayar.toLocaleString("id-ID")}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Menunggu Pembayaran</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
            <div className="text-2xl font-bold">
              Rp {statistik.totalMenunggu.toLocaleString("id-ID")}
              </div>
            </CardContent>
          </Card>
         
        </div>

        <div className="grid gap-6 md:grid-cols-2">
        <Card>
            <CardHeader>
            <CardTitle>Tagihan Terbaru</CardTitle>
            </CardHeader>
            <CardContent>
            <div className="space-y-4">
              {tagihan.length === 0 ? (
                <div className="flex h-32 items-center justify-center">
                  <p className="text-sm text-muted-foreground">Tidak ada tagihan</p>
                </div>
              ) : (
                tagihan
                  .sort((a: Tagihan, b: Tagihan) => {
                    // Prioritaskan tagihan yang belum dibayar
                    if (a.status === "pending" && b.status !== "pending") return -1;
                    if (a.status !== "pending" && b.status === "pending") return 1;
                    
                    // Jika status sama, urutkan berdasarkan tanggal jatuh tempo
                    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                  })
                  .slice(0, 5)
                  .map((t: Tagihan) => {
                    const hasExistingTransaction = hasTransaction(t.id);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const dueDate = new Date(t.dueDate);
                    dueDate.setHours(0, 0, 0, 0);
                    const isOverdue = dueDate < today && t.status === "pending";
                    
                    return (
                  <div
                    key={t.id}
                        className={cn(
                          "flex items-center justify-between p-4 border rounded-lg hover:bg-accent/20 transition-colors",
                          isOverdue && "border-red-200 bg-red-50/10"
                        )}
                  >
                    <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Receipt className={cn(
                              "h-4 w-4",
                              isOverdue ? "text-red-500" : "text-muted-foreground"
                            )} />
                      <p className="text-sm font-medium leading-none">
                        {t.jenisTagihan.name}
                      </p>
                          </div>
                          <div className="flex flex-col gap-1">
                            <p className={cn(
                              "text-sm",
                              isOverdue ? "text-red-600" : "text-muted-foreground"
                            )}>
                              Jatuh tempo: {new Date(t.dueDate).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "long",
                                year: "numeric"
                              })}
                            </p>
                            {isOverdue && (
                              <p className="text-xs text-red-600">
                                Tagihan ini telah melewati batas waktu pembayaran
                              </p>
                            )}
                          </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          Rp {Number(t.amount).toLocaleString("id-ID")}
                        </p>
                            {getStatusBadge(t.status, hasExistingTransaction, new Date(t.dueDate))}
                      </div>
                          {t.status === "pending" && !hasExistingTransaction && (
                          <Button
                            size="sm"
                          onClick={() => router.push(`/santri/pembayaran?tagihan=${t.id}`)}
                              variant={isOverdue ? "destructive" : "default"}
                          >
                            Bayar
                          </Button>
                      )}
                    </div>
                  </div>
                    );
                  })
              )}
            </div>
            </CardContent>
          </Card>

        <Card>
            <CardHeader>
            <CardTitle>Transaksi Terbaru</CardTitle>
            </CardHeader>
            <CardContent>
            <div className="space-y-4">
              {transaksi.length === 0 ? (
                <div className="flex h-32 items-center justify-center">
                  <p className="text-sm text-muted-foreground">Tidak ada transaksi</p>
                </div>
              ) : (
                transaksi
                  .sort((a: Transaksi, b: Transaksi) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
                  .slice(0, 5)
                  .map((t: Transaksi) => (
                  <div
                    key={t.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-medium leading-none">
                        {t.tagihan.jenisTagihan.name}
                      </p>
                        </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(t.paymentDate).toLocaleDateString("id-ID")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        Rp {Number(t.amount).toLocaleString("id-ID")}
                      </p>
                      <Badge
                        variant="outline"
                        className={cn("mt-1", getStatusColor(t.status))}
                      >
                          {getStatusText(t.status)}
                        </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
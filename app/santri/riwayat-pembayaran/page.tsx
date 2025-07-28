"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SantriSidebar } from "@/components/santri/santri-sidebar";
import { Separator } from "@/components/ui/separator";

import { useQuery } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ExportButtons } from "@/components/ui/export-buttons";

interface Transaksi {
  id: string;
  amount: number;
  status: string;
  paymentDate: string;
  note?: string;
  rejectionReason?: string;
  tagihan: {
    jenisTagihan: {
      name: string;
    };
  };
}

export default function RiwayatPembayaranSantriPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const { data: transaksiResponse, isLoading } = useQuery({
    queryKey: ["transaksi"],
    queryFn: async () => {
      const response = await fetch("/api/transaksi/santri");
      if (!response.ok) {
        throw new Error("Gagal mengambil data transaksi");
      }
      return response.json();
    },
  });

  useEffect(() => {
    if (!isLoading) {
      setLoading(false);
    }
  }, [isLoading]);

  const transaksi = transaksiResponse?.data || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
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
      default:
        return status;
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Memuat data...</div>;
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
          <div className="flex flex-col">
            
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Riwayat Pembayaran</h2>
          </div>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Transaksi</CardTitle>
          <ExportButtons
            data={transaksi.map((t: any) => ({
              "Jenis Tagihan": t.tagihan.jenisTagihan.name,
              "Tanggal": new Date(t.paymentDate).toLocaleDateString("id-ID"),
              "Jumlah": t.amount,
              "Status": t.status === "pending" ? "Menunggu" : t.status === "approved" ? "Disetujui" : t.status === "rejected" ? "Ditolak" : t.status,
              "Alasan Ditolak": t.rejectionReason || "-",
              "Catatan": t.note || "-",
            }))}
            columns={[
              { header: "Jenis Tagihan", accessor: "Jenis Tagihan" },
              { header: "Tanggal", accessor: "Tanggal" },
              { header: "Jumlah", accessor: "Jumlah" },
              { header: "Status", accessor: "Status" },
              { header: "Alasan Ditolak", accessor: "Alasan Ditolak" },
              { header: "Catatan", accessor: "Catatan" },
            ]}
            filename="riwayat-pembayaran"
          />
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-16rem)]">
            {transaksi.length === 0 ? (
              <div className="flex h-32 items-center justify-center">
                <p className="text-sm text-muted-foreground">Tidak ada transaksi</p>
              </div>
            ) : (
              <div className="space-y-4">
                {transaksi.map((t: Transaksi) => (
                  <div
                    key={t.id}
                    className="flex flex-col rounded-lg border p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {t.tagihan.jenisTagihan.name}
                        </p>
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
                    {t.status === "rejected" && (
                      <>
                        {t.rejectionReason && (
                          <div className="mt-2 p-2 bg-red-50 rounded-md">
                            <p className="text-sm text-red-600">
                              <span className="font-medium">Alasan ditolak:</span> {t.rejectionReason}
                            </p>
                          </div>
                        )}
                        {t.note && (
                          <div className="mt-2 p-2 bg-gray-50 rounded-md">
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Catatan:</span> {t.note}
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
} 
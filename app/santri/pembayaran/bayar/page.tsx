"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SantriSidebar } from "@/components/santri/santri-sidebar";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import Script from "next/script";

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

export default function BayarPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [paymentMethod, setPaymentMethod] = useState<string>("transfer");
  const [note, setNote] = useState<string>("");
  const [snapLoading, setSnapLoading] = useState(false);

  const { data: tagihanResponse, isLoading } = useQuery({
    queryKey: ["tagihan"],
    queryFn: async () => {
      const response = await fetch("/api/tagihan/santri");
      if (!response.ok) {
        throw new Error("Gagal mengambil data tagihan");
      }
      return response.json();
    },
  });

  const tagihan = tagihanResponse?.data || [];
  const selectedTagihanId = searchParams.get("tagihan");
  const selectedTagihan = tagihan.find((t: Tagihan) => t.id === selectedTagihanId);

  const createPembayaran = useMutation({
    mutationFn: async (data: any) => {
      if (data.paymentMethod === "midtrans") {
        const response = await fetch("/api/pembayaran/midtrans", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ tagihanId: data.tagihanId }),
        });
        if (!response.ok) {
          throw new Error("Gagal membuat pembayaran Midtrans");
        }
        return response.json();
      } else {
        const response = await fetch("/api/pembayaran", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });
        if (!response.ok) {
          throw new Error("Gagal membuat pembayaran");
        }
        return response.json();
      }
    },
    onSuccess: (data, variables) => {
      if (variables.paymentMethod === "midtrans" && data.snapToken) {
        setSnapLoading(true);
        // @ts-ignore
        window.snap.pay(data.snapToken, {
          onSuccess: function() {
            toast.success("Pembayaran berhasil diproses oleh Midtrans");
            router.push("/santri/pembayaran");
          },
          onPending: function() {
            toast("Pembayaran Anda sedang diproses oleh Midtrans");
            router.push("/santri/pembayaran");
          },
          onError: function() {
            toast.error("Pembayaran gagal diproses oleh Midtrans");
          },
          onClose: function() {
            setSnapLoading(false);
          }
        });
      } else {
        toast.success("Pembayaran berhasil dibuat");
        router.push("/santri/pembayaran");
      }
    },
    onError: (error: any, variables) => {
      if (variables.paymentMethod === "midtrans") {
        toast.error("Gagal membuat pembayaran Midtrans");
      } else {
        toast.error("Gagal membuat pembayaran");
      }
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTagihan) return;

    const data = {
      tagihanId: selectedTagihan.id,
      amount: selectedTagihan.amount,
      paymentMethod,
      note: note || undefined,
    };

    createPembayaran.mutate(data);
  };

  if (!selectedTagihan) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-sm text-muted-foreground">Tagihan tidak ditemukan</p>
      </div>
    );
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
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Pembayaran</h2>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-4 w-full">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Detail Tagihan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Jenis Tagihan</p>
                <p className="text-sm text-muted-foreground">
                  {selectedTagihan.jenisTagihan.name}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Jumlah</p>
                <p className="text-sm text-muted-foreground">
                  Rp {Number(selectedTagihan.amount).toLocaleString("id-ID")}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Jatuh Tempo</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(selectedTagihan.dueDate).toLocaleDateString("id-ID")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardHeader>
            <CardTitle>Form Pembayaran</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <Label>Metode Pembayaran</Label>
                <RadioGroup
                  value={paymentMethod}
                  onValueChange={setPaymentMethod}
                  className="flex flex-col space-y-1"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="transfer" id="transfer" />
                    <Label htmlFor="transfer">Transfer Bank</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="cash" id="cash" />
                    <Label htmlFor="cash">Tunai</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="qris" id="qris" />
                    <Label htmlFor="qris">QRIS</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="midtrans" id="midtrans" />
                    <Label htmlFor="midtrans">Pembayaran Online (Midtrans)</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-4">
                <Label>Catatan (Opsional)</Label>
                <Input
                  type="text"
                  placeholder="Tambahkan catatan jika diperlukan"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={createPembayaran.isPending}
              >
                {createPembayaran.isPending ? "Memproses..." : "Bayar Sekarang"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Script
        src="https://app.sandbox.midtrans.com/snap/snap.js"
        data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
        strategy="afterInteractive"
      />
    </div>
  );
} 
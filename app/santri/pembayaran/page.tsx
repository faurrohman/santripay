"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useRouter } from "next/navigation";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { SantriSidebar } from "@/components/santri/santri-sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useState, useRef } from "react";
import Script from "next/script";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface Tagihan {
  id: string;
  amount: number;
  dueDate: string;
  status: "pending" | "paid" | "overdue";
  description?: string;
  jenisTagihan: {
    id: string;
    name: string;
    amount: number;
  };
  santri: {
    id: string;
    name: string;
  };
}

interface Transaksi {
  id: string;
  tagihanId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: "cash" | "transfer" | "qris" | "midtrans";
  status: "pending" | "approved" | "rejected";
  note?: string;
  tagihan?: Tagihan;
}

const formSchema = z.object({
  tagihanId: z.string().uuid("Pilih tagihan yang valid"),
  amount: z.coerce.number().min(0, "Jumlah harus lebih dari atau sama dengan 0"),
  paymentMethod: z.enum(["cash", "transfer", "qris"]),
  note: z.string().optional(),
});

export default function PembayaranPage() {
  const router = useRouter();
  
  // State hooks
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTagihan, setSelectedTagihan] = useState<Tagihan | null>(null);
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [note, setNote] = useState("");
  const queryClient = useQueryClient();
  const [snapLoading, setSnapLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("manual");
  const [bukti, setBukti] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch data
  const { data: tagihanResponse, isLoading, error } = useQuery({
    queryKey: ["tagihan"],
    queryFn: async () => {
      const response = await fetch("/api/tagihan/santri");
      if (!response.ok) {
        throw new Error("Gagal mengambil data tagihan");
      }
      const data = await response.json();
      console.log("Tagihan data:", data); // Debug log
      return data;
    },
  });

  // Filter tagihan yang belum dibayar
  const unpaidTagihan = tagihanResponse?.data?.filter(
    (tagihan: Tagihan) => tagihan.status === "pending"
  ) || [];

  // Fetch transaksi
  const { data: transaksiResponse } = useQuery({
    queryKey: ["transaksi"],
    queryFn: async () => {
      const response = await fetch("/api/transaksi/santri");
      if (!response.ok) {
        throw new Error("Gagal mengambil data transaksi");
      }
      const data = await response.json();
      console.log("Transaksi data:", data);
      return data;
    },
  });

  // Filter transaksi yang sudah dibayar atau pending
  const paidTransaksi = transaksiResponse?.data?.filter(
    (transaksi: Transaksi) => 
      transaksi.status === "approved" || 
      transaksi.status === "pending"
  ) || [];

  // Filter transaksi manual dan Midtrans
  const manualTransaksi = paidTransaksi.filter((t: Transaksi) => ["cash", "transfer", "qris"].includes(t.paymentMethod));
  const midtransTransaksi = paidTransaksi.filter((t: Transaksi) => t.paymentMethod === "midtrans" || (t.note && t.note.toLowerCase().includes("midtrans")));

  // Fungsi untuk mengecek apakah tagihan sudah memiliki transaksi
  const hasTransaction = (tagihanId: string) => {
    return paidTransaksi.some(
      (transaksi: Transaksi) => transaksi.tagihan?.id === tagihanId
    );
  };

  // Mutation hooks
  const pembayaranMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTagihan) return;
      if (activeTab === "midtrans") {
        const response = await fetch("/api/pembayaran/midtrans", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ tagihanId: selectedTagihan.id }),
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Gagal membuat pembayaran Midtrans");
        }
        return response.json();
      } else {
        // Manual, handle upload bukti jika ada
        let buktiUrl = undefined;
        if (bukti) {
          // Simulasi upload, implementasi upload sesuaikan kebutuhan
          // Misal: upload ke endpoint /api/upload, dapatkan url
          // buktiUrl = await uploadBukti(bukti);
        }
        const response = await fetch("/api/pembayaran", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tagihanId: selectedTagihan.id,
            amount: Number(amount),
            paymentMethod,
            note,
            bukti: buktiUrl,
          }),
        });
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Gagal membuat pembayaran");
        }
        return response.json();
      }
    },
    onSuccess: (data) => {
      if (activeTab === "midtrans" && data.snapToken) {
        setSnapLoading(true);
        // @ts-ignore
        window.snap.pay(data.snapToken, {
          onSuccess: function() {
            toast.success("Pembayaran berhasil diproses oleh Midtrans");
            setIsDialogOpen(false);
            setSelectedTagihan(null);
            setAmount("");
            setPaymentMethod("");
            setNote("");
            setBukti(null);
            queryClient.invalidateQueries({ queryKey: ["transaksi"] });
            queryClient.invalidateQueries({ queryKey: ["tagihan"] });
          },
          onPending: function() {
            toast("Pembayaran Anda sedang diproses oleh Midtrans");
            setIsDialogOpen(false);
            setSelectedTagihan(null);
            setAmount("");
            setPaymentMethod("");
            setNote("");
            setBukti(null);
            queryClient.invalidateQueries({ queryKey: ["transaksi"] });
            queryClient.invalidateQueries({ queryKey: ["tagihan"] });
          },
          onError: function() {
            toast.error("Pembayaran gagal diproses oleh Midtrans");
          },
          onClose: function() {
            setSnapLoading(false);
          }
        });
      } else {
        toast.success("Pembayaran berhasil dibuat dan menunggu konfirmasi admin");
        setIsDialogOpen(false);
        setSelectedTagihan(null);
        setAmount("");
        setPaymentMethod("");
        setNote("");
        setBukti(null);
        queryClient.invalidateQueries({ queryKey: ["transaksi"] });
        queryClient.invalidateQueries({ queryKey: ["tagihan"] });
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Gagal membuat pembayaran");
    },
  });

  // Handler functions
  const handleBayar = (tagihan: Tagihan) => {
    // Cek apakah tagihan sudah dibayar
    if (tagihan.status === "paid") {
      toast.error("Tagihan ini sudah dibayar");
      return;
    }

    setSelectedTagihan(tagihan);
    setAmount(tagihan.amount.toString());
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTagihan) return;

    try {
      // Validasi metode pembayaran
      if (!paymentMethod) {
        toast.error("Pilih metode pembayaran");
        return;
      }

      await pembayaranMutation.mutateAsync();
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error submitting payment:", error);
    }
  };

  if (isLoading) return <div>Memuat data...</div>;

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
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/santri/dashboard">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Pembayaran</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <h2 className="text-3xl font-bold tracking-tight">Pembayaran</h2>
          </div>
        </div>
      </header>
      <div className="flex-1 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Tagihan Belum Dibayar</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : error ? (
              <div className="text-red-500">Error: {error.message}</div>
            ) : unpaidTagihan.length === 0 ? (
              <div className="text-center text-gray-500">Tidak ada tagihan yang belum dibayar</div>
            ) : (
              <div className="space-y-4">
                {unpaidTagihan.map((tagihan: Tagihan) => {
                  const hasExistingTransaction = hasTransaction(tagihan.id);
                  return (
                    <div
                      key={tagihan.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <h3 className="font-medium">{tagihan.jenisTagihan.name}</h3>
                        <p className="text-sm text-gray-500">
                          Jatuh tempo: {new Date(tagihan.dueDate).toLocaleDateString("id-ID")}
                        </p>
                        <p className="text-sm text-gray-500">
                          Jumlah: Rp {Number(tagihan.amount).toLocaleString("id-ID")}
                        </p>
                      </div>
                      <Button
                        onClick={() => handleBayar(tagihan)}
                        disabled={hasExistingTransaction}
                        variant={hasExistingTransaction ? "secondary" : "default"}
                      >
                        {hasExistingTransaction ? "Menunggu Konfirmasi" : "Bayar"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Riwayat Pembayaran</h3>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : paidTransaksi.length === 0 ? (
              <div className="text-center text-gray-500">Belum ada riwayat pembayaran</div>
            ) : (
              <div className="space-y-4">
                {paidTransaksi.map((transaksi: Transaksi) => (
                  <div
                    key={transaksi.id}
                    className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-gray-50"
                    onClick={() => transaksi.tagihan && handleBayar(transaksi.tagihan)}
                  >
                    <div>
                      <h3 className="font-medium">
                        {transaksi.tagihan?.jenisTagihan.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Tanggal: {new Date(transaksi.paymentDate).toLocaleDateString("id-ID")}
                      </p>
                      <p className="text-sm text-gray-500">
                        Jumlah: Rp {Number(transaksi.amount).toLocaleString("id-ID")}
                      </p>
                      <p className="text-sm text-gray-500">
                        Status: {transaksi.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Riwayat Pembayaran Manual</h3>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : manualTransaksi.length === 0 ? (
              <div className="text-center text-gray-500">Belum ada riwayat pembayaran manual</div>
            ) : (
              <div className="space-y-4">
                {manualTransaksi.map((transaksi: Transaksi) => (
                  <div key={transaksi.id} className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-gray-50" onClick={() => transaksi.tagihan && handleBayar(transaksi.tagihan)}>
                    <div>
                      <h3 className="font-medium">{transaksi.tagihan?.jenisTagihan.name}</h3>
                      <p className="text-sm text-gray-500">Tanggal: {new Date(transaksi.paymentDate).toLocaleDateString("id-ID")}</p>
                      <p className="text-sm text-gray-500">Jumlah: Rp {Number(transaksi.amount).toLocaleString("id-ID")}</p>
                      <p className="text-sm text-gray-500">Status: {transaksi.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Riwayat Pembayaran Midtrans</h3>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : midtransTransaksi.length === 0 ? (
              <div className="text-center text-gray-500">Belum ada riwayat pembayaran Midtrans</div>
            ) : (
              <div className="space-y-4">
                {midtransTransaksi.map((transaksi: Transaksi) => (
                  <div key={transaksi.id} className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-gray-50" onClick={() => transaksi.tagihan && handleBayar(transaksi.tagihan)}>
                    <div>
                      <h3 className="font-medium">{transaksi.tagihan?.jenisTagihan.name}</h3>
                      <p className="text-sm text-gray-500">Tanggal: {new Date(transaksi.paymentDate).toLocaleDateString("id-ID")}</p>
                      <p className="text-sm text-gray-500">Jumlah: Rp {Number(transaksi.amount).toLocaleString("id-ID")}</p>
                      <p className="text-sm text-gray-500">Status: {transaksi.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Konfirmasi Pembayaran</DialogTitle>
            </DialogHeader>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="manual">Manual</TabsTrigger>
                <TabsTrigger value="midtrans">Midtrans</TabsTrigger>
              </TabsList>
              <TabsContent value="manual">
                <form onSubmit={handleSubmit}>
                  <div className="space-y-4">
                    <div>
                      <Label>Tagihan</Label>
                      <Input value={selectedTagihan?.jenisTagihan.name || ""} disabled />
                    </div>
                    <div>
                      <Label>Jumlah Tagihan</Label>
                      <Input value={selectedTagihan ? `Rp ${selectedTagihan.amount.toLocaleString('id-ID')}` : ""} disabled />
                    </div>
                    <div>
                      <Label>Jumlah Pembayaran</Label>
                      <Input type="number" value={amount || ""} disabled />
                    </div>
                    <div>
                      <Label>Metode Pembayaran</Label>
                      <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="flex flex-col space-y-2">
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
                      </RadioGroup>
                    </div>
                    <div>
                      <Label>Catatan (Opsional)</Label>
                      <Textarea value={note || ""} onChange={(e) => setNote(e.target.value)} placeholder="Tambahkan catatan jika diperlukan" />
                    </div>
                    <div>
                      <Label>Bukti Transfer (Opsional)</Label>
                      <Input type="file" accept="image/*" ref={fileInputRef} onChange={e => setBukti(e.target.files?.[0] || null)} />
                    </div>
                  </div>
                  <DialogFooter className="mt-6">
                    <Button type="button" variant="outline" onClick={() => { setIsDialogOpen(false); setSelectedTagihan(null); setAmount(""); setPaymentMethod(""); setNote(""); setBukti(null); }}>Batal</Button>
                    <Button type="submit" disabled={pembayaranMutation.isPending}>{pembayaranMutation.isPending ? "Memproses..." : "Bayar"}</Button>
                  </DialogFooter>
                </form>
              </TabsContent>
              <TabsContent value="midtrans">
                <div className="space-y-4">
                  <div>
                    <Label>Tagihan</Label>
                    <Input value={selectedTagihan?.jenisTagihan.name || ""} disabled />
                  </div>
                  <div>
                    <Label>Jumlah Tagihan</Label>
                    <Input value={selectedTagihan ? `Rp ${selectedTagihan.amount.toLocaleString('id-ID')}` : ""} disabled />
                  </div>
                  <Button className="w-full mt-4" onClick={e => { e.preventDefault(); pembayaranMutation.mutateAsync(); }} disabled={pembayaranMutation.isPending || snapLoading}>
                    {pembayaranMutation.isPending || snapLoading ? "Memproses..." : "Bayar via Midtrans"}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>
      <Script
        src="https://app.sandbox.midtrans.com/snap/snap.js"
        data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
        strategy="afterInteractive"
      />
    </div>
  );
} 
"use client"

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExportButtons } from "@/components/ui/export-buttons";
import { ArrowLeft, Calendar, Download, CalendarIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import React, { useState } from "react";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Calendar as ShadcnCalendar } from "@/components/ui/calendar";

interface PembayaranBulanan {
  id: string;
  paymentDate: string;
  paymentMethod: string;
  santriName: string;
  jenisTagihanName: string;
  status: string;
  amount: number;
}

interface TahunAjaran {
  id: string;
  name: string;
  aktif: boolean;
}

const BULAN_OPTIONS = [
  { value: "all", label: "Semua Bulan" },
  { value: "1", label: "Januari" },
  { value: "2", label: "Februari" },
  { value: "3", label: "Maret" },
  { value: "4", label: "April" },
  { value: "5", label: "Mei" },
  { value: "6", label: "Juni" },
  { value: "7", label: "Juli" },
  { value: "8", label: "Agustus" },
  { value: "9", label: "September" },
  { value: "10", label: "Oktober" },
  { value: "11", label: "November" },
  { value: "12", label: "Desember" },
];

export default function LaporanBulananPage() {
  const [selectedBulan, setSelectedBulan] = useState<string>("all");
  // Default ke 'all' agar benar-benar tidak mengirim tahunAjaranId saat semua tahun ajaran
  const [selectedTahunAjaran, setSelectedTahunAjaran] = useState<string>("all");
  const [tanggalMulai, setTanggalMulai] = useState<Date | undefined>(undefined);
  const [tanggalSelesai, setTanggalSelesai] = useState<Date | undefined>(undefined);
  const [showCalendarMulai, setShowCalendarMulai] = useState(false);
  const [showCalendarSelesai, setShowCalendarSelesai] = useState(false);
  // State untuk tanggal yang benar-benar dikirim ke query
  const [tanggalQuery, setTanggalQuery] = useState<{ mulai?: Date, selesai?: Date }>({});

  // Fetch tahun ajaran
  const { data: tahunAjaranList = [] } = useQuery<TahunAjaran[]>({
    queryKey: ["tahun-ajaran"],
    queryFn: async () => {
      const response = await fetch("/api/tahun-ajaran");
      if (!response.ok) {
        throw new Error("Gagal mengambil data tahun ajaran");
      }
      return response.json();
    },
  });

  // Fetch pembayaran bulanan dengan filter
  const { data: pembayaranResponse, isLoading } = useQuery({
    queryKey: ["pembayaran-bulanan", selectedBulan, selectedTahunAjaran, tanggalQuery.mulai, tanggalQuery.selesai],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedBulan && selectedBulan !== "all") params.append("bulan", selectedBulan);
      // Pada useQuery, hanya kirim tahunAjaranId jika selectedTahunAjaran !== 'all'
      if (selectedTahunAjaran && selectedTahunAjaran !== "all") params.append("tahunAjaranId", selectedTahunAjaran);
      if (tanggalQuery.mulai) params.append("tanggalMulai", tanggalQuery.mulai.toISOString());
      if (tanggalQuery.selesai) params.append("tanggalSelesai", tanggalQuery.selesai.toISOString());
      
      const url = `/api/admin/pembayaran-bulanan${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Gagal mengambil data pembayaran bulanan");
      }
      return response.json();
    },
  });

  const pembayaran: PembayaranBulanan[] = pembayaranResponse?.data || [];
  const statistik = pembayaranResponse?.statistik || {};
  const totalPembayaran = statistik.totalPembayaran || pembayaran.length;
  const totalNominal = statistik.totalNominal || pembayaran.reduce((sum, item) => sum + item.amount, 0);
  const approvedCount = statistik.approvedCount || pembayaran.filter(item => item.status === "approved").length;
  const pendingCount = statistik.pendingCount || pembayaran.filter(item => item.status === "pending").length;

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    try {
      return new Date(dateString).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
    } catch (error) {
      return "-";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "approved":
        return "Disetujui";
      case "pending":
        return "Menunggu";
      case "rejected":
        return "Ditolak";
      default:
        return status;
    }
  };

  const getPaymentMethodText = (method: string) => {
    if (!method) return "-";
    switch (method) {
      case "cash":
        return "Tunai";
      case "transfer":
        return "Transfer";
      case "qris":
        return "QRIS";
      default:
        return method;
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Laporan Bulanan</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <h2 className="text-3xl font-bold tracking-tight">Laporan Bulanan</h2>

        <Card>
          <CardHeader>
            <CardTitle>Laporan Bulanan</CardTitle>
            <CardDescription>Daftar pembayaran bulanan dengan detail lengkap</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filter dan Export Skeleton */}
            <div className="flex space-x-4 mb-4">
              <div className="flex-1"><Skeleton className="h-10 w-full rounded-md" /></div>
              <div className="flex-1"><Skeleton className="h-10 w-full rounded-md" /></div>
              <div className="w-32"><Skeleton className="h-10 w-full rounded-md" /></div>
            </div>

            {/* Statistik Cards Skeleton */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-4" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-16 mb-2" />
                    <Skeleton className="h-3 w-32" />
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Tabel Skeleton */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No</TableHead>
                  <TableHead>Tanggal Pembayaran</TableHead>
                  <TableHead>Nama Santri</TableHead>
                  <TableHead>Jenis Pembayaran</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Jumlah Pembayaran</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-6" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-62" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Laporan Bulanan</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <h2 className="text-3xl font-bold tracking-tight">Laporan Bulanan</h2>

      {/* Card utama */}
      <Card>
        <CardHeader>
          <CardTitle>Laporan Bulanan</CardTitle>
          <CardDescription>
            Daftar pembayaran bulanan dengan detail lengkap
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filter dan Export */}
          <div className="flex space-x-4 mb-4">
            <div className="flex-1">
              <Select value={selectedBulan} onValueChange={setSelectedBulan}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih bulan" />
                </SelectTrigger>
                <SelectContent>
                  {BULAN_OPTIONS.map((bulan) => (
                    <SelectItem key={bulan.value} value={bulan.value}>
                      {bulan.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-8">
              <Select value={selectedTahunAjaran} onValueChange={val => setSelectedTahunAjaran(val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih tahun ajaran" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tahun Ajaran</SelectItem>
                  {tahunAjaranList.map((tahun) => (
                    <SelectItem key={tahun.id} value={tahun.id}>
                      {tahun.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Filter tanggal mulai */}
            <div className="flex items-center space-x-2">
              <span className="text-xs">Dari</span>
              <div className="relative">
                <Button
                  variant="outline"
                  className="pl-3 text-left font-normal"
                  onClick={() => setShowCalendarMulai(true)}
                >
                  {tanggalMulai ? (
                    tanggalMulai.toLocaleDateString("id-ID")
                  ) : (
                    <span className="text-muted-foreground">Tanggal Mulai</span>
                  )}
                  <CalendarIcon className="ml-2 h-4 w-4" />
                </Button>
                <div className="absolute z-10 bg-white shadow-lg rounded-md mt-2" style={{ display: showCalendarMulai ? 'block' : 'none' }}>
                  <ShadcnCalendar
                    mode="single"
                    selected={tanggalMulai}
                    onSelect={date => {
                      setTanggalMulai(date);
                      setShowCalendarMulai(false);
                    }}
                    initialFocus
                  />
                </div>
              </div>
            </div>
            {/* Filter tanggal selesai */}
            <div className="flex items-center space-x-2">
              <span className="text-xs">Sampai</span>
              <div className="relative">
                <Button
                  variant="outline"
                  className="pl-3 text-left font-normal"
                  onClick={() => setShowCalendarSelesai(true)}
                >
                  {tanggalSelesai ? (
                    tanggalSelesai.toLocaleDateString("id-ID")
                  ) : (
                    <span className="text-muted-foreground">Tanggal Selesai</span>
                  )}
                  <CalendarIcon className="ml-2 h-4 w-4" />
                </Button>
                <div className="absolute z-10 bg-white shadow-lg rounded-md mt-2" style={{ display: showCalendarSelesai ? 'block' : 'none' }}>
                  <ShadcnCalendar
                    mode="single"
                    selected={tanggalSelesai}
                    onSelect={date => {
                      setTanggalSelesai(date);
                      setShowCalendarSelesai(false);
                    }}
                    initialFocus
                  />
                </div>
              </div>
            </div>
            {/* Tombol Filter */}
            <div className="flex items-center">
              <Button
                variant="default"
                onClick={() => setTanggalQuery({ mulai: tanggalMulai, selesai: tanggalSelesai })}
                disabled={!tanggalMulai && !tanggalSelesai}
              >
                Filter
              </Button>
            </div>
            <div className="flex items-center">
              <ExportButtons
                data={pembayaran}
                columns={[
                  { header: "Tanggal Pembayaran", accessor: "paymentDate" },
                  { header: "Nama Santri", accessor: "santriName" },
                  { header: "Jenis Pembayaran", accessor: "jenisTagihanName" },
                  { header: "Status", accessor: "status" },
                  { header: "Jumlah Pembayaran", accessor: "amount" },
                ]}
                filename={`laporan-pembayaran-bulanan-${selectedBulan && selectedBulan !== "all" ? BULAN_OPTIONS.find(b => b.value === selectedBulan)?.label : 'semua-bulan'}-${selectedTahunAjaran ? tahunAjaranList.find(t => t.id === selectedTahunAjaran)?.name : 'semua-tahun'}`}
              />
            </div>
          </div>

          {/* Statistik Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Nominal</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(statistik.totalNominal || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Jumlah total pembayaran: <span className="font-semibold text-green-700">{statistik.totalPembayaran || 0}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Total nominal pembayaran
                </p>
              </CardContent>
            </Card>

            {/* Card Total Dibayar */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Dibayar</CardTitle>
                <Calendar className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-700">
                  {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(statistik.totalDibayar || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Jumlah tagihan disetujui: <span className="font-semibold text-green-700">{statistik.approvedCount || 0}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Total nominal pembayaran disetujui
                </p>
              </CardContent>
            </Card>

            {/* Card Menunggu Pembayaran */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Menunggu Pembayaran</CardTitle>
                <Calendar className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-700">
                  {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(statistik.totalMenunggu || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Jumlah tagihan menunggu: <span className="font-semibold text-yellow-700">{statistik.pendingCount || 0}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Total nominal pembayaran menunggu
                </p>
              </CardContent>
            </Card>

            {/* Card Tagihan Terlambat */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tagihan Terlambat</CardTitle>
                <Calendar className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-700">
                  {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(statistik.totalNominalTerlambat || 0)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Jumlah tagihan terlambat: <span className="font-semibold text-red-700">{statistik.totalTerlambat || 0}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Total nominal tagihan terlambat
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tabel Pembayaran */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No</TableHead>
                <TableHead>Tanggal Pembayaran</TableHead>
                <TableHead>Nama Santri</TableHead>
                <TableHead>Jenis Pembayaran</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Jumlah Pembayaran</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pembayaran.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    Tidak ada data pembayaran
                  </TableCell>
                </TableRow>
              ) : (
                pembayaran.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-medium">
                      {item.paymentDate ? formatDate(item.paymentDate) : "-"}
                    </TableCell>
                 
                    <TableCell className="font-medium">
                      {item.santriName || "-"}
                    </TableCell>
                    <TableCell>
                      {item.jenisTagihanName || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(item.status)}>
                        {getStatusText(item.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {typeof item.amount === 'number' && !isNaN(item.amount) ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(item.amount) : "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
} 
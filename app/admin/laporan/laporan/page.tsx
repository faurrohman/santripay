"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExportButtons } from "@/components/ui/export-buttons";
import { Button } from "@/components/ui/button";
import { Receipt, CheckCircle2, AlertCircle, TrendingUp, TrendingDown, Clock, DollarSign, Users, FileText, Activity, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useMemo } from "react";
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import Link from "next/link";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

interface Statistik {
  totalTagihan: number;
  totalDibayar: number;
  totalMenunggu: number;
  totalTerlambat: number;
  tagihanPerBulan: any[];
  transaksiPerBulan: any[];
  breakdownJenisTagihan: any[];
  breakdownPerKelas: any[];
  tagihanTerlambatDetail: any[];
  recentPembayaran: any[];
}

interface TahunAjaran {
  id: string;
  name: string;
  aktif: boolean;
}

const COLORS = ["#22c55e", "#facc15", "#ef4444", "#3b82f6", "#8b5cf6", "#f97316"];
const BULAN_NAMES = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];

export default function LaporanAdminPage() {
  const [selectedTahunAjaran, setSelectedTahunAjaran] = useState<string>("");

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

  // Fetch laporan berdasarkan tahun ajaran
  const { data: statistikResponse, isLoading } = useQuery({
    queryKey: ["laporan-admin", selectedTahunAjaran],
    queryFn: async () => {
      const url = selectedTahunAjaran 
        ? `/api/admin/laporan?tahunAjaranId=${selectedTahunAjaran}`
        : "/api/admin/laporan";
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Gagal mengambil data laporan");
      }
      return response.json();
    },
  });

  const statistik: Statistik = statistikResponse?.data || {
    totalTagihan: 0,
    totalDibayar: 0,
    totalMenunggu: 0,
    totalTerlambat: 0,
    tagihanPerBulan: [],
    transaksiPerBulan: [],
    breakdownJenisTagihan: [],
    breakdownPerKelas: [],
    tagihanTerlambatDetail: [],
    recentPembayaran: [],
  };

  // Persentase pencapaian
  const persentase = statistik.totalTagihan > 0 ? (statistik.totalDibayar / statistik.totalTagihan) * 100 : 0;
  const pencapaianKurang = persentase < 80;
  const pencapaianSangatKurang = persentase < 60;

  // Data untuk pie chart
  const pieData = [
    { name: "Sudah Dibayar", value: statistik.totalDibayar },
    { name: "Menunggu", value: statistik.totalMenunggu },
    { name: "Terlambat", value: statistik.totalTerlambat },
  ];

  // Data untuk bar chart (data real per bulan)
  const barData = useMemo(() => {
    const bulanData: Record<number, { bulan: string; target: number; realisasi: number }> = {};
    
    // Inisialisasi semua bulan dengan 0
    for (let i = 0; i < 12; i++) {
      bulanData[i] = {
        bulan: BULAN_NAMES[i],
        target: 0,
        realisasi: 0
      };
    }

    // Proses data tagihan per bulan
    if (statistik.tagihanPerBulan && Array.isArray(statistik.tagihanPerBulan)) {
      statistik.tagihanPerBulan.forEach((item: any) => {
        const month = new Date(item.createdAt).getMonth();
        bulanData[month].target += Number(item._sum.amount || 0);
      });
    }

    // Proses data transaksi per bulan
    if (statistik.transaksiPerBulan && Array.isArray(statistik.transaksiPerBulan)) {
      statistik.transaksiPerBulan.forEach((item: any) => {
        const month = item.month || new Date(item.paymentDate).getMonth();
        bulanData[month].realisasi += Number(item._sum?.amount || item.amount || 0);
      });
    }

    return Object.values(bulanData);
  }, [statistik.tagihanPerBulan, statistik.transaksiPerBulan]);

  // Data untuk pie chart jenis tagihan
  const pieJenisTagihanData = (statistik.breakdownJenisTagihan || []).map((item, index) => ({
    name: item.name,
    value: item.target,
    color: COLORS[index % COLORS.length],
    persentase: item.persentase
  }));

  // Data untuk bar chart per kelas
  const barKelasData = (statistik.breakdownPerKelas || []).map((kelas, index) => ({
    name: kelas.name,
    target: kelas.target,
    realisasi: kelas.realisasi,
    persentase: kelas.persentase,
    santriCount: kelas.santriCount,
    color: COLORS[index % COLORS.length]
  }));

  const getStatusColor = () => {
    if (pencapaianSangatKurang) return "text-red-600";
    if (pencapaianKurang) return "text-yellow-600";
    return "text-green-600";
  };

  const getStatusIcon = () => {
    if (pencapaianSangatKurang) return <TrendingDown className="h-5 w-5 text-red-600" />;
    if (pencapaianKurang) return <AlertCircle className="h-5 w-5 text-yellow-600" />;
    return <TrendingUp className="h-5 w-5 text-green-600" />;
  };

  const getInsightMessage = () => {
    if (pencapaianSangatKurang) {
      return "Realisasi pemasukan sangat rendah. Perlu tindakan cepat untuk meningkatkan penagihan.";
    }
    if (pencapaianKurang) {
      return "Realisasi pemasukan masih di bawah target. Perlu strategi penagihan yang lebih agresif.";
    }
    return "Realisasi pemasukan sudah baik! Pertahankan performa ini.";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="p-4 space-y-4">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Laporan</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <h2 className="text-3xl font-bold tracking-tight">Laporan Pemasukan</h2>

      {/* Card utama */}
      <Card>
        <CardHeader>
          <CardTitle>Laporan Pemasukan</CardTitle>
          <CardDescription>
            Analisis target dan realisasi pemasukan {selectedTahunAjaran ? `tahun ajaran ${tahunAjaranList.find(t => t.id === selectedTahunAjaran)?.name}` : 'semua tahun ajaran'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filter dan Export */}
          <div className="flex space-x-4 mb-6">
            <div className="flex-1">
              <Select value={selectedTahunAjaran} onValueChange={setSelectedTahunAjaran}>
                <SelectTrigger>
                  <SelectValue placeholder="Semua Tahun Ajaran" />
                </SelectTrigger>
                <SelectContent>
                  {tahunAjaranList.map((tahun) => (
                    <SelectItem key={tahun.id} value={tahun.id}>
                      {tahun.name} {tahun.aktif && "(Aktif)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <ExportButtons
                data={[
                  {
                    tahunAjaran: selectedTahunAjaran ? tahunAjaranList.find(t => t.id === selectedTahunAjaran)?.name : 'Semua Tahun Ajaran',
                    target: statistik.totalTagihan,
                    realisasi: statistik.totalDibayar,
                    menunggu: statistik.totalMenunggu,
                    terlambat: statistik.totalTerlambat,
                    persentase: persentase.toFixed(1),
                  }
                ]}
                columns={[
                  { header: "Tahun Ajaran", accessor: "tahunAjaran" },
                  { header: "Target Pemasukan", accessor: "target" },
                  { header: "Total Pemasukan", accessor: "realisasi" },
                  { header: "Menunggu Pembayaran", accessor: "menunggu" },
                  { header: "Tagihan Terlambat", accessor: "terlambat" },
                  { header: "Persentase Pencapaian (%)", accessor: "persentase" },
                ]}
                filename={`laporan-pemasukan-${selectedTahunAjaran ? tahunAjaranList.find(t => t.id === selectedTahunAjaran)?.name : 'semua-tahun'}`}
              />
              <Link href="/admin/laporan/bulanan">
                <Button className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Laporan Bulanan
                </Button>
              </Link>
            </div>
          </div>

          {/* Statistik Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Target Pemasukan</CardTitle>
                <Receipt className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-32" />
                ) : (
                  <>
                    <div className="text-2xl font-bold text-blue-600">
                      {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(statistik.totalTagihan)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Total tagihan yang harus dibayar
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Pemasukan</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-32" />
                ) : (
                  <>
                    <div className="text-2xl font-bold text-green-600">
                      {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(statistik.totalDibayar)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Tagihan yang sudah dibayar
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-yellow-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Menunggu Pembayaran</CardTitle>
                <Clock className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-32" />
                ) : (
                  <>
                    <div className="text-2xl font-bold text-yellow-600">
                      {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(statistik.totalMenunggu)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Tagihan yang belum dibayar
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-red-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tagihan Terlambat</CardTitle>
                <AlertCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-32" />
                ) : (
                  <>
                    <div className="text-2xl font-bold text-red-600">
                      {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(statistik.totalTerlambat)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Tagihan yang sudah jatuh tempo
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Insight Card */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                {getStatusIcon()}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold">Persentase Pencapaian:</span>
                    <span className={`font-bold text-lg ${getStatusColor()}`}>
                      {persentase.toFixed(1)}%
                    </span>
                    <Badge variant={pencapaianSangatKurang ? "destructive" : pencapaianKurang ? "secondary" : "default"}>
                      {pencapaianSangatKurang ? "Kritis" : pencapaianKurang ? "Waspada" : "Baik"}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {getInsightMessage()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs Navigation */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="jenis-tagihan">Jenis Tagihan</TabsTrigger>
              <TabsTrigger value="per-kelas">Per Kelas</TabsTrigger>
              <TabsTrigger value="terlambat">Tagihan Terlambat</TabsTrigger>
              <TabsTrigger value="recent">Recent Activities</TabsTrigger>
              <TabsTrigger value="detail">Detail</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Pie Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Komposisi Pemasukan
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <Skeleton className="h-64 w-full" />
                    ) : (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={pieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(1)}%`}
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(value)} 
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                {/* Bar Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Tren Bulanan (Data Real)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <Skeleton className="h-64 w-full" />
                    ) : (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={barData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="bulan" />
                          <YAxis />
                          <Tooltip 
                            formatter={(value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(value)} 
                          />
                          <Legend />
                          <Bar dataKey="target" fill="#3b82f6" name="Target (Tagihan Dibuat)" />
                          <Bar dataKey="realisasi" fill="#22c55e" name="Realisasi (Dibayar)" />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Jenis Tagihan Tab */}
            <TabsContent value="jenis-tagihan" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Breakdown Per Jenis Tagihan
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <Skeleton className="h-64 w-full" />
                    ) : (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={pieJenisTagihanData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(1)}%`}
                          >
                            {pieJenisTagihanData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(value)} 
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Detail Per Jenis Tagihan</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Jenis Tagihan</TableHead>
                          <TableHead className="text-right">Target</TableHead>
                          <TableHead className="text-right">Realisasi</TableHead>
                          <TableHead className="text-right">Persentase</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(statistik.breakdownJenisTagihan || []).map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell className="text-right">
                              {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(item.target)}
                            </TableCell>
                            <TableCell className="text-right text-green-600">
                              {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(item.realisasi)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant={item.persentase < 80 ? "destructive" : "default"}>
                                {item.persentase.toFixed(1)}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Per Kelas Tab */}
            <TabsContent value="per-kelas" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Performa Per Kelas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <Skeleton className="h-64 w-full" />
                    ) : (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={barKelasData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip 
                            formatter={(value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(value)} 
                          />
                          <Legend />
                          <Bar dataKey="target" fill="#3b82f6" name="Target" />
                          <Bar dataKey="realisasi" fill="#22c55e" name="Realisasi" />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Detail Per Kelas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Kelas</TableHead>
                          <TableHead className="text-right">Santri</TableHead>
                          <TableHead className="text-right">Target</TableHead>
                          <TableHead className="text-right">Realisasi</TableHead>
                          <TableHead className="text-right">Persentase</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(statistik.breakdownPerKelas || []).map((kelas) => (
                          <TableRow key={kelas.name}>
                            <TableCell className="font-medium">{kelas.name}</TableCell>
                            <TableCell className="text-right">{kelas.santriCount}</TableCell>
                            <TableCell className="text-right">
                              {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(kelas.target)}
                            </TableCell>
                            <TableCell className="text-right text-green-600">
                              {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(kelas.realisasi)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant={kelas.persentase < 80 ? "destructive" : "default"}>
                                {kelas.persentase.toFixed(1)}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Tagihan Terlambat Tab */}
            <TabsContent value="terlambat" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    Tagihan Terlambat (Top 10)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Santri</TableHead>
                        <TableHead>Kelas</TableHead>
                        <TableHead>Jenis Tagihan</TableHead>
                        <TableHead>Jatuh Tempo</TableHead>
                        <TableHead className="text-right">Nominal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(statistik.tagihanTerlambatDetail || []).map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.santriName}</TableCell>
                          <TableCell>{item.kelasName}</TableCell>
                          <TableCell>{item.jenisTagihanName}</TableCell>
                          <TableCell>{formatDate(item.dueDate)}</TableCell>
                          <TableCell className="text-right text-red-600 font-medium">
                            {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(item.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Recent Activities Tab */}
            <TabsContent value="recent" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-green-500" />
                    Pembayaran Terbaru
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Santri</TableHead>
                        <TableHead>Kelas</TableHead>
                        <TableHead>Jenis Tagihan</TableHead>
                        <TableHead>Tanggal Bayar</TableHead>
                        <TableHead className="text-right">Nominal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(statistik.recentPembayaran || []).map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.santriName}</TableCell>
                          <TableCell>{item.kelasName}</TableCell>
                          <TableCell>{item.jenisTagihanName}</TableCell>
                          <TableCell>{formatDate(item.paymentDate)}</TableCell>
                          <TableCell className="text-right text-green-600 font-medium">
                            {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(item.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Detail Tab */}
            <TabsContent value="detail" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Rincian Pemasukan</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Keterangan</TableHead>
                        <TableHead className="text-right">Nominal</TableHead>
                        <TableHead className="text-right">Persentase</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">Target Pemasukan (Total Tagihan)</TableCell>
                        <TableCell className="text-right font-medium">
                          {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(statistik.totalTagihan)}
                        </TableCell>
                        <TableCell className="text-right">100%</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Total Pemasukan (Sudah Dibayar)</TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(statistik.totalDibayar)}
                        </TableCell>
                        <TableCell className="text-right text-green-600">{persentase.toFixed(1)}%</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Tagihan Menunggu Pembayaran</TableCell>
                        <TableCell className="text-right font-medium text-yellow-600">
                          {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(statistik.totalMenunggu)}
                        </TableCell>
                        <TableCell className="text-right text-yellow-600">
                          {statistik.totalTagihan > 0 ? ((statistik.totalMenunggu / statistik.totalTagihan) * 100).toFixed(1) : 0}%
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Tagihan Terlambat</TableCell>
                        <TableCell className="text-right font-medium text-red-600">
                          {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(statistik.totalTerlambat)}
                        </TableCell>
                        <TableCell className="text-right text-red-600">
                          {statistik.totalTagihan > 0 ? ((statistik.totalTerlambat / statistik.totalTagihan) * 100).toFixed(1) : 0}%
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
} 
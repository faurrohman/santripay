"use client";

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { id as idLocale } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";

// Definisi tipe untuk riwayat kelas
interface RiwayatKelas {
  id: string;
  santriId: string;
  santri: {
    name: string;
    santriId: string;
  };
  kelasLamaId: string;
  kelasLama: {
    name: string;
    level?: string;
  };
  kelasBaruId: string;
  kelasBaru: {
    name: string;
    level?: string;
  };
  tanggal: string;
}

// Definisi tipe untuk tahun ajaran
interface TahunAjaran {
  id: string;
  name: string;
  aktif: boolean;
}

export default function RiwayatNaikKelasPage() {
  // State untuk menyimpan data
  const [riwayatList, setRiwayatList] = useState<RiwayatKelas[]>([]);
  const [tahunAjaranList, setTahunAjaranList] = useState<TahunAjaran[]>([]);
  
  // State untuk filter
  const [selectedTahunAjaran, setSelectedTahunAjaran] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: undefined,
    to: undefined
  });

  // State loading untuk data riwayat
  const [loadingRiwayat, setLoadingRiwayat] = useState(true);

  // Fungsi untuk mengambil data riwayat kenaikan kelas
  const fetchRiwayatNaikKelas = async (tahunAjaranId?: string) => {
    try {
      const params = new URLSearchParams();
      
      if (tahunAjaranId) {
        params.append('tahunAjaranId', tahunAjaranId);
      }

      if (dateRange?.from) {
        params.append('startDate', dateRange.from.toISOString());
      }

      if (dateRange?.to) {
        params.append('endDate', dateRange.to.toISOString());
      }

      const url = `/api/santri/naik-kelas/riwayat?${params.toString()}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Gagal mengambil riwayat kenaikan kelas');
      }

      setRiwayatList(data);
    } catch (error) {
      toast.error('Gagal memuat riwayat kenaikan kelas', {
        description: error instanceof Error ? error.message : undefined
      });
    } finally {
      setLoadingRiwayat(false);
    }
  };

  // Fungsi untuk mengambil tahun ajaran
  const fetchTahunAjaran = async () => {
    try {
      const response = await fetch('/api/tahun-ajaran');
      const data = await response.json();

      console.log('Tahun Ajaran Data:', data);

      if (!response.ok) {
        throw new Error(data.message || 'Gagal mengambil data tahun ajaran');
      }

      setTahunAjaranList(data);
      
      // Set tahun ajaran aktif sebagai default
      const tahunAjaranAktif = data.find((ta: TahunAjaran) => ta.aktif);
      console.log('Tahun Ajaran Aktif:', tahunAjaranAktif);

      if (tahunAjaranAktif) {
        setSelectedTahunAjaran(tahunAjaranAktif.id);
        fetchRiwayatNaikKelas(tahunAjaranAktif.id);
      } else if (data.length > 0) {
        // Jika tidak ada tahun ajaran aktif, gunakan tahun ajaran pertama
        setSelectedTahunAjaran(data[0].id);
        fetchRiwayatNaikKelas(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching tahun ajaran:', error);
      toast.error('Gagal memuat tahun ajaran', {
        description: error instanceof Error ? error.message : undefined
      });
    }
  };

  // Effect untuk mengambil data awal dan saat filter berubah
  useEffect(() => {
    // Ambil data tahun ajaran
    fetchTahunAjaran();
  }, []);

  useEffect(() => {
    if (selectedTahunAjaran) {
      setLoadingRiwayat(true);
      fetchRiwayatNaikKelas(selectedTahunAjaran);
    }
  }, [selectedTahunAjaran, dateRange]);

  // Filter riwayat berdasarkan pencarian
  const filteredRiwayat = riwayatList.filter(riwayat => 
    riwayat.santri.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    riwayat.santri.santriId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Render tombol tanggal
  const renderDateButton = () => {
    if (!dateRange?.from) {
      return <span>Pilih Rentang Tanggal</span>;
    }

    if (dateRange.to) {
      return (
        <>
          {format(dateRange.from, "dd LLL y", { locale: idLocale })} -{" "}
          {format(dateRange.to, "dd LLL y", { locale: idLocale })}
        </>
      );
    }

    return format(dateRange.from, "dd LLL y", { locale: idLocale });
  };

  if (loadingRiwayat) return (
    <div className="p-4 space-y-4">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin/naik-kelas">Naik Kelas</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Riwayat Kenaikan Kelas</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <Card>
        <CardHeader>
          <CardTitle>Riwayat Kenaikan Kelas</CardTitle>
          <CardDescription>Daftar santri yang telah naik kelas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4 mb-4">
            <div className="flex-1"><Skeleton className="h-10 w-full rounded-md" /></div>
            <div className="flex-1"><Skeleton className="h-10 w-full rounded-md" /></div>
            <div className="flex-1"><Skeleton className="h-10 w-full rounded-md" /></div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><Skeleton className="h-4 w-8" /></TableHead>
                <TableHead><Skeleton className="h-4 w-32" /></TableHead>
                <TableHead><Skeleton className="h-4 w-24" /></TableHead>
                <TableHead><Skeleton className="h-4 w-32" /></TableHead>
                <TableHead><Skeleton className="h-4 w-32" /></TableHead>
                <TableHead><Skeleton className="h-4 w-32" /></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="p-4 space-y-4">
      {/* Breadcrumb shadcn */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin/naik-kelas">Naik Kelas</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Riwayat Kenaikan Kelas</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <h2 className="text-3xl font-bold tracking-tight">Riwayat Kenaikan Kelas</h2>
      {/* Card utama */}
      <Card>
        <CardHeader>
          <CardTitle>Riwayat Kenaikan Kelas</CardTitle>
          <CardDescription>
            Daftar santri yang telah naik kelas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filter dan Pencarian */}
          <div className="flex space-x-4 mb-4">
            <div className="flex-1">
              <Select 
                value={selectedTahunAjaran} 
                onValueChange={(value: string) => {
                  console.log('Selected Tahun Ajaran:', value);
                  setSelectedTahunAjaran(value);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Tahun Ajaran" />
                </SelectTrigger>
                <SelectContent>
                  {tahunAjaranList.length === 0 ? (
                    <SelectItem value="default" disabled>Tidak ada tahun ajaran</SelectItem>
                  ) : (
                    tahunAjaranList.map(tahunAjaran => (
                      <SelectItem key={tahunAjaran.id} value={tahunAjaran.id}>
                        {tahunAjaran.name} {tahunAjaran.aktif ? '(Aktif)' : ''}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Input 
                placeholder="Cari nama atau ID santri" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateRange?.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {renderDateButton()}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Tabel Riwayat Kenaikan Kelas */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No</TableHead>
                <TableHead>Nama Santri</TableHead>
                <TableHead>ID Santri</TableHead>
                <TableHead>Kelas Lama</TableHead>
                <TableHead>Kelas Baru</TableHead>
                <TableHead>Tanggal Naik Kelas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRiwayat.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    Tidak ada riwayat kenaikan kelas
                  </TableCell>
                </TableRow>
              ) : (
                filteredRiwayat.map((riwayat, index) => (
                  <TableRow key={riwayat.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{riwayat.santri.name}</TableCell>
                    <TableCell>{riwayat.santri.santriId}</TableCell>
                    <TableCell>
                      {riwayat.kelasLama.name} 
                      {riwayat.kelasLama.level ? ` (${riwayat.kelasLama.level})` : ''}
                    </TableCell>
                    <TableCell>
                      {riwayat.kelasBaru.name}
                      {riwayat.kelasBaru.level ? ` (${riwayat.kelasBaru.level})` : ''}
                    </TableCell>
                    <TableCell>
                      {format(parseISO(riwayat.tanggal), 'dd MMMM yyyy HH:mm', { locale: idLocale })}
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
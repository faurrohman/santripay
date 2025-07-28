"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
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
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";

interface Santri {
  id: string;
  name: string;
  santriId: string;
  kelas: {
    id: string;
    name: string;
    level?: string;
  };
}

interface Kelas {
  id: string;
  name: string;
  level?: string;
  tahunAjaran?: { id: string; name: string; aktif?: boolean };
}

// Tambahkan interface untuk memperluas Santri dengan total tagihan
interface SantriWithTagihan extends Santri {
  totalTagihan: number;
  tagihanBelumLunas: number;
}

// Tipe untuk checkbox
type CheckboxValue = boolean | 'indeterminate';

export default function NaikKelasPage() {
  const [santriList, setSantriList] = useState<SantriWithTagihan[]>([]);
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [selectedSantri, setSelectedSantri] = useState<string[]>([]);
  const [kelasLama, setKelasLama] = useState<string | null>(null);
  const [kelasBaru, setKelasBaru] = useState<string | null>(null);
  // State loading untuk data kelas
  const [loadingKelas, setLoadingKelas] = useState(true);

  // Tambahkan fungsi untuk mengecek apakah semua santri dipilih
  const isAllSelected = santriList.length > 0 && 
    selectedSantri.length === santriList.length;

  // Fungsi untuk memilih/menghapus semua santri
  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedSantri([]);
    } else {
      setSelectedSantri(santriList.map(santri => santri.id));
    }
  };

  // Fetch santri and kelas data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch tahun ajaran aktif terlebih dahulu
        const tahunAjaranResponse = await fetch('/api/tahun-ajaran');
        const tahunAjaranData = await tahunAjaranResponse.json();
        const tahunAjaranAktif = tahunAjaranData.find((ta: any) => ta.aktif);

        if (!tahunAjaranAktif) {
          throw new Error('Tidak ada tahun ajaran aktif');
        }

        // Fetch daftar kelas dengan filter tahun ajaran aktif
        const kelasResponse = await fetch(`/api/kelas?tahunAjaranId=${tahunAjaranAktif.id}`);
        const kelasData = await kelasResponse.json();
        
        if (!kelasResponse.ok) {
          throw new Error(kelasData.message || 'Gagal mengambil data kelas');
        }
        setKelasList(kelasData);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Gagal mengambil data");
        console.error(error);
      } finally {
        setLoadingKelas(false);
      }
    };

    fetchData();
  }, []);

  // Fetch santri berdasarkan kelas lama
  const fetchSantriByKelas = async (kelasId: string) => {
    try {
      const response = await fetch(`/api/santri/naik-kelas?kelasId=${kelasId}&withTagihan=true`);
      const santriData = await response.json();
      
      if (!response.ok) {
        throw new Error(santriData.message || 'Gagal mengambil data santri');
      }
      
      setSantriList(santriData);
      // Reset pilihan santri
      setSelectedSantri([]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal mengambil data santri");
      console.error(error);
    }
  };

  // Handle santri selection
  const toggleSantriSelection = (santriId: string) => {
    setSelectedSantri(prev => 
      prev.includes(santriId) 
        ? prev.filter(id => id !== santriId)
        : [...prev, santriId]
    );
  };

  // Fungsi untuk memfilter kelas berdasarkan kelas lama
  const filterKelasBaru = (kelasLamaId?: string | null): Kelas[] => {
    if (!kelasLamaId) return kelasList;
    
    // Ambil level kelas lama
    const kelasLama = kelasList.find(k => k.id === kelasLamaId);
    
    if (!kelasLama) return kelasList;

    // Filter kelas baru yang memiliki level lebih tinggi
    return kelasList.filter(k => 
      k.id !== kelasLamaId && 
      (!kelasLama.level || !k.level || k.level > kelasLama.level) &&
      k.tahunAjaran?.aktif
    );
  };

  // Validasi sebelum naik kelas
  const validateNaikKelas = (): boolean => {
    if (!kelasLama) {
      toast.error("Pilih kelas lama terlebih dahulu");
      return false;
    }

    if (!kelasBaru) {
      toast.error("Pilih kelas baru");
      return false;
    }

    if (kelasLama === kelasBaru) {
      toast.error("Kelas lama dan kelas baru harus berbeda");
      return false;
    }

    if (selectedSantri.length === 0) {
      toast.error("Pilih minimal satu santri");
      return false;
    }

    return true;
  };

  // Proses kenaikan kelas
  const handleNaikKelas = async () => {
    // Validasi input
    if (!validateNaikKelas()) return;

    // Cek santri dengan tagihan belum lunas
    const santriBelumsLunas = santriList.filter(
      santri => santri.tagihanBelumLunas && santri.tagihanBelumLunas > 0
    );

    // Konfirmasi jika ada santri dengan tagihan belum lunas
    if (santriBelumsLunas.length > 0) {
      const konfirmasi = window.confirm(
        `Terdapat ${santriBelumsLunas.length} santri dengan tagihan belum lunas. Yakin ingin melanjutkan kenaikan kelas?`
      );

      if (!konfirmasi) {
        return;
      }
    }

    try {
      const response = await fetch('/api/santri/naik-kelas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          santriIds: selectedSantri,
          kelasLamaId: kelasLama,
          kelasBaru: kelasBaru
        })
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || 'Gagal proses kenaikan kelas');
      }

      // Tampilkan detail kenaikan kelas
      const kelasLamaInfo = kelasList.find(k => k.id === kelasLama);
      const kelasBaruInfo = kelasList.find(k => k.id === kelasBaru);

      toast.success(
        `Berhasil naik kelas`, 
        {
          description: `${responseData.santriDinaikan} santri dipindahkan dari kelas ${kelasLamaInfo?.name || 'Lama'}${kelasLamaInfo?.level ? ` (${kelasLamaInfo.level})` : ''}${kelasLamaInfo?.tahunAjaran ? ` - ${kelasLamaInfo.tahunAjaran.name}` : ''} ke kelas ${kelasBaruInfo?.name || 'Baru'}${kelasBaruInfo?.level ? ` (${kelasBaruInfo.level})` : ''}${kelasBaruInfo?.tahunAjaran ? ` - ${kelasBaruInfo.tahunAjaran.name}` : ''}`,
          duration: 5000
        }
      );
      
      // Reset selection
      setSelectedSantri([]);
      setKelasLama(null);
      setKelasBaru(null);

      // Refresh data dengan parameter withTagihan
      const tahunAjaranResponse = await fetch('/api/tahun-ajaran');
      const tahunAjaranData = await tahunAjaranResponse.json();
      const tahunAjaranAktif = tahunAjaranData.find((ta: any) => ta.aktif);

      if (tahunAjaranAktif && kelasLama) {
        const santriResponse = await fetch(`/api/santri/naik-kelas?kelasId=${kelasLama}&withTagihan=true`);
        const santriData = await santriResponse.json();
        
        if (!santriResponse.ok) {
          throw new Error(santriData.message || 'Gagal mengambil data santri');
        }
        setSantriList(santriData);
      }
    } catch (error) {
      toast.error("Gagal Proses Kenaikan Kelas", {
        description: error instanceof Error ? error.message : "Terjadi kesalahan tidak dikenal",
        duration: 5000
      });
      console.error(error);
    }
  };

  // Render bagian tabel santri
  const renderSantriTable = () => {
    if (!kelasLama) {
      return (
        <TableRow>
          <TableCell colSpan={6} className="text-center">
            Pilih Kelas Lama untuk Melihat Daftar Santri
          </TableCell>
        </TableRow>
      );
    }

    if (santriList.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={6} className="text-center">
            Tidak ada santri di kelas ini
          </TableCell>
        </TableRow>
      );
    }

    return santriList.map((santri) => (
      <TableRow key={santri.id}>
        <TableCell>
          <Checkbox
            checked={selectedSantri.includes(santri.id)}
            onCheckedChange={() => toggleSantriSelection(santri.id)}
          />
        </TableCell>
        <TableCell>{santri.name}</TableCell>
        <TableCell>{santri.kelas.name}</TableCell>
        <TableCell>
          {new Intl.NumberFormat('id-ID', { 
            style: 'currency', 
            currency: 'IDR' 
          }).format(santri.totalTagihan || 0)}
        </TableCell>
        <TableCell>
          {new Intl.NumberFormat('id-ID', { 
            style: 'currency', 
            currency: 'IDR' 
          }).format(santri.tagihanBelumLunas || 0)}
        </TableCell>
        <TableCell>
          {santri.tagihanBelumLunas && santri.tagihanBelumLunas > 0 ? (
            <span className="text-red-600 font-semibold">Belum Lunas</span>
          ) : (
            <span className="text-green-600 font-semibold">Lunas</span>
          )}
        </TableCell>
      </TableRow>
    ));
  };

  // Modifikasi render header tabel
  const renderTableHeader = () => (
    <TableHeader>
      <TableRow>
        <TableHead>
          <Checkbox
            checked={isAllSelected}
            onCheckedChange={toggleSelectAll}
          />
        </TableHead>
        <TableHead>Nama Santri</TableHead>
        <TableHead>Kelas</TableHead>
        <TableHead>Total Tagihan</TableHead>
        <TableHead>Tagihan Belum Lunas</TableHead>
        <TableHead>Status</TableHead>
      </TableRow>
    </TableHeader>
  );

  // Render bagian footer untuk kenaikan kelas
  const renderFooter = () => {
    // Hitung jumlah santri dengan tagihan belum lunas
    const santriBelumsLunas = santriList.filter(
      santri => santri.tagihanBelumLunas && santri.tagihanBelumLunas > 0
    );

    return (
      <div className="flex justify-between items-center mt-4">
        <div>
          {santriBelumsLunas.length > 0 && (
            <p className="text-red-600 font-semibold">
              Peringatan: {santriBelumsLunas.length} santri memiliki tagihan belum lunas
            </p>
          )}
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={() => {
              setSelectedSantri([]);
              setKelasLama(null);
              setKelasBaru(null);
            }}
          >
            Reset
          </Button>
          <Button 
            onClick={handleNaikKelas} 
            disabled={!kelasLama || !kelasBaru || selectedSantri.length === 0}
          >
            Naik Kelas
          </Button>
        </div>
      </div>
    );
  };

  if (loadingKelas) return (
    <div className="p-4 space-y-4">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin">Admin</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Naik Kelas</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <h2 className="text-3xl font-bold tracking-tight">Kenaikan Kelas</h2>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Kenaikan Kelas</CardTitle>
              <CardDescription>
                Pilih kelas lama, kelas baru, dan santri yang akan dinaikkan kelasnya.
              </CardDescription>
            </div>
            <Button variant="outline" disabled>
              <BookOpen className="mr-2 h-4 w-4" />
              Riwayat Kenaikan Kelas
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4 mb-4">
            <div className="flex-1">
              <Label>Kelas Lama</Label>
              <Skeleton className="h-10 w-full rounded-md mt-2" />
            </div>
            <div className="flex-1">
              <Label>Kelas Baru</Label>
              <Skeleton className="h-10 w-full rounded-md mt-2" />
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><Skeleton className="h-4 w-4" /></TableHead>
                <TableHead><Skeleton className="h-4 w-32" /></TableHead>
                <TableHead><Skeleton className="h-4 w-24" /></TableHead>
                <TableHead><Skeleton className="h-4 w-24" /></TableHead>
                <TableHead><Skeleton className="h-4 w-24" /></TableHead>
                <TableHead><Skeleton className="h-4 w-20" /></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex justify-between items-center mt-4">
            <div>
              <Skeleton className="h-4 w-64" />
            </div>
            <div className="flex space-x-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
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
            <BreadcrumbPage>Naik Kelas</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <h2 className="text-3xl font-bold tracking-tight">Kenaikan Kelas</h2>
      {/* Card utama */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Kenaikan Kelas</CardTitle>
              <CardDescription>
                Pilih kelas lama, kelas baru, dan santri yang akan dinaikkan kelasnya.
              </CardDescription>
            </div>
            <Button variant="outline" asChild>
              <Link href="/admin/naik-kelas/riwayat">
                <BookOpen className="mr-2 h-4 w-4" />
                Riwayat Kenaikan Kelas
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4 mb-4">
            <div className="flex-1 ">
              <Label>Kelas Lama</Label>
              <Select 
                value={kelasLama || ""} 
                onValueChange={(value: string) => {
                  // Reset state saat kelas lama berubah
                  setKelasLama(value);
                  setKelasBaru(null);
                  setSantriList([]);
                  setSelectedSantri([]);

                  // Fetch santri untuk kelas yang dipilih
                  fetchSantriByKelas(value);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Kelas Lama" />
                </SelectTrigger>
                <SelectContent>
                  {kelasList.filter(kelas => kelas.tahunAjaran?.aktif).map(kelas => (
                    <SelectItem key={kelas.id} value={kelas.id}>
                      {kelas.name} {kelas.level ? `(${kelas.level})` : ''} {kelas.tahunAjaran ? `- ${kelas.tahunAjaran.name}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label>Kelas Baru</Label>
              <Select 
                value={kelasBaru || ""} 
                onValueChange={(value: string) => setKelasBaru(value)}
                disabled={!kelasLama}
              >
                <SelectTrigger>
                  <SelectValue placeholder={!kelasLama ? "Pilih Kelas Lama Dulu" : "Pilih Kelas Baru"} />
                </SelectTrigger>
                <SelectContent>
                  {filterKelasBaru(kelasLama).map(kelas => (
                    <SelectItem key={kelas.id} value={kelas.id}>
                      {kelas.name} {kelas.level ? `(${kelas.level})` : ''} {kelas.tahunAjaran ? `- ${kelas.tahunAjaran.name}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tabel Santri */}
          <Table>
            {renderTableHeader()}
            <TableBody>
              {renderSantriTable()}
            </TableBody>
          </Table>

          {/* Footer */}
          {renderFooter()}
        </CardContent>
      </Card>
    </div>
  );
}
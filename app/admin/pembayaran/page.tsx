"use client"

import { ArrowLeft, Menu } from "lucide-react"
import { useSession } from "next-auth/react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { AppSidebar } from "@/components/admin/app-sidebar"
import { Separator } from "@/components/ui/separator"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import { id } from "date-fns/locale"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useState } from "react"
import { ExportButtons } from "@/components/ui/export-buttons"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

interface Pembayaran {
  id: string
  tagihanId: string
  santriId: string
  amount: number
  paymentDate: string
  note: string
  status: "pending" | "approved" | "rejected"
  createdAt: string
  updatedAt: string
  paymentMethod?: string
  santri: {
    name: string
    kelas: {
      name: string
    }
  }
  tagihan: {
    jenisTagihan: {
      name: string
    }
  }
}

export default function PembayaranPage() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const router = useRouter()
  const [selectedPembayaran, setSelectedPembayaran] = useState<Pembayaran | null>(null)
  const [rejectionNote, setRejectionNote] = useState("")
  const [showDetail, setShowDetail] = useState<Pembayaran | null>(null)
  const [filterNama, setFilterNama] = useState("");
  const [filterKelas, setFilterKelas] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const { data: pembayaran, isLoading } = useQuery<Pembayaran[]>({
    queryKey: ["pembayaran"],
    queryFn: async () => {
      const response = await fetch("/api/pembayaran", {
        credentials: "include"
      })
      if (!response.ok) {
        throw new Error("Gagal mengambil data pembayaran")
      }
      return response.json()
    },
  })

  const handleApprove = async (id: string) => {
    try {
      const response = await fetch(`/api/pembayaran/${id}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(error)
      }

      toast.success("Pembayaran berhasil disetujui")
      queryClient.invalidateQueries({ queryKey: ["pembayaran"] })
    } catch (error) {
      console.error("Error approving payment:", error)
      toast.error(error instanceof Error ? error.message : "Gagal menyetujui pembayaran")
    }
  }

  const handleReject = async (id: string) => {
    if (!rejectionNote) {
      toast.error("Alasan penolakan harus diisi")
      return
    }

    try {
      const response = await fetch(`/api/pembayaran/${id}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ note: rejectionNote }),
        credentials: "include",
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(error)
      }

      toast.success("Pembayaran berhasil ditolak")
      setRejectionNote("")
      setSelectedPembayaran(null)
      queryClient.invalidateQueries({ queryKey: ["pembayaran"] })
    } catch (error) {
      console.error("Error rejecting payment:", error)
      toast.error(error instanceof Error ? error.message : "Gagal menolak pembayaran")
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline">Menunggu</Badge>
      case "approved":
        return <Badge variant="default">Disetujui</Badge>
      case "rejected":
        return <Badge variant="destructive">Ditolak</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const filteredPembayaran = (pembayaran || []).filter((item) => {
    const namaMatch = item.santri.name.toLowerCase().includes(filterNama.toLowerCase());
    const kelasMatch = item.santri.kelas.name.toLowerCase().includes(filterKelas.toLowerCase());
    const statusMatch = filterStatus === "" || item.status === filterStatus;
    return namaMatch && kelasMatch && statusMatch;
  });

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
                  <BreadcrumbLink href="/admin/dashboard">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Pembayaran</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </div>
        <Button onClick={() => router.push("/admin/dashboard")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Kembali ke Dashboard
        </Button>
      </header>

      <div className="flex-1 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row gap-2 items-center">
                <Input
                  placeholder="Filter nama santri..."
                  value={filterNama}
                  onChange={e => setFilterNama(e.target.value)}
                  className="max-w-xs"
                />
                <Input
                  placeholder="Filter kelas..."
                  value={filterKelas}
                  onChange={e => setFilterKelas(e.target.value)}
                  className="max-w-xs"
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="min-w-[140px] justify-between">
                      {filterStatus === "" ? "Semua Status" :
                        filterStatus === "pending" ? "Menunggu" :
                        filterStatus === "approved" ? "Disetujui" :
                        filterStatus === "rejected" ? "Ditolak" : filterStatus}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => setFilterStatus("")}>Semua Status</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilterStatus("pending")}>Menunggu</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilterStatus("approved")}>Disetujui</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilterStatus("rejected")}>Ditolak</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <ExportButtons
                data={
                  filteredPembayaran.slice().sort((a, b) => {
                    const namaA = a.santri.name.toLowerCase();
                    const namaB = b.santri.name.toLowerCase();
                    if (namaA < namaB) return -1;
                    if (namaA > namaB) return 1;
                    const kelasA = a.santri.kelas.name.toLowerCase();
                    const kelasB = b.santri.kelas.name.toLowerCase();
                    if (kelasA < kelasB) return -1;
                    if (kelasA > kelasB) return 1;
                    return 0;
                  }).map((item) => ({
                  Santri: item.santri.name,
                  Kelas: item.santri.kelas.name,
                  "Jenis Tagihan": item.tagihan?.jenisTagihan?.name || "-",
                  Jumlah: item.amount,
                  Tanggal: item.paymentDate,
                  Status: item.status === "pending" ? "Menunggu" : item.status === "approved" ? "Disetujui" : item.status === "rejected" ? "Ditolak" : item.status,
                  Catatan: item.note || "-",
                  }))
                }
                columns={[
                  { header: "Santri", accessor: "Santri" },
                  { header: "Kelas", accessor: "Kelas" },
                  { header: "Jenis Tagihan", accessor: "Jenis Tagihan" },
                  { header: "Jumlah", accessor: "Jumlah" },
                  { header: "Tanggal", accessor: "Tanggal" },
                  { header: "Status", accessor: "Status" },
                  { header: "Catatan", accessor: "Catatan" },
                ]}
                filename="data-pembayaran"
              />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Santri</TableHead>
                      <TableHead>Kelas</TableHead>
                      <TableHead>Jenis Tagihan</TableHead>
                      <TableHead>Jumlah</TableHead>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : filteredPembayaran?.length === 0 ? (
              <div className="flex h-full items-center justify-center py-10">
                <p className="text-sm text-muted-foreground">Tidak ada pembayaran yang sesuai dengan filter</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Santri</TableHead>
                      <TableHead>Kelas</TableHead>
                      <TableHead>Jenis Tagihan</TableHead>
                      <TableHead>Jumlah</TableHead>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPembayaran?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.santri.name}</TableCell>
                        <TableCell>{item.santri.kelas.name}</TableCell>
                        <TableCell>{item.tagihan?.jenisTagihan?.name || "-"}</TableCell>
                        <TableCell>
                          {new Intl.NumberFormat("id-ID", {
                            style: "currency",
                            currency: "IDR",
                          }).format(item.amount)}
                        </TableCell>
                        <TableCell>
                          {formatDistanceToNow(new Date(item.paymentDate), {
                            addSuffix: true,
                            locale: id,
                          })}
                        </TableCell>
                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {item.status === "pending" && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleApprove(item.id)}
                                >
                                  Setujui
                                </Button>
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => setSelectedPembayaran(item)}
                                    >
                                      Tolak
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="sm:max-w-[425px]">
                                    <ScrollArea className="max-h-[70vh]">
                                      <DialogHeader>
                                        <DialogTitle>Tolak Pembayaran</DialogTitle>
                                        <DialogDescription>
                                          Berikan alasan penolakan pembayaran ini.
                                        </DialogDescription>
                                      </DialogHeader>
                                      <div className="grid gap-4 py-4">
                                        <div className="grid gap-2">
                                          <Label htmlFor="note">Alasan Penolakan</Label>
                                          <Textarea
                                            id="note"
                                            value={rejectionNote}
                                            onChange={(e) => setRejectionNote(e.target.value)}
                                            placeholder="Masukkan alasan penolakan..."
                                          />
                                        </div>
                                      </div>
                                    </ScrollArea>
                                    <DialogFooter>
                                      <Button
                                        variant="destructive"
                                        onClick={() => handleReject(item.id)}
                                      >
                                        Tolak Pembayaran
                                      </Button>
                                    </DialogFooter>
                                  </DialogContent>
                                </Dialog>
                              </>
                            )}
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setShowDetail(item)}
                            >
                              Lihat Detail
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {showDetail && (
        <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <ScrollArea className="max-h-[70vh]">
              <DialogHeader>
                <DialogTitle>Detail Pembayaran</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4 mb-2">
                  <div className="text-right font-medium">Santri</div>
                  <div className="col-span-3">{showDetail.santri.name}</div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4 mb-2">
                  <div className="text-right font-medium">Kelas</div>
                  <div className="col-span-3">{showDetail.santri.kelas.name}</div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4 mb-2">
                  <div className="text-right font-medium">Jenis Tagihan</div>
                  <div className="col-span-3">{showDetail.tagihan?.jenisTagihan?.name || "-"}</div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4 mb-2">
                  <div className="text-right font-medium">Jumlah</div>
                  <div className="col-span-3">{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(showDetail.amount)}</div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4 mb-2">
                  <div className="text-right font-medium">Tanggal</div>
                  <div className="col-span-3">{new Date(showDetail.paymentDate).toLocaleString("id-ID")}</div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4 mb-2">
                  <div className="text-right font-medium">Metode Pembayaran</div>
                  <div className="col-span-3">{showDetail.paymentMethod || "-"}</div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4 mb-2">
                  <div className="text-right font-medium">Status</div>
                  <div className="col-span-3">{getStatusBadge(showDetail.status)}</div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <div className="text-right font-medium">Catatan</div>
                  <div className="col-span-3">{showDetail.note || "-"}</div>
                </div>
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button onClick={() => setShowDetail(null)}>Tutup</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
} 
"use client"

import { ArrowLeft, Menu, Download, FileText, Printer } from "lucide-react"
import { useSession } from "next-auth/react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
  const [showStruk, setShowStruk] = useState<Pembayaran | null>(null)
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

  const generateStrukPDF = async (pembayaran: Pembayaran) => {
    try {
      toast.loading('Mengambil data struk...', { id: 'struk-loading' })
      
      const response = await fetch('/api/pembayaran/struk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pembayaranId: pembayaran.id }),
      })

      if (!response.ok) {
        throw new Error('Gagal mengambil data struk')
      }

      const htmlContent = await response.text()
      
      // Create a blob with the HTML content
      const blob = new Blob([htmlContent], { type: 'text/html' })
      const url = window.URL.createObjectURL(blob)
      
      // Create a temporary link element to trigger download
      const link = document.createElement('a')
      link.href = url
      link.download = `struk-pembayaran-${pembayaran.santri.name}-${new Date().toISOString().split('T')[0]}.html`
      
      // Append to body, click, and remove
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Clean up the URL object
      window.URL.revokeObjectURL(url)
      
      toast.dismiss('struk-loading')
      toast.success('Struk berhasil didownload! File HTML tersimpan di folder Downloads.')
      
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast.dismiss('struk-loading')
      toast.error('Gagal download struk')
    }
  }

  const printStruk = (pembayaran: Pembayaran) => {
    // Quick print using frontend data (no API call)
    toast.loading('Mempersiapkan struk untuk print...', { id: 'print-loading' })
    
    const printWindow = window.open('', '_blank', 'width=600,height=800,scrollbars=yes,resizable=yes')
    if (!printWindow) {
      toast.dismiss('print-loading')
      toast.error('Popup diblokir. Silakan izinkan popup untuk situs ini.')
      return
    }

    const strukContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Struk Pembayaran - ${pembayaran.santri.name}</title>
        <meta charset="utf-8">
        <style>
          * { box-sizing: border-box; }
          body { 
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 15px;
            background: white;
            color: #000;
            line-height: 1.4;
            font-size: 12px;
          }
          .struk {
            border: 1px solid #000;
            padding: 0;
            max-width: 400px;
            margin: 0 auto;
            background: white;
          }
          .header {
            text-align: center;
            border-bottom: 1px solid #000;
            padding: 15px 10px;
            background: #f8f9fa;
          }
          .header h1 {
            margin: 0 0 5px 0;
            font-size: 16px;
            font-weight: bold;
            text-transform: uppercase;
          }
          .header p {
            margin: 0;
            font-size: 12px;
            color: #666;
          }
          .content {
            padding: 15px 10px;
          }
          .row {
            display: flex;
            justify-content: space-between;
            padding: 4px 0;
            border-bottom: 1px dotted #ccc;
            font-size: 11px;
          }
          .row:last-child {
            border-bottom: none;
          }
          .label {
            font-weight: bold;
            flex: 1;
          }
          .value {
            text-align: right;
            flex: 1;
          }
          .amount-row {
            border-top: 2px solid #000;
            border-bottom: 2px solid #000;
            padding: 8px 0;
            margin: 8px 0;
          }
          .amount-row .label {
            font-size: 14px;
            font-weight: bold;
          }
          .amount-row .value {
            font-size: 16px;
            font-weight: bold;
          }
          .footer {
            text-align: center;
            border-top: 1px solid #000;
            padding: 10px;
            background: #f8f9fa;
            font-size: 10px;
          }
          .footer p {
            margin: 2px 0;
          }
          .note {
            margin-top: 10px;
            padding: 8px;
            background: #f5f5f5;
            border: 1px solid #ddd;
            font-size: 10px;
          }
          @media print {
            body { margin: 0; padding: 5px; }
            .struk { border: 1px solid #000 !important; }
            .no-print { display: none !important; }
            @page { margin: 0.3in; size: A5; }
          }
        </style>
      </head>
      <body>
        <div class="struk">
          <div class="header">
            <h1>STRUK PEMBAYARAN</h1>
            <p>Pondok Pesantren SantriPay</p>
          </div>
          
          <div class="content">
            <div class="row">
              <span class="label">No. Transaksi:</span>
              <span class="value">${pembayaran.id}</span>
            </div>
            
            <div class="row">
              <span class="label">Tanggal:</span>
              <span class="value">${new Date(pembayaran.paymentDate).toLocaleString('id-ID')}</span>
            </div>
            
            <div class="row">
              <span class="label">Santri:</span>
              <span class="value">${pembayaran.santri.name}</span>
            </div>
            
            <div class="row">
              <span class="label">Kelas:</span>
              <span class="value">${pembayaran.santri.kelas.name}</span>
            </div>
            
            <div class="row">
              <span class="label">Tagihan:</span>
              <span class="value">${pembayaran.tagihan?.jenisTagihan?.name || '-'}</span>
            </div>
            
            <div class="row amount-row">
              <span class="label">JUMLAH:</span>
              <span class="value">${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(pembayaran.amount)}</span>
            </div>
            
            <div class="row">
              <span class="label">Metode:</span>
              <span class="value">${pembayaran.paymentMethod || 'Manual'}</span>
            </div>
            
            <div class="row">
              <span class="label">Status:</span>
              <span class="value" style="font-weight: bold; color: ${pembayaran.status === 'approved' ? 'green' : pembayaran.status === 'rejected' ? 'red' : 'orange'};">
                ${pembayaran.status === 'approved' ? 'DISETUJUI' : pembayaran.status === 'rejected' ? 'DITOLAK' : 'MENUNGGU'}
              </span>
            </div>
            
            ${pembayaran.note ? `
            <div class="note">
              <strong>Catatan:</strong><br>
              ${pembayaran.note}
            </div>
            ` : ''}
          </div>
          
          <div class="footer">
            <p><strong>Struk ini adalah bukti pembayaran yang sah</strong></p>
            <p>Dicetak: ${new Date().toLocaleString('id-ID')}</p>
            <p>SantriPay - Sistem Pembayaran Digital</p>
          </div>
        </div>
      </body>
      </html>
    `

    printWindow.document.write(strukContent)
    printWindow.document.close()
    
    toast.dismiss('print-loading')
    
    // Quick print with auto-close
    setTimeout(() => {
      try {
        printWindow.focus()
        printWindow.print()
        
        toast.success('Struk siap untuk dicetak')
        
        // Auto-close after print (for quick printing)
        setTimeout(() => {
          if (!printWindow.closed) {
            printWindow.close()
          }
        }, 2000)
        
      } catch (printError) {
        console.error('Print error:', printError)
        toast.error('Gagal membuka dialog print')
        printWindow.close()
      }
    }, 300) // Faster for quick printing
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
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowStruk(item)}
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              Struk
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
            <ScrollArea className="max-h-[60vh] overflow-y-auto">
              <div className="pr-4">
                <DialogHeader>
                  <DialogTitle>Detail Pembayaran</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4 mb-2">
                    <div className="text-right font-medium">Santri</div>
                    <div className="col-span-3 break-words">{showDetail.santri.name}</div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4 mb-2">
                    <div className="text-right font-medium">Kelas</div>
                    <div className="col-span-3 break-words">{showDetail.santri.kelas.name}</div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4 mb-2">
                    <div className="text-right font-medium">Jenis Tagihan</div>
                    <div className="col-span-3 break-words">{showDetail.tagihan?.jenisTagihan?.name || "-"}</div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4 mb-2">
                    <div className="text-right font-medium">Jumlah</div>
                    <div className="col-span-3 break-words">{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(showDetail.amount)}</div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4 mb-2">
                    <div className="text-right font-medium">Tanggal</div>
                    <div className="col-span-3 break-words">{new Date(showDetail.paymentDate).toLocaleString("id-ID")}</div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4 mb-2">
                    <div className="text-right font-medium">Metode Pembayaran</div>
                    <div className="col-span-3 break-words">{showDetail.paymentMethod || "-"}</div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4 mb-2">
                    <div className="text-right font-medium">Status</div>
                    <div className="col-span-3">{getStatusBadge(showDetail.status)}</div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <div className="text-right font-medium">Catatan</div>
                    <div className="col-span-3 break-words">{showDetail.note || "-"}</div>
                  </div>
                </div>
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button onClick={() => setShowDetail(null)}>Tutup</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {showStruk && (
        <Dialog open={!!showStruk} onOpenChange={() => setShowStruk(null)}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Struk Validasi Pembayaran</DialogTitle>
              <DialogDescription>
                Struk pembayaran untuk {showStruk.santri.name}
              </DialogDescription>
            </DialogHeader>
            
            <ScrollArea className="max-h-[60vh] overflow-y-auto">
              <div className="pr-4">
                <Card className="print:shadow-none print:border-2 print:border-black">
                  <CardHeader className="text-center border-b-2 border-primary pb-4 mb-6">
                    <CardTitle className="text-2xl font-bold tracking-wide">
                      STRUK VALIDASI PEMBAYARAN
                    </CardTitle>
                    <CardDescription className="text-base font-medium">
                      Pondok Pesantren SantriPay
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <div className="flex justify-between items-center py-2 border-b border-dashed">
                        <Label className="font-semibold text-sm">No. Transaksi:</Label>
                        <Badge variant="outline" className="font-mono text-xs">
                          {showStruk.id}
                        </Badge>
                      </div>
                      
                      <div className="flex justify-between items-center py-2 border-b border-dashed">
                        <Label className="font-semibold text-sm">Tanggal:</Label>
                        <span className="text-sm">
                          {new Date(showStruk.paymentDate).toLocaleString('id-ID')}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center py-2 border-b border-dashed">
                        <Label className="font-semibold text-sm">Nama Santri:</Label>
                        <span className="text-sm font-medium">{showStruk.santri.name}</span>
                      </div>
                      
                      <div className="flex justify-between items-center py-2 border-b border-dashed">
                        <Label className="font-semibold text-sm">Kelas:</Label>
                        <Badge variant="secondary" className="text-xs">
                          {showStruk.santri.kelas.name}
                        </Badge>
                      </div>
                      
                      <div className="flex justify-between items-center py-2 border-b border-dashed">
                        <Label className="font-semibold text-sm">Jenis Tagihan:</Label>
                        <span className="text-sm">{showStruk.tagihan?.jenisTagihan?.name || '-'}</span>
                      </div>
                      
                      <div className="flex justify-between items-center py-3 border-b-2 border-primary">
                        <Label className="font-bold text-base">Jumlah:</Label>
                        <span className="text-lg font-bold text-primary">
                          {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(showStruk.amount)}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center py-2 border-b border-dashed">
                        <Label className="font-semibold text-sm">Metode Pembayaran:</Label>
                        <Badge variant="outline" className="text-xs">
                          {showStruk.paymentMethod || 'Manual'}
                        </Badge>
                      </div>
                      
                      <div className="flex justify-between items-center py-2 border-b border-dashed">
                        <Label className="font-semibold text-sm">Status:</Label>
                        <Badge 
                          variant={
                            showStruk.status === 'approved' ? 'default' : 
                            showStruk.status === 'rejected' ? 'destructive' : 
                            'outline'
                          }
                          className="text-xs font-bold"
                        >
                          {showStruk.status === 'approved' ? 'DISETUJUI' : 
                           showStruk.status === 'rejected' ? 'DITOLAK' : 
                           'MENUNGGU'}
                        </Badge>
                      </div>
                      
                      {showStruk.note && (
                        <div className="mt-4 p-3 bg-muted rounded-lg">
                          <Label className="font-semibold text-sm block mb-2">Catatan:</Label>
                          <p className="text-sm text-muted-foreground break-words">{showStruk.note}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  
                  <CardFooter className="text-center border-t-2 border-primary pt-4 mt-6">
                    <div className="w-full space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">
                        Struk ini adalah bukti validasi pembayaran yang sah
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Dicetak pada: {new Date().toLocaleString('id-ID')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Pondok Pesantren SantriPay - Sistem Pembayaran Digital
                      </p>
                    </div>
                  </CardFooter>
                </Card>
              </div>
            </ScrollArea>
            
            <DialogFooter className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => printStruk(showStruk)}
                className="flex-1"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print Cepat
              </Button>
              <Button
                variant="default"
                onClick={() => generateStrukPDF(showStruk)}
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Struk
              </Button>
              <Button onClick={() => setShowStruk(null)}>
                Tutup
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
} 
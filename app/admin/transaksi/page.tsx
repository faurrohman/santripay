"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, Menu, MoreHorizontal, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { AppSidebar } from "@/components/admin/app-sidebar";
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
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getFilteredRowModel,
  ColumnFiltersState,
  VisibilityState,
  RowSelectionState,
  Table as TanstackTable,
  Row,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { ExportButtons } from "@/components/ui/export-buttons";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

interface Tagihan {
  id: string;
  santriId: string;
  jenisTagihanId: string;
  amount: number;
  dueDate: string;
    status: "pending" | "paid" | "overdue";
  description?: string;
    santri?: {
      id: string;
      name: string;
      kelas?: {
        id: string;
        name: string;
        level?: string;
      };
    };
    jenisTagihan: {
      id: string;
      name: string;
    amount: number;
  };
  tahunAjaran?: {
    id: string;
    name: string;
  };
}

interface Santri {
  id: string;
  name: string;
  kelas?: {
    id: string;
      name: string;
      level?: string;
    };
}

interface JenisTagihan {
    id: string;
    name: string;
  amount: number;
}

interface TahunAjaran {
  id: string;
  name: string;
  aktif: boolean;
}

const formSchema = z.object({
  id: z.string().optional(),
  santriId: z.string().uuid("Pilih santri yang valid"),
  jenisTagihanId: z.string().uuid("Pilih jenis tagihan yang valid"),
  amount: z.coerce.number().min(0, "Jumlah harus lebih dari atau sama dengan 0"),
  dueDate: z.string().min(1, "Tanggal jatuh tempo harus diisi"),
  description: z.string().optional(),
  tahunAjaranId: z.string().uuid().optional(),
});

const massalFormSchema = z.object({
  kelasId: z.string().uuid("Pilih kelas yang valid"),
  jenisTagihanId: z.string().uuid("Pilih jenis tagihan yang valid"),
  amount: z.coerce.number().min(0, "Jumlah harus lebih dari atau sama dengan 0"),
  dueDate: z.string().min(1, "Tanggal jatuh tempo harus diisi"),
  description: z.string().optional(),
  tahunAjaranId: z.string().uuid().optional(),
});

export default function TagihanPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  
  // State hooks
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingTagihan, setEditingTagihan] = React.useState<Tagihan | null>(null);
  const [deletingTagihanId, setDeletingTagihanId] = React.useState<string | null>(null);
  const [showingDetailTagihan, setShowingDetailTagihan] = React.useState<Tagihan | null>(null);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [isMassalDialogOpen, setIsMassalDialogOpen] = React.useState(false);

  // Form hook
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: "",
      santriId: "",
      jenisTagihanId: "",
      amount: 0,
      dueDate: "",
      description: "",
    },
  });

  const massalForm = useForm<z.infer<typeof massalFormSchema>>({
    resolver: zodResolver(massalFormSchema),
    defaultValues: {
      kelasId: "",
      jenisTagihanId: "",
      amount: 0,
      dueDate: "",
      description: "",
    },
  });

  // Query hooks
  const {
    data: tagihanData,
    isLoading: isLoadingTagihan,
    error: errorTagihan,
  } = useQuery<Tagihan[]>({ 
    queryKey: ["tagihan"], 
    queryFn: () => fetch("/api/tagihan").then((res) => res.json()) 
  });

  const {
    data: santriData,
    isLoading: isLoadingSantri,
    error: errorSantri,
  } = useQuery<Santri[]>({ 
    queryKey: ["santri"], 
    queryFn: () => fetch("/api/santri").then((res) => res.json()) 
  });

  const {
    data: jenisTagihanData,
    isLoading: isLoadingJenisTagihan,
    error: errorJenisTagihan,
  } = useQuery<JenisTagihan[]>({ 
    queryKey: ["jenis-tagihan"], 
    queryFn: () => fetch("/api/jenis-tagihan").then((res) => res.json()) 
  });

  const {
    data: kelasData,
    isLoading: isLoadingKelas,
    error: errorKelas,
  } = useQuery({
    queryKey: ["kelas"],
    queryFn: () => fetch("/api/kelas").then((res) => res.json()),
  });

  const { data: tahunAjaranList = [], isLoading: loadingTahunAjaran } = useQuery<TahunAjaran[]>({
    queryKey: ["tahun-ajaran"],
    queryFn: () => fetch("/api/tahun-ajaran").then((res) => res.json()),
  });

  // Mutation hooks
  const addTagihanMutation = useMutation({
    mutationFn: async (newTagihan: z.infer<typeof formSchema>) => {
      const response = await fetch("/api/tagihan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTagihan),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Gagal menambahkan tagihan");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tagihan"] });
      setIsDialogOpen(false);
      setEditingTagihan(null);
      form.reset();
      toast.success("Tagihan berhasil ditambahkan");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateTagihanMutation = useMutation({
    mutationFn: async (updatedTagihan: Partial<Tagihan> & { id: string }) => {
      const response = await fetch(`/api/tagihan/${updatedTagihan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          santriId: updatedTagihan.santriId,
          jenisTagihanId: updatedTagihan.jenisTagihanId,
          amount: updatedTagihan.amount,
          dueDate: updatedTagihan.dueDate,
          description: updatedTagihan.description,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Gagal memperbarui tagihan");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tagihan"] });
      setIsDialogOpen(false);
      setEditingTagihan(null);
      form.reset();
      toast.success("Tagihan berhasil diperbarui");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteTagihanMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/tagihan/${id}`, {
        method: "DELETE",
      }).then((res) => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tagihan"] });
      setDeletingTagihanId(null);
      toast.success("Tagihan berhasil dihapus");
    },
  });

  const massalMutation = useMutation({
    mutationFn: async (data: z.infer<typeof massalFormSchema>) => {
      const response = await fetch("/api/tagihan/massal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Gagal membuat tagihan massal");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tagihan"] });
      setIsMassalDialogOpen(false);
      massalForm.reset();
      toast.success(`Berhasil membuat ${data.count} tagihan massal!`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Table configuration
  const columns: ColumnDef<Tagihan>[] = [
    {
      id: "select",
      header: ({ table }: { table: TanstackTable<Tagihan> }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value: boolean | "indeterminate") => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }: { row: Row<Tagihan> }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value: boolean | "indeterminate") => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: "no",
      header: "No",
      cell: ({ row }: { row: Row<Tagihan> }) => row.index + 1,
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: "santri",
      header: "Santri",
      accessorFn: (row) => row.santri?.name || "-",
      cell: ({ row }: { row: Row<Tagihan> }) => {
        const santri = row.original.santri;
        return (
          <div className="flex flex-col">
            <div className="font-medium">{santri?.name || "-"}</div>
            <div className="text-sm text-muted-foreground">
              {santri?.kelas?.name || "-"} {santri?.kelas?.level ? `(${santri.kelas.level})` : ""}
            </div>
          </div>
        );
      },
    },
    {
      id: "jenisTagihan",
      header: "Jenis Tagihan",
      accessorFn: (row) => row.jenisTagihan?.name || "-",
      cell: ({ row }: { row: Row<Tagihan> }) => (
        <div className="flex flex-col">
          <div className="font-medium">{row.original.jenisTagihan?.name || "-"}</div>
          <div className="text-sm text-muted-foreground">
            {row.original.status === "overdue" ? "Terlambat" : 
             row.original.status === "paid" ? "Lunas" : "Menunggu"}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "amount",
      header: "Jumlah",
      cell: ({ row }: { row: Row<Tagihan> }) => {
        const amount = row.getValue<number>("amount");
        return (
            <div className="font-medium">
              {new Intl.NumberFormat("id-ID", {
                style: "currency",
                currency: "IDR",
              }).format(amount)}
          </div>
        );
      },
    },
    {
      accessorKey: "dueDate",
      header: "Jatuh Tempo",
      cell: ({ row }: { row: Row<Tagihan> }) => {
        const dueDate = new Date(row.getValue<string>("dueDate"));
          const today = new Date();
        today.setHours(0, 0, 0, 0);
        dueDate.setHours(0, 0, 0, 0);
          
        const isOverdue = dueDate < today && row.original.status !== "paid";
          
          return (
            <div className="flex flex-col">
              <div className="font-medium">
              {dueDate.toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </div>
            {isOverdue && (
                <div className="text-sm text-red-600">
                Terlambat
                </div>
              )}
            </div>
          );
      },
    },
    {
      id: "tahunAjaran",
      header: "Tahun Ajaran",
      accessorFn: (row) => row.tahunAjaran?.name || "-",
      cell: ({ row }: { row: Row<Tagihan> }) => (
        <span>{row.original.tahunAjaran?.name || "-"}</span>
      ),
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }: { row: Row<Tagihan> }) => {
        const tagihan = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleEditTagihan(tagihan)}>Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={() => confirmDeleteTagihan(tagihan.id)}>Hapus</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDetailTagihan(tagihan)}>Detail</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable<Tagihan>({
    data: tagihanData || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  // Handler functions
  const handleAddTagihan = () => {
    setEditingTagihan(null);
    form.reset({
      id: "",
      santriId: "",
      jenisTagihanId: "",
      amount: 0,
      dueDate: "",
      description: "",
      tahunAjaranId: tahunAjaranList.find((t) => t.aktif)?.id || tahunAjaranList[0]?.id || "",
    });
    setIsDialogOpen(true);
  };

  const handleEditTagihan = (tagihan: Tagihan) => {
    setEditingTagihan(tagihan);
      form.reset({
      id: tagihan.id,
      santriId: tagihan.santriId,
      jenisTagihanId: tagihan.jenisTagihanId,
      amount: tagihan.amount,
      dueDate: tagihan.dueDate,
      description: tagihan.description || "",
      tahunAjaranId: tagihan.tahunAjaran?.id || tahunAjaranList.find((t) => t.aktif)?.id || tahunAjaranList[0]?.id || "",
      });
      setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingTagihan(null);
    form.reset({
      id: "",
      santriId: "",
      jenisTagihanId: "",
      amount: 0,
      dueDate: "",
      description: "",
    });
  };

  const confirmDeleteTagihan = (id: string) => {
    setDeletingTagihanId(id);
  };

  const handleDeleteConfirm = () => {
    if (deletingTagihanId) {
      deleteTagihanMutation.mutate(deletingTagihanId);
    }
  };

  const handleDetailTagihan = (tagihan: Tagihan) => {
    setShowingDetailTagihan(tagihan);
  };

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      if (editingTagihan) {
        await updateTagihanMutation.mutateAsync({
          id: editingTagihan.id,
          ...data,
        });
      } else {
        await addTagihanMutation.mutateAsync(data);
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Terjadi kesalahan saat menyimpan data");
      }
    }
  };

  function exportExcel(data: Tagihan[]) {
    const ws = XLSX.utils.json_to_sheet(
      data.map((row) => ({
        Santri: row.santri?.name || "-",
        Kelas: row.santri?.kelas?.name || "-",
        "Jenis Tagihan": row.jenisTagihan?.name || "-",
        Jumlah: row.amount,
        "Jatuh Tempo": row.dueDate,
        Status:
          row.status === "overdue"
            ? "Terlambat"
            : row.status === "paid"
            ? "Lunas"
            : "Menunggu",
        "Tahun Ajaran": row.tahunAjaran?.name || "-",
        Deskripsi: row.description || "-",
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tagihan");
    XLSX.writeFile(wb, "tagihan.xlsx");
  }

  function exportPDF(data: Tagihan[]) {
    const doc = new jsPDF();
    // @ts-ignore
    doc.autoTable({
      head: [[
        "Santri",
        "Kelas",
        "Jenis Tagihan",
        "Jumlah",
        "Jatuh Tempo",
        "Status",
        "Tahun Ajaran",
        "Deskripsi",
      ]],
      body: data.map((row) => [
        row.santri?.name || "-",
        row.santri?.kelas?.name || "-",
        row.jenisTagihan?.name || "-",
        row.amount,
        row.dueDate,
        row.status === "overdue"
          ? "Terlambat"
          : row.status === "paid"
          ? "Lunas"
          : "Menunggu",
        row.tahunAjaran?.name || "-",
        row.description || "-",
      ]),
    });
    doc.save("tagihan.pdf");
  }

  if (isLoadingTagihan || isLoadingSantri || isLoadingJenisTagihan || isLoadingKelas) return (
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
                  <BreadcrumbPage>Tagihan</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <h2 className="text-3xl font-bold tracking-tight">Tagihan</h2>
          </div>
        </div>
        <div className="flex gap-2">
          <Button disabled variant="secondary">
            <PlusCircle className="mr-2 h-4 w-4" />
            Tagihan Massal
          </Button>
          <Button disabled>
            <PlusCircle className="mr-2 h-4 w-4" />
            Tambah Tagihan
          </Button>
        </div>
      </header>
      <div className="flex-1 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center py-4 gap-2">
                <Skeleton className="h-10 w-64 max-w-sm" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    <th className="px-2 py-2 text-left">Santri</th>
                    <th className="px-2 py-2 text-left">Jenis Tagihan</th>
                    <th className="px-2 py-2 text-left">Jumlah</th>
                    <th className="px-2 py-2 text-left">Jatuh Tempo</th>
                    <th className="px-2 py-2 text-left">Tahun Ajaran</th>
                    <th className="px-2 py-2 text-left">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {[...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b">
                      <td className="px-2 py-2"><Skeleton className="h-4 w-32" /></td>
                      <td className="px-2 py-2"><Skeleton className="h-4 w-32" /></td>
                      <td className="px-2 py-2"><Skeleton className="h-4 w-20" /></td>
                      <td className="px-2 py-2"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-2 py-2"><Skeleton className="h-4 w-32" /></td>
                      <td className="px-2 py-2"><Skeleton className="h-8 w-20" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
  if (errorTagihan || errorSantri || errorJenisTagihan || errorKelas) return <div>Terjadi kesalahan saat memuat data</div>;

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
                  <BreadcrumbPage>Tagihan</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <h2 className="text-3xl font-bold tracking-tight">Tagihan</h2>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsMassalDialogOpen(true)} variant="secondary">
            <PlusCircle className="mr-2 h-4 w-4" />
            Tagihan Massal
          </Button>
        <Button onClick={() => setIsDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Tambah Tagihan
        </Button>
        </div>
      </header>
      <div className="flex-1 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center py-4 gap-2">
                <Input
                  placeholder="Filter tagihan..."
                  value={(table.getColumn("santri")?.getFilterValue() as string) ?? ""}
                  onChange={(event) =>
                    table.getColumn("santri")?.setFilterValue(event.target.value)
                  }
                  className="max-w-sm"
                />
                <ExportButtons
                  data={table.getFilteredRowModel().rows.map((r) => ({
                    Santri: r.original.santri?.name || "-",
                    Kelas: r.original.santri?.kelas?.name || "-",
                    "Jenis Tagihan": r.original.jenisTagihan?.name || "-",
                    Jumlah: r.original.amount,
                    "Jatuh Tempo": r.original.dueDate,
                    Status:
                      r.original.status === "overdue"
                        ? "Terlambat"
                        : r.original.status === "paid"
                        ? "Lunas"
                        : "Menunggu",
                    "Tahun Ajaran": r.original.tahunAjaran?.name || "-",
                    Deskripsi: r.original.description || "-",
                  }))}
                  columns={[
                    { header: "Santri", accessor: "Santri" },
                    { header: "Kelas", accessor: "Kelas" },
                    { header: "Jenis Tagihan", accessor: "Jenis Tagihan" },
                    { header: "Jumlah", accessor: "Jumlah" },
                    { header: "Jatuh Tempo", accessor: "Jatuh Tempo" },
                    { header: "Status", accessor: "Status" },
                    { header: "Tahun Ajaran", accessor: "Tahun Ajaran" },
                    { header: "Deskripsi", accessor: "Deskripsi" },
                  ]}
                  filename="tagihan"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => {
                        return (
                          <TableHead key={header.id}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                          </TableHead>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && "selected"}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="h-24 text-center">
                        Tidak ada hasil.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-end space-x-2 py-4">
              <div className="flex-1 text-sm text-muted-foreground">
                {table.getFilteredSelectedRowModel().rows.length} dari{" "}
                {table.getFilteredRowModel().rows.length} baris yang dipilih.
              </div>
              <div className="space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  Sebelumnya
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  Berikutnya
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingTagihan ? "Edit Tagihan" : "Tambah Tagihan"}
              </DialogTitle>
              <DialogDescription>
                {editingTagihan
                  ? "Ubah informasi tagihan yang ada"
                  : "Tambahkan tagihan baru ke sistem"}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="santriId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Santri</FormLabel>
                      {editingTagihan ? (
                        <FormControl>
                          <Input
                            value={santriData?.find(s => s.id === field.value)?.name || '-'}
                            disabled
                          />
                        </FormControl>
                      ) : (
                        <Select 
                          onValueChange={field.onChange}
                          value={field.value}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih santri" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {santriData?.map((santri) => (
                              <SelectItem key={santri.id} value={santri.id}>
                                {santri.name} - {santri.kelas?.name} {santri.kelas?.level ? `(${santri.kelas.level})` : ""}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="jenisTagihanId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jenis Tagihan</FormLabel>
                      {editingTagihan ? (
                        <FormControl>
                          <Input
                            value={jenisTagihanData?.find(j => j.id === field.value)?.name || '-'}
                            disabled
                          />
                        </FormControl>
                      ) : (
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            const selectedJenisTagihan = jenisTagihanData?.find(j => j.id === value);
                            if (selectedJenisTagihan) {
                              form.setValue("amount", selectedJenisTagihan.amount);
                            }
                          }}
                          value={field.value}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih jenis tagihan" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {jenisTagihanData?.map((jenisTagihan) => (
                              <SelectItem key={jenisTagihan.id} value={jenisTagihan.id}>
                                {jenisTagihan.name} ({new Intl.NumberFormat("id-ID", {
                                  style: "currency",
                                  currency: "IDR",
                                }).format(jenisTagihan.amount)})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jumlah</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Masukkan jumlah"
                          {...field}
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(value === "" ? 0 : Number(value));
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Jatuh Tempo</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(new Date(field.value), "PPP", { locale: id })
                              ) : (
                                <span>Pilih tanggal</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={(date) => {
                              if (date) {
                                const formattedDate = date.toISOString().split('T')[0];
                                field.onChange(formattedDate);
                              }
                            }}
                            disabled={(date) =>
                              date < new Date("1900-01-01") || date > new Date("2100-12-31")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deskripsi</FormLabel>
                      <FormControl>
                        <Input placeholder="Masukkan deskripsi" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tahunAjaranId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tahun Ajaran</FormLabel>
                      <FormControl>
                        <select
                          className="border rounded px-2 py-1 w-full"
                          {...field}
                          value={field.value || tahunAjaranList.find((t) => t.aktif)?.id || tahunAjaranList[0]?.id || ""}
                          onChange={field.onChange}
                          disabled={loadingTahunAjaran}
                        >
                          <option value="" disabled>Pilih tahun ajaran</option>
                          {tahunAjaranList.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name} {t.aktif ? "(Aktif)" : ""}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseDialog}
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    disabled={addTagihanMutation.isPending || updateTagihanMutation.isPending}
                  >
                    {editingTagihan ? "Simpan Perubahan" : "Tambah"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Dialog open={!!showingDetailTagihan} onOpenChange={() => setShowingDetailTagihan(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <ScrollArea className="max-h-[70vh]">
              <DialogHeader>
                <DialogTitle>Detail Tagihan</DialogTitle>
                <DialogDescription>
                  Informasi lengkap mengenai tagihan.
                </DialogDescription>
              </DialogHeader>
              {showingDetailTagihan && (
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4 mb-2">
                    <div className="text-right font-medium">Santri</div>
                    <div className="col-span-3">
                      <div className="font-medium">
                        {showingDetailTagihan.santri?.name || "-"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {showingDetailTagihan.santri?.kelas?.name || "-"} 
                        {showingDetailTagihan.santri?.kelas?.level ? 
                         ` (${showingDetailTagihan.santri.kelas.level})` : ""}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4 mb-2">
                    <div className="text-right font-medium">Jenis Tagihan</div>
                    <div className="col-span-3">
                      {showingDetailTagihan.jenisTagihan?.name || "-"}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4 mb-2">
                    <div className="text-right font-medium">Jumlah</div>
                    <div className="col-span-3">
                      {new Intl.NumberFormat("id-ID", {
                        style: "currency",
                        currency: "IDR",
                      }).format(showingDetailTagihan.amount)}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4 mb-2">
                    <div className="text-right font-medium">Status</div>
                    <div className="col-span-3">
                      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        showingDetailTagihan.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                        showingDetailTagihan.status === "paid" ? "bg-green-100 text-green-800" :
                        "bg-red-100 text-red-800"
                      }`}>
                        {showingDetailTagihan.status === "pending" ? "Menunggu" :
                         showingDetailTagihan.status === "paid" ? "Lunas" :
                         "Terlambat"}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4 mb-2">
                    <div className="text-right font-medium">Jatuh Tempo</div>
                    <div className="col-span-3">
                      {new Date(showingDetailTagihan.dueDate).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4 mb-2">
                    <div className="text-right font-medium">Tahun Ajaran</div>
                    <div className="col-span-3">{showingDetailTagihan.tahunAjaran?.name || "-"}</div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <div className="text-right font-medium">Deskripsi</div>
                    <div className="col-span-3">{showingDetailTagihan.description || "-"}</div>
                  </div>
                </div>
              )}
              <DialogFooter>
                
                <Button onClick={() => setShowingDetailTagihan(null)}>Tutup</Button>
              </DialogFooter>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        <Dialog open={!!deletingTagihanId} onOpenChange={() => setDeletingTagihanId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Konfirmasi Hapus</DialogTitle>
              <DialogDescription>
                Apakah Anda yakin ingin menghapus tagihan ini? Tindakan ini tidak dapat dibatalkan.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeletingTagihanId(null)}>Batal</Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={deleteTagihanMutation.isPending}
              >
                {deleteTagihanMutation.isPending ? "Menghapus..." : "Hapus"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isMassalDialogOpen} onOpenChange={setIsMassalDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Buat Tagihan Massal</DialogTitle>
              <DialogDescription>Buat tagihan untuk seluruh santri dalam satu kelas.</DialogDescription>
            </DialogHeader>
            <Form {...massalForm}>
              <form onSubmit={massalForm.handleSubmit((data) => massalMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={massalForm.control}
                  name="kelasId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kelas</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih kelas" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {kelasData?.filter((kelas: any) => kelas.tahunAjaran?.aktif).map((kelas: any) => (
                            <SelectItem key={kelas.id} value={kelas.id}>
                              {kelas.name} {kelas.level ? `(${kelas.level})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={massalForm.control}
                  name="jenisTagihanId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jenis Tagihan</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          const selectedJenis = jenisTagihanData?.find((j: any) => j.id === value);
                          if (selectedJenis) {
                            massalForm.setValue("amount", selectedJenis.amount || 0);
                          }
                        }}
                        value={field.value}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih jenis tagihan" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {jenisTagihanData?.map((jenis: any) => (
                            <SelectItem key={jenis.id} value={jenis.id}>
                              {jenis.name} ({new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(jenis.amount)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={massalForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jumlah</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="Masukkan jumlah" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={massalForm.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Jatuh Tempo</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(new Date(field.value), "PPP", { locale: id })
                              ) : (
                                <span>Pilih tanggal</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={(date) => {
                              if (date) {
                                const formattedDate = date.toISOString().split('T')[0];
                                field.onChange(formattedDate);
                              }
                            }}
                            disabled={(date) =>
                              date < new Date("1900-01-01") || date > new Date("2100-12-31")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={massalForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deskripsi</FormLabel>
                      <FormControl>
                        <Input placeholder="Masukkan deskripsi (opsional)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={massalForm.control}
                  name="tahunAjaranId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tahun Ajaran</FormLabel>
                      <FormControl>
                        <select
                          className="border rounded px-2 py-1 w-full"
                          {...field}
                          value={field.value || tahunAjaranList.find((t) => t.aktif)?.id || tahunAjaranList[0]?.id || ""}
                          onChange={field.onChange}
                          disabled={loadingTahunAjaran}
                        >
                          <option value="" disabled>Pilih tahun ajaran</option>
                          {tahunAjaranList.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name} {t.aktif ? "(Aktif)" : ""}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsMassalDialogOpen(false)}>
                    Batal
                  </Button>
                  <Button type="submit" disabled={massalMutation.isPending}>
                    {massalMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Buat Tagihan Massal
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
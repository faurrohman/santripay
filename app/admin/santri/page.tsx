"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, Menu, MoreHorizontal, Upload, Download, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { AppSidebar } from "@/components/admin/app-sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbList, // Pastikan ini diimpor!
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
import { toast } from "sonner";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { ExportButtons } from "@/components/ui/export-buttons";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

interface Santri {
  id: string;
  name: string;
  santriId: string;
  kelas: Kelas;
  phone?: string;
  namaBapak?: string;
  namaIbu?: string;
  alamat?: string;
  user: {
    id: string;
    username: string;
    email: string;
  };
}

interface Kelas {
  id: string;
  name: string;
  level?: string;
  tahunAjaran?: {
    id: string;
    name: string;
  };
}

const santriFormSchema = z.object({
  name: z.string().min(1, "Nama santri tidak boleh kosong"),
  santriId: z.string().min(1, "ID Santri tidak boleh kosong"),
  kelasId: z.string().min(1, "Kelas harus dipilih"),
  phone: z.string().optional().transform(val => val === "" ? undefined : val),
  namaBapak: z.string().optional(),
  namaIbu: z.string().optional(),
  alamat: z.string().optional(),
});

const userCreateFormSchema = z.object({
  username: z.string().min(1, "Username tidak boleh kosong"),
  email: z.string().email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
});

const userUpdateFormSchema = z.object({
  username: z.string().min(1, "Username tidak boleh kosong").optional(),
  email: z.string().email("Email tidak valid").optional(),
});

export default function SantriPage() {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingSantri, setEditingSantri] = React.useState<Santri | null>(null);
  const [deletingSantriId, setDeletingSantriId] = React.useState<string | null>(null);
  const [showingDetailSantri, setShowingDetailSantri] = React.useState<Santri | null>(null);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [tahunAjaranAktif, setTahunAjaranAktif] = React.useState<string | null>(null);
  const [kelasAktif, setKelasAktif] = React.useState<Kelas[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [santriToDelete, setSantriToDelete] = React.useState<string | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [previewing, setPreviewing] = React.useState(false);
  const [showPreview, setShowPreview] = React.useState(false);
  const [previewData, setPreviewData] = React.useState<any>(null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [downloadingSample, setDownloadingSample] = React.useState(false);
  const [downloadingSampleExcel, setDownloadingSampleExcel] = React.useState(false);

  const queryClient = useQueryClient();

  const {
    data: santriData,
    isLoading: isLoadingSantri,
    error: errorSantri,
  } = useQuery<Santri[]>({ queryKey: ["santri"], queryFn: () => fetch("/api/santri").then((res) => res.json()) });

  const {
    data: kelasData,
    isLoading: isLoadingKelas,
    error: errorKelas,
  } = useQuery<Kelas[]>({ queryKey: ["kelas"], queryFn: () => fetch("/api/kelas").then((res) => res.json()) });

  const addSantriMutation = useMutation({
    mutationFn: async (data: { userData: z.infer<typeof userCreateFormSchema>, santriData: z.infer<typeof santriFormSchema> }) => {
      // 1. Register user baru
      const userRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data.userData, role: "santri" }),
      });
      const userResult = await userRes.json();
      if (!userResult.success) {
        throw new Error(userResult.message || "Gagal mendaftarkan user");
      }
      // 2. Tambah data santri dengan userId hasil register
      const santriRes = await fetch("/api/santri", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data.santriData, userId: userResult.user.id }),
      });
      return santriRes.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["santri"] });
      setIsDialogOpen(false);
      setEditingSantri(null);
    },
  });

  const updateSantriMutation = useMutation({
    mutationFn: (payload: any) =>
      fetch(`/api/santri/${payload.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then((res) => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["santri"] });
      setIsDialogOpen(false);
      setEditingSantri(null);
    },
  });

  const deleteSantriMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/santri/${id}`, {
        method: "DELETE",
      }).then((res) => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["santri"] });
      setDeletingSantriId(null);
    },
  });

  React.useEffect(() => {
    const fetchTahunAjaranKelas = async () => {
      try {
        const tahunAjaranRes = await fetch("/api/tahun-ajaran");
        const tahunAjaranList = await tahunAjaranRes.json();
        const aktif = tahunAjaranList.find((t: any) => t.aktif);
        if (aktif) {
          setTahunAjaranAktif(aktif.id);
          const kelasRes = await fetch(`/api/kelas?tahunAjaranId=${aktif.id}`);
          const kelasList = await kelasRes.json();
          setKelasAktif(kelasList);
        } else {
          setTahunAjaranAktif(null);
          setKelasAktif([]);
        }
      } catch (e) {
        setTahunAjaranAktif(null);
        setKelasAktif([]);
      }
    };
    fetchTahunAjaranKelas();
  }, []);

  if (errorSantri) return <div>Terjadi kesalahan: {errorSantri.message}</div>;
  if (errorKelas) return <div>Terjadi kesalahan saat memuat kelas: {errorKelas.message}</div>;

  const columns: ColumnDef<Santri>[] = [
    {
      id: "select",
      header: ({ table }: { table: TanstackTable<Santri> }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value: boolean | "indeterminate") => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }: { row: Row<Santri> }) => (
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
      cell: ({ row }: { row: Row<Santri> }) => row.index + 1,
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "name",
      header: "Nama",
      cell: ({ row }: { row: Row<Santri> }) => <div className="capitalize">{row.getValue<string>("name")}</div>,
    },
    {
      accessorKey: "kelas",
      header: "Kelas",
      cell: ({ row }: { row: Row<Santri> }) => <div className="lowercase">{row.original.kelas.name}</div>,
    },
    {
      accessorKey: "phone",
      header: "Telepon",
      cell: ({ row }: { row: Row<Santri> }) => <div className="lowercase">{row.getValue<string | undefined>("phone")}</div>,
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }: { row: Row<Santri> }) => {
        const santri = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleEditSantri(santri)}>Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={() => confirmDeleteSantri(santri.id)}>Hapus</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDetailSantri(santri)}>Detail</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable<Santri>({
    data: santriData || [],
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

  const form = useForm<z.infer<typeof santriFormSchema>>({
    resolver: zodResolver(santriFormSchema),
    defaultValues: {
      name: "",
      santriId: "",
      kelasId: "",
      phone: "",
      namaBapak: "",
      namaIbu: "",
      alamat: "",
    },
  });

  const userForm = useForm<z.infer<typeof userCreateFormSchema>>({
    resolver: zodResolver(userCreateFormSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
    },
  });

  React.useEffect(() => {
    if (editingSantri) {
      form.reset({
        name: editingSantri.name,
        santriId: editingSantri.santriId,
        kelasId: editingSantri.kelas.id,
        phone: editingSantri.phone || "",
        namaBapak: editingSantri.namaBapak || "",
        namaIbu: editingSantri.namaIbu || "",
        alamat: editingSantri.alamat || "",
      });
      userForm.reset({
        username: editingSantri.user.username,
        email: editingSantri.user.email,
        password: "", // Password not displayed/edited
      });
    } else {
      form.reset();
      userForm.reset();
    }
  }, [editingSantri, form, userForm]);

  async function onSubmit(values: z.infer<typeof santriFormSchema>) {
    try {
      if (editingSantri) {
        const userUpdateData = userForm.getValues();
        if (!userUpdateData.username || !userUpdateData.email) {
          toast.error("Username dan email tidak boleh kosong");
          return;
        }
        // Kirim update user+santri dalam satu request
        const res = await updateSantriMutation.mutateAsync({
          id: editingSantri.id,
          userId: editingSantri.user.id,
          userData: {
            username: userUpdateData.username,
            email: userUpdateData.email
          },
          name: values.name,
          santriId: values.santriId,
          kelasId: values.kelasId,
          phone: values.phone,
          namaBapak: values.namaBapak,
          namaIbu: values.namaIbu,
          alamat: values.alamat,
        });
        if (res && res.message && res.message !== 'Santri berhasil diperbarui') {
          toast.error(res.message || "Gagal update santri/user");
          return;
        }
        setIsDialogOpen(false);
        setEditingSantri(null);
        toast.success("Data santri berhasil diperbarui");
      } else {
        const userValues = userForm.getValues();
        console.log("Data yang akan dikirim:", {
          userData: userValues,
          santriData: values
        });

        // Register user baru
        const userRes = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: userValues.username,
            email: userValues.email,
            password: userValues.password,
            name: values.name,
            kelasId: values.kelasId,
            phone: values.phone,
            namaBapak: values.namaBapak,
            namaIbu: values.namaIbu,
            alamat: values.alamat,
          }),
        });

        const response = await userRes.json();

        if (!userRes.ok) {
          throw new Error(response.message || "Gagal mendaftarkan user");
        }

        console.log("Hasil registrasi:", response);
        queryClient.invalidateQueries({ queryKey: ["santri"] });
        setIsDialogOpen(false);
        form.reset();
        userForm.reset();
        toast.success("Santri berhasil ditambahkan");
      }
    } catch (error: any) {
      toast.error(error?.message || "Terjadi kesalahan saat menyimpan data");
    }
  }

  const handleAddSantri = () => {
    setEditingSantri(null);
    form.reset({
      name: "",
      santriId: "",
      kelasId: "",
      phone: "",
      namaBapak: "",
      namaIbu: "",
      alamat: "",
    });
    userForm.reset({
      username: "",
      email: "",
      password: "",
    });
    setIsDialogOpen(true);
  };

  const handleEditSantri = (santri: Santri) => {
    setEditingSantri(santri);
    form.reset({
      name: santri.name,
      santriId: santri.santriId,
      kelasId: santri.kelas.id,
      phone: santri.phone || "",
      namaBapak: santri.namaBapak || "",
      namaIbu: santri.namaIbu || "",
      alamat: santri.alamat || "",
    });
    userForm.reset({
      username: santri.user.username,
      email: santri.user.email,
      password: "",
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingSantri(null);
    form.reset({
      name: "",
      santriId: "",
      kelasId: "",
      phone: "",
      namaBapak: "",
      namaIbu: "",
      alamat: "",
    });
    userForm.reset({
      username: "",
      email: "",
      password: "",
    });
  };

  const confirmDeleteSantri = (id: string) => {
    setSantriToDelete(id);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (santriToDelete) {
      try {
        const res = await deleteSantriMutation.mutateAsync(santriToDelete);
        if (res && res.message && res.message !== 'Santri berhasil dihapus.') {
          toast.error(res.message || "Gagal menghapus santri");
        } else {
          toast.success("Santri berhasil dihapus");
          queryClient.invalidateQueries({ queryKey: ["santri"] });
        }
      } catch (error: any) {
        toast.error(error?.message || "Gagal menghapus santri");
      } finally {
        setShowDeleteDialog(false);
        setSantriToDelete(null);
      }
    }
  };

  const handleDetailSantri = (santri: Santri) => {
    setShowingDetailSantri(santri);
  };

  // Fungsi untuk handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setShowPreview(false);
      setPreviewData(null);
    }
  };

  // Fungsi untuk preview file
  const handlePreviewFile = async () => {
    if (!selectedFile) return;
    
    setPreviewing(true);
    try {
      let base64Data: string;
      
      if (selectedFile.name.toLowerCase().endsWith('.csv')) {
        // For CSV files, read as text with proper encoding
        const text = await selectedFile.text();
        console.log("CSV text sample:", text.substring(0, 200));
        base64Data = btoa(text);
      } else {
        // For Excel files, read as ArrayBuffer
        const arrayBuffer = await selectedFile.arrayBuffer();
        base64Data = btoa(String.fromCharCode(...Array.from(new Uint8Array(arrayBuffer))));
      }
      
      console.log("File name:", selectedFile.name);
      console.log("Base64 data length:", base64Data.length);
      
      const res = await fetch(`/api/santri/import?fileData=${encodeURIComponent(base64Data)}&fileName=${encodeURIComponent(selectedFile.name)}`, {
        method: "GET",
      });
      const result = await res.json();
      
      if (!res.ok) {
        throw new Error(result.message || "Gagal preview data");
      }
      
      setPreviewData(result);
      setShowPreview(true);
    } catch (error: any) {
      console.error("Preview error:", error);
      toast.error(error?.message || "Gagal preview data");
    } finally {
      setPreviewing(false);
    }
  };

  // Fungsi untuk handle import file
  const handleImportFile = async () => {
    if (!selectedFile) return;
    
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const res = await fetch("/api/santri/import", {
        method: "POST",
        body: formData,
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || "Gagal import data");
      }
      toast.success("Data santri berhasil diimport");
      queryClient.invalidateQueries({ queryKey: ["santri"] });
      setIsImportDialogOpen(false);
      setSelectedFile(null);
      setShowPreview(false);
      setPreviewData(null);
    } catch (error: any) {
      toast.error(error?.message || "Gagal import data");
    } finally {
      setImporting(false);
    }
  };

  // Fungsi untuk menghapus file yang dipilih
  const handleRemoveFile = () => {
    setSelectedFile(null);
    setShowPreview(false);
    setPreviewData(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Fungsi untuk reset import dialog
  const handleCloseImportDialog = () => {
    setIsImportDialogOpen(false);
    setSelectedFile(null);
    setShowPreview(false);
    setPreviewData(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

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
                  <BreadcrumbPage>Santri</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <h2 className="text-3xl font-bold tracking-tight">Santri</h2>
          </div>
        </div>
        <div className="flex gap-2">
          <Button disabled={isLoadingSantri} onClick={handleAddSantri}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Tambah Santri
          </Button>
          <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
        </div>
      </header>
      <div className="flex-1 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center py-4 gap-2">
                <Skeleton className="h-10 w-64 max-w-sm" style={{ display: isLoadingSantri ? undefined : 'none' }} />
                <Input
                  placeholder="Filter santri..."
                  value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
                  onChange={(event) =>
                    table.getColumn("name")?.setFilterValue(event.target.value)
                  }
                  className="max-w-sm"
                />
                <ExportButtons
                  data={table.getFilteredRowModel().rows.map((r) => ({
                    Nama: r.original.name,
                    "ID Santri": r.original.santriId,
                    Kelas: r.original.kelas?.name || "-",
                    Level: r.original.kelas?.level || "-",
                    Telepon: r.original.phone || "-",
                    Username: r.original.user?.username || "-",
                    Email: r.original.user?.email || "-",
                  }))}
                  columns={[
                    { header: "Nama", accessor: "Nama" },
                    { header: "ID Santri", accessor: "ID Santri" },
                    { header: "Kelas", accessor: "Kelas" },
                    { header: "Level", accessor: "Level" },
                    { header: "Telepon", accessor: "Telepon" },
                    { header: "Username", accessor: "Username" },
                    { header: "Email", accessor: "Email" },
                  ]}
                  filename="data-santri"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingSantri ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr>
                      <th className="px-2 py-2 text-left">Nama</th>
                      <th className="px-2 py-2 text-left">ID Santri</th>
                      <th className="px-2 py-2 text-left">Kelas</th>
                      <th className="px-2 py-2 text-left">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...Array(5)].map((_, i) => (
                      <tr key={i} className="border-b">
                        <td className="px-2 py-2"><Skeleton className="h-4 w-32" /></td>
                        <td className="px-2 py-2"><Skeleton className="h-4 w-24" /></td>
                        <td className="px-2 py-2"><Skeleton className="h-4 w-24" /></td>
                        <td className="px-2 py-2"><Skeleton className="h-8 w-20" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
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
            )}
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
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <ScrollArea className="max-h-[70vh]">
            <DialogHeader>
              <DialogTitle>{editingSantri ? "Edit Santri" : "Tambah Santri"}</DialogTitle>
              <DialogDescription>
                {editingSantri
                  ? "Edit informasi santri."
                  : "Tambahkan santri baru ke sistem."}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={userForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="Username" {...field} required />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={userForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="Email" {...field} required />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {!editingSantri && (
                  <FormField
                    control={userForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama</FormLabel>
                      <FormControl>
                        <Input placeholder="Nama Santri" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="santriId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ID Santri</FormLabel>
                      <FormControl>
                        <Input placeholder="S001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="kelasId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kelas</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih kelas" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {kelasAktif.map((kelas) => (
                            <SelectItem key={kelas.id} value={kelas.id}>
                              {kelas.name}
                              {kelas.level ? ` (${kelas.level})` : ""}
                              {kelas.tahunAjaran?.name ? ` - ${kelas.tahunAjaran.name}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nomor Telepon (Opsional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="08123456789" 
                          {...field} 
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="namaBapak"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Bapak</FormLabel>
                      <FormControl>
                        <Input placeholder="Nama Bapak" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="namaIbu"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Ibu</FormLabel>
                      <FormControl>
                        <Input placeholder="Nama Ibu" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="alamat"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alamat</FormLabel>
                      <FormControl>
                        <Input placeholder="Alamat" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={addSantriMutation.isPending || updateSantriMutation.isPending}>
                    {(addSantriMutation.isPending || updateSantriMutation.isPending) ? "Menyimpan..." : "Simpan"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showingDetailSantri} onOpenChange={() => setShowingDetailSantri(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <ScrollArea className="max-h-[70vh]">
            <DialogHeader>
              <DialogTitle>Detail Santri</DialogTitle>
              <DialogDescription>
                Informasi lengkap mengenai santri.
              </DialogDescription>
            </DialogHeader>
            {showingDetailSantri && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4 mb-2">
                  <div className="text-right font-medium">Username</div>
                  <div className="col-span-3">{showingDetailSantri.user.username}</div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4 mb-2">
                  <div className="text-right font-medium">Email</div>
                  <div className="col-span-3">{showingDetailSantri.user.email}</div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4 mb-2">
                  <div className="text-right font-medium">Nama</div>
                  <div className="col-span-3">{showingDetailSantri.name}</div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4 mb-2">
                  <div className="text-right font-medium">ID Santri</div>
                  <div className="col-span-3">{showingDetailSantri.santriId}</div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4 mb-2">
                  <div className="text-right font-medium">Kelas</div>
                  <div className="col-span-3">
                    {showingDetailSantri.kelas.name}
                    {showingDetailSantri.kelas.level ? ` (${showingDetailSantri.kelas.level})` : ""}
                    {showingDetailSantri.kelas.tahunAjaran?.name ? ` - ${showingDetailSantri.kelas.tahunAjaran.name}` : ""}
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <div className="text-right font-medium">Nomor Telepon</div>
                  <div className="col-span-3">{showingDetailSantri.phone || "-"}</div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4 mb-2">
                  <div className="text-right font-medium">Nama Bapak</div>
                  <div className="col-span-3">{showingDetailSantri.namaBapak || "-"}</div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4 mb-2">
                  <div className="text-right font-medium">Nama Ibu</div>
                  <div className="col-span-3">{showingDetailSantri.namaIbu || "-"}</div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4 mb-2">
                  <div className="text-right font-medium">Alamat</div>
                  <div className="col-span-3">{showingDetailSantri.alamat || "-"}</div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setEditingSantri(showingDetailSantri);
                setIsDialogOpen(true);
                setShowingDetailSantri(null);
              }}>Edit</Button>
              <Button onClick={() => setShowingDetailSantri(null)}>Tutup</Button>
            </DialogFooter>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <ScrollArea className="max-h-[70vh]">
            <DialogHeader>
              <DialogTitle>Konfirmasi Hapus</DialogTitle>
              <DialogDescription>
                Apakah Anda yakin ingin menghapus santri ini? Tindakan ini tidak dapat dibatalkan.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Batal</Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteConfirm}
                disabled={deleteSantriMutation.isPending}
              >
                {deleteSantriMutation.isPending ? "Menghapus..." : "Hapus"}
              </Button>
            </DialogFooter>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={isImportDialogOpen} onOpenChange={handleCloseImportDialog}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Import Data Santri</DialogTitle>
            <DialogDescription>
              Upload file CSV atau Excel untuk mengimport data santri. Anda dapat preview data terlebih dahulu sebelum melakukan import.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
          <div className="py-4">
            <div className="mb-4 flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={downloadingSample}
                onClick={async () => {
                  setDownloadingSample(true);
                  try {
                    const a = document.createElement("a");
                    a.href = "/contoh_santri.csv";
                    a.download = "contoh_santri.csv";
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                  } finally {
                    setTimeout(() => setDownloadingSample(false), 1000);
                  }
                }}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                {downloadingSample ? "Mengunduh..." : "Unduh Contoh CSV"}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={downloadingSampleExcel}
                onClick={async () => {
                  setDownloadingSampleExcel(true);
                  try {
                    const a = document.createElement("a");
                    a.href = "/contoh_santri.xlsx";
                    a.download = "contoh_santri.xlsx";
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                  } finally {
                    setTimeout(() => setDownloadingSampleExcel(false), 1000);
                  }
                }}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                {downloadingSampleExcel ? "Mengunduh..." : "Unduh Contoh Excel"}
              </Button>
            </div>
              
              <div className="mb-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  onChange={handleFileSelect}
                  disabled={importing || previewing}
                  className="mb-2"
                />
                {selectedFile && (
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">File dipilih:</span> {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveFile}
                      disabled={importing || previewing}
                      className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only">Hapus file</span>
                    </Button>
                  </div>
                )}
              </div>

              {selectedFile && !showPreview && (
                <div className="mb-4">
                  <Button
                    onClick={handlePreviewFile}
                    disabled={previewing}
                    className="gap-2"
                  >
                    {previewing ? "Memproses..." : "Preview Data"}
                  </Button>
                </div>
              )}

              {showPreview && previewData && (
                <div className="mb-4 space-y-4">
                  <div className="p-4 border rounded-lg bg-muted/50">
                    <h4 className="font-semibold mb-2">Ringkasan Preview</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Total Baris:</span> {previewData.totalRows}
                      </div>
                      <div>
                        <span className="font-medium">Data Valid:</span> {previewData.success}
                      </div>
                      <div>
                        <span className="font-medium">Error:</span> {previewData.failed}
                      </div>
                    </div>
                  </div>

                  {previewData.errors && previewData.errors.length > 0 && (
                    <div className="p-4 border rounded-lg bg-red-50">
                      <h4 className="font-semibold mb-2 text-red-700">Error yang Ditemukan</h4>
                      <div className="space-y-1 text-sm text-red-600">
                        {previewData.errors.map((error: any, index: number) => (
                          <div key={index}>
                            <span className="font-medium">Baris {error.row}:</span> {error.message}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {previewData.validData && previewData.validData.length > 0 && (
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">Data Valid (Preview 20 baris pertama)</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left p-2">Baris</th>
                              <th className="text-left p-2">Nama</th>
                              <th className="text-left p-2">Username</th>
                              <th className="text-left p-2">Email</th>
                              <th className="text-left p-2">Kelas</th>
                              <th className="text-left p-2">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {previewData.validData.map((data: any, index: number) => (
                              <tr
                                key={index}
                                className={`border-b ${data.duplicateType ? 'bg-red-100 text-red-700' : ''}`}
                                title={data.duplicateType ? `Duplikat pada ${data.duplicateType}` : ''}
                              >
                                <td className="p-2">{data.rowNumber}</td>
                                <td className="p-2">{data.name}</td>
                                <td className="p-2">{data.username}</td>
                                <td className="p-2">{data.email}</td>
                                <td className="p-2">{data.kelas}</td>
                                <td className="p-2 font-bold">
                                  {data.duplicateType ? `Duplikat: ${data.duplicateType}` : 'Valid'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

            <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={handleCloseImportDialog} disabled={importing || previewing}>
                Batal
              </Button>
                {selectedFile && previewData && previewData.success > 0 && (
                  <Button 
                    onClick={handleImportFile} 
                    disabled={importing || previewing}
                    className="gap-2"
                  >
                    {importing ? "Mengimport..." : "Import Data"}
                  </Button>
                )}
            </div>
          </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
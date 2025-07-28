"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, Menu, MoreHorizontal } from "lucide-react";
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
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

interface Kelas {
  id: string;
  name: string;
  level?: string;
  tahunAjaran?: { id: string; name: string; aktif?: boolean };
}

interface TahunAjaran {
  id: string;
  name: string;
  aktif: boolean;
}

const kelasFormSchema = z.object({
  name: z.string().min(1, "Nama kelas tidak boleh kosong"),
  level: z.string().optional(),
  tahunAjaranId: z.string().optional(),
});

export default function KelasPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  
  // State hooks
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingKelas, setEditingKelas] = React.useState<Kelas | null>(null);
  const [deletingKelasId, setDeletingKelasId] = React.useState<string | null>(null);
  const [showingDetailKelas, setShowingDetailKelas] = React.useState<Kelas | null>(null);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});

  // Form hook
  const form = useForm<z.infer<typeof kelasFormSchema>>({
    resolver: zodResolver(kelasFormSchema),
    defaultValues: {
      name: "",
      level: "",
      tahunAjaranId: "",
    },
  });

  // Query kelas tanpa filter tahun ajaran
  const {
    data: kelasData,
    isLoading: isLoadingKelas,
    error: errorKelas,
  } = useQuery<Kelas[]>({ 
    queryKey: ["kelas"], 
    queryFn: () => fetch("/api/kelas").then((res) => res.json()),
  });

  // Query tahun ajaran
  const { data: tahunAjaranList = [], isLoading: loadingTahunAjaran } = useQuery<TahunAjaran[]>({
    queryKey: ["tahun-ajaran"],
    queryFn: () => fetch("/api/tahun-ajaran").then((res) => res.json()),
  });

  // Mutation hooks
  const addKelasMutation = useMutation({
    mutationFn: (newKelas: z.infer<typeof kelasFormSchema>) =>
      fetch("/api/kelas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newKelas),
      }).then((res) => {
        if (!res.ok) throw new Error("Gagal menambah kelas");
        return res.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kelas"] });
      setIsDialogOpen(false);
      setEditingKelas(null);
      toast.success("Kelas berhasil ditambahkan");
    },
    onError: (err: any) => {
      toast.error(err.message || "Gagal menambah kelas");
    },
  });

  const updateKelasMutation = useMutation({
    mutationFn: (updatedKelas: Kelas) =>
      fetch(`/api/kelas/${updatedKelas.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedKelas),
      }).then((res) => {
        if (!res.ok) throw new Error("Gagal mengedit kelas");
        return res.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kelas"] });
      setIsDialogOpen(false);
      setEditingKelas(null);
      toast.success("Kelas berhasil diedit");
    },
    onError: (err: any) => {
      toast.error(err.message || "Gagal mengedit kelas");
    },
  });

  const deleteKelasMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/kelas/${id}`, {
        method: "DELETE",
      }).then((res) => {
        if (!res.ok) throw new Error("Gagal menghapus kelas");
        return res.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kelas"] });
      setDeletingKelasId(null);
      toast.success("Kelas berhasil dihapus");
    },
    onError: (err: any) => {
      // Deteksi error constraint (foreign key)
      if (err.message && err.message.toLowerCase().includes('constraint')) {
        toast.error('Kelas ini masih digunakan.');
      } else {
        toast.error(err.message || "Gagal menghapus kelas");
      }
    },
  });

  // Effect hooks
  React.useEffect(() => {
    if (editingKelas) {
      form.reset({
        name: editingKelas.name,
        level: editingKelas.level || "",
        tahunAjaranId: editingKelas.tahunAjaran?.id || "",
      });
    } else {
      form.reset();
    }
  }, [editingKelas, form]);

  // Table configuration
  const columns: ColumnDef<Kelas>[] = [
    {
      id: "select",
      header: ({ table }: { table: TanstackTable<Kelas> }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value: boolean | "indeterminate") => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }: { row: Row<Kelas> }) => (
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
      cell: ({ row }: { row: Row<Kelas> }) => row.index + 1,
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "name",
      header: "Nama Kelas",
      cell: ({ row }: { row: Row<Kelas> }) => <div className="capitalize">{row.getValue<string>("name")}</div>,
    },
    {
      accessorKey: "level",
      header: "Level",
      cell: ({ row }: { row: Row<Kelas> }) => <div className="lowercase">{row.getValue<string | undefined>("level") || "-"}</div>,
    },
    {
      accessorKey: "tahunAjaran",
      header: "Tahun Ajaran",
      cell: ({ row }: { row: Row<Kelas> }) => (
        <span>{row.original.tahunAjaran?.name || "-"}</span>
      ),
    },
    {
      id: "statusTahunAjaran",
      header: "Status Tahun Ajaran",
      cell: ({ row }: { row: Row<Kelas> }) => (
        typeof row.original.tahunAjaran?.aktif !== 'undefined' ? (
          <span
            className={
              "px-2 py-0.5 rounded-full text-xs font-semibold " +
              (row.original.tahunAjaran.aktif
                ? "bg-green-100 text-green-800 border border-green-200"
                : "bg-gray-100 text-gray-600 border border-gray-200")
            }
          >
            {row.original.tahunAjaran.aktif ? "Aktif" : "Tidak Aktif"}
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )
      ),
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }: { row: Row<Kelas> }) => {
        const kelas = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleEditKelas(kelas)}>Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={() => confirmDeleteKelas(kelas.id)}>Hapus</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDetailKelas(kelas)}>Detail</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable<Kelas>({
    data: kelasData || [],
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
  async function onSubmit(values: z.infer<typeof kelasFormSchema>) {
    if (editingKelas) {
      const updatedKelas = { ...editingKelas, ...values };
      await updateKelasMutation.mutateAsync(updatedKelas);
    } else {
      await addKelasMutation.mutateAsync(values);
    }
    setIsDialogOpen(false);
    setEditingKelas(null);
  }

  const handleAddKelas = () => {
    setEditingKelas(null);
    form.reset({
      name: "",
      level: "",
      tahunAjaranId: tahunAjaranList.find((t) => t.aktif)?.id || tahunAjaranList[0]?.id || "",
    });
    setIsDialogOpen(true);
  };

  const handleEditKelas = (kelas: Kelas) => {
    setEditingKelas(kelas);
    form.reset({
      name: kelas.name,
      level: kelas.level || "",
      tahunAjaranId: kelas.tahunAjaran?.id || tahunAjaranList[0]?.id || "",
    });
    setIsDialogOpen(true);
  };

  const confirmDeleteKelas = (id: string) => {
    setDeletingKelasId(id);
  };

  const handleDetailKelas = (kelas: Kelas) => {
    setShowingDetailKelas(kelas);
  };

  if (isLoadingKelas) return (
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
                  <BreadcrumbPage>Kelas</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <h2 className="text-3xl font-bold tracking-tight">Kelas</h2>
          </div>
        </div>
        <Button disabled>
          <PlusCircle className="mr-2 h-4 w-4" />
          Tambah Kelas
        </Button>
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
                    <th className="px-2 py-2 text-left">No</th>
                    <th className="px-2 py-2 text-left">Nama</th>
                    <th className="px-2 py-2 text-left">Level</th>
                    <th className="px-2 py-2 text-left">Tahun Ajaran</th>
                    <th className="px-2 py-2 text-left">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {[...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b">
                      <td className="px-2 py-2"><Skeleton className="h-4 w-8" /></td>
                      <td className="px-2 py-2"><Skeleton className="h-4 w-32" /></td>
                      <td className="px-2 py-2"><Skeleton className="h-4 w-20" /></td>
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
  if (errorKelas) return <div>Terjadi kesalahan: {errorKelas.message}</div>;

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
                  <BreadcrumbPage>Kelas</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <h2 className="text-3xl font-bold tracking-tight">Kelas</h2>
          </div>
        </div>
        <Button onClick={handleAddKelas}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Tambah Kelas
        </Button>
      </header>
      <div className="flex-1 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center py-4 gap-2">
                <Input
                  placeholder="Filter kelas..."
                  value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
                  onChange={(event) =>
                    table.getColumn("name")?.setFilterValue(event.target.value)
                  }
                  className="max-w-sm"
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
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <ScrollArea className="max-h-[70vh]">
          <DialogHeader>
            <DialogTitle>{editingKelas ? "Edit Kelas" : "Tambah Kelas"}</DialogTitle>
            <DialogDescription>
              {editingKelas
                ? "Edit informasi kelas." 
                : "Tambahkan kelas baru ke sistem."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Kelas</FormLabel>
                    <FormControl>
                      <Input placeholder="Nama Kelas" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Level (Opsional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Tsanawiyah" {...field} />
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
                <Button type="submit" disabled={addKelasMutation.isPending || updateKelasMutation.isPending}>
                  {(addKelasMutation.isPending || updateKelasMutation.isPending) ? "Menyimpan..." : "Simpan"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showingDetailKelas} onOpenChange={() => setShowingDetailKelas(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <ScrollArea className="max-h-[70vh]">
          <DialogHeader>
            <DialogTitle>Detail Kelas</DialogTitle>
            <DialogDescription>
              Informasi lengkap mengenai kelas.
            </DialogDescription>
          </DialogHeader>
          {showingDetailKelas && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4 mb-2">
                <div className="text-right font-medium">Nama Kelas</div>
                <div className="col-span-3">{showingDetailKelas.name}</div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4 mb-2">
                <div className="text-right font-medium">Level</div>
                <div className="col-span-3">{showingDetailKelas.level || "-"}</div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4 mb-2">
                <div className="text-right font-medium">Tahun Ajaran</div>
                <div className="col-span-3">{showingDetailKelas.tahunAjaran?.name || "-"}</div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setEditingKelas(showingDetailKelas);
              setIsDialogOpen(true);
              setShowingDetailKelas(null);
            }}>Edit</Button>
            <Button onClick={() => setShowingDetailKelas(null)}>Tutup</Button>
          </DialogFooter>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingKelasId} onOpenChange={() => setDeletingKelasId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Hapus</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus kelas ini? Tindakan ini tidak dapat dibatalkan dan akan
              memengaruhi santri yang terkait dengan kelas ini.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingKelasId(null)}>Batal</Button>
            <Button 
              variant="destructive" 
              onClick={() => {
                if (deletingKelasId) {
                  deleteKelasMutation.mutate(deletingKelasId, {
                    onSuccess: () => {
                      queryClient.invalidateQueries({ queryKey: ["kelas"] });
                      setDeletingKelasId(null);
                      toast.success("Kelas berhasil dihapus");
                    },
                    onError: (err: any) => toast.error(err.message || "Gagal menghapus kelas"),
                  });
                }
              }}
              disabled={deleteKelasMutation.isPending}
            >
              {deleteKelasMutation.isPending ? "Menghapus..." : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
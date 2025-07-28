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
import { toast } from "sonner";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

interface JenisTagihan {
  id: string;
  name: string;
  amount: number | null;
  description?: string;
}

const jenisTagihanFormSchema = z.object({
  name: z.string().min(1, "Nama jenis tagihan tidak boleh kosong"),
  amount: z.coerce.number().min(0, "Jumlah harus lebih dari atau sama dengan 0"),
  description: z.string().optional(),
});

export default function JenisTagihanPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  
  // State hooks
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingJenisTagihan, setEditingJenisTagihan] = React.useState<JenisTagihan | null>(null);
  const [deletingJenisTagihanId, setDeletingJenisTagihanId] = React.useState<string | null>(null);
  const [showingDetailJenisTagihan, setShowingDetailJenisTagihan] = React.useState<JenisTagihan | null>(null);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});

  // Form hook
  const form = useForm<z.infer<typeof jenisTagihanFormSchema>>({
    resolver: zodResolver(jenisTagihanFormSchema),
    defaultValues: {
      name: "",
      amount: 0,
      description: "",
    },
  });

  // Query hooks
  const {
    data: jenisTagihanData,
    isLoading: isLoadingJenisTagihan,
    error: errorJenisTagihan,
  } = useQuery<JenisTagihan[]>({ 
    queryKey: ["jenis-tagihan"], 
    queryFn: () => fetch("/api/jenis-tagihan").then((res) => res.json()) 
  });

  // Mutation hooks
  const addJenisTagihanMutation = useMutation({
    mutationFn: (newJenisTagihan: z.infer<typeof jenisTagihanFormSchema>) =>
      fetch("/api/jenis-tagihan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newJenisTagihan),
      }).then((res) => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jenis-tagihan"] });
      setIsDialogOpen(false);
      setEditingJenisTagihan(null);
      form.reset();
      toast.success("Jenis tagihan berhasil ditambahkan");
    },
  });

  const updateJenisTagihanMutation = useMutation({
    mutationFn: async (updatedJenisTagihan: JenisTagihan) => {
      const response = await fetch(`/api/jenis-tagihan/${updatedJenisTagihan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: updatedJenisTagihan.name,
          amount: updatedJenisTagihan.amount,
          description: updatedJenisTagihan.description,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Gagal memperbarui jenis tagihan");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jenis-tagihan"] });
      setIsDialogOpen(false);
      setEditingJenisTagihan(null);
      form.reset();
      toast.success("Jenis tagihan berhasil diperbarui");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteJenisTagihanMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/jenis-tagihan/${id}`, {
        method: "DELETE",
      }).then((res) => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jenis-tagihan"] });
      setDeletingJenisTagihanId(null);
      toast.success("Jenis tagihan berhasil dihapus");
    },
  });

  // Effect hooks
  React.useEffect(() => {
    if (editingJenisTagihan) {
      form.reset({
        name: editingJenisTagihan.name,
        amount: editingJenisTagihan.amount !== null ? editingJenisTagihan.amount : undefined,
        description: editingJenisTagihan.description || "",
      });
    } else {
      form.reset();
    }
  }, [editingJenisTagihan, form]);

  // Table configuration
  const columns: ColumnDef<JenisTagihan>[] = [
    {
      id: "select",
      header: ({ table }: { table: TanstackTable<JenisTagihan> }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value: boolean | "indeterminate") => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }: { row: Row<JenisTagihan> }) => (
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
      cell: ({ row }: { row: Row<JenisTagihan> }) => row.index + 1,
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "name",
      header: "Nama Jenis Tagihan",
      cell: ({ row }: { row: Row<JenisTagihan> }) => <div className="capitalize">{row.getValue<string>("name")}</div>,
    },
    {
      accessorKey: "amount",
      header: "Jumlah Default",
      cell: ({ row }: { row: Row<JenisTagihan> }) => (
        <div>
          {new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
          }).format(row.getValue<number | null>("amount") ?? 0)}
        </div>
      ),
    },
    {
      accessorKey: "description",
      header: "Deskripsi",
      cell: ({ row }: { row: Row<JenisTagihan> }) => <div>{row.getValue<string | undefined>("description") || "-"}</div>,
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }: { row: Row<JenisTagihan> }) => {
        const jenisTagihan = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleEditJenisTagihan(jenisTagihan)}>Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={() => confirmDeleteJenisTagihan(jenisTagihan.id)}>Hapus</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDetailJenisTagihan(jenisTagihan)}>Detail</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable<JenisTagihan>({
    data: jenisTagihanData || [],
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
  async function onSubmit(values: z.infer<typeof jenisTagihanFormSchema>) {
    try {
      if (editingJenisTagihan) {
        await updateJenisTagihanMutation.mutateAsync({
          id: editingJenisTagihan.id,
          name: values.name,
          amount: values.amount,
          description: values.description,
        });
      } else {
        await addJenisTagihanMutation.mutateAsync(values);
      }
    } catch (error) {
      console.error("Error submitting form:", error);
    }
    setIsDialogOpen(false);
    setEditingJenisTagihan(null);
  }

  const handleAddJenisTagihan = () => {
    setEditingJenisTagihan(null);
    form.reset({
      name: "",
      amount: 0,
      description: "",
    });
    setIsDialogOpen(true);
  };

  const handleEditJenisTagihan = (jenisTagihan: JenisTagihan) => {
    setEditingJenisTagihan(jenisTagihan);
    form.reset({
      name: jenisTagihan.name,
      amount: jenisTagihan.amount ?? 0,
      description: jenisTagihan.description ?? "",
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingJenisTagihan(null);
    form.reset({
      name: "",
      amount: 0,
      description: "",
    });
  };

  const confirmDeleteJenisTagihan = (id: string) => {
    setDeletingJenisTagihanId(id);
  };

  const handleDeleteConfirm = () => {
    if (deletingJenisTagihanId) {
      deleteJenisTagihanMutation.mutate(deletingJenisTagihanId);
    }
  };

  const handleDetailJenisTagihan = (jenisTagihan: JenisTagihan) => {
    setShowingDetailJenisTagihan(jenisTagihan);
  };

  if (isLoadingJenisTagihan) return (
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
                  <BreadcrumbPage>Jenis Tagihan</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <h2 className="text-3xl font-bold tracking-tight">Jenis Tagihan</h2>
          </div>
        </div>
        <Button disabled>
          <PlusCircle className="mr-2 h-4 w-4" />
          Tambah Jenis Tagihan
        </Button>
      </header>
      <div className="flex-1 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center py-4">
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
                    <th className="px-2 py-2 text-left">Nominal</th>
                    <th className="px-2 py-2 text-left">Deskripsi</th>
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
  if (errorJenisTagihan) return <div>Terjadi kesalahan: {errorJenisTagihan.message}</div>;

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
                  <BreadcrumbPage>Jenis Tagihan</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <h2 className="text-3xl font-bold tracking-tight">Jenis Tagihan</h2>
          </div>
        </div>
        <Button onClick={handleAddJenisTagihan}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Tambah Jenis Tagihan
        </Button>
      </header>
      <div className="flex-1 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center py-4">
                <Input
                  placeholder="Filter jenis tagihan..."
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

        <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
          <DialogContent>
            <ScrollArea className="max-h-[70vh]">
              <DialogHeader>
                <DialogTitle>
                  {editingJenisTagihan ? "Edit Jenis Tagihan" : "Tambah Jenis Tagihan"}
                </DialogTitle>
                <DialogDescription>
                  {editingJenisTagihan
                      ? "Ubah informasi jenis tagihan yang ada"
                      : "Tambahkan jenis tagihan baru ke sistem"}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nama Jenis Tagihan</FormLabel>
                        <FormControl>
                          <Input placeholder="Masukkan nama jenis tagihan" {...field} />
                        </FormControl>
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
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
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
                          <Input placeholder="Masukkan deskripsi (opsional)" {...field} />
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
                      disabled={addJenisTagihanMutation.isPending || updateJenisTagihanMutation.isPending}
                    >
                      {editingJenisTagihan ? "Simpan Perubahan" : "Tambah"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        <Dialog open={!!showingDetailJenisTagihan} onOpenChange={() => setShowingDetailJenisTagihan(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <ScrollArea className="max-h-[70vh]">
              <DialogHeader>
                <DialogTitle>Detail Jenis Tagihan</DialogTitle>
                <DialogDescription>
                  Informasi lengkap mengenai jenis tagihan.
                </DialogDescription>
              </DialogHeader>
              {showingDetailJenisTagihan && (
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4 mb-2">
                    <div className="text-right font-medium">Nama Jenis Tagihan</div>
                    <div className="col-span-3">{showingDetailJenisTagihan.name}</div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4 mb-2">
                    <div className="text-right font-medium">Jumlah Default</div>
                    <div className="col-span-3">
                      {new Intl.NumberFormat("id-ID", {
                        style: "currency",
                        currency: "IDR",
                      }).format(showingDetailJenisTagihan.amount || 0)}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <div className="text-right font-medium">Deskripsi</div>
                    <div className="col-span-3">{showingDetailJenisTagihan.description || "-"}</div>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setEditingJenisTagihan(showingDetailJenisTagihan);
                  setIsDialogOpen(true);
                  setShowingDetailJenisTagihan(null);
                }}>Edit</Button>
                <Button onClick={() => setShowingDetailJenisTagihan(null)}>Tutup</Button>
              </DialogFooter>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        <Dialog open={!!deletingJenisTagihanId} onOpenChange={() => setDeletingJenisTagihanId(null)}>
          <DialogContent>
            <ScrollArea className="max-h-[70vh]">
              <DialogHeader>
                <DialogTitle>Konfirmasi Hapus</DialogTitle>
                <DialogDescription>
                  Apakah Anda yakin ingin menghapus jenis tagihan ini? Tindakan ini tidak dapat dibatalkan dan akan
                  memengaruhi tagihan yang terkait dengan jenis tagihan ini.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeletingJenisTagihanId(null)}>Batal</Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteConfirm}
                  disabled={deleteJenisTagihanMutation.isPending}
                >
                  {deleteJenisTagihanMutation.isPending ? "Menghapus..." : "Hapus"}
                </Button>
              </DialogFooter>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
} 
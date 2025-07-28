"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreHorizontal, CheckCircle2, Menu } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { AppSidebar } from "@/components/admin/app-sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

interface TahunAjaran {
  id: string;
  name: string;
  aktif: boolean;
  createdAt: string;
  updatedAt: string;
}

const tahunAjaranFormSchema = z.object({
  name: z.string().min(4, "Nama tahun ajaran tidak boleh kosong"),
  aktif: z.boolean().optional(),
});

export default function TahunAjaranPage() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingTahunAjaran, setEditingTahunAjaran] = React.useState<TahunAjaran | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [showingDetail, setShowingDetail] = React.useState<TahunAjaran | null>(null);
  const [filter, setFilter] = React.useState("");

  const form = useForm<z.infer<typeof tahunAjaranFormSchema>>({
    resolver: zodResolver(tahunAjaranFormSchema),
    defaultValues: {
      name: "",
      aktif: false,
    },
  });

  const { data: tahunAjaranData = [], isLoading, error } = useQuery<TahunAjaran[]>({
    queryKey: ["tahun-ajaran"],
    queryFn: () => fetch("/api/tahun-ajaran").then((res) => res.json()),
  });

  const addMutation = useMutation({
    mutationFn: async (data: z.infer<typeof tahunAjaranFormSchema>) => {
      const response = await fetch("/api/tahun-ajaran", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Gagal menyimpan tahun ajaran");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tahun-ajaran"] });
      setIsDialogOpen(false);
      setEditingTahunAjaran(null);
      form.reset();
      toast.success("Tahun ajaran berhasil disimpan");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<{ name: string; aktif: boolean }> }) => {
      const response = await fetch(`/api/tahun-ajaran/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Gagal mengedit tahun ajaran");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tahun-ajaran"] });
      setIsDialogOpen(false);
      setEditingTahunAjaran(null);
      toast.success("Tahun ajaran berhasil diedit");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/tahun-ajaran/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Gagal menghapus tahun ajaran");
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success("Tahun ajaran berhasil dihapus");
      setDeletingId(null);
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["tahun-ajaran"] });
      }, 300);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleAdd = () => {
    setEditingTahunAjaran(null);
    form.reset({ name: "", aktif: false });
    setIsDialogOpen(true);
  };

  const handleEdit = (ta: TahunAjaran) => {
    setEditingTahunAjaran(ta);
    form.reset({ name: ta.name, aktif: ta.aktif });
    setIsDialogOpen(true);
  };

  const handleDetail = (ta: TahunAjaran) => {
    setShowingDetail(ta);
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
  };

  const onSubmit = async (data: z.infer<typeof tahunAjaranFormSchema>) => {
    addMutation.mutate(data);
  };

  const onEditSubmit = async (data: z.infer<typeof tahunAjaranFormSchema>) => {
    if (editingTahunAjaran) {
      editMutation.mutate({ id: editingTahunAjaran.id, data });
    }
  };

  if (isLoading) return (
    <div className="flex flex-col flex-1 gap-4 p-4 pt-0 mt-6 max-w-[1400px] mx-auto w-full pb-8">
      <header className="flex h-14 shrink-0 items-center justify-between w-full">
        <div className="flex items-center gap-2">
          {/* Sidebar mobile */}
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
                  <BreadcrumbPage>Tahun Ajaran</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <h2 className="text-3xl font-bold tracking-tight">Tahun Ajaran</h2>
          </div>
        </div>
        <Button disabled>
          <PlusCircle className="mr-2 h-4 w-4" />
          Tambah Tahun Ajaran
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
                    <th className="px-2 py-2 text-left">Status</th>
                    <th className="px-2 py-2 text-left">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {[...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b">
                      <td className="px-2 py-2"><Skeleton className="h-4 w-8" /></td>
                      <td className="px-2 py-2"><Skeleton className="h-4 w-32" /></td>
                      <td className="px-2 py-2"><Skeleton className="h-4 w-20" /></td>
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
  if (error) return <div>Terjadi kesalahan saat memuat data</div>;

  const filteredTahunAjaran = tahunAjaranData.filter((ta) => ta.name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="flex flex-col flex-1 gap-4 p-4 pt-0 mt-6 max-w-[1400px] mx-auto w-full pb-8">
      <header className="flex h-14 shrink-0 items-center justify-between w-full">
        <div className="flex items-center gap-2">
          {/* Sidebar mobile */}
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
                  <BreadcrumbPage>Tahun Ajaran</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <h2 className="text-3xl font-bold tracking-tight">Tahun Ajaran</h2>
          </div>
        </div>
        <Button onClick={handleAdd}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Tambah Tahun Ajaran
        </Button>
      </header>
      <div className="flex-1 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center py-4">
                <Input
                  placeholder="Filter tahun ajaran..."
                  className="max-w-sm"
                  value={filter}
                  onChange={e => setFilter(e.target.value)}
                />
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
                    <th className="px-2 py-2 text-left">Status</th>
                    <th className="px-2 py-2 text-left">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTahunAjaran.map((ta, i) => (
                    <tr key={ta.id} className="border-b">
                      <td className="px-2 py-2">{i + 1}</td>
                      <td className="px-2 py-2">{ta.name}</td>
                      <td className="px-2 py-2">
                        {ta.aktif ? (
                          <span className="inline-flex items-center gap-1 text-green-600 font-semibold">
                            <CheckCircle2 className="w-4 h-4" /> Aktif
                          </span>
                        ) : (
                          <span className="text-gray-500">Tidak Aktif</span>
                        )}
                      </td>
                      <td className="px-2 py-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(ta)}>Edit</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDetail(ta)}>Detail</DropdownMenuItem>
                            {!ta.aktif && (
                              <DropdownMenuItem onClick={() => editMutation.mutate({ id: ta.id, data: { aktif: true } })}>
                                Jadikan Aktif
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleDelete(ta.id)}>Hapus</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <ScrollArea className="max-h-[70vh]">
            <DialogHeader>
              <DialogTitle>{editingTahunAjaran ? "Edit Tahun Ajaran" : "Tambah Tahun Ajaran"}</DialogTitle>
              <DialogDescription>
                {editingTahunAjaran
                  ? "Edit informasi tahun ajaran."
                  : "Tambahkan tahun ajaran baru ke sistem."}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={editingTahunAjaran ? form.handleSubmit(onEditSubmit) : form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Tahun Ajaran</FormLabel>
                      <FormControl>
                        <Input placeholder="2024/2025" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="aktif"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center gap-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          id="aktif"
                        />
                      </FormControl>
                      <FormLabel htmlFor="aktif">Jadikan Tahun Ajaran Aktif</FormLabel>
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Batal
                  </Button>
                  <Button type="submit" disabled={addMutation.isPending || editMutation.isPending}>
                    {(addMutation.isPending || editMutation.isPending) ? (editingTahunAjaran ? "Menyimpan..." : "Menyimpan...") : (editingTahunAjaran ? "Simpan Perubahan" : "Tambah")}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </ScrollArea>
        </DialogContent>
      </Dialog>
      <Dialog open={!!showingDetail} onOpenChange={() => setShowingDetail(null)}>
        <DialogContent>
          <ScrollArea className="max-h-[70vh]">
            <DialogHeader>
              <DialogTitle>Detail Tahun Ajaran</DialogTitle>
              <DialogDescription>
                Informasi lengkap mengenai tahun ajaran.
              </DialogDescription>
            </DialogHeader>
            {showingDetail && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4 mb-2">
                  <div className="text-right font-medium">Nama</div>
                  <div className="col-span-3">{showingDetail.name}</div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4 mb-2">
                  <div className="text-right font-medium">Status</div>
                  <div className="col-span-3">
                    {showingDetail.aktif ? (
                      <span className="inline-flex items-center gap-1 text-green-600 font-semibold">
                        <CheckCircle2 className="w-4 h-4" /> Aktif
                      </span>
                    ) : (
                      <span className="text-gray-500">Tidak Aktif</span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4 mb-2">
                  <div className="text-right font-medium">Dibuat</div>
                  <div className="col-span-3">{new Date(showingDetail.createdAt).toLocaleString("id-ID")}</div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <div className="text-right font-medium">Diupdate</div>
                  <div className="col-span-3">{new Date(showingDetail.updatedAt).toLocaleString("id-ID")}</div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => setShowingDetail(null)}>Tutup</Button>
            </DialogFooter>
          </ScrollArea>
        </DialogContent>
      </Dialog>
      <Dialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <DialogContent>
          <ScrollArea className="max-h-[70vh]">
            <DialogHeader>
              <DialogTitle>Konfirmasi Hapus</DialogTitle>
              <DialogDescription>
                Apakah Anda yakin ingin menghapus tahun ajaran ini? Tindakan ini tidak dapat dibatalkan.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeletingId(null)}>Batal</Button>
              <Button variant="destructive" onClick={() => deleteMutation.mutate(deletingId!)} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? "Menghapus..." : "Hapus"}
              </Button>
            </DialogFooter>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
} 
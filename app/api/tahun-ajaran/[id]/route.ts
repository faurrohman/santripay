import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

const patchSchema = z.object({
  aktif: z.boolean(),
});

const putSchema = z.object({
  name: z.string().min(4, "Nama tahun ajaran tidak boleh kosong").optional(),
  aktif: z.boolean().optional(),
});

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const { id } = await context.params;
    const body = await req.json();
    const { aktif } = patchSchema.parse(body);
    if (aktif) {
      // Nonaktifkan semua tahun ajaran lain
      await prisma.tahunAjaran.updateMany({ data: { aktif: false } });
    }
    // Update tahun ajaran sesuai id
    const updated = await prisma.tahunAjaran.update({
      where: { id },
      data: { aktif },
    });
    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.errors }, { status: 400 });
    }
    console.error("Error updating tahun ajaran:", error);
    return NextResponse.json({ message: "Terjadi kesalahan saat mengupdate tahun ajaran." }, { status: 500 });
  }
}

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const { id } = await context.params;
    const body = await req.json();
    const data = putSchema.parse(body);
    // Jika aktif true, nonaktifkan tahun ajaran lain
    if (data.aktif) {
      await prisma.tahunAjaran.updateMany({ data: { aktif: false } });
    }
    const updated = await prisma.tahunAjaran.update({
      where: { id },
      data,
    });
    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.errors }, { status: 400 });
    }
    console.error("Error updating tahun ajaran:", error);
    return NextResponse.json({ message: "Terjadi kesalahan saat mengupdate tahun ajaran." }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const { id } = await context.params;
    // Cek apakah ada tagihan terkait tahun ajaran ini
    const count = await prisma.tagihan.count({ where: { tahunAjaranId: id } });
    if (count > 0) {
      return NextResponse.json({ message: "Tidak bisa menghapus tahun ajaran yang masih memiliki tagihan." }, { status: 400 });
    }
    await prisma.tahunAjaran.delete({ where: { id } });
    return NextResponse.json({ message: "Tahun ajaran berhasil dihapus." }, { status: 200 });
  } catch (error) {
    console.error("Error deleting tahun ajaran:", error);
    return NextResponse.json({ message: "Terjadi kesalahan saat menghapus tahun ajaran." }, { status: 500 });
  }
} 
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

const kelasSchema = z.object({
  name: z.string().min(1, "Nama kelas tidak boleh kosong").optional(),
  level: z.string().optional(),
  tahunAjaranId: z.string().min(1, "Tahun ajaran wajib dipilih").optional(),
});

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const kelas = await prisma.kelas.findUnique({
      where: { id },
    });

    if (!kelas) {
      return NextResponse.json({ message: "Kelas tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json(kelas, { status: 200 });
  } catch (error) {
    console.error("Error fetching kelas by ID:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengambil data kelas." },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const body = await req.json();
    const validatedData = kelasSchema.partial().parse(body);

    const updatedKelas = await prisma.kelas.update({
      where: { id },
      data: validatedData,
      select: {
        id: true,
        name: true,
        level: true,
        tahunAjaran: { select: { id: true, name: true, aktif: true } },
      },
    });

    return NextResponse.json(updatedKelas, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.errors }, { status: 400 });
    }
    console.error("Error updating kelas:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat memperbarui kelas." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    await prisma.kelas.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Kelas berhasil dihapus." }, { status: 200 });
  } catch (error) {
    console.error("Error deleting kelas:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat menghapus kelas." },
      { status: 500 }
    );
  }
} 
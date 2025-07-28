import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

const kelasSchema = z.object({
  name: z.string().min(1, "Nama kelas tidak boleh kosong"),
  level: z.string().optional(),
  tahunAjaranId: z.string().min(1, "Tahun ajaran wajib dipilih"),
});

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    const { searchParams } = new URL(req.url);
    const tahunAjaranId = searchParams.get("tahunAjaranId");
    const where = tahunAjaranId ? { tahunAjaranId } : {};
    const kelas = await prisma.kelas.findMany({
      include: {
        tahunAjaran: true,
      },
      orderBy: [
        { tahunAjaran: { name: 'asc' } },
        { name: 'asc' }
      ]
    });
    return NextResponse.json(kelas, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=59',
      }
    });
  } catch (error) {
    console.error("Error fetching kelas:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengambil data kelas." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    const body = await req.json();
    const validatedData = kelasSchema.parse(body);
    const newKelas = await prisma.kelas.create({
      data: validatedData,
    });
    return NextResponse.json(newKelas, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.errors }, { status: 400 });
    }
    console.error("Error creating kelas:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat membuat kelas baru." },
      { status: 500 }
    );
  }
} 
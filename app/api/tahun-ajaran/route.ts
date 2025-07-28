import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import jwt from "jsonwebtoken";

const tahunAjaranSchema = z.object({
  name: z.string().min(4, "Nama tahun ajaran tidak boleh kosong"), // contoh: 2023/2024
  aktif: z.boolean().optional(),
});

export async function GET(req: Request) {
  try {
    // Cek Bearer token di header
    const authHeader = req.headers.get("authorization");
    let user: any = undefined;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        const payload: any = jwt.verify(token, process.env.JWT_SECRET || "secret");
        user = payload;
      } catch (e) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }
    } else {
      // Fallback ke session NextAuth
      const session = await getServerSession(authOptions);
      if (!session?.user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }
      user = session.user;
    }
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const tahunAjaran = await prisma.tahunAjaran.findMany({
      orderBy: { name: "desc" },
    });
    return NextResponse.json(tahunAjaran, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=59',
      }
    });
  } catch (error) {
    console.error("Error fetching tahun ajaran:", error);
    return NextResponse.json({ message: "Terjadi kesalahan saat mengambil data tahun ajaran." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json();
    const validatedData = tahunAjaranSchema.parse(body);
    // Jika aktif true, nonaktifkan tahun ajaran lain
    if (validatedData.aktif) {
      await prisma.tahunAjaran.updateMany({ data: { aktif: false } });
    }
    const newTahunAjaran = await prisma.tahunAjaran.create({
      data: validatedData,
    });
    return NextResponse.json(newTahunAjaran, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.errors }, { status: 400 });
    }
    console.error("Error creating tahun ajaran:", error);
    return NextResponse.json({ message: "Terjadi kesalahan saat membuat tahun ajaran." }, { status: 500 });
  }
} 
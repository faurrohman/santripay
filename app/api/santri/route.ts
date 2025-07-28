import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

const santriSchema = z.object({
  userId: z.string().uuid(),
  name: z.string().min(1, "Nama santri tidak boleh kosong"),
  santriId: z.string().min(1, "ID Santri tidak boleh kosong"),
  kelasId: z.string().uuid("Pilih kelas yang valid"),
  phone: z.string().optional().transform(val => val === "" ? undefined : val),
  namaBapak: z.string().optional(),
  namaIbu: z.string().optional(),
  alamat: z.string().optional(),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const santriFull = await prisma.santri.findMany({ 
      select: {
        id: true,
        name: true,
        santriId: true,
        phone: true,
        namaBapak: true,
        namaIbu: true,
        alamat: true,
        user: {
          select: {
            id: true,
            username: true,
            email: true
          }
        },
        kelas: {
          select: {
            id: true,
            name: true,
            level: true,
            tahunAjaran: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json(santriFull, { 
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=59',
      }
    });
  } catch (error) {
    console.error("Error fetching all santri:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengambil semua data santri." }, 
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
    console.log("Data yang diterima:", body);
    
    const validatedData = santriSchema.parse(body);
    console.log("Data yang sudah divalidasi:", validatedData);

    // Cek apakah ID Santri sudah digunakan
    const existingSantriId = await prisma.santri.findUnique({
      where: { santriId: validatedData.santriId },
    });

    if (existingSantriId) {
      return NextResponse.json(
        { message: "ID Santri sudah digunakan" },
        { status: 400 }
      );
    }

    const newSantri = await prisma.santri.create({
      data: {
        userId: validatedData.userId,
        name: validatedData.name,
        santriId: validatedData.santriId,
        kelasId: validatedData.kelasId,
        phone: validatedData.phone,
        namaBapak: validatedData.namaBapak,
        namaIbu: validatedData.namaIbu,
        alamat: validatedData.alamat,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true
          }
        },
        kelas: {
          select: {
            id: true,
            name: true,
            level: true
          }
        }
      }
    });

    return NextResponse.json({
      message: "Santri berhasil ditambahkan",
      data: newSantri
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Error validasi:", error.errors);
      return NextResponse.json({ 
        message: "Data tidak valid", 
        errors: error.errors 
      }, { status: 400 });
    }
    console.error("Error creating santri:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat membuat santri baru." },
      { status: 500 }
    );
  }
}
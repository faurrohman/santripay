import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

const santriSchema = z.object({
  userId: z.string().uuid().optional(),
  name: z.string().min(1, "Nama santri tidak boleh kosong").optional(),
  santriId: z.string().min(1, "ID Santri tidak boleh kosong").optional(),
  kelasId: z.string().uuid("Pilih kelas yang valid").optional(),
  phone: z.string().optional().transform(val => val === "" ? undefined : val),
  namaBapak: z.string().optional(),
  namaIbu: z.string().optional(),
  alamat: z.string().optional(),
});

interface Params {
  id: string;
}

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

    const santri = await prisma.santri.findUnique({
      where: { id },
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
        },
      },
    });

    if (!santri) {
      return NextResponse.json({ message: "Santri tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json(santri, { status: 200 });
  } catch (error) {
    console.error("Error fetching santri by ID:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengambil data santri." },
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
    // Jika ada userData, update user dulu
    if (body.userData && body.userId) {
      const userUpdateSchema = z.object({
        username: z.string().min(1, "Username tidak boleh kosong").optional(),
        email: z.string().email("Email tidak valid").optional(),
      });
      const validatedUser = userUpdateSchema.parse(body.userData);
      try {
        await prisma.user.update({
          where: { id: body.userId },
          data: validatedUser,
        });
      } catch (e: any) {
        return NextResponse.json({ message: e?.message || "Gagal update user" }, { status: 400 });
      }
    }
    // Lanjut update santri (hanya field valid)
    const santriUpdate: any = {};
    if (body.name) santriUpdate.name = body.name;
    if (body.santriId) santriUpdate.santriId = body.santriId;
    if (body.kelasId) santriUpdate.kelasId = body.kelasId;
    if (body.phone !== undefined) santriUpdate.phone = body.phone;
    if (body.namaBapak !== undefined) santriUpdate.namaBapak = body.namaBapak;
    if (body.namaIbu !== undefined) santriUpdate.namaIbu = body.namaIbu;
    if (body.alamat !== undefined) santriUpdate.alamat = body.alamat;
    // Validasi dengan schema
    const validatedData = santriSchema.partial().parse(santriUpdate);
    // Cek duplikasi santriId
    if (validatedData.santriId) {
      const existingSantriId = await prisma.santri.findFirst({
        where: {
          santriId: validatedData.santriId,
          id: { not: id }
        }
      });
      if (existingSantriId) {
        return NextResponse.json(
          { message: "ID Santri sudah digunakan" },
          { status: 400 }
        );
      }
    }
    const updatedSantri = await prisma.santri.update({
      where: { id },
      data: validatedData,
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
      message: "Santri berhasil diperbarui",
      data: updatedSantri
    }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Error validasi:", error.errors);
      return NextResponse.json({ 
        message: "Data tidak valid", 
        errors: error.errors 
      }, { status: 400 });
    }
    console.error("Error updating santri:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat memperbarui santri." },
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
    // Ambil data santri dulu untuk dapat userId
    const santri = await prisma.santri.findUnique({ where: { id } });
    if (!santri) {
      return NextResponse.json({ message: "Santri tidak ditemukan." }, { status: 404 });
    }
    // Hapus santri
    await prisma.santri.delete({ where: { id } });
    // Hapus user terkait
    if (santri.userId) {
      await prisma.user.delete({ where: { id: santri.userId } });
    }
    return NextResponse.json({ message: "Santri dan user berhasil dihapus." }, { status: 200 });
  } catch (error) {
    console.error("Error deleting santri:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat menghapus santri." },
      { status: 500 }
    );
  }
} 
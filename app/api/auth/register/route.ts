import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { z } from "zod";

const registerSchema = z.object({
  username: z.string().min(3, "Username minimal 3 karakter"),
  email: z.string().email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  name: z.string().min(1, "Nama tidak boleh kosong"),
  kelasId: z.string().uuid("Pilih kelas yang valid"),
  phone: z.string().optional().transform(val => val === "" ? undefined : val),
  namaBapak: z.string().optional(),
  namaIbu: z.string().optional(),
  alamat: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    const validatedData = registerSchema.parse(body);

    // Cek username sudah ada atau belum
    const existingUsername = await prisma.user.findUnique({
      where: { username: validatedData.username },
    });

    if (existingUsername) {
      return NextResponse.json(
        { message: "Username sudah digunakan" },
        { status: 400 }
      );
    }

    // Cek email sudah ada atau belum
    const existingEmail = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingEmail) {
      return NextResponse.json(
        { message: "Email sudah digunakan" },
        { status: 400 }
      );
    }

    // Generate ID Santri otomatis
    const currentYear = new Date().getFullYear();
    
    const lastSantri = await prisma.santri.findFirst({
      orderBy: { santriId: 'desc' },
      where: {
        santriId: {
          startsWith: `${currentYear}`
        }
      }
    });

    let newSantriId;
    if (lastSantri) {
      const lastNumber = parseInt(lastSantri.santriId.slice(-4));
      newSantriId = `${currentYear}${String(lastNumber + 1).padStart(4, '0')}`;
    } else {
      newSantriId = `${currentYear}0001`;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 10);

    // Buat user dan santri dalam satu transaksi
    const result = await prisma.$transaction(async (tx) => {
      // Buat user baru
      const user = await tx.user.create({
        data: {
          username: validatedData.username,
          email: validatedData.email,
          password: hashedPassword,
          role: "santri",
        },
      });

      // Buat santri baru dengan ID otomatis
      const santri = await tx.santri.create({
        data: {
          userId: user.id,
          name: validatedData.name,
          santriId: newSantriId,
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

      return { user, santri };
    });

    // Hapus password dari response
    const { password, ...userWithoutPassword } = result.user;

    return NextResponse.json({
      message: "Registrasi berhasil",
      data: {
        user: userWithoutPassword,
        santri: result.santri
      }
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Data tidak valid", errors: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Terjadi kesalahan saat registrasi" },
      { status: 500 }
    );
  }
} 
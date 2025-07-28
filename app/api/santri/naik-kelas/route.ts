import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { PrismaClient, Prisma } from "@prisma/client";

// Skema validasi untuk proses naik kelas
const naikKelasSchema = z.object({
  santriIds: z.array(z.string()).min(1, "Pilih minimal satu santri"),
  kelasLamaId: z.string().min(1, "Kelas lama harus dipilih"),
  kelasBaru: z.string().min(1, "Kelas baru harus dipilih"),
});

export async function GET(req: Request) {
  try {
    // Pastikan hanya admin yang bisa mengakses
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Parse URL untuk mendapatkan parameter
    const { searchParams } = new URL(req.url);
    const kelasId = searchParams.get('kelasId');
    const withTagihan = searchParams.get('withTagihan') === 'true';

    // Ambil tahun ajaran aktif
    const tahunAjaranAktif = await prisma.tahunAjaran.findFirst({
      where: { aktif: true }
    });

    if (!tahunAjaranAktif) {
      return NextResponse.json({ 
        message: "Tidak ada tahun ajaran aktif" 
      }, { status: 400 });
    }

    // Siapkan kondisi where
    const whereCondition: any = {
      kelas: {
        tahunAjaranId: tahunAjaranAktif.id
      }
    };

    // Tambahkan filter kelas jika ada
    if (kelasId) {
      whereCondition.kelasId = kelasId;
    }

    // Ambil daftar santri yang bisa naik kelas
    const santriList = await prisma.santri.findMany({
      where: whereCondition,
      select: {
        id: true,
        name: true,
        santriId: true,
        kelas: {
          select: {
            id: true,
            name: true,
            level: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Jika diminta, tambahkan informasi tagihan
    if (withTagihan) {
      const santriWithTagihan = await Promise.all(
        santriList.map(async (santri: { id: string }) => {
          // Hitung total tagihan
          const tagihan = await prisma.tagihan.findMany({
            where: {
              santriId: santri.id,
              status: {
                not: 'paid'
              }
            }
          });

          const totalTagihan = tagihan.reduce((sum: number, t: Prisma.TagihanGetPayload<{}>) => 
            sum + Number(t.amount), 0);
          const tagihanBelumLunas = totalTagihan;

          return {
            ...santri,
            totalTagihan,
            tagihanBelumLunas
          };
        })
      );

      return NextResponse.json(santriWithTagihan, { status: 200 });
    }

    return NextResponse.json(santriList, { status: 200 });
  } catch (error) {
    console.error("[NAIK_KELAS_GET_ERROR]", error);
    
    // Log detail error untuk debugging
    if (error instanceof Error) {
      return NextResponse.json({ 
        message: "Terjadi kesalahan saat mengambil data santri",
        errorDetails: error.message
      }, { status: 500 });
    }

    return NextResponse.json({ 
      message: "Terjadi kesalahan saat mengambil data santri" 
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // Pastikan hanya admin yang bisa mengakses
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Parse dan validasi request body
    const body = await req.json();
    const { santriIds, kelasLamaId, kelasBaru } = naikKelasSchema.parse(body);

    // Ambil tahun ajaran aktif
    const tahunAjaranAktif = await prisma.tahunAjaran.findFirst({
      where: { aktif: true }
    });

    if (!tahunAjaranAktif) {
      return NextResponse.json({ 
        message: "Tidak ada tahun ajaran aktif" 
      }, { status: 400 });
    }

    // Ambil informasi kelas lama dan baru
    const [kelasLamaInfo, kelasBaruInfo] = await Promise.all([
      prisma.kelas.findUnique({
        where: { id: kelasLamaId },
        select: { name: true, level: true }
      }),
      prisma.kelas.findUnique({
        where: { id: kelasBaru },
        select: { name: true, level: true }
      })
    ]);

    // Mulai transaksi untuk memastikan konsistensi data
    const result = await prisma.$transaction(async (tx) => {
      // Simpan riwayat kenaikan kelas
      const naikKelasRecords = await Promise.all(
        santriIds.map(async (santriId) => {
          // Ambil informasi santri
          const santri = await tx.santri.findUnique({
            where: { id: santriId },
            include: { user: true }
          });

          // Update kelas santri
          await tx.santri.update({
            where: { id: santriId },
            data: { 
              kelasId: kelasBaru,
              riwayatKelas: {
                create: {
                  kelasLamaId,
                  kelasBaruId: kelasBaru,
                  tanggal: new Date()
                }
              }
            }
          });

          // Buat notifikasi untuk setiap santri
          if (santri?.user) {
            await tx.notifikasi.create({
              data: {
                userId: santri.user.id,
                title: "Kenaikan Kelas",
                message: `Selamat! Anda telah naik kelas dari ${kelasLamaInfo?.name || 'Kelas Lama'} ke ${kelasBaruInfo?.name || 'Kelas Baru'}. ${kelasLamaInfo?.level && kelasBaruInfo?.level ? `(Level: ${kelasLamaInfo.level} → ${kelasBaruInfo.level})` : ''}`,
                type: 'naik_kelas', // Gunakan tipe spesifik untuk kenaikan kelas
                role: 'santri',
                isRead: false
              }
            });
          }

          return santriId;
        })
      );

      return naikKelasRecords;
    });

    return NextResponse.json({ 
      message: "Proses kenaikan kelas berhasil", 
      santriDinaikan: result.length,
      kelasLama: kelasLamaInfo?.name,
      kelasBaru: kelasBaruInfo?.name
    }, { status: 200 });

  } catch (error) {
    console.error("[NAIK_KELAS_ERROR]", error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        message: "Validasi gagal", 
        errors: error.errors 
      }, { status: 400 });
    }

    // Handle other errors
    return NextResponse.json({ 
      message: "Terjadi kesalahan saat proses kenaikan kelas" 
    }, { status: 500 });
  }
}
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

    // Siapkan kondisi where
    const whereCondition: any = {};

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
            level: true,
            tahunAjaran: {
              select: {
                id: true,
                name: true,
                aktif: true
              }
            }
          }
        },
        riwayatKelas: {
          select: {
            kelasBaruId: true,
            kelasBaru: {
              select: {
                id: true,
                name: true,
                level: true,
                tahunAjaran: {
                  select: {
                    name: true
                  }
                }
              }
            }
          },
          orderBy: {
            tanggal: 'desc'
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

    // Gunakan pendekatan individual operations untuk menghindari timeout
    // Meskipun tidak atomic, lebih reliable untuk operasi besar
    
    try {
      // 1. Update semua santri secara parallel
      console.log(`[NAIK_KELAS] Memulai update ${santriIds.length} santri...`);
      const updatePromises = santriIds.map(santriId =>
        prisma.santri.update({
          where: { id: santriId },
          data: { kelasId: kelasBaru }
        })
      );
      
      await Promise.all(updatePromises);
      console.log(`[NAIK_KELAS] ✅ Berhasil update ${santriIds.length} santri`);

      // 2. Buat semua riwayat kelas secara parallel
      console.log(`[NAIK_KELAS] Memulai create riwayat kelas...`);
      const riwayatPromises = santriIds.map(santriId =>
        prisma.riwayatKelas.create({
          data: {
            santriId,
            kelasLamaId,
            kelasBaruId: kelasBaru,
            tanggal: new Date()
          }
        })
      );
      
      await Promise.all(riwayatPromises);
      console.log(`[NAIK_KELAS] ✅ Berhasil create ${santriIds.length} riwayat kelas`);

      // 3. Buat notifikasi untuk semua santri secara parallel
      console.log(`[NAIK_KELAS] Memulai create notifikasi...`);
      const notifikasiPromises = santriIds.map(async (santriId) => {
        const santri = await prisma.santri.findUnique({
          where: { id: santriId },
          include: { user: true }
        });
        
        if (santri?.user) {
          return prisma.notifikasi.create({
            data: {
              userId: santri.user.id,
              title: "Kenaikan Kelas",
              message: `Selamat! Anda telah naik kelas dari ${kelasLamaInfo?.name || 'Kelas Lama'} ke ${kelasBaruInfo?.name || 'Kelas Baru'}. ${kelasLamaInfo?.level && kelasBaruInfo?.level ? `(Level: ${kelasLamaInfo.level} → ${kelasBaruInfo.level})` : ''}`,
              type: 'naik_kelas',
              role: 'santri',
              isRead: false
            }
          });
        }
        return null;
      });
      
      const notifikasiResults = await Promise.all(notifikasiPromises);
      const notifikasiBerhasil = notifikasiResults.filter(Boolean).length;
      console.log(`[NAIK_KELAS] ✅ Berhasil create ${notifikasiBerhasil} notifikasi`);

      console.log(`[NAIK_KELAS] 🎉 Semua operasi berhasil!`);
      
      return NextResponse.json({ 
        message: "Proses kenaikan kelas berhasil", 
        santriDinaikan: santriIds.length,
        kelasLama: kelasLamaInfo?.name,
        kelasBaru: kelasBaruInfo?.name
      }, { status: 200 });

    } catch (error) {
      console.error("[NAIK_KELAS_OPERATION_ERROR]", error);
      
      // Jika ada error, coba rollback update santri
      try {
        console.log("[NAIK_KELAS] ⚠️ Mencoba rollback update santri...");
        const rollbackPromises = santriIds.map(santriId =>
          prisma.santri.update({
            where: { id: santriId },
            data: { kelasId: kelasLamaId }
          })
        );
        await Promise.all(rollbackPromises);
        console.log("[NAIK_KELAS] ✅ Rollback berhasil");
      } catch (rollbackError) {
        console.error("[NAIK_KELAS_ROLLBACK_ERROR]", rollbackError);
        console.log("[NAIK_KELAS] ❌ Rollback gagal - data mungkin tidak konsisten");
      }
      
      throw error;
    }

  } catch (error) {
    console.error("[NAIK_KELAS_ERROR]", error);

    // Handle Prisma transaction errors specifically
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2028') {
        return NextResponse.json({ 
          message: "Transaksi database timeout. Silakan coba lagi atau hubungi administrator jika masalah berlanjut.",
          errorCode: error.code,
          suggestion: "Coba kurangi jumlah santri yang dipilih atau coba lagi dalam beberapa saat."
        }, { status: 408 }); // Request Timeout
      }
      
      return NextResponse.json({ 
        message: "Error database: " + error.message,
        errorCode: error.code
      }, { status: 400 });
    }

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        message: "Validasi gagal", 
        errors: error.errors 
      }, { status: 400 });
    }

    // Handle other errors
    return NextResponse.json({ 
      message: "Terjadi kesalahan saat proses kenaikan kelas",
      errorDetails: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
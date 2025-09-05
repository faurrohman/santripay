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
        select: { 
          name: true, 
          level: true,
          tahunAjaranId: true,
          tahunAjaran: {
            select: {
              name: true,
              aktif: true
            }
          }
        }
      })
    ]);

    // Gunakan pendekatan batch dengan delay untuk menghindari connection pool exhaustion
    // Operasi dibagi menjadi batch kecil dengan delay antar batch
    
    try {
      const BATCH_SIZE = 5; // Proses 5 santri per batch
      const DELAY_MS = 100; // Delay 100ms antar batch
      
      // Helper function untuk delay
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      
      // 1. Update santri dalam batch kecil
      console.log(`[NAIK_KELAS] Memulai update ${santriIds.length} santri dari kelas ${kelasLamaId} ke kelas ${kelasBaru}...`);
      
      for (let i = 0; i < santriIds.length; i += BATCH_SIZE) {
        const batch = santriIds.slice(i, i + BATCH_SIZE);
        console.log(`[NAIK_KELAS] Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(santriIds.length/BATCH_SIZE)} (${batch.length} santri)`);
        
        const updatePromises = batch.map(santriId =>
          prisma.santri.update({
            where: { id: santriId },
            data: { kelasId: kelasBaru }
          })
        );
        
        const updateResults = await Promise.all(updatePromises);
        console.log(`[NAIK_KELAS] ✅ Batch ${Math.floor(i/BATCH_SIZE) + 1} berhasil - ${updateResults.length} santri diupdate`);
        
        // Verifikasi update berhasil
        for (const result of updateResults) {
          console.log(`[NAIK_KELAS] ✅ Santri ${result.name} (ID: ${result.id}) berhasil dipindah ke kelas ${result.kelasId}`);
        }
        
        // Delay antar batch untuk menghindari connection pool exhaustion
        if (i + BATCH_SIZE < santriIds.length) {
          await delay(DELAY_MS);
        }
      }
      
      console.log(`[NAIK_KELAS] ✅ Semua ${santriIds.length} santri berhasil diupdate ke kelas ${kelasBaru}`);

      // Verifikasi final: cek apakah semua santri sudah pindah kelas
      console.log(`[NAIK_KELAS] 🔍 Verifikasi final: memeriksa apakah semua santri sudah pindah kelas...`);
      const verificationResults = await prisma.santri.findMany({
        where: { id: { in: santriIds } },
        select: { id: true, name: true, kelasId: true }
      });
      
      const santriYangSudahPindah = verificationResults.filter(s => s.kelasId === kelasBaru).length;
      const santriYangBelumPindah = verificationResults.filter(s => s.kelasId !== kelasBaru);
      
      console.log(`[NAIK_KELAS] 📊 Hasil verifikasi: ${santriYangSudahPindah}/${santriIds.length} santri berhasil pindah ke kelas ${kelasBaru}`);
      
      if (santriYangBelumPindah.length > 0) {
        console.log(`[NAIK_KELAS] ⚠️ Peringatan: ${santriYangBelumPindah.length} santri belum pindah kelas:`);
        santriYangBelumPindah.forEach(s => {
          console.log(`[NAIK_KELAS] ⚠️ - ${s.name} (ID: ${s.id}) masih di kelas ${s.kelasId}`);
        });
      }

      // 2. Buat riwayat kelas dalam batch kecil
      console.log(`[NAIK_KELAS] Memulai create riwayat kelas dalam batch ${BATCH_SIZE}...`);
      
      for (let i = 0; i < santriIds.length; i += BATCH_SIZE) {
        const batch = santriIds.slice(i, i + BATCH_SIZE);
        console.log(`[NAIK_KELAS] Processing riwayat batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(santriIds.length/BATCH_SIZE)} (${batch.length} santri)`);
        
        const riwayatPromises = batch.map(santriId =>
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
        console.log(`[NAIK_KELAS] ✅ Riwayat batch ${Math.floor(i/BATCH_SIZE) + 1} berhasil`);
        
        if (i + BATCH_SIZE < santriIds.length) {
          await delay(DELAY_MS);
        }
      }
      
      console.log(`[NAIK_KELAS] ✅ Semua ${santriIds.length} riwayat kelas berhasil dibuat`);

      // 3. Buat notifikasi dalam batch kecil
      console.log(`[NAIK_KELAS] Memulai create notifikasi dalam batch ${BATCH_SIZE}...`);
      let totalNotifikasi = 0;
      
      for (let i = 0; i < santriIds.length; i += BATCH_SIZE) {
        const batch = santriIds.slice(i, i + BATCH_SIZE);
        console.log(`[NAIK_KELAS] Processing notifikasi batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(santriIds.length/BATCH_SIZE)} (${batch.length} santri)`);
        
        const notifikasiPromises = batch.map(async (santriId) => {
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
        const batchNotifikasi = notifikasiResults.filter(Boolean).length;
        totalNotifikasi += batchNotifikasi;
        
        console.log(`[NAIK_KELAS] ✅ Notifikasi batch ${Math.floor(i/BATCH_SIZE) + 1} berhasil (${batchNotifikasi} notifikasi)`);
        
        if (i + BATCH_SIZE < santriIds.length) {
          await delay(DELAY_MS);
        }
      }
      
      console.log(`[NAIK_KELAS] ✅ Total ${totalNotifikasi} notifikasi berhasil dibuat`);

      // 4. Pindahkan tagihan dari kelas lama ke kelas baru
      console.log(`[NAIK_KELAS] Memulai pemindahan tagihan dari kelas ${kelasLamaId} ke kelas ${kelasBaru}...`);
      
      // Cari semua tagihan yang terkait dengan santri yang naik kelas
      const tagihanToMove = await prisma.tagihan.findMany({
        where: {
          santriId: { in: santriIds },
          status: {
            not: 'paid' // Hanya tagihan yang belum lunas
          }
        },
        select: {
          id: true,
          santriId: true,
          jenisTagihanId: true,
          amount: true,
          dueDate: true,
          status: true,
          description: true,
          createdAt: true,
          updatedAt: true
        }
      });

      console.log(`[NAIK_KELAS] 📋 Ditemukan ${tagihanToMove.length} tagihan yang akan dipindah`);
      console.log(`[NAIK_KELAS] 📅 Tagihan akan dipindah ke tahun ajaran: ${kelasBaruInfo?.tahunAjaran?.name || 'Tidak ada tahun ajaran'} (ID: ${kelasBaruInfo?.tahunAjaranId || 'null'}) - Status: ${kelasBaruInfo?.tahunAjaran?.aktif ? 'AKTIF' : 'TIDAK AKTIF'}`);

      if (tagihanToMove.length > 0) {
        // Buat tagihan baru di kelas baru untuk setiap tagihan yang ada
        const newTagihanPromises = tagihanToMove.map(tagihan =>
          prisma.tagihan.create({
            data: {
              santriId: tagihan.santriId,
              jenisTagihanId: tagihan.jenisTagihanId,
              amount: tagihan.amount,
              dueDate: tagihan.dueDate,
              status: tagihan.status,
              description: tagihan.description ? `${tagihan.description} (Dipindah dari kelas lama ke ${kelasBaruInfo?.tahunAjaran?.name || 'tahun ajaran baru'})` : `Dipindah dari kelas lama ke ${kelasBaruInfo?.tahunAjaran?.name || 'tahun ajaran baru'}`,
              tahunAjaranId: kelasBaruInfo?.tahunAjaranId || null, // Set tahun ajaran sesuai kelas baru
              createdAt: tagihan.createdAt,
              updatedAt: new Date()
            }
          })
        );

        const newTagihanResults = await Promise.all(newTagihanPromises);
        console.log(`[NAIK_KELAS] ✅ ${newTagihanResults.length} tagihan baru berhasil dibuat di kelas baru`);

        // Hapus tagihan lama
        const deleteTagihanResult = await prisma.tagihan.deleteMany({
          where: {
            id: { in: tagihanToMove.map(t => t.id) }
          }
        });

        console.log(`[NAIK_KELAS] ✅ ${deleteTagihanResult.count} tagihan lama berhasil dihapus`);

        // Buat notifikasi untuk tagihan yang dipindah
        console.log(`[NAIK_KELAS] Membuat notifikasi untuk tagihan yang dipindah...`);
        
        for (let i = 0; i < santriIds.length; i += BATCH_SIZE) {
          const batch = santriIds.slice(i, i + BATCH_SIZE);
          const batchTagihan = tagihanToMove.filter(t => batch.includes(t.santriId));
          
          if (batchTagihan.length > 0) {
            const notifikasiTagihanPromises = batch.map(async (santriId) => {
              const santri = await prisma.santri.findUnique({
                where: { id: santriId },
                include: { user: true }
              });
              
              if (santri?.user) {
                return prisma.notifikasi.create({
                  data: {
                    userId: santri.user.id,
                    title: "Tagihan Dipindah",
                    message: `Tagihan Anda telah dipindah ke kelas baru (${kelasBaruInfo?.name || 'Kelas Baru'}) tahun ajaran ${kelasBaruInfo?.tahunAjaran?.name || 'baru'} (${kelasBaruInfo?.tahunAjaran?.aktif ? 'aktif' : 'tidak aktif'}) karena kenaikan kelas. Silakan periksa tagihan terbaru Anda.`,
                    type: 'tagihan_dipindah',
                    role: 'santri',
                    isRead: false
                  }
                });
              }
              return null;
            });
            
            const notifikasiTagihanResults = await Promise.all(notifikasiTagihanPromises);
            const batchNotifikasiTagihan = notifikasiTagihanResults.filter(Boolean).length;
            console.log(`[NAIK_KELAS] ✅ Notifikasi tagihan batch ${Math.floor(i/BATCH_SIZE) + 1} berhasil (${batchNotifikasiTagihan} notifikasi)`);
          }
          
          if (i + BATCH_SIZE < santriIds.length) {
            await delay(DELAY_MS);
          }
        }
      } else {
        console.log(`[NAIK_KELAS] ℹ️ Tidak ada tagihan yang perlu dipindah`);
      }

      console.log(`[NAIK_KELAS] 🎉 Semua operasi berhasil!`);

    return NextResponse.json({ 
      message: "Proses kenaikan kelas berhasil", 
      santriDinaikan: santriIds.length,
      kelasLama: kelasLamaInfo?.name,
      kelasBaru: kelasBaruInfo?.name,
      tahunAjaranBaru: kelasBaruInfo?.tahunAjaran?.name,
      tahunAjaranAktif: kelasBaruInfo?.tahunAjaran?.aktif,
      tagihanDipindah: tagihanToMove.length
    }, { status: 200 });

    } catch (error) {
      console.error("[NAIK_KELAS_OPERATION_ERROR]", error);
      
      // Jika ada error, coba rollback update santri dalam batch kecil
      try {
        console.log("[NAIK_KELAS] ⚠️ Mencoba rollback update santri dalam batch kecil...");
        
        const BATCH_SIZE = 5;
        const DELAY_MS = 100;
        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
        
        for (let i = 0; i < santriIds.length; i += BATCH_SIZE) {
          const batch = santriIds.slice(i, i + BATCH_SIZE);
          console.log(`[NAIK_KELAS] Rollback batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(santriIds.length/BATCH_SIZE)} (${batch.length} santri)`);
          
          const rollbackPromises = batch.map(santriId =>
            prisma.santri.update({
              where: { id: santriId },
              data: { kelasId: kelasLamaId }
            })
          );
          
          await Promise.all(rollbackPromises);
          console.log(`[NAIK_KELAS] ✅ Rollback batch ${Math.floor(i/BATCH_SIZE) + 1} berhasil`);
          
          if (i + BATCH_SIZE < santriIds.length) {
            await delay(DELAY_MS);
          }
        }
        
        console.log("[NAIK_KELAS] ✅ Rollback semua santri berhasil");
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
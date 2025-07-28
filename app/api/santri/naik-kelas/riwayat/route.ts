import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    // Pastikan hanya admin yang bisa mengakses
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Parse URL untuk mendapatkan parameter
    const { searchParams } = new URL(req.url);
    const tahunAjaranId = searchParams.get('tahunAjaranId');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // Siapkan kondisi where
    const whereCondition: any = {};

    // Filter tahun ajaran
    if (tahunAjaranId) {
      whereCondition.kelasLama = {
        tahunAjaranId: tahunAjaranId
      };
    }

    // Filter tanggal
    if (startDateParam && endDateParam) {
      const startDate = new Date(startDateParam);
      const endDate = new Date(endDateParam);
      
      whereCondition.tanggal = {
        gte: startDate,
        lte: endDate
      };
    } else if (startDateParam) {
      const startDate = new Date(startDateParam);
      whereCondition.tanggal = {
        gte: startDate
      };
    } else if (endDateParam) {
      const endDate = new Date(endDateParam);
      whereCondition.tanggal = {
        lte: endDate
      };
    }

    // Ambil riwayat kenaikan kelas
    const riwayatList = await prisma.riwayatKelas.findMany({
      where: whereCondition,
      include: {
        santri: {
          select: {
            name: true,
            santriId: true
          }
        },
        kelasLama: {
          select: {
            name: true,
            level: true
          }
        },
        kelasBaru: {
          select: {
            name: true,
            level: true
          }
        }
      },
      orderBy: {
        tanggal: 'desc'
      }
    });

    return NextResponse.json(riwayatList, { 
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=59',
      }
    });
  } catch (error) {
    console.error("[RIWAYAT_NAIK_KELAS_ERROR]", error);
    
    // Log detail error untuk debugging
    if (error instanceof Error) {
      return NextResponse.json({ 
        message: "Terjadi kesalahan saat mengambil riwayat kenaikan kelas",
        errorDetails: error.message
      }, { status: 500 });
    }

    return NextResponse.json({ 
      message: "Terjadi kesalahan saat mengambil riwayat kenaikan kelas" 
    }, { status: 500 });
  }
} 
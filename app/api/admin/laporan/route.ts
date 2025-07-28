import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Ambil query param tahunAjaranId
    const { searchParams } = new URL(req.url);
    const tahunAjaranId = searchParams.get("tahunAjaranId");
    const tagihanWhere = tahunAjaranId ? { tahunAjaranId } : {};

    // Total tagihan (target pemasukan)
    const totalTagihan = await prisma.tagihan.aggregate({
      where: tagihanWhere,
      _sum: { amount: true },
    });

    // Total dibayar (total pemasukan)
    let totalDibayarAmount = 0;
    if (tahunAjaranId) {
      const transaksi = await prisma.transaksi.findMany({
        where: { status: "approved" },
        include: { tagihan: true },
      });
      const filtered = transaksi.filter(t => t.tagihan?.tahunAjaranId === tahunAjaranId);
      totalDibayarAmount = filtered.reduce((acc, t) => acc + Number(t.amount), 0);
    } else {
      const agg = await prisma.transaksi.aggregate({
        where: { status: "approved" },
        _sum: { amount: true },
      });
      totalDibayarAmount = Number(agg._sum.amount || 0);
    }

    // Tagihan menunggu pembayaran
    const totalMenunggu = await prisma.tagihan.aggregate({
      where: { ...tagihanWhere, status: "pending" },
      _sum: { amount: true },
    });

    // Tagihan terlambat
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const totalTerlambat = await prisma.tagihan.aggregate({
      where: {
        ...tagihanWhere,
        status: "pending",
        dueDate: { lt: today },
      },
      _sum: { amount: true },
    });

    // Data tagihan per bulan untuk tren
    const tagihanPerBulan = await prisma.tagihan.groupBy({
      by: ['createdAt'],
      where: tagihanWhere,
      _sum: { amount: true },
    });

    // Data transaksi per bulan untuk tren
    let transaksiPerBulan: any[] = [];
    if (tahunAjaranId) {
      const transaksi = await prisma.transaksi.findMany({
        where: { status: "approved" },
        include: { tagihan: true },
      });
      const filtered = transaksi.filter(t => t.tagihan?.tahunAjaranId === tahunAjaranId);
      const grouped = filtered.reduce((acc, t) => {
        const month = new Date(t.paymentDate).getMonth();
        if (!acc[month]) acc[month] = 0;
        acc[month] += Number(t.amount);
        return acc;
      }, {} as Record<number, number>);
      transaksiPerBulan = Object.entries(grouped).map(([month, amount]) => ({
        month: parseInt(month),
        amount
      }));
    } else {
      const transaksiAgg = await prisma.transaksi.groupBy({
        by: ['paymentDate'],
        where: { status: "approved" },
        _sum: { amount: true },
      });
      transaksiPerBulan = transaksiAgg.map(item => ({
        paymentDate: item.paymentDate,
        _sum: { amount: Number(item._sum.amount || 0) }
      }));
    }

    // Breakdown per jenis tagihan
    const tagihanPerJenis = await prisma.tagihan.groupBy({
      by: ['jenisTagihanId'],
      where: tagihanWhere,
      _sum: { amount: true },
    });

    // Ambil nama jenis tagihan
    const jenisTagihanIds = tagihanPerJenis.map(t => t.jenisTagihanId);
    const jenisTagihanList = await prisma.jenisTagihan.findMany({
      where: { id: { in: jenisTagihanIds } },
      select: { id: true, name: true },
    });

    // Hitung realisasi per jenis tagihan
    const realisasiPerJenis = await Promise.all(
      jenisTagihanIds.map(async (jenisId) => {
        let realisasi = 0;
        if (tahunAjaranId) {
          const transaksi = await prisma.transaksi.findMany({
            where: { 
              status: "approved",
              tagihan: { 
                jenisTagihanId: jenisId,
                tahunAjaranId 
              }
            },
          });
          realisasi = transaksi.reduce((acc, t) => acc + Number(t.amount), 0);
        } else {
          const transaksi = await prisma.transaksi.findMany({
            where: { 
              status: "approved",
              tagihan: { jenisTagihanId: jenisId }
            },
          });
          realisasi = transaksi.reduce((acc, t) => acc + Number(t.amount), 0);
        }
        return { jenisId, realisasi };
      })
    );

    // Breakdown per kelas
    const tagihanPerKelas = await prisma.tagihan.groupBy({
      by: ['santriId'],
      where: tagihanWhere,
      _sum: { amount: true },
    });

    // Ambil data santri dan kelas
    const santriIds = tagihanPerKelas.map(t => t.santriId);
    const santriList = await prisma.santri.findMany({
      where: { id: { in: santriIds } },
      include: { kelas: true },
    });

    // Hitung realisasi per kelas
    const realisasiPerKelas = await Promise.all(
      santriIds.map(async (santriId) => {
        let realisasi = 0;
        if (tahunAjaranId) {
          const transaksi = await prisma.transaksi.findMany({
            where: { 
              status: "approved",
              santriId,
              tagihan: { tahunAjaranId }
            },
          });
          realisasi = transaksi.reduce((acc, t) => acc + Number(t.amount), 0);
        } else {
          const transaksi = await prisma.transaksi.findMany({
            where: { 
              status: "approved",
              santriId
            },
          });
          realisasi = transaksi.reduce((acc, t) => acc + Number(t.amount), 0);
        }
        return { santriId, realisasi };
      })
    );

    // Data untuk insight lanjutan
    const tagihanTerlambatDetail = await prisma.tagihan.findMany({
      where: {
        ...tagihanWhere,
        status: "pending",
        dueDate: { lt: today },
      },
      include: {
        santri: {
          include: { kelas: true }
        },
        jenisTagihan: true,
      },
      orderBy: { dueDate: 'asc' },
      take: 10, // Top 10 terlambat
    });

    // Recent activities (pembayaran terbaru)
    const recentPembayaran = await prisma.transaksi.findMany({
      where: { status: "approved" },
      include: {
        santri: { include: { kelas: true } },
        tagihan: { include: { jenisTagihan: true } },
      },
      orderBy: { paymentDate: 'desc' },
      take: 5,
    });

    // Konversi BigInt ke Number untuk tagihanPerBulan
    const serializedTagihanPerBulan = tagihanPerBulan.map(item => ({
      createdAt: item.createdAt,
      _sum: { amount: Number(item._sum.amount || 0) }
    }));

    // Proses data per jenis tagihan
    const breakdownJenisTagihan = tagihanPerJenis.map(tagihan => {
      const jenis = jenisTagihanList.find(j => j.id === tagihan.jenisTagihanId);
      const realisasi = realisasiPerJenis.find(r => r.jenisId === tagihan.jenisTagihanId);
      const target = Number(tagihan._sum.amount || 0);
      const realisasiAmount = realisasi?.realisasi || 0;
      const persentase = target > 0 ? (realisasiAmount / target) * 100 : 0;
      
      return {
        id: tagihan.jenisTagihanId,
        name: jenis?.name || 'Unknown',
        target,
        realisasi: realisasiAmount,
        persentase: Math.round(persentase * 100) / 100,
      };
    });

    // Proses data per kelas
    const breakdownPerKelas = santriList.reduce((acc, santri) => {
      const tagihan = tagihanPerKelas.find(t => t.santriId === santri.id);
      const realisasi = realisasiPerKelas.find(r => r.santriId === santri.id);
      const target = Number(tagihan?._sum.amount || 0);
      const realisasiAmount = realisasi?.realisasi || 0;
      
      const kelasKey = santri.kelas?.name || 'Unknown';
      if (!acc[kelasKey]) {
        acc[kelasKey] = {
          name: kelasKey,
          target: 0,
          realisasi: 0,
          santriCount: 0,
        };
      }
      
      acc[kelasKey].target += target;
      acc[kelasKey].realisasi += realisasiAmount;
      acc[kelasKey].santriCount += 1;
      
      return acc;
    }, {} as Record<string, any>);

    // Hitung persentase per kelas
    Object.values(breakdownPerKelas).forEach(kelas => {
      kelas.persentase = kelas.target > 0 ? Math.round((kelas.realisasi / kelas.target) * 100 * 100) / 100 : 0;
    });

    return NextResponse.json({
      data: {
        totalTagihan: Number(totalTagihan?._sum?.amount || 0),
        totalDibayar: totalDibayarAmount,
        totalMenunggu: Number(totalMenunggu?._sum?.amount || 0),
        totalTerlambat: Number(totalTerlambat?._sum?.amount || 0),
        tagihanPerBulan: serializedTagihanPerBulan,
        transaksiPerBulan,
        breakdownJenisTagihan,
        breakdownPerKelas: Object.values(breakdownPerKelas),
        tagihanTerlambatDetail: tagihanTerlambatDetail.map(t => ({
          id: t.id,
          amount: Number(t.amount),
          dueDate: t.dueDate,
          santriName: t.santri.name,
          kelasName: t.santri.kelas?.name,
          jenisTagihanName: t.jenisTagihan.name,
        })),
        recentPembayaran: recentPembayaran.map(t => ({
          id: t.id,
          amount: Number(t.amount),
          paymentDate: t.paymentDate,
          santriName: t.santri.name,
          kelasName: t.santri.kelas?.name,
          jenisTagihanName: t.tagihan?.jenisTagihan?.name || 'Unknown',
        })),
      },
    });
  } catch (error) {
    console.error("[LAPORAN_ADMIN_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
} 
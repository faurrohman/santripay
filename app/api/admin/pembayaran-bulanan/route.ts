import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const bulan = searchParams.get("bulan");
    const tahunAjaranId = searchParams.get("tahunAjaranId");
    const tanggalMulai = searchParams.get("tanggalMulai");
    const tanggalSelesai = searchParams.get("tanggalSelesai");

    // Ambil semua tagihan beserta transaksi
    const tagihanWhere: any = {};
    if (tahunAjaranId) {
      tagihanWhere.tahunAjaranId = tahunAjaranId;
    }
    if (tanggalMulai || tanggalSelesai) {
      tagihanWhere.dueDate = {};
      if (tanggalMulai) tagihanWhere.dueDate.gte = new Date(tanggalMulai);
      if (tanggalSelesai) {
        const endDate = new Date(tanggalSelesai);
        endDate.setHours(23, 59, 59, 999);
        tagihanWhere.dueDate.lte = endDate;
      }
    }
    const tagihanList = await prisma.tagihan.findMany({
      where: tagihanWhere,
          include: {
            santri: true,
            jenisTagihan: true,
        tahunAjaran: true,
        transaksi: true,
      },
      orderBy: {
        dueDate: "desc"
      }
    });

    // Gabungkan data transaksi dan tagihan
    const pembayaranGabungan = tagihanList.map((tagihan: any) => {
      if (tagihan.transaksi && tagihan.transaksi.length > 0) {
        // Jika ada transaksi, tampilkan data transaksi (bisa lebih dari satu, ambil yang terbaru)
        const transaksi = tagihan.transaksi.sort((a: any, b: any) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())[0];
        return {
          id: transaksi.id,
          paymentDate: transaksi.paymentDate?.toISOString() || "",
          paymentMethod: transaksi.paymentMethod || "-",
          santriName: tagihan.santri?.name || "-",
          jenisTagihanName: tagihan.jenisTagihan?.name || "-",
          status: transaksi.status,
          amount: Number(transaksi.amount)
        };
      } else {
        // Jika belum ada transaksi, tampilkan data tagihan
        return {
          id: tagihan.id,
          paymentDate: "",
          paymentMethod: "-",
          santriName: tagihan.santri?.name || "-",
          jenisTagihanName: tagihan.jenisTagihan?.name || "-",
          status: tagihan.status || "pending",
          amount: Number(tagihan.amount)
        };
      }
    });

    // Filter by bulan jika ada
    let pembayaranFiltered = pembayaranGabungan;
    if (bulan) {
      pembayaranFiltered = pembayaranGabungan.filter(item => {
        if (!item.paymentDate) return false;
        const date = new Date(item.paymentDate);
        return date.getMonth() + 1 === parseInt(bulan);
      });
    }

    // Statistik (hitung dari pembayaranFiltered)
    const totalDibayar = pembayaranFiltered.filter(item => item.status === "approved").reduce((sum, item) => sum + item.amount, 0);
    const totalMenunggu = pembayaranFiltered.filter(item => item.status === "pending").reduce((sum, item) => sum + item.amount, 0);
    const now = new Date();
    const overdueTagihan = pembayaranFiltered.filter(item => {
      // Tagihan pending dan dueDate sudah lewat hari ini
      return item.status === "pending" && item.paymentDate && new Date(item.paymentDate) < now;
    });
    const totalTerlambat = overdueTagihan.length;
    const totalNominalTerlambat = overdueTagihan.reduce((sum, item) => sum + (item.amount ? Number(item.amount) : 0), 0);
    const totalJenisPembayaran = Array.from(new Set(pembayaranFiltered.map(item => item.jenisTagihanName))).length;
    const totalPembayaran = pembayaranFiltered.length;
    const totalNominal = pembayaranFiltered.reduce((sum, item) => sum + item.amount, 0);
    const approvedCount = pembayaranFiltered.filter(item => item.status === "approved").length;
    const pendingCount = pembayaranFiltered.filter(item => item.status === "pending").length;

    return NextResponse.json({
      success: true,
      data: pembayaranFiltered,
      statistik: {
        totalDibayar,
        totalMenunggu,
        totalTerlambat,
        totalNominalTerlambat,
        totalJenisPembayaran,
        totalPembayaran,
        totalNominal,
        approvedCount,
        pendingCount
      }
    });

  } catch (error) {
    console.error("Error fetching pembayaran bulanan:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Mengambil total santri
    const totalSantri = await prisma.santri.count();

    // Mengambil total tagihan
    const totalTagihan = await prisma.tagihan.aggregate({
      _sum: {
        amount: true,
      },
    });

    // Mengambil total tagihan yang sudah dibayar
    const totalDibayar = await prisma.transaksi.aggregate({
      where: {
        status: "approved",
      },
      _sum: {
        amount: true,
      },
    });

    // Mengambil total tagihan yang menunggu pembayaran
    const totalMenunggu = await prisma.tagihan.aggregate({
      where: {
        status: "pending",
      },
      _sum: {
        amount: true,
      },
    });

    // Mengambil total tagihan yang terlambat (jatuh tempo)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalTerlambat = await prisma.tagihan.aggregate({
      where: {
        status: "pending",
        dueDate: {
          lt: today,
        },
      },
      _sum: {
        amount: true,
      },
    });

    return NextResponse.json({
      data: {
        totalSantri,
        totalTagihan: Number(totalTagihan._sum.amount || 0),
        totalDibayar: Number(totalDibayar._sum.amount || 0),
        totalMenunggu: Number(totalMenunggu._sum.amount || 0),
        totalTerlambat: Number(totalTerlambat._sum.amount || 0),
      },
    });
  } catch (error) {
    console.error("[STATISTIK_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
} 
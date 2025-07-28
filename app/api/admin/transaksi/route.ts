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

    const transaksi = await prisma.transaksi.findMany({
      include: {
        santri: {
          select: {
            name: true,
          },
        },
        tagihan: {
          select: {
            jenisTagihan: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        paymentDate: "desc",
      },
    });

    // Konversi BigInt ke Number
    const formattedTransaksi = transaksi.map(t => ({
      ...t,
      amount: Number(t.amount),
    }));

    return NextResponse.json({
      data: formattedTransaksi,
    });
  } catch (error) {
    console.error("[TRANSAKSI_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
} 
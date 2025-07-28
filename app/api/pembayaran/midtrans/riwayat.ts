import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Cari santriId dari user
    const santri = await prisma.santri.findUnique({
      where: { userId: session.user.id },
    });
    if (!santri) {
      return NextResponse.json({ message: "Santri tidak ditemukan" }, { status: 404 });
    }

    // Ambil transaksi yang note mengandung 'Midtrans'
    const transaksi = await prisma.transaksi.findMany({
      where: {
        santriId: santri.id,
        note: { contains: "Midtrans" },
      },
      include: {
        tagihan: {
          include: { jenisTagihan: true },
        },
      },
      orderBy: { paymentDate: "desc" },
    });

    // Serialisasi BigInt dan Date
    const serialize = (value: any): any => {
      if (typeof value === 'bigint') return value.toString();
      if (value instanceof Date) return value.toISOString();
      if (Array.isArray(value)) return value.map(serialize);
      if (value && typeof value === 'object') {
        const result: any = {};
        for (const key in value) result[key] = serialize(value[key]);
        return result;
      }
      return value;
    };

    return NextResponse.json({ data: serialize(transaksi) });
  } catch (error) {
    console.error("[MIDTRANS_RIWAYAT]", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
} 
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";

// Fungsi untuk mengkonversi BigInt ke string
function serializeBigInt(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === "bigint") {
    return data.toString();
  }

  if (Array.isArray(data)) {
    return data.map(serializeBigInt);
  }

  if (typeof data === "object") {
    const result: any = {};
    for (const key in data) {
      if (key === 'paymentDate' || key === 'payment_date') {
        result[key] = data[key] ? new Date(data[key]).toISOString() : null;
      } else {
        result[key] = serializeBigInt(data[key]);
      }
    }
    return result;
  }

  return data;
}

export async function GET(req: Request) {
  try {
    let email: string | undefined = undefined;
    // Cek Bearer token di header
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        const payload: any = jwt.verify(token, process.env.JWT_SECRET || "secret");
        email = payload?.email;
      } catch (e) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }
    } else {
      // Fallback ke session NextAuth
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }
      email = session.user.email;
    }

    if (!email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const transaksi = await prisma.transaksi.findMany({
      where: {
        santri: {
          user: {
            email: email,
          },
        },
      },
      include: {
        tagihan: {
          include: {
            jenisTagihan: true,
          },
        },
      },
      orderBy: {
        paymentDate: "desc",
      },
    });

    const serializedTransaksi = serializeBigInt(transaksi);

    return NextResponse.json({
      message: "Data transaksi berhasil diambil",
      data: serializedTransaksi,
    });
  } catch (error) {
    console.error("[TRANSAKSI_SANTRI_GET]", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
} 
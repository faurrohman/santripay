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
      if (key === 'paymentDate' || key === 'payment_date' || key === 'dueDate' || key === 'due_date') {
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
    // Ambil token dari header Authorization
    const authHeader = req.headers.get("authorization");
    let email: string | undefined = undefined;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        const payload: any = jwt.verify(token, process.env.JWT_SECRET || "secret");
        email = payload?.email;
      } catch (e) {
        return new NextResponse("Unauthorized", { status: 401 });
      }
    } else {
      // Fallback ke session NextAuth
      const session = await getServerSession(authOptions);
      if (!session?.user?.email) {
        return new NextResponse("Unauthorized", { status: 401 });
      }
      email = session.user.email;
    }

    if (!email) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Ambil query param tahunAjaranId
    const { searchParams } = new URL(req.url);
    const tahunAjaranId = searchParams.get('tahunAjaranId');

    const tagihan = await prisma.tagihan.findMany({
      where: {
        santri: {
          user: {
            email: email,
          },
        },
        ...(tahunAjaranId ? { tahunAjaranId } : {}),
      },
      include: {
        jenisTagihan: {
          select: {
            id: true,
            name: true,
          },
        },
        transaksi: {
          select: {
            id: true,
            status: true,
            paymentMethod: true, // tambahkan ini
          },
        },
        tahunAjaran: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        dueDate: "desc",
      },
    });

    // Tambahkan field hasTransaction pada setiap tagihan
    const tagihanWithTransaction = tagihan.map((t: any) => {
      const hasTransaction = t.transaksi?.some((trx: any) => trx.status === "pending" || trx.status === "approved");
      return {
        ...t,
        hasTransaction,
      };
    });

    const serializedTagihan = serializeBigInt(tagihanWithTransaction);

    return NextResponse.json({
      message: "Data tagihan berhasil diambil",
      data: serializedTagihan,
    });
  } catch (error) {
    console.error("[TAGIHAN_SANTRI_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
} 
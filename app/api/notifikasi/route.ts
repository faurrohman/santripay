import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { Notifikasi, Tagihan, Prisma } from "@prisma/client";

const notifikasiSchema = z.object({
  title: z.string().min(1, "Judul harus diisi"),
  message: z.string().min(1, "Pesan harus diisi"),
  type: z.enum([
    "tagihan_baru",
    "tagihan_jatuh_tempo",
    "pembayaran_diterima",
    "pembayaran_ditolak",
    "saldo_berkurang",
    "saldo_bertambah",
    "sistem"
  ]),
  tagihanId: z.string().optional(),
});

const updateNotifikasiSchema = z.object({
  id: z.string(),
  isRead: z.boolean(),
});

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
      if (key === 'paymentDate' || key === 'payment_date' || key === 'createdAt' || key === 'updatedAt' || key === 'dueDate') {
        result[key] = data[key] ? new Date(data[key]).toISOString() : null;
      } else {
        result[key] = serializeBigInt(data[key]);
      }
    }
    return result;
  }

  return data;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const notifikasi = await prisma.notifikasi.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        tagihan: {
          include: {
            jenisTagihan: true,
          },
        },
      } as Prisma.NotifikasiInclude,
      orderBy: {
        createdAt: "desc",
      },
    });

    // Serialize semua data termasuk nested objects
    const serializedNotifikasi = serializeBigInt(notifikasi);

    return NextResponse.json(serializedNotifikasi);
  } catch (error) {
    console.error("[NOTIFIKASI_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { id, isRead } = updateNotifikasiSchema.parse(body);

    const notifikasi = await prisma.notifikasi.findUnique({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!notifikasi) {
      return new NextResponse("Notifikasi tidak ditemukan", { status: 404 });
    }

    const updatedNotifikasi = await prisma.notifikasi.update({
      where: {
        id,
      },
      data: {
        isRead,
      },
      include: {
        tagihan: {
          include: {
            jenisTagihan: true,
          },
        },
      } as Prisma.NotifikasiInclude,
    });

    // Serialize semua data termasuk nested objects
    const serializedNotifikasi = serializeBigInt(updatedNotifikasi);

    return NextResponse.json(serializedNotifikasi);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse("Invalid request data", { status: 422 });
    }

    console.error("[NOTIFIKASI_PATCH]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
} 
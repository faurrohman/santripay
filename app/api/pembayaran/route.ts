import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { JenisNotifikasi, Tagihan, Role, Prisma } from "@prisma/client";

const pembayaranSchema = z.object({
  tagihanId: z.string().uuid("Pilih tagihan yang valid"),
  amount: z.coerce.number().min(0, "Jumlah harus lebih dari atau sama dengan 0"),
  note: z.string().optional(),
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

export async function POST(request: Request) {
  try {
    let userId: string | undefined = undefined;
    // Cek Bearer token di header
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        const payload: any = require("jsonwebtoken").verify(token, process.env.JWT_SECRET || "secret");
        userId = payload?.id;
      } catch (e) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }
    } else {
      // Fallback ke session NextAuth
      const session = await getServerSession(authOptions);
      if (!session?.user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }
      userId = session.user.id;
    }

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = pembayaranSchema.parse(body);

    // Cek tagihan
    const tagihan = await prisma.tagihan.findUnique({
      where: { id: validatedData.tagihanId },
      include: {
        santri: {
          include: {
            user: true,
            kelas: true,
          },
        },
        jenisTagihan: true,
      },
    });

    if (!tagihan) {
      return NextResponse.json(
        { message: "Tagihan tidak ditemukan" },
        { status: 404 }
      );
    }

    // Verifikasi bahwa santri yang login adalah pemilik tagihan
    if (tagihan.santri.user.id !== userId) {
      return NextResponse.json(
        { message: "Anda tidak memiliki akses untuk membayar tagihan ini" },
        { status: 403 }
      );
    }

    // Cek status tagihan
    if (tagihan.status === "paid") {
      return NextResponse.json(
        { message: "Tagihan ini sudah dibayar" },
        { status: 400 }
      );
    }

    // Cek apakah sudah ada transaksi yang disetujui untuk tagihan ini
    const existingTransaksi = await prisma.transaksi.findFirst({
      where: {
        tagihanId: validatedData.tagihanId,
        santriId: tagihan.santriId,
        status: "approved"
      }
    });

    if (existingTransaksi) {
      return NextResponse.json(
        { message: "Tagihan ini sudah dibayar dan disetujui" },
        { status: 400 }
      );
    }

    // Validasi jumlah pembayaran
    if (Number(validatedData.amount) < Number(tagihan.amount)) {
      return NextResponse.json(
        { message: "Jumlah pembayaran tidak boleh kurang dari jumlah tagihan" },
        { status: 400 }
      );
    }

    try {
      // Buat transaksi baru
      const result = await prisma.$transaction(async (tx) => {
        // Buat transaksi
        const transaksi = await tx.transaksi.create({
          data: {
            tagihanId: validatedData.tagihanId,
            santriId: tagihan.santriId,
            amount: BigInt(validatedData.amount),
            paymentDate: new Date(),
            note: validatedData.note,
            status: "pending",
            orderId: `MANUAL-${validatedData.tagihanId}-${Date.now()}`,
          },
          include: {
            santri: {
              include: {
                kelas: true,
                user: true,
              },
            },
            tagihan: {
              include: {
                jenisTagihan: true,
              },
            },
          },
        });

        // Buat notifikasi untuk santri
        if (transaksi.santri.user) {
          await tx.notifikasi.create({
            data: {
              userId: transaksi.santri.user.id,
              title: "Pembayaran Dibuat",
              message: `Pembayaran Anda untuk ${tagihan.jenisTagihan.name} sebesar Rp ${Number(validatedData.amount).toLocaleString('id-ID')} telah dibuat dan menunggu konfirmasi admin.`,
              type: JenisNotifikasi.tagihan_baru
            },
          });
        }

        // Buat notifikasi untuk admin
        const adminUsers = await tx.user.findMany({
          where: {
            role: "admin",
            receiveAppNotifications: true,
          },
          select: {
            id: true,
          },
        });

        await Promise.all(adminUsers.map(async (adminUser) => {
          await tx.notifikasi.create({
            data: {
              userId: adminUser.id,
              title: "Pembayaran Menunggu Konfirmasi",
              message: `Pembayaran baru dari ${tagihan.santri.name} untuk ${tagihan.jenisTagihan.name} sebesar Rp ${Number(validatedData.amount).toLocaleString('id-ID')} menunggu konfirmasi Anda.`,
              type: JenisNotifikasi.sistem
            },
          });
        }));

        return transaksi;
      });

      // Convert BigInt to number for JSON serialization
      const serializedResult = {
        ...result,
        amount: Number(result.amount),
        paymentDate: result.paymentDate.toISOString(),
        createdAt: result.createdAt.toISOString(),
        updatedAt: result.updatedAt.toISOString(),
        tagihan: result.tagihan ? {
          ...result.tagihan,
          amount: Number(result.tagihan.amount),
          dueDate: result.tagihan.dueDate.toISOString(),
          createdAt: result.tagihan.createdAt.toISOString(),
          updatedAt: result.tagihan.updatedAt.toISOString(),
          jenisTagihan: result.tagihan.jenisTagihan ? {
            ...result.tagihan.jenisTagihan,
            amount: result.tagihan.jenisTagihan.amount ? Number(result.tagihan.jenisTagihan.amount) : null,
            createdAt: result.tagihan.jenisTagihan.createdAt.toISOString(),
            updatedAt: result.tagihan.jenisTagihan.updatedAt.toISOString(),
          } : null,
        } : null,
        santri: {
          ...result.santri,
          createdAt: result.santri.createdAt.toISOString(),
          updatedAt: result.santri.updatedAt.toISOString(),
          kelas: result.santri.kelas ? {
            ...result.santri.kelas,
            createdAt: result.santri.kelas.createdAt.toISOString(),
            updatedAt: result.santri.kelas.updatedAt.toISOString(),
          } : null,
        }
      };

      return NextResponse.json({
        message: "Pembayaran berhasil dibuat dan menunggu konfirmasi admin",
        data: serializedResult,
      });
    } catch (error) {
      console.error("[PAYMENT_CREATE]", error);
      // Jika error karena unique constraint, berarti ada transaksi yang belum terdeteksi
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return NextResponse.json(
          { message: "Tagihan ini sudah memiliki transaksi yang menunggu konfirmasi" },
          { status: 400 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error("[PAYMENT_POST]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Validation error", errors: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (session.user.role !== "admin") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const pembayaran = await prisma.transaksi.findMany({
      include: {
        santri: {
          include: {
            kelas: true,
          },
        },
        tagihan: {
          include: {
            jenisTagihan: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Fungsi untuk mengkonversi BigInt dan Date ke string
    const serializeValue = (value: any): any => {
      if (typeof value === 'bigint') {
        return value.toString();
      }
      if (value instanceof Date) {
        return value.toISOString();
      }
      if (Array.isArray(value)) {
        return value.map(serializeValue);
      }
      if (value && typeof value === 'object') {
        const result: any = {};
        for (const key in value) {
          result[key] = serializeValue(value[key]);
        }
        return result;
      }
      return value;
    };

    const serializedPembayaran = serializeValue(pembayaran);

    return NextResponse.json(serializedPembayaran);
  } catch (error) {
    console.error("[PAYMENT_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
} 
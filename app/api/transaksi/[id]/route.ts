import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { StatusTransaksi } from "@prisma/client";

// Schema validasi untuk update transaksi
const transaksiSchema = z.object({
  status: z.enum(["pending", "approved", "rejected"]),
  note: z.string().optional(),
});

// Fungsi untuk memformat tanggal ke ISO string
function formatDateToISO(date: string | Date): string {
  if (typeof date === 'string') {
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      throw new Error('Invalid date format');
    }
    return parsedDate.toISOString();
  }
  return date.toISOString();
}

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
      result[key] = serializeBigInt(data[key]);
    }
    return result;
  }

  return data;
}

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    const transaksi = await prisma.transaksi.findUnique({
      where: {
        id,
      },
      include: {
        santri: {
          include: {
            user: true,
            kelas: true,
          },
        },
        tagihan: {
          include: {
            jenisTagihan: true,
          },
        },
      },
    });

    if (!transaksi) {
      return NextResponse.json(
        { message: "Transaksi tidak ditemukan" },
        { status: 404 }
      );
    }

    // Verifikasi bahwa user yang login adalah pemilik transaksi atau admin
    if (session.user.role !== "admin" && transaksi.santri.userId !== session.user.id) {
      return NextResponse.json(
        { message: "Forbidden" },
        { status: 403 }
      );
    }

    const serializedTransaksi = serializeBigInt(transaksi);
    return NextResponse.json({
      message: "Data transaksi berhasil diambil",
      data: serializedTransaksi,
    });
  } catch (error) {
    console.error("[TRANSACTION_GET]", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    if (session.user.role !== "admin") {
      return NextResponse.json(
        { message: "Forbidden" },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    const body = await req.json();
    const validatedData = transaksiSchema.parse(body);

    const transaksi = await prisma.transaksi.update({
      where: {
        id,
      },
      data: {
        status: validatedData.status,
        note: validatedData.note,
      },
      include: {
        santri: {
          include: {
            user: true,
            kelas: true,
          },
        },
        tagihan: {
          include: {
            jenisTagihan: true,
          },
        },
      },
    });

    const serializedTransaksi = serializeBigInt(transaksi);
    return NextResponse.json({
      message: "Transaksi berhasil diperbarui",
      data: serializedTransaksi,
    });
  } catch (error) {
    console.error("[TRANSACTION_PATCH]", error);
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

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    await prisma.transaksi.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({ message: "Transaksi berhasil dihapus" });
  } catch (error) {
    console.error("[TRANSACTION_DELETE]", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
} 
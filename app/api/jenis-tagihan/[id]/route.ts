import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

const jenisTagihanSchema = z.object({
  name: z.string().min(1, "Nama harus diisi"),
  amount: z.number().min(0, "Jumlah harus lebih dari 0"),
  description: z.string().optional(),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const jenisTagihan = await prisma.jenisTagihan.findUnique({
      where: { id },
    });

    if (!jenisTagihan) {
      return NextResponse.json(
        { message: "Jenis tagihan tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...jenisTagihan,
      amount: jenisTagihan.amount ? Number(jenisTagihan.amount) : null,
    });
  } catch (error) {
    console.error("[JENIS_TAGIHAN_GET]", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = jenisTagihanSchema.parse(body);

    const jenisTagihan = await prisma.jenisTagihan.update({
      where: { id },
      data: {
        name: validatedData.name,
        amount: BigInt(validatedData.amount),
        description: validatedData.description,
      },
    });

    return NextResponse.json({
      ...jenisTagihan,
      amount: jenisTagihan.amount ? Number(jenisTagihan.amount) : null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.errors },
        { status: 400 }
      );
    }
    console.error("[JENIS_TAGIHAN_PATCH]", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Cek apakah jenis tagihan masih digunakan
    const tagihanCount = await prisma.tagihan.count({
      where: {
        jenisTagihanId: id,
      },
    });

    if (tagihanCount > 0) {
      return NextResponse.json(
        { message: "Jenis tagihan masih digunakan dalam tagihan" },
        { status: 400 }
      );
    }

    // Hapus jenis tagihan
    await prisma.jenisTagihan.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Jenis tagihan berhasil dihapus." });
  } catch (error) {
    console.error("[JENIS_TAGIHAN_DELETE]", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
} 
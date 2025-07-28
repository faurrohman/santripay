import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

const jenisTagihanSchema = z.object({
  name: z.string().min(1, "Nama jenis tagihan tidak boleh kosong"),
  amount: z.number().min(0, "Jumlah harus lebih dari atau sama dengan 0"),
  description: z.string().optional(),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const jenisTagihan = await prisma.jenisTagihan.findMany({
      orderBy: {
        name: "asc",
      },
    });

    // Konversi BigInt ke string untuk JSON
    const formattedJenisTagihan = jenisTagihan.map(item => ({
      ...item,
      amount: item.amount ? Number(item.amount) : null,
    }));

    return NextResponse.json(formattedJenisTagihan);
  } catch (error) {
    console.error("[JENIS_TAGIHAN_GET]", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validatedData = jenisTagihanSchema.parse(body);

    const jenisTagihan = await prisma.jenisTagihan.create({
      data: {
        name: validatedData.name,
        amount: BigInt(validatedData.amount),
        description: validatedData.description,
      },
    });

    return NextResponse.json({
      ...jenisTagihan,
      amount: Number(jenisTagihan.amount),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: error.errors },
        { status: 400 }
      );
    }
    console.error("[JENIS_TAGIHAN_POST]", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ message: "ID jenis tagihan tidak ditemukan." }, { status: 400 });
    }

    const body = await req.json();
    const validatedData = jenisTagihanSchema.partial().parse(body);

    const updatedJenisTagihan = await prisma.jenisTagihan.update({
      where: { id },
      data: {
        ...validatedData,
        amount: validatedData.amount ? BigInt(validatedData.amount) : undefined,
      },
    });

    return NextResponse.json({
      ...updatedJenisTagihan,
      amount: updatedJenisTagihan.amount ? Number(updatedJenisTagihan.amount) : null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.errors }, { status: 400 });
    }
    console.error("[JENIS_TAGIHAN_PUT]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ message: "ID jenis tagihan tidak ditemukan." }, { status: 400 });
    }

    // Cek apakah jenis tagihan masih digunakan
    const tagihanCount = await prisma.tagihan.count({
      where: {
        jenisTagihanId: id,
      },
    });

    if (tagihanCount > 0) {
      return NextResponse.json(
        { message: "Jenis tagihan tidak dapat dihapus karena masih digunakan dalam tagihan" },
        { status: 400 }
      );
    }

    await prisma.jenisTagihan.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Jenis tagihan berhasil dihapus." });
  } catch (error) {
    console.error("[JENIS_TAGIHAN_DELETE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
} 
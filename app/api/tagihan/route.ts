import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";

const tagihanSchema = z.object({
  santriId: z.string().uuid("ID Santri tidak valid"),
  jenisTagihanId: z.string().uuid("ID Jenis Tagihan tidak valid"),
  amount: z.number().min(0, "Jumlah harus lebih dari atau sama dengan 0"),
  dueDate: z.string().min(1, "Tanggal jatuh tempo harus diisi"),
  description: z.string().optional(),
  tahunAjaranId: z.string().uuid("ID Tahun Ajaran tidak valid").optional(),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const tagihan = await prisma.tagihan.findMany({
      include: {
        santri: {
          include: {
            kelas: true,
          },
        },
        jenisTagihan: true,
        tahunAjaran: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Convert BigInt to number for JSON serialization
    const serializedTagihan = tagihan.map(t => ({
      ...t,
      amount: Number(t.amount),
      status: t.status.toLowerCase(),
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      dueDate: t.dueDate.toISOString(),
      santri: {
        ...t.santri,
        createdAt: t.santri.createdAt.toISOString(),
        updatedAt: t.santri.updatedAt.toISOString(),
      },
      jenisTagihan: {
        ...t.jenisTagihan,
        amount: t.jenisTagihan.amount ? Number(t.jenisTagihan.amount) : null,
        createdAt: t.jenisTagihan.createdAt.toISOString(),
        updatedAt: t.jenisTagihan.updatedAt.toISOString(),
      },
      tahunAjaran: t.tahunAjaran ? {
        ...t.tahunAjaran,
        createdAt: t.tahunAjaran.createdAt.toISOString(),
        updatedAt: t.tahunAjaran.updatedAt.toISOString(),
      } : undefined,
    }));

    return NextResponse.json(serializedTagihan);
  } catch (error) {
    console.error("Error fetching tagihan:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    console.log("Received data:", body);

    const validatedData = tagihanSchema.parse(body);
    console.log("Validated data:", validatedData);

    // Check if santri exists
    const santri = await prisma.santri.findUnique({
      where: { id: validatedData.santriId },
    });

    if (!santri) {
      return NextResponse.json(
        { message: "Santri tidak ditemukan" },
        { status: 404 }
      );
    }

    // Check if jenis tagihan exists
    const jenisTagihan = await prisma.jenisTagihan.findUnique({
      where: { id: validatedData.jenisTagihanId },
    });

    if (!jenisTagihan) {
      return NextResponse.json(
        { message: "Jenis tagihan tidak ditemukan" },
        { status: 404 }
      );
    }

    // Check if there's already a pending tagihan for this santri and jenis tagihan
    const existingTagihan = await prisma.tagihan.findFirst({
      where: {
        santriId: validatedData.santriId,
        jenisTagihanId: validatedData.jenisTagihanId,
        status: "pending",
      },
    });

    if (existingTagihan) {
      return NextResponse.json(
        { message: "Santri sudah memiliki tagihan yang belum dibayar untuk jenis tagihan ini" },
        { status: 400 }
      );
    }

    // Tentukan tahun ajaran
    let tahunAjaranId = validatedData.tahunAjaranId;
    if (!tahunAjaranId) {
      const aktif = await prisma.tahunAjaran.findFirst({ where: { aktif: true } });
      tahunAjaranId = aktif?.id;
    }
    if (!tahunAjaranId) {
      return NextResponse.json({ message: "Tahun ajaran tidak ditemukan" }, { status: 400 });
    }

    // Create tagihan
    const tagihan = await prisma.$transaction(async (tx) => {
      const newTagihan = await tx.tagihan.create({
        data: {
          santriId: validatedData.santriId,
          jenisTagihanId: validatedData.jenisTagihanId,
          amount: BigInt(validatedData.amount),
          dueDate: new Date(validatedData.dueDate),
          description: validatedData.description,
          status: "pending",
          tahunAjaranId: tahunAjaranId,
        } as Prisma.TagihanUncheckedCreateInput,
        include: {
          santri: {
            include: {
              user: true,
              kelas: true,
            },
          },
          jenisTagihan: true,
          tahunAjaran: true,
        },
      });

      // Buat notifikasi untuk santri
      if (newTagihan.santri?.user) {
        const notifikasiData: Prisma.NotifikasiUncheckedCreateInput = {
          userId: newTagihan.santri.user.id,
          title: "Tagihan Baru",
          message: `Anda memiliki tagihan baru untuk ${newTagihan.jenisTagihan?.name} sebesar Rp ${Number(validatedData.amount).toLocaleString('id-ID')} dengan jatuh tempo ${new Date(validatedData.dueDate).toLocaleDateString('id-ID')}`,
          type: "tagihan_baru"
        };
        await tx.notifikasi.create({
          data: notifikasiData
        });
      }

      return newTagihan;
    });

    // Convert BigInt to number for JSON serialization
    const serializedTagihan = {
      ...tagihan,
      amount: Number(tagihan.amount),
      status: tagihan.status.toLowerCase(),
      createdAt: tagihan.createdAt.toISOString(),
      updatedAt: tagihan.updatedAt.toISOString(),
      dueDate: tagihan.dueDate.toISOString(),
      santri: tagihan.santri ? {
        ...tagihan.santri,
        createdAt: tagihan.santri.createdAt.toISOString(),
        updatedAt: tagihan.santri.updatedAt.toISOString(),
      } : undefined,
      jenisTagihan: tagihan.jenisTagihan ? {
        ...tagihan.jenisTagihan,
        amount: tagihan.jenisTagihan.amount ? Number(tagihan.jenisTagihan.amount) : null,
        createdAt: tagihan.jenisTagihan.createdAt.toISOString(),
        updatedAt: tagihan.jenisTagihan.updatedAt.toISOString(),
      } : undefined,
      tahunAjaran: tagihan.tahunAjaran ? {
        ...tagihan.tahunAjaran,
        createdAt: tagihan.tahunAjaran.createdAt.toISOString(),
        updatedAt: tagihan.tahunAjaran.updatedAt.toISOString(),
      } : undefined,
    };

    return NextResponse.json({
      message: "Tagihan berhasil dibuat",
      data: serializedTagihan,
    });
  } catch (error) {
    console.error("Error creating tagihan:", error);
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

export async function PUT(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ message: "ID tagihan tidak ditemukan." }, { status: 400 });
    }

    const body = await req.json();
    const validatedData = tagihanSchema.partial().parse({
      ...body,
      amount: body.amount ? BigInt(body.amount) : undefined,
    });

    const updatedTagihan = await prisma.tagihan.update({
      where: { id },
      data: {
        ...validatedData,
        dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : undefined,
      },
      include: {
        santri: {
          include: {
            kelas: true,
          },
        },
        jenisTagihan: true,
        tahunAjaran: true,
      },
    });

    // Convert BigInt to number for JSON serialization
    const serializedTagihan = {
      ...updatedTagihan,
      amount: Number(updatedTagihan.amount),
      status: updatedTagihan.status.toLowerCase(),
      createdAt: updatedTagihan.createdAt.toISOString(),
      updatedAt: updatedTagihan.updatedAt.toISOString(),
      dueDate: updatedTagihan.dueDate.toISOString(),
      santri: {
        ...updatedTagihan.santri,
        createdAt: updatedTagihan.santri.createdAt.toISOString(),
        updatedAt: updatedTagihan.santri.updatedAt.toISOString(),
      },
      jenisTagihan: {
        ...updatedTagihan.jenisTagihan,
        amount: updatedTagihan.jenisTagihan.amount ? Number(updatedTagihan.jenisTagihan.amount) : null,
        createdAt: updatedTagihan.jenisTagihan.createdAt.toISOString(),
        updatedAt: updatedTagihan.jenisTagihan.updatedAt.toISOString(),
      },
      tahunAjaran: updatedTagihan.tahunAjaran ? {
        ...updatedTagihan.tahunAjaran,
        createdAt: updatedTagihan.tahunAjaran.createdAt.toISOString(),
        updatedAt: updatedTagihan.tahunAjaran.updatedAt.toISOString(),
      } : undefined,
    };

    return NextResponse.json(serializedTagihan, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.errors }, { status: 400 });
    }
    console.error("Error updating tagihan:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat memperbarui tagihan." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ message: "ID tagihan tidak ditemukan." }, { status: 400 });
    }

    await prisma.tagihan.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Tagihan berhasil dihapus." }, { status: 200 });
  } catch (error) {
    console.error("Error deleting tagihan:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat menghapus tagihan." },
      { status: 500 }
    );
  }
} 
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { StatusTagihan } from "@prisma/client";

const tagihanSchema = z.object({
  santriId: z.string().uuid("ID Santri tidak valid"),
  jenisTagihanId: z.string().uuid("ID Jenis Tagihan tidak valid"),
  amount: z.number().min(0, "Jumlah harus lebih dari atau sama dengan 0"),
  dueDate: z.string().min(1, "Tanggal jatuh tempo harus diisi"),
  description: z.string().optional(),
  status: z.enum(["pending", "paid", "overdue"] as const).optional(),
});

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    let email: string | undefined = undefined;
    // Cek Bearer token di header
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        const payload: any = require("jsonwebtoken").verify(token, process.env.JWT_SECRET || "secret");
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

    const { id } = await context.params;
    const tagihan = await prisma.tagihan.findUnique({
      where: { id },
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

    if (!tagihan) {
      return NextResponse.json(
        { message: "Tagihan tidak ditemukan" },
        { status: 404 }
      );
    }

    // Optional: verifikasi bahwa user yang akses adalah pemilik tagihan
    // (bisa ditambah jika ingin lebih aman)

    // Convert BigInt to number for JSON serialization
    const serializedTagihan = {
      ...tagihan,
      amount: Number(tagihan.amount),
      status: tagihan.status.toLowerCase(),
      createdAt: tagihan.createdAt.toISOString(),
      updatedAt: tagihan.updatedAt.toISOString(),
      dueDate: tagihan.dueDate.toISOString(),
      santri: {
        ...tagihan.santri,
        createdAt: tagihan.santri.createdAt.toISOString(),
        updatedAt: tagihan.santri.updatedAt.toISOString(),
      },
      jenisTagihan: {
        ...tagihan.jenisTagihan,
        amount: tagihan.jenisTagihan.amount ? Number(tagihan.jenisTagihan.amount) : null,
        createdAt: tagihan.jenisTagihan.createdAt.toISOString(),
        updatedAt: tagihan.jenisTagihan.updatedAt.toISOString(),
      },
      tahunAjaran: tagihan.tahunAjaran ? {
        ...tagihan.tahunAjaran,
        createdAt: tagihan.tahunAjaran.createdAt.toISOString(),
        updatedAt: tagihan.tahunAjaran.updatedAt.toISOString(),
      } : undefined,
    };

    return NextResponse.json(serializedTagihan);
  } catch (error) {
    console.error("Error fetching tagihan:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const body = await request.json();
    console.log("Received data:", body);

    const validatedData = tagihanSchema.parse(body);
    console.log("Validated data:", validatedData);

    // Check if tagihan exists
    const existingTagihan = await prisma.tagihan.findUnique({
      where: { id },
    });

    if (!existingTagihan) {
      return NextResponse.json(
        { message: "Tagihan tidak ditemukan" },
        { status: 404 }
      );
    }

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

    // Update tagihan
    const updatedTagihan = await prisma.tagihan.update({
      where: { id },
      data: {
        santriId: validatedData.santriId,
        jenisTagihanId: validatedData.jenisTagihanId,
        amount: BigInt(validatedData.amount),
        dueDate: new Date(validatedData.dueDate),
        description: validatedData.description,
        status: (validatedData.status?.toLowerCase() as StatusTagihan) || existingTagihan.status,
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

    return NextResponse.json(serializedTagihan);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: error.errors }, { status: 400 });
    }
    console.error("Error updating tagihan:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    // Check if tagihan exists
    const existingTagihan = await prisma.tagihan.findUnique({
      where: { id },
    });

    if (!existingTagihan) {
      return NextResponse.json(
        { message: "Tagihan tidak ditemukan" },
        { status: 404 }
      );
    }

    await prisma.tagihan.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Tagihan berhasil dihapus" });
  } catch (error) {
    console.error("Error deleting tagihan:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
} 
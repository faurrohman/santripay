import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { kelasId, jenisTagihanId, amount, dueDate, description, tahunAjaranId } = body;

    if (!kelasId || !jenisTagihanId || !amount || !dueDate) {
      return NextResponse.json({ success: false, message: "Data tidak lengkap" }, { status: 400 });
    }

    // Ambil tahun ajaran (fallback ke aktif jika tidak dikirim)
    let tahunAjaran = tahunAjaranId;
    if (!tahunAjaran) {
      const aktif = await prisma.tahunAjaran.findFirst({ where: { aktif: true } });
      tahunAjaran = aktif?.id;
    }
    if (!tahunAjaran) {
      return NextResponse.json({ success: false, message: "Tahun ajaran tidak ditemukan" }, { status: 400 });
    }

    // Ambil semua santri di kelas
    const santriList = await prisma.santri.findMany({
      where: { kelasId },
      select: { id: true, userId: true },
    });
    if (!santriList.length) {
      return NextResponse.json({ success: false, message: "Tidak ada santri di kelas ini" }, { status: 404 });
    }

    // Buat tagihan untuk setiap santri
    const created = await prisma.$transaction(
      santriList.map((santri) =>
        prisma.tagihan.create({
          data: {
            santriId: santri.id,
            jenisTagihanId,
            amount,
            dueDate: new Date(dueDate),
            description: description || null,
            status: "pending",
            tahunAjaranId: tahunAjaran,
          },
        })
      )
    );

    return NextResponse.json({ success: true, count: created.length });
  } catch (error) {
    console.error("[TAGIHAN_MASSAL_POST]", error);
    return NextResponse.json({ success: false, message: "Terjadi kesalahan server" }, { status: 500 });
  }
} 
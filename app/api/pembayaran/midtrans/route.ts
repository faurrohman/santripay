import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { snap } from "@/lib/services/midtrans";
import { z } from "zod";

const pembayaranMidtransSchema = z.object({
  tagihanId: z.string().uuid("Pilih tagihan yang valid"),
});

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
    const validatedData = pembayaranMidtransSchema.parse(body);

    // Cek tagihan
    const tagihan = await prisma.tagihan.findUnique({
      where: { id: validatedData.tagihanId },
      include: {
        santri: {
          include: {
            user: true,
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

    // Buat order_id yang valid untuk Midtrans (maks 50 karakter, hanya huruf, angka, strip, underscore)
    const shortId = tagihan.id.replace(/-/g, '').slice(0, 20); // max 20 karakter
    const orderId = `TGHN-${shortId}-${Date.now()}`; // total < 50 karakter

    // JANGAN buat transaksi pending di database sampai pembayaran berhasil
    // Transaksi akan dibuat di callback Midtrans setelah pembayaran selesai

    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: typeof tagihan.amount === "bigint" ? Number(tagihan.amount) : Number(tagihan.amount),
      },
      customer_details: {
        first_name: tagihan.santri.name,
        email: tagihan.santri.user.email,
      },
      item_details: [
        {
          id: tagihan.id,
          price: typeof tagihan.amount === "bigint" ? Number(tagihan.amount) : Number(tagihan.amount),
          quantity: 1,
          name: tagihan.jenisTagihan.name,
        },
      ],
    };
    console.log("[MIDTRANS_PAYMENT_POST] parameter:", parameter);

    try {
      const snapResponse = await snap.createTransaction(parameter);
      return NextResponse.json({
        message: "Berhasil membuat transaksi Midtrans",
        snapToken: snapResponse.token,
        redirectUrl: snapResponse.redirect_url,
      });
    } catch (error: any) {
      console.error("[MIDTRANS_PAYMENT_POST]", error, error?.message, error?.response?.data);
      return NextResponse.json(
        { message: error?.message || "Internal Server Error", detail: error?.response?.data || null },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[MIDTRANS_PAYMENT_POST]", error);
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
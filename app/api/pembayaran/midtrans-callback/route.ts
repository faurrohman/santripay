import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { coreApi } from "@/lib/services/midtrans";
import { StatusTransaksi, StatusTagihan } from "@prisma/client";

function verifySignature(body: any, signatureKey: string) {
  const crypto = require("crypto");
  const data = body.order_id + body.status_code + body.gross_amount + process.env.MIDTRANS_SERVER_KEY;
  const hash = crypto.createHash("sha512").update(data).digest("hex");
  return hash === signatureKey;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("[MIDTRANS_CALLBACK] body:", body);
    const signatureKey = body.signature_key;
    if (!verifySignature(body, signatureKey)) {
      console.error("[MIDTRANS_CALLBACK] Invalid signature", { signatureKey, body });
      return NextResponse.json({ message: "Invalid signature" }, { status: 403 });
    }

    // Ambil order_id dan status
    const { order_id, transaction_status, fraud_status } = body;
    console.log("[MIDTRANS_CALLBACK] order_id:", order_id, "transaction_status:", transaction_status, "fraud_status:", fraud_status);

    // Cari transaksi berdasarkan order_id
    const transaksi = await prisma.transaksi.findFirst({ where: { orderId: order_id } });
    if (!transaksi) {
      console.error("[MIDTRANS_CALLBACK] Transaksi tidak ditemukan untuk order_id", order_id);
      return NextResponse.json({ message: "Transaksi tidak ditemukan" }, { status: 404 });
    }
    const tagihanId = transaksi.tagihanId as string;
    console.log("[MIDTRANS_CALLBACK] tagihanId dari transaksi:", tagihanId);

    // Temukan tagihan terkait
    const tagihan = await prisma.tagihan.findUnique({ where: { id: tagihanId } });
    if (!tagihan) {
      console.error("[MIDTRANS_CALLBACK] Tagihan tidak ditemukan", tagihanId);
      return NextResponse.json({ message: "Tagihan tidak ditemukan" }, { status: 404 });
    }

    // Update status tagihan & transaksi sesuai status Midtrans
    let statusTagihan = "pending";
    let statusTransaksi = "pending";
    if (transaction_status === "settlement" || transaction_status === "capture") {
      statusTagihan = "paid";
      statusTransaksi = "approved";
    } else if (transaction_status === "deny" || transaction_status === "expire" || transaction_status === "cancel") {
      statusTagihan = "pending";
      statusTransaksi = "rejected";
    }
    console.log("[MIDTRANS_CALLBACK] Akan update status:", { statusTagihan, statusTransaksi });

    // Update transaksi dan tagihan
    await prisma.$transaction(async (tx) => {
      // Update atau buat transaksi
      const transaksiUpsert = await tx.transaksi.upsert({
        where: { orderId: order_id },
        update: {
          status: statusTransaksi as StatusTransaksi,
          paymentDate: new Date(),
        },
        create: {
          tagihanId,
          santriId: tagihan.santriId,
          amount: tagihan.amount,
          paymentDate: new Date(),
          status: statusTransaksi as StatusTransaksi,
          note: `Pembayaran via Midtrans (${transaction_status})`,
          orderId: order_id,
        },
      });
      // Ambil ulang transaksi lengkap dengan relasi
      const transaksiFull = await tx.transaksi.findUnique({
        where: { id: transaksiUpsert.id },
        include: {
          santri: { include: { user: true } },
          tagihan: { include: { jenisTagihan: true } },
        },
      });
      await tx.tagihan.update({
        where: { id: tagihanId },
        data: { status: statusTagihan as StatusTagihan },
      });
      // Notifikasi otomatis untuk santri
      if (transaksiFull?.santri && transaksiFull.santri.user && transaksiFull.santri.user.id) {
        if (statusTransaksi === "approved") {
          await tx.notifikasi.create({
            data: {
              userId: transaksiFull.santri.user.id,
              title: "Pembayaran Berhasil",
              message: `Pembayaran Anda untuk ${transaksiFull.tagihan?.jenisTagihan?.name ?? "-"} sebesar Rp ${Number(transaksiFull.amount).toLocaleString('id-ID')} telah berhasil diproses melalui Midtrans.`,
              type: "pembayaran_diterima"
            },
          });
        } else if (statusTransaksi === "rejected") {
          await tx.notifikasi.create({
            data: {
              userId: transaksiFull.santri.user.id,
              title: "Pembayaran Gagal",
              message: `Pembayaran Anda untuk ${transaksiFull.tagihan?.jenisTagihan?.name ?? "-"} sebesar Rp ${Number(transaksiFull.amount).toLocaleString('id-ID')} gagal diproses oleh Midtrans. Silakan coba lagi atau hubungi admin.`,
              type: "pembayaran_ditolak"
            },
          });
        }
      }
      // Notifikasi otomatis untuk admin jika pembayaran berhasil
      if (statusTransaksi === "approved") {
        const adminUsers = await tx.user.findMany({
          where: { role: "admin", receiveAppNotifications: true },
          select: { id: true },
        });
        if (!transaksiFull) return;
        await Promise.all(adminUsers.map(async (adminUser: { id: string }) => {
          await tx.notifikasi.create({
            data: {
              userId: adminUser.id,
              title: "Pembayaran Midtrans Berhasil",
              message: `Pembayaran dari ${transaksiFull.santri?.name ?? "-"} untuk ${transaksiFull.tagihan?.jenisTagihan?.name ?? "-"} sebesar Rp ${Number(transaksiFull.amount).toLocaleString('id-ID')} telah berhasil diproses melalui Midtrans.`,
              type: "sistem"
            },
          });
        }));
      }
    });

    console.log("[MIDTRANS_CALLBACK] Callback processed sukses untuk tagihanId:", tagihanId);
    return NextResponse.json({ message: "Callback processed" });
  } catch (error: any) {
    console.error("[MIDTRANS_CALLBACK ERROR]", error, error?.message, error?.stack);
    return NextResponse.json({ message: "Internal Server Error", detail: error?.message }, { status: 500 });
  }
} 
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

      // Cari transaksi berdasarkan order_id (bisa belum ada jika kita tidak membuatnya saat inisiasi)
      const transaksi = await prisma.transaksi.findFirst({ where: { orderId: order_id } });
      // Ambil tagihanId dari transaksi jika ada, atau dari custom_field1 jika transaksi belum dibuat
      const tagihanIdFromTrx = transaksi?.tagihanId as string | undefined;
      const tagihanId = tagihanIdFromTrx || body.custom_field1;
      if (!tagihanId) {
        console.error("[MIDTRANS_CALLBACK] tagihanId tidak ditemukan di transaksi maupun custom_field1", { order_id, body });
        return NextResponse.json({ message: "tagihanId tidak ditemukan" }, { status: 400 });
      }
      console.log("[MIDTRANS_CALLBACK] tagihanId dari transaksi:", tagihanId);

      // Temukan tagihan terkait
      const tagihan = await prisma.tagihan.findUnique({ where: { id: tagihanId } });
      if (!tagihan) {
        console.error("[MIDTRANS_CALLBACK] Tagihan tidak ditemukan", tagihanId);
        return NextResponse.json({ message: "Tagihan tidak ditemukan" }, { status: 404 });
      }

      // Update status tagihan & transaksi sesuai status Midtrans
      // Auto-approve: settlement, atau capture dengan fraud_status "accept"
      let statusTagihan = tagihan.status; // Default: tidak ubah status tagihan
      let statusTransaksi = "pending";
      if (transaction_status === "settlement") {
        statusTagihan = "paid";
        statusTransaksi = "approved";
      } else if (transaction_status === "capture") {
        if (fraud_status === "accept") {
          statusTagihan = "paid";
          statusTransaksi = "approved";
        } else if (fraud_status === "challenge") {
          statusTransaksi = "pending"; // biarkan pending untuk review
        } else {
          statusTransaksi = "rejected";
        }
      } else if (transaction_status === "deny" || transaction_status === "expire" || transaction_status === "cancel") {
        statusTransaksi = "rejected";
      }
      console.log("[MIDTRANS_CALLBACK] Akan update status:", { statusTagihan, statusTransaksi });

      // Cegah pembayaran ganda: jika approved dan sudah ada approved sebelumnya atau tagihan sudah paid
      if (statusTransaksi === "approved") {
        const approvedExists = await prisma.transaksi.findFirst({ where: { tagihanId, status: "approved" } });
        if (approvedExists || tagihan.status === "paid") {
          console.warn("[MIDTRANS_CALLBACK] Pembayaran ganda dicegah untuk tagihan", tagihanId);
          return NextResponse.json({ message: "Already paid" });
        }
      }

      // Upsert transaksi berdasarkan tagihanId (unik)
      const transaksiUpsert = await prisma.transaksi.upsert({
        where: { tagihanId },
        update: {
          status: statusTransaksi as StatusTransaksi,
          paymentDate: new Date(),
          tagihanId,
          santriId: tagihan.santriId,
          amount: tagihan.amount,
          paymentMethod: "midtrans",
          note: `Pembayaran via Midtrans (${transaction_status})`,
          orderId: order_id,
        },
        create: {
          tagihanId,
          santriId: tagihan.santriId,
          amount: tagihan.amount,
          paymentDate: new Date(),
          status: statusTransaksi as StatusTransaksi,
          paymentMethod: "midtrans",
          note: `Pembayaran via Midtrans (${transaction_status})`,
          orderId: order_id,
        },
      });

      // Update status tagihan jika berubah (paid pada settlement/capture accept)
      if (statusTagihan !== tagihan.status) {
        await prisma.tagihan.update({
          where: { id: tagihanId },
          data: { status: statusTagihan as StatusTagihan },
        });
      }

      // Ambil ulang transaksi lengkap
      const transaksiFull = await prisma.transaksi.findUnique({
        where: { id: transaksiUpsert.id },
        include: {
          santri: { include: { user: true } },
          tagihan: { include: { jenisTagihan: true } },
        },
      });

      // Notifikasi santri
      if (transaksiFull?.santri && transaksiFull.santri.user && transaksiFull.santri.user.id) {
        if (statusTransaksi === "approved") {
          await prisma.notifikasi.create({
            data: {
              userId: transaksiFull.santri.user.id,
              title: "Pembayaran Berhasil",
              message: `Pembayaran Anda untuk ${transaksiFull.tagihan?.jenisTagihan?.name ?? "-"} sebesar Rp ${Number(transaksiFull.amount).toLocaleString('id-ID')} telah berhasil diproses melalui Midtrans.`,
              type: "pembayaran_diterima"
            },
          });
        } else if (statusTransaksi === "rejected") {
          await prisma.notifikasi.create({
            data: {
              userId: transaksiFull.santri.user.id,
              title: "Pembayaran Gagal",
              message: `Pembayaran Anda untuk ${transaksiFull.tagihan?.jenisTagihan?.name ?? "-"} sebesar Rp ${Number(transaksiFull.amount).toLocaleString('id-ID')} gagal diproses oleh Midtrans. Silakan coba lagi atau hubungi admin.`,
              type: "pembayaran_ditolak"
            },
          });
        }
      }

      // Notifikasi admin jika approved
      if (statusTransaksi === "approved") {
        const adminUsers = await prisma.user.findMany({
          where: { role: "admin", receiveAppNotifications: true },
          select: { id: true },
        });
        if (transaksiFull) {
          await Promise.all(adminUsers.map(async (adminUser: { id: string }) => {
            await prisma.notifikasi.create({
              data: {
                userId: adminUser.id,
                title: "Pembayaran Midtrans Berhasil",
                message: `Pembayaran dari ${transaksiFull.santri?.name ?? "-"} untuk ${transaksiFull.tagihan?.jenisTagihan?.name ?? "-"} sebesar Rp ${Number(transaksiFull.amount).toLocaleString('id-ID')} telah berhasil diproses melalui Midtrans.`,
                type: "sistem"
              },
            });
          }));
        }
      }

      console.log("[MIDTRANS_CALLBACK] Callback processed sukses untuk tagihanId:", tagihanId);
      return NextResponse.json({ message: "Callback processed" });
    } catch (error: any) {
      console.error("[MIDTRANS_CALLBACK ERROR]", error, error?.message, error?.stack);
      return NextResponse.json({ message: "Internal Server Error", detail: error?.message }, { status: 500 });
    }
  } 
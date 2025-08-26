import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { coreApi } from "@/lib/services/midtrans";

export async function GET(
  request: Request,
  { params }: { params: { tagihanId: string } }
) {
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

    const { tagihanId } = params;

    // Validasi UUID
    if (!tagihanId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tagihanId)) {
      return NextResponse.json(
        { message: "Tagihan ID tidak valid" },
        { status: 400 }
      );
    }

         // Cek tagihan dan verifikasi kepemilikan
     const tagihan = await prisma.tagihan.findUnique({
       where: { id: tagihanId },
       include: {
         santri: {
           include: {
             user: true,
           },
         },
         jenisTagihan: true,
         transaksi: {
           where: {
             paymentMethod: "midtrans"
           },
           orderBy: {
             createdAt: "desc"
           },
           take: 1
         }
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
        { message: "Anda tidak memiliki akses untuk tagihan ini" },
        { status: 403 }
      );
    }

    // Cek apakah ada transaksi Midtrans
    if (!tagihan.transaksi || tagihan.transaksi.length === 0) {
      return NextResponse.json(
        { message: "Tidak ada transaksi Midtrans untuk tagihan ini" },
        { status: 404 }
      );
    }

    const latestTransaksi = tagihan.transaksi[0];

    try {
      // Cek status dari Midtrans
      const midtransStatus = await coreApi.transaction.status(latestTransaksi.orderId);
      
      console.log("[MIDTRANS_STATUS_CHECK]", {
        orderId: latestTransaksi.orderId,
        midtransStatus: midtransStatus
      });

      // Update status transaksi lokal jika ada perubahan
      let updatedStatus = latestTransaksi.status;
      let updatedTagihanStatus = tagihan.status;

      if (midtransStatus.transaction_status !== latestTransaksi.status) {
                 // Update status transaksi
         if (midtransStatus.transaction_status === "settlement" || midtransStatus.transaction_status === "capture") {
           updatedStatus = "approved";
           updatedTagihanStatus = "paid"; // Otomatis disetujui
         } else if (midtransStatus.transaction_status === "deny" || midtransStatus.transaction_status === "expire" || midtransStatus.transaction_status === "cancel") {
           updatedStatus = "rejected";
           updatedTagihanStatus = "pending";
         } else if (midtransStatus.transaction_status === "pending") {
           updatedStatus = "pending";
           updatedTagihanStatus = "pending";
         }

        // Update database jika ada perubahan
        if (updatedStatus !== latestTransaksi.status) {
          await prisma.$transaction(async (tx) => {
            // Update transaksi
            await tx.transaksi.update({
              where: { id: latestTransaksi.id },
              data: {
                status: updatedStatus,
                paymentDate: updatedStatus === "approved" ? new Date() : latestTransaksi.paymentDate,
                note: `Status Midtrans: ${midtransStatus.transaction_status}`
              }
            });

            // Update tagihan
            await tx.tagihan.update({
              where: { id: tagihanId },
              data: { status: updatedTagihanStatus }
            });

            // Buat notifikasi jika pembayaran berhasil
            if (updatedStatus === "approved") {
              await tx.notifikasi.create({
                data: {
                  userId: userId,
                  title: "Pembayaran Berhasil",
                  message: `Pembayaran Anda untuk ${tagihan.jenisTagihan?.name || "-"} sebesar Rp ${Number(tagihan.amount).toLocaleString('id-ID')} telah berhasil diproses melalui Midtrans.`,
                  type: "pembayaran_diterima",
                  tagihanId: tagihanId
                }
              });
            }
          });
        }
      }

      return NextResponse.json({
        message: "Status pembayaran berhasil dicek",
        data: {
          transactionId: latestTransaksi.id,
          orderId: latestTransaksi.orderId,
          localStatus: updatedStatus,
          midtransStatus: midtransStatus.transaction_status,
          tagihanStatus: updatedTagihanStatus,
          amount: latestTransaksi.amount,
          createdAt: latestTransaksi.createdAt,
          updatedAt: latestTransaksi.updatedAt
        }
      });

    } catch (midtransError: any) {
      console.error("[MIDTRANS_STATUS_CHECK_ERROR]", midtransError);
      
      // Jika gagal cek status Midtrans, return status lokal
      return NextResponse.json({
        message: "Gagal cek status Midtrans, menggunakan status lokal",
        data: {
          transactionId: latestTransaksi.id,
          orderId: latestTransaksi.orderId,
          localStatus: latestTransaksi.status,
          midtransStatus: "unknown",
          tagihanStatus: tagihan.status,
          amount: latestTransaksi.amount,
          createdAt: latestTransaksi.createdAt,
          updatedAt: latestTransaksi.updatedAt
        }
      });
    }

  } catch (error) {
    console.error("[MIDTRANS_STATUS_CHECK]", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}


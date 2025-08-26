import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { coreApi } from "@/lib/services/midtrans";

export async function GET(request: Request) {
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

             // Cari santri berdasarkan userId
         const santri = await prisma.santri.findUnique({
           where: { userId: userId },
           include: {
             tagihan: {
               include: {
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
               }
             }
           }
         });

    if (!santri) {
      return NextResponse.json(
        { message: "Data santri tidak ditemukan" },
        { status: 404 }
      );
    }

    let updatedCount = 0;
    const updateResults = [];

    // Loop melalui semua tagihan dan cek status Midtrans
    for (const tagihan of santri.tagihan) {
      if (tagihan.transaksi && tagihan.transaksi.length > 0) {
        const latestTransaksi = tagihan.transaksi[0];
        
        try {
          // Cek status dari Midtrans
          const midtransStatus = await coreApi.transaction.status(latestTransaksi.orderId);
          
          let updatedStatus = latestTransaksi.status;
          let updatedTagihanStatus = tagihan.status;
          let needsUpdate = false;

          // Update status berdasarkan Midtrans
          if (midtransStatus.transaction_status === "settlement" || midtransStatus.transaction_status === "capture") {
            if (latestTransaksi.status !== "approved") {
              updatedStatus = "approved";
              updatedTagihanStatus = "paid";
              needsUpdate = true;
            }
          } else if (midtransStatus.transaction_status === "deny" || midtransStatus.transaction_status === "expire" || midtransStatus.transaction_status === "cancel") {
            if (latestTransaksi.status !== "rejected") {
              updatedStatus = "rejected";
              updatedTagihanStatus = "pending";
              needsUpdate = true;
            }
          } else if (midtransStatus.transaction_status === "pending") {
            if (latestTransaksi.status !== "pending") {
              updatedStatus = "pending";
              updatedTagihanStatus = "pending";
              needsUpdate = true;
            }
          }

          // Update database jika ada perubahan
          if (needsUpdate) {
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
                where: { id: tagihan.id },
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
                    tagihanId: tagihan.id
                  }
                });
              }
            });

            updatedCount++;
            updateResults.push({
              tagihanId: tagihan.id,
              oldStatus: latestTransaksi.status,
              newStatus: updatedStatus,
              tagihanStatus: updatedTagihanStatus
            });
          }

        } catch (midtransError: any) {
          console.error("[TAGIHAN_REFRESH_ERROR]", {
            tagihanId: tagihan.id,
            orderId: latestTransaksi.orderId,
            error: midtransError.message
          });
          
          // Log error tapi lanjutkan dengan tagihan berikutnya
          updateResults.push({
            tagihanId: tagihan.id,
            error: "Gagal cek status Midtrans",
            orderId: latestTransaksi.orderId
          });
        }
      }
    }

    return NextResponse.json({
      message: "Refresh status tagihan selesai",
      data: {
        totalTagihan: santri.tagihan.length,
        updatedCount: updatedCount,
        updateResults: updateResults
      }
    });

  } catch (error) {
    console.error("[TAGIHAN_REFRESH]", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

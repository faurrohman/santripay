import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { JenisNotifikasi, Role } from "@prisma/client"

// Fungsi untuk mengkonversi BigInt ke string
function serializeBigInt(data: any): any {
  if (data === null || data === undefined) {
    return data
  }

  if (typeof data === "bigint") {
    return data.toString()
  }

  if (Array.isArray(data)) {
    return data.map(serializeBigInt)
  }

  if (typeof data === "object") {
    const result: any = {}
    for (const key in data) {
      result[key] = serializeBigInt(data[key])
    }
    return result
  }

  return data
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    if (session.user.role !== "admin") {
      return new NextResponse("Forbidden", { status: 403 })
    }

    const { id } = await context.params;

    // Update transaksi dan buat notifikasi dalam satu transaksi
    const result = await prisma.$transaction(async (tx) => {
      // Update transaksi
      const transaksi = await tx.transaksi.update({
        where: {
          id,
        },
        data: {
          status: "approved",
        },
        include: {
          santri: {
            include: {
              user: true,
            },
          },
          tagihan: {
            include: {
              jenisTagihan: true,
            },
          },
        },
      })

      if (!transaksi.tagihan) {
        throw new Error("Tagihan tidak ditemukan")
      }

      if (!transaksi.santri?.user?.id) {
        throw new Error("Data santri tidak lengkap")
      }

      if (!transaksi.tagihanId) {
        throw new Error("ID Tagihan tidak ditemukan")
      }

      // Update status tagihan
      await tx.tagihan.update({
        where: {
          id: transaksi.tagihanId,
        },
        data: {
          status: "paid",
        },
      })

      // Buat notifikasi untuk santri
      await tx.notifikasi.create({
        data: {
          userId: transaksi.santri.user.id,
          title: "Pembayaran Disetujui",
          message: `Pembayaran Anda untuk ${transaksi.tagihan.jenisTagihan.name} sebesar Rp ${Number(transaksi.amount).toLocaleString('id-ID')} telah disetujui.`,
          type: JenisNotifikasi.pembayaran_diterima
        }
      })

      // Buat notifikasi untuk admin
      await tx.notifikasi.create({
        data: {
          userId: session.user.id,
          title: "Pembayaran Disetujui",
          message: `Pembayaran dari ${transaksi.santri.name} sebesar Rp ${Number(transaksi.amount).toLocaleString('id-ID')} telah disetujui.`,
          type: JenisNotifikasi.sistem
        }
      })

      return transaksi
    })

    const serializedResult = serializeBigInt(result)
    return NextResponse.json(serializedResult)
  } catch (error) {
    console.error("[PAYMENT_APPROVE]", error)
    if (error instanceof Error) {
      return new NextResponse(error.message, { status: 400 })
    }
    return new NextResponse("Internal error", { status: 500 })
  }
} 
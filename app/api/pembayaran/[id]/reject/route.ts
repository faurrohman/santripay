import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { JenisNotifikasi } from "@prisma/client"

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
    const body = await req.json()
    const { note } = body

    if (!note) {
      return new NextResponse("Note is required", { status: 400 })
    }

    // Update transaksi dan buat notifikasi dalam satu transaksi
    const result = await prisma.$transaction(async (tx) => {
      // Update transaksi
      const transaksi = await tx.transaksi.update({
        where: {
          id,
        },
        data: {
          status: "rejected",
          note,
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
          status: "pending",
        },
      })

      // Buat notifikasi untuk santri
      await tx.notifikasi.create({
        data: {
          userId: transaksi.santri.user.id,
          title: "Pembayaran Ditolak",
          message: `Pembayaran Anda untuk ${transaksi.tagihan.jenisTagihan.name} sebesar ${new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
          }).format(Number(transaksi.amount))} telah ditolak. Alasan: ${note}`,
          type: JenisNotifikasi.pembayaran_ditolak
        },
      })

      return transaksi
    })

    const serializedResult = serializeBigInt(result)
    return NextResponse.json({
      message: "Pembayaran berhasil ditolak",
      data: serializedResult,
    })
  } catch (error) {
    console.error("[PAYMENT_REJECT]", error)
    if (error instanceof Error) {
      return new NextResponse(error.message, { status: 400 })
    }
    return new NextResponse("Internal error", { status: 500 })
  }
} 
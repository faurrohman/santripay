import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";

export async function GET(req: Request) {
  try {
    let email: string | undefined = undefined;
    // Cek Bearer token di header
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        const payload: any = jwt.verify(token, process.env.JWT_SECRET || "secret");
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

    // Ambil data tagihan dan transaksi
    const tagihan = await prisma.tagihan.findMany({
      where: {
        santri: {
          user: { email }
        }
      }
    });
    const transaksi = await prisma.transaksi.findMany({
      where: {
        santri: {
          user: { email }
        }
      }
    });

    // Hitung statistik
    const totalTagihan = tagihan.reduce((sum, t) => sum + Number(t.amount), 0);
    const totalDibayar = transaksi.filter(t => t.status === "approved").reduce((sum, t) => sum + Number(t.amount), 0);
    const totalMenunggu = tagihan.filter(t => t.status === "pending").reduce((sum, t) => sum + Number(t.amount), 0);

    return NextResponse.json({
      data: {
        totalTagihan,
        totalDibayar,
        totalMenunggu,
      }
    });
  } catch (error) {
    console.error("[SANTRI_STATISTIK_GET]", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
} 
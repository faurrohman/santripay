import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { Role } from "@prisma/client"
import jwt from "jsonwebtoken"

export async function GET(req: Request) {
  try {
    let userId: string | undefined = undefined;
    let role: string | undefined = undefined;
    // Cek Bearer token di header
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        const payload: any = jwt.verify(token, process.env.JWT_SECRET || "secret");
        userId = payload?.id;
        role = payload?.role;
      } catch (e) {
        return new NextResponse("Unauthorized", { status: 401 });
      }
    } else {
      // Fallback ke session NextAuth
      const session = await getServerSession(authOptions);
      if (!session) {
        return new NextResponse("Unauthorized", { status: 401 });
      }
      userId = session.user.id;
      role = session.user.role;
    }

    if (!userId || role !== "santri") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const notifikasi = await prisma.notifikasi.findMany({
      where: {
        role: Role.santri,
        userId: userId,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(notifikasi)
  } catch (error) {
    console.error("[NOTIFIKASI_SANTRI_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    let userId: string | undefined = undefined;
    let role: string | undefined = undefined;
    // Cek Bearer token di header
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      try {
        const payload: any = jwt.verify(token, process.env.JWT_SECRET || "secret");
        userId = payload?.id;
        role = payload?.role;
      } catch (e) {
        return new NextResponse("Unauthorized", { status: 401 });
      }
    } else {
      // Fallback ke session NextAuth
      const session = await getServerSession(authOptions);
      if (!session) {
        return new NextResponse("Unauthorized", { status: 401 });
      }
      userId = session.user.id;
      role = session.user.role;
    }

    if (!userId || role !== "santri") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const body = await req.json()
    const { id, isRead } = body

    if (!id || typeof isRead !== "boolean") {
      return new NextResponse("Invalid request body", { status: 400 })
    }

    const notifikasi = await prisma.notifikasi.update({
      where: {
        id,
        userId: userId,
        role: Role.santri,
      },
      data: {
        isRead,
      },
    })

    return NextResponse.json(notifikasi)
  } catch (error) {
    console.error("[NOTIFIKASI_SANTRI_PATCH]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
} 
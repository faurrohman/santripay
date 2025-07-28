import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
      select: {
        receiveAppNotifications: true,
        receiveEmailNotifications: true,
      },
    })

    if (!user) {
      console.log("USER NOT FOUND:", session.user.id)
      return new NextResponse("User not found", { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error("[USER_PREFERENCES_GET]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const body = await req.json()
    const { receiveAppNotifications, receiveEmailNotifications } = body

    if (typeof receiveAppNotifications !== "boolean" || typeof receiveEmailNotifications !== "boolean") {
      return new NextResponse("Invalid request body", { status: 400 })
    }

    const user = await prisma.user.update({
      where: {
        id: session.user.id,
      },
      data: {
        receiveAppNotifications,
        receiveEmailNotifications,
      },
      select: {
        receiveAppNotifications: true,
        receiveEmailNotifications: true,
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error("[USER_PREFERENCES_PATCH]", error)
    return new NextResponse("Internal error", { status: 500 })
  }
}
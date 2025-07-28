import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

const pengaturanSchema = z.object({
  receiveAppNotifications: z.boolean(),
  receiveEmailNotifications: z.boolean(),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
      select: {
        receiveAppNotifications: true,
        receiveEmailNotifications: true,
      },
    });

    if (!user) {
      return new NextResponse("User tidak ditemukan", { status: 404 });
    }

    return NextResponse.json({
      data: {
        receiveAppNotifications: user.receiveAppNotifications,
        receiveEmailNotifications: user.receiveEmailNotifications,
      },
    });
  } catch (error) {
    console.error("[PENGATURAN_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const validatedData = pengaturanSchema.parse(body);

    const updatedUser = await prisma.user.update({
      where: {
        id: session.user.id,
      },
      data: {
        receiveAppNotifications: validatedData.receiveAppNotifications,
        receiveEmailNotifications: validatedData.receiveEmailNotifications,
      },
      select: {
        receiveAppNotifications: true,
        receiveEmailNotifications: true,
      },
    });

    return NextResponse.json({
      data: {
        receiveAppNotifications: updatedUser.receiveAppNotifications,
        receiveEmailNotifications: updatedUser.receiveEmailNotifications,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse("Invalid request data", { status: 422 });
    }

    console.error("[PENGATURAN_PATCH]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
} 
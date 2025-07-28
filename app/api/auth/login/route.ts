import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ success: false, message: "NIS/Email dan password harus diisi" }, { status: 400 });
    }
    // Coba cari user berdasarkan email
    let user = await prisma.user.findUnique({ where: { email } });
    // Jika tidak ditemukan, cek ke tabel santriId
    if (!user) {
      const santri = await prisma.santri.findUnique({ where: { santriId: email } });
      if (santri) {
        user = await prisma.user.findUnique({ where: { id: santri.userId } });
      }
    }
    if (!user) {
      return NextResponse.json({ success: false, message: "NIS/Email atau password salah" }, { status: 401 });
    }
    // Jika admin, hanya boleh login pakai email
    if (user.role === "admin" && user.email !== email) {
      return NextResponse.json({ success: false, message: "Admin hanya bisa login dengan email" }, { status: 401 });
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json({ success: false, message: "NIS/Email atau password salah" }, { status: 401 });
    }
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET || "secret", { expiresIn: "1h" });
    return NextResponse.json({ success: true, token, user: { id: user.id, email: user.email, role: user.role } });
  } catch (err) {
    return NextResponse.json({ success: false, message: "Terjadi kesalahan server" }, { status: 500 });
  }
}

// Tambahkan endpoint logout
export async function DELETE(req: Request) {
  // Tidak perlu revoke token, hanya response sukses
  return NextResponse.json({ success: true, message: "Logout berhasil" });
} 
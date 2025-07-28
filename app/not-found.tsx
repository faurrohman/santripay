"use client";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-center p-8">
      <h1 className="text-6xl font-bold mb-4">404</h1>
      <h2 className="text-2xl font-semibold mb-2">Halaman Tidak Ditemukan</h2>
      <p className="mb-6 text-muted-foreground">Maaf, halaman yang kamu cari tidak tersedia atau sudah dipindahkan.</p>
      <Link href="/" className="px-6 py-2 rounded bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition">Kembali ke Beranda</Link>
    </div>
  );
} 
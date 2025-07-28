[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-14.x-blue.svg)](https://nextjs.org/)
[![Prisma](https.img.shields.io/badge/Prisma-5.x-lightgrey.svg)](https://www.prisma.io/)

# Santri Pay

Santri Pay adalah sistem pembayaran digital untuk pesantren yang memungkinkan santri mengelola pembayaran iuran (bulanan, kegiatan, buku, dll) melalui aplikasi web (PWA) di Android, serta admin mengelola data santri, tagihan, dan transaksi melalui antarmuka web. Sistem ini dirancang untuk efisiensi, transparansi, dan kemudahan penggunaan.

---

## Daftar Isi
- [Fitur Utama](#fitur-utama)
- [Dokumentasi Proyek](#dokumentasi-proyek)
- [Arsitektur & Teknologi](#arsitektur--teknologi)
- [Instalasi & Setup](#instalasi--setup)
- [Script Penting](#script-penting)
- [Deployment](#deployment)
- [Pengembangan Lanjutan](#pengembangan-lanjutan)
- [Lisensi](#lisensi)

---

## Fitur Utama

### Untuk Santri
- **Dashboard:** Lihat saldo, tagihan aktif, dan riwayat transaksi.
- **Pembayaran:** Ajukan pembayaran tagihan atau pembayaran ad-hoc.
- **Notifikasi:** Dapatkan notifikasi status pembayaran dan tagihan jatuh tempo.
- **Profil:** Lihat dan edit data pribadi.
- **Offline Mode:** Akses saldo & riwayat transaksi saat offline (PWA).

### Untuk Admin
- **Manajemen Santri:** Tambah, edit, hapus, dan pindah kelas santri.
- **Manajemen Kelas:** Tambah, edit, hapus kelas, lihat daftar santri per kelas.
- **Manajemen Tagihan:** Buat tagihan individu/massal, edit, hapus, tandai overdue.
- **Manajemen Transaksi:** Lihat, setujui/tolak transaksi, filter berdasarkan status/santri.
- **Laporan & Statistik:** Lihat statistik, grafik tren pembayaran, ekspor PDF/Excel.
- **Pengaturan:** Kelola jenis tagihan, atur pengingat otomatis.

---

## Dokumentasi Proyek

Dokumentasi teknis dan fungsional yang lebih mendalam dapat ditemukan pada tautan berikut:

- **[Manual Book](./documentasi/manual-book.md)**: Panduan penggunaan lengkap untuk Admin dan Santri.
- **[Rancangan Database](./documentasi/erd.md)**: Entity-Relationship Diagram (ERD) yang memvisualisasikan struktur database.
- **[Diagram UML](./documentasi/uml.md)**: Class diagram yang menjelaskan model data dan relasinya.
- **[Desain Tabel Rinci](./rancangan-tabel/)**: Penjelasan detail untuk setiap tabel dalam database.
- **Diagram Alir Data (DFD)**:
  - [Level 0 (Diagram Konteks)](./documentasi/dfd/level-0.md)
  - [Level 1 & 2](./documentasi/dfd/)
- **Diagram Usecase**:
  - [Admin](./documentasi/usecase/admin.md)
  - [Santri](./documentasi/usecase/santri.md)
- **Diagram Sequence**:
  - [Login](./documentasi/sequence/login.md)
  - [Pembayaran](./documentasi/sequence/ajukan-pembayaran.md)
  - [Approval](./documentasi/sequence/approval-pembayaran.md)
- **Diagram Activity**:
  - [Manajemen Santri](./documentasi/activity/pengelolaan-santri.md)
  - [Manajemen Kelas](./documentasi/activity/pengelolaan-kelas.md)
  - [Kenaikan Kelas](./documentasi/activity/naik-kelas.md)


---

## Arsitektur & Teknologi
- **Frontend:** Next.js (App Router), Tailwind CSS, React Query, NextAuth.js
- **Backend:** Next.js API Routes, Prisma ORM, PostgreSQL (produksi) / SQLite (dev)
- **PWA:** Mendukung instalasi di Android, offline mode
- **Autentikasi:** JWT, NextAuth
- **Keamanan:** Bcrypt, JWT, CORS, HTTPS, validasi input (zod)

---

## Struktur Database (Ringkasan)
- **User:** Data login (admin/santri)
- **Santri:** Profil santri, relasi ke user & kelas
- **Kelas:** Data kelas, relasi ke santri
- **Tagihan:** Data tagihan santri, status (pending/paid/overdue)
- **Transaksi:** Riwayat pembayaran santri
- **Jenis Tagihan:** Kategori tagihan
- **Notifikasi:** Notifikasi ke user
- **Tahun Ajaran, Riwayat Kelas:** Manajemen tahun ajaran & riwayat kelas

---

## Instalasi & Setup

### 1. Clone Repository
```bash
git clone <repo-url>
cd santripay
```

### 2. Install Dependencies
```bash
npm install
# atau
yarn install
```

### 3. Konfigurasi Environment
Buat file `.env` dan isi variabel berikut:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/santripay
NEXTAUTH_SECRET=your_secret
NEXTAUTH_URL=http://localhost:3000
```

### 4. Migrasi & Seed Database
```bash
npx prisma migrate dev
npm run prisma:seed
```

### 5. Menjalankan Aplikasi
```bash
npm run dev
```
Akses di [http://localhost:3000](http://localhost:3000)

---

## Script Penting
- `npm run dev` — Jalankan server development
- `npm run build` — Build production
- `npm run start` — Jalankan production
- `npm run lint` — Cek kode
- `npm run prisma:seed` — Seed data awal ke database

---

## Testing
- **Frontend:** Gunakan Jest & React Testing Library (opsional)
- **Backend:** Gunakan Postman/Jest untuk API, k6 untuk load test
- **PWA:** Uji instalasi & offline mode di Chrome DevTools

---

## Deployment
### Frontend (Vercel)
- Hubungkan repo ke Vercel
- Set environment variable
- Deploy otomatis dari branch utama

### Backend (Render/Heroku)
- Deploy backend & database PostgreSQL
- Jalankan migrasi & seed
- Pastikan environment variable sudah benar

---

## Keamanan
- Password terenkripsi (bcrypt)
- JWT untuk autentikasi
- Role-based access (admin/santri)
- Validasi input (zod)
- HTTPS wajib di produksi
- Rate limiting untuk API

---

## Pengembangan Lanjutan
- Integrasi pembayaran (Midtrans/Xendit)
- Notifikasi push (Web Push API)
- Multi-bahasa (next-intl)
- Multi-admin (role granular)
- Integrasi sistem lain (akademik/kehadiran)

---

## Lisensi
Proyek ini dilisensikan di bawah Lisensi MIT. Lihat file [LICENSE](LICENSE) untuk detailnya.

---

> Dokumentasi lengkap & ERD: lihat `documentasi/blueprint.md`

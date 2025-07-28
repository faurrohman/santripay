import { PrismaClient, Role, StatusTagihan, StatusTransaksi, JenisNotifikasi } from '@prisma/client';
import bcrypt from "bcryptjs";
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

const prisma = new PrismaClient();

interface SantriCSVRow {
  username: string;
  email: string;
  password: string;
  name: string;
  santriId: string;
  kelas: string;
  tahunAjaran: string;
  phone: string;
  namaBapak: string;
  namaIbu: string;
  alamat: string;
}

async function importSantriFromCSV() {
  const csvPath = path.join(__dirname, 'santri_kelas10.csv');
  if (!fs.existsSync(csvPath)) {
    console.log('File santri.csv tidak ditemukan, skip import santri dari CSV.');
    return;
  }
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as SantriCSVRow[];
  for (const row of records) {
    // Validasi duplikasi user/santri
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username: row.username },
          { email: row.email },
        ],
      },
    });
    const existingSantri = await prisma.santri.findFirst({
      where: { santriId: row.santriId },
    });
    if (existingUser || existingSantri) {
      console.log(`Lewati duplikat: ${row.username} / ${row.email} / ${row.santriId}`);
      continue;
    }
    // Cari/buat tahun ajaran
    let tahunAjaran = await prisma.tahunAjaran.findFirst({ where: { name: row.tahunAjaran } });
    if (!tahunAjaran) {
      tahunAjaran = await prisma.tahunAjaran.create({ data: { name: row.tahunAjaran, aktif: false } });
    }
    // Cari/buat kelas
    let kelas = await prisma.kelas.findFirst({ where: { name: row.kelas, tahunAjaranId: tahunAjaran.id } });
    if (!kelas) {
      kelas = await prisma.kelas.create({ data: { name: row.kelas, tahunAjaranId: tahunAjaran.id } });
    }
    // Hash password
    const passwordHash = await bcrypt.hash(row.password, 10);
    // Buat user
    const user = await prisma.user.create({
      data: {
        username: row.username,
        email: row.email,
        password: passwordHash,
        role: Role.santri,
        receiveAppNotifications: true,
        receiveEmailNotifications: true,
      },
    });
    // Buat santri
    await prisma.santri.create({
      data: {
        userId: user.id,
        name: row.name,
        santriId: row.santriId,
        kelasId: kelas.id,
        phone: row.phone,
        namaBapak: row.namaBapak,
        namaIbu: row.namaIbu,
        alamat: row.alamat,
      },
    });
    console.log(`Santri ${row.name} (${row.santriId}) berhasil diimport.`);
  }
}

async function main() {
  // Hapus data lama
  await prisma.transaksi.deleteMany({});
  await prisma.tagihan.deleteMany({});
  await prisma.jenisTagihan.deleteMany({});
  await prisma.santri.deleteMany({});
  await prisma.kelas.deleteMany({});
  await prisma.notifikasi.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('Data lama berhasil dihapus.');

  // Buat user admin
  const adminPassword = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.create({
    data: {
      username: "admin",
      email: "admin@example.com",
      password: adminPassword,
      role: Role.admin,
      receiveAppNotifications: true,
      receiveEmailNotifications: true,
    },
  });
  console.log("Admin berhasil dibuat:", admin.email);

  // Buat user santri
  const santri1Password = await bcrypt.hash("santri123", 10);
  const userSantri1 = await prisma.user.create({
    data: {
      username: "ahmad",
      email: "ahmad@example.com",
      password: santri1Password,
      role: Role.santri,
      receiveAppNotifications: true,
      receiveEmailNotifications: true,
    },
  });

  const santri2Password = await bcrypt.hash("santri123", 10);
  const userSantri2 = await prisma.user.create({
    data: {
      username: "siti",
      email: "siti@example.com",
      password: santri2Password,
      role: Role.santri,
      receiveAppNotifications: true,
      receiveEmailNotifications: true,
    },
  });

  const santri3Password = await bcrypt.hash("santri123", 10);
  const userSantri3 = await prisma.user.create({
    data: {
      username: "budi",
      email: "budi@example.com",
      password: santri3Password,
      role: Role.santri,
      receiveAppNotifications: true,
      receiveEmailNotifications: true,
    },
  });
  console.log("User santri berhasil dibuat");

  // Buat Tahun Ajaran
  const tahunAjaran2024 = await prisma.tahunAjaran.create({
    data: { name: "2024/2025", aktif: true },
  });
  const tahunAjaran2023 = await prisma.tahunAjaran.create({
    data: { name: "2023/2024", aktif: false },
  });
  console.log("Tahun ajaran berhasil dibuat");

  // Buat data Kelas
  const kelas1 = await prisma.kelas.create({
    data: { name: "1A", level: "Tsanawiyah", tahunAjaranId: tahunAjaran2024.id },
  });
  const kelas2A = await prisma.kelas.create({
    data: { name: "2A", level: "Tsanawiyah", tahunAjaranId: tahunAjaran2024.id },
  });
  const kelas3A = await prisma.kelas.create({
    data: { name: "3A", level: "Tsanawiyah", tahunAjaranId: tahunAjaran2024.id },
  });
  const kelas2B = await prisma.kelas.create({
    data: { name: "2B", level: "Aliyah", tahunAjaranId: tahunAjaran2024.id },
  });
  const kelas3B = await prisma.kelas.create({
    data: { name: "3B", level: "Aliyah", tahunAjaranId: tahunAjaran2024.id },
  });
  console.log("Kelas berhasil dibuat");

  // Buat data Kelas untuk tahun ajaran 2023/2024
  const kelas1_2023 = await prisma.kelas.create({
    data: { name: "1A", level: "Tsanawiyah", tahunAjaranId: tahunAjaran2023.id },
  });
  const kelas2_2023 = await prisma.kelas.create({
    data: { name: "2B", level: "Aliyah", tahunAjaranId: tahunAjaran2023.id },
  });
  console.log("Kelas tahun ajaran 2023/2024 berhasil dibuat");

  // Buat data Santri
  const santriAhmad = await prisma.santri.create({
    data: {
      userId: userSantri1.id,
      name: "Ahmad Fauzi",
      santriId: "S001",
      kelasId: kelas1.id,
      phone: "08111222333",
    },
  });

  const santriSiti = await prisma.santri.create({
    data: {
      userId: userSantri2.id,
      name: "Siti Rahmawati",
      santriId: "S002",
      kelasId: kelas2B.id,
      phone: "08444555666",
    },
  });

  const santriBudi = await prisma.santri.create({
    data: {
      userId: userSantri3.id,
      name: "Budi Santoso",
      santriId: "S003",
      kelasId: kelas1.id,
      phone: "08777888999",
    },
  });
  console.log("Data santri berhasil dibuat");

  // Buat data JenisTagihan
  const iuranBulanan = await prisma.jenisTagihan.create({
    data: { 
      name: "Iuran Bulanan", 
      amount: BigInt(150000), 
      description: "Iuran bulanan rutin pesantren" 
    },
  });

  const kegiatanTahunan = await prisma.jenisTagihan.create({
    data: { 
      name: "Kegiatan Tahunan", 
      amount: BigInt(250000), 
      description: "Biaya kegiatan pesantren tahunan" 
    },
  });

  const seragam = await prisma.jenisTagihan.create({
    data: { 
      name: "Seragam", 
      amount: BigInt(200000), 
      description: "Biaya seragam pesantren" 
    },
  });

  const buku = await prisma.jenisTagihan.create({
    data: { 
      name: "Buku Pelajaran", 
      amount: BigInt(100000), 
      description: "Biaya buku pelajaran" 
    },
  });
  console.log("Jenis tagihan berhasil dibuat");

  // Buat data Tagihan untuk Ahmad
  const tagihanAhmad1 = await prisma.tagihan.create({
    data: {
      santriId: santriAhmad.id,
      jenisTagihanId: iuranBulanan.id,
      amount: BigInt(150000),
      dueDate: new Date("2025-07-01"),
      status: StatusTagihan.pending,
      description: "Iuran bulanan Juli 2025",
      tahunAjaranId: tahunAjaran2024.id,
    },
  });

  const tagihanAhmad2 = await prisma.tagihan.create({
    data: {
      santriId: santriAhmad.id,
      jenisTagihanId: kegiatanTahunan.id,
      amount: BigInt(250000),
      dueDate: new Date("2025-06-15"),
      status: StatusTagihan.paid,
      description: "Biaya kegiatan tahunan 2025",
      tahunAjaranId: tahunAjaran2024.id,
    },
  });

  // Buat data Tagihan untuk Siti
  const tagihanSiti1 = await prisma.tagihan.create({
    data: {
      santriId: santriSiti.id,
      jenisTagihanId: iuranBulanan.id,
      amount: BigInt(150000),
      dueDate: new Date("2025-07-01"),
      status: StatusTagihan.pending,
      description: "Iuran bulanan Juli 2025",
      tahunAjaranId: tahunAjaran2024.id,
    },
  });

  const tagihanSiti2 = await prisma.tagihan.create({
    data: {
      santriId: santriSiti.id,
      jenisTagihanId: buku.id,
      amount: BigInt(100000),
      dueDate: new Date("2025-06-20"),
      status: StatusTagihan.paid,
      description: "Biaya buku pelajaran semester 1",
      tahunAjaranId: tahunAjaran2024.id,
    },
  });

  // Buat data Tagihan untuk Budi
  const tagihanBudi1 = await prisma.tagihan.create({
    data: {
      santriId: santriBudi.id,
      jenisTagihanId: iuranBulanan.id,
      amount: BigInt(150000),
      dueDate: new Date("2025-07-01"),
      status: StatusTagihan.pending,
      description: "Iuran bulanan Juli 2025",
      tahunAjaranId: tahunAjaran2024.id,
    },
  });

  const tagihanBudi2 = await prisma.tagihan.create({
    data: {
      santriId: santriBudi.id,
      jenisTagihanId: seragam.id,
      amount: BigInt(200000),
      dueDate: new Date("2025-06-25"),
      status: StatusTagihan.pending,
      description: "Biaya seragam pesantren",
      tahunAjaranId: tahunAjaran2024.id,
    },
  });
  console.log("Data tagihan berhasil dibuat");

  // Buat data Transaksi
  await prisma.transaksi.create({
    data: {
      santriId: santriAhmad.id,
      tagihanId: tagihanAhmad1.id,
      amount: BigInt(150000),
      status: StatusTransaksi.pending,
      paymentDate: new Date(),
      note: "Menunggu konfirmasi pembayaran",
      orderId: `SEED-${tagihanAhmad1.id}-${Date.now()}`,
    },
  });

  await prisma.transaksi.create({
    data: {
      santriId: santriSiti.id,
      tagihanId: tagihanSiti1.id,
      amount: BigInt(150000),
      status: StatusTransaksi.pending,
      paymentDate: new Date(),
      note: "Menunggu konfirmasi pembayaran",
      orderId: `SEED-${tagihanSiti1.id}-${Date.now()}`,
    },
  });

  await prisma.transaksi.create({
    data: {
      santriId: santriBudi.id,
      tagihanId: tagihanBudi1.id,
      amount: BigInt(150000),
      status: StatusTransaksi.pending,
      paymentDate: new Date(),
      note: "Menunggu konfirmasi pembayaran",
      orderId: `SEED-${tagihanBudi1.id}-${Date.now()}`,
    },
  });
  console.log("Data transaksi berhasil dibuat");

  // Buat data Notifikasi
  await prisma.notifikasi.create({
    data: {
      userId: userSantri1.id,
      title: "Tagihan Baru",
      message: "Anda memiliki tagihan baru untuk Iuran Bulanan Juli 2025",
      type: JenisNotifikasi.tagihan_baru,
      tagihanId: tagihanAhmad1.id,
    },
  });

  await prisma.notifikasi.create({
    data: {
      userId: admin.id,
      title: "Pembayaran Baru",
      message: "Ada pembayaran baru dari Ahmad Fauzi",
      type: JenisNotifikasi.sistem,
    },
  });
  console.log("Data notifikasi berhasil dibuat");

  // Buat tagihan untuk Ahmad di tahun ajaran 2023/2024
  await prisma.tagihan.create({
    data: {
      santriId: santriAhmad.id,
      jenisTagihanId: iuranBulanan.id,
      amount: BigInt(150000),
      dueDate: new Date("2024-07-01"),
      status: StatusTagihan.paid,
      description: "Iuran bulanan Juli 2024",
      tahunAjaranId: tahunAjaran2023.id,
    },
  });

  // Buat riwayat kelas untuk Ahmad (dari kelas1_2023 ke kelas1 di tahun ajaran 2024/2025)
  await prisma.riwayatKelas.create({
    data: {
      santriId: santriAhmad.id,
      kelasLamaId: kelas1_2023.id,
      kelasBaruId: kelas1.id,
      tanggal: new Date("2024-07-15"),
    },
  });

  // Buat notifikasi naik kelas untuk Ahmad
  await prisma.notifikasi.create({
    data: {
      userId: userSantri1.id,
      title: "Kenaikan Kelas",
      message: "Selamat! Anda telah naik kelas dari 1A ke 1A (Tsanawiyah)",
      type: JenisNotifikasi.naik_kelas,
      isRead: false,
      role: "santri",
    },
  });

  await importSantriFromCSV();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 
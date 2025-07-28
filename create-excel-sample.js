const XLSX = require('xlsx');

// Data yang sama dengan CSV
const data = [
  {
    username: '1234567890',
    email: '1234567890@santri.com',
    password: 'santri123',
    name: 'Contoh Santri 1',
    santriId: '1234567890',
    kelas: 'Kelas 10',
    tahunAjaran: '2024/2025',
    phone: '081234567890',
    namaBapak: 'Bapak Satu',
    namaIbu: 'Ibu Satu',
    alamat: 'Jl. Contoh No. 1, Kota Contoh'
  },
  {
    username: '0987654321',
    email: '0987654321@santri.com',
    password: 'santri123',
    name: 'Contoh Santri 2',
    santriId: '0987654321',
    kelas: 'Kelas 10',
    tahunAjaran: '2024/2025',
    phone: '082345678901',
    namaBapak: 'Bapak Dua',
    namaIbu: 'Ibu Dua',
    alamat: 'Jl. Contoh No. 2, Kota Contoh'
  }
];

// Buat workbook baru
const workbook = XLSX.utils.book_new();

// Buat worksheet dari data
const worksheet = XLSX.utils.json_to_sheet(data);

// Tambahkan worksheet ke workbook
XLSX.utils.book_append_sheet(workbook, worksheet, 'Santri Data');

// Tulis file
XLSX.writeFile(workbook, 'public/contoh_santri.xlsx');

console.log('File Excel contoh berhasil dibuat: public/contoh_santri.xlsx'); 
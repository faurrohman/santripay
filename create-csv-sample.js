const fs = require('fs');
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

const headers = Object.keys(data[0]);
const csv = [
  headers.join(','),
  ...data.map(row => headers.map(h => `"${(row[h] || '').replace(/"/g, '""')}"`).join(','))
].join('\n');

fs.writeFileSync('public/contoh_santri.csv', csv, 'utf8');
console.log('CSV sample created!');
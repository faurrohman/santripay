import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";
import Papa from "papaparse";
import bcrypt from "bcryptjs";
import * as XLSX from "xlsx";

const santriImportSchema = z.object({
  username: z.string().min(1, "Username tidak boleh kosong"),
  email: z.string().email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  name: z.string().min(1, "Nama tidak boleh kosong"),
  santriId: z.string().min(1, "ID Santri tidak boleh kosong"),
  kelas: z.string().min(1, "Kelas tidak boleh kosong"),
  tahunAjaran: z.string().min(1, "Tahun ajaran tidak boleh kosong"),
  phone: z.string().optional(),
  namaBapak: z.string().optional(),
  namaIbu: z.string().optional(),
  alamat: z.string().optional(),
});

async function parseFile(file: File): Promise<any[]> {
  const fileName = file.name.toLowerCase();
    const arrayBuffer = await file.arrayBuffer();

  if (fileName.endsWith('.csv')) {
    const text = Buffer.from(arrayBuffer).toString("utf-8");
    const parsed = Papa.parse(text, { 
      header: true, 
      skipEmptyLines: true,
      transform: (value) => value.trim()
    });
    
    if (parsed.errors.length > 0) {
      throw new Error(`Format CSV tidak valid: ${parsed.errors.map(e => e.message).join(', ')}`);
    }
    
    return parsed.data as any[];
  } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    const workbook = XLSX.read(arrayBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (data.length < 2) {
      throw new Error("File Excel kosong atau tidak memiliki data yang valid");
    }
    
    // Convert to array of objects with headers
    const headers = data[0] as string[];
    const rows = data.slice(1) as any[][];
    
    // Konversi semua kolom ke string
    return rows.map(row => {
      const obj: any = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] !== undefined && row[index] !== null ? String(row[index]) : '';
      });
      return obj;
    });
  } else {
    throw new Error("Format file tidak didukung. Gunakan CSV atau Excel (.xlsx/.xls)");
  }
}

async function validateImportData(rows: any[], preview: boolean = false) {
    let success = 0;
    let failed = 0;
    let errors: any[] = [];
  let validData: any[] = [];

      for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
      // Validasi data dengan schema
        const data = santriImportSchema.parse(row);

      // Cek duplikasi username/email/santriId juga saat preview
      if (preview) {
        const [existingUser, existingEmail, existingSantri] = await Promise.all([
          prisma.user.findUnique({ where: { username: data.username } }),
          prisma.user.findUnique({ where: { email: data.email } }),
          prisma.santri.findUnique({ where: { santriId: data.santriId } }),
        ]);
        let duplicateType = null;
        let duplicateValue = '';
        if (existingUser) {
          duplicateType = 'username';
          duplicateValue = data.username;
        } else if (existingEmail) {
          duplicateType = 'email';
          duplicateValue = data.email;
        } else if (existingSantri) {
          duplicateType = 'santriId';
          duplicateValue = data.santriId;
        }

        validData.push({ ...data, rowNumber: i + 2, duplicateType });
        if (duplicateType) {
          failed++;
          errors.push({ row: i + 2, message: `Duplikat pada ${duplicateType}: ${duplicateValue}` });
        } else {
          success++;
        }
        continue;
      }

      if (!preview) {
        // Cek duplikasi username
        const existingUser = await prisma.user.findUnique({ 
          where: { username: data.username } 
        });
        if (existingUser) {
          failed++;
          errors.push({ 
            row: i + 2, 
            message: `Username sudah ada: ${data.username}` 
          });
          continue;
        }

        // Cek duplikasi email
        const existingEmail = await prisma.user.findUnique({ 
          where: { email: data.email } 
        });
        if (existingEmail) {
          failed++;
          errors.push({ 
            row: i + 2, 
            message: `Email sudah ada: ${data.email}` 
          });
          continue;
        }

        // Cek duplikasi santriId
        const existingSantri = await prisma.santri.findUnique({ 
          where: { santriId: data.santriId } 
        });
        if (existingSantri) {
          failed++;
          errors.push({ 
            row: i + 2, 
            message: `ID Santri sudah ada: ${data.santriId}` 
          });
          continue;
        }

        // Cari tahun ajaran terlebih dahulu
        const tahunAjaran = await prisma.tahunAjaran.findFirst({
          where: {
            name: data.tahunAjaran
          }
        });

        if (!tahunAjaran) {
          failed++;
          errors.push({ 
            row: i + 2, 
            message: `Tahun ajaran tidak ditemukan: ${data.tahunAjaran}` 
          });
          continue;
        }

        // Cari kelas berdasarkan nama dan tahun ajaran
        let kelas = await prisma.kelas.findFirst({
          where: {
            name: data.kelas,
            tahunAjaranId: tahunAjaran.id
          },
          include: {
            tahunAjaran: true
          }
        });

        if (!kelas) {
          // Coba buat kelas baru jika tidak ditemukan
          try {
            kelas = await prisma.kelas.create({
              data: {
                name: data.kelas,
                tahunAjaranId: tahunAjaran.id,
                level: "Aliyah" // Default level, bisa disesuaikan
              },
              include: {
                tahunAjaran: true
              }
            });
            console.log(`Kelas baru dibuat: ${data.kelas} untuk tahun ajaran ${data.tahunAjaran}`);
          } catch (createError: any) {
            failed++;
            errors.push({ 
              row: i + 2, 
              message: `Gagal membuat kelas: ${data.kelas} pada tahun ajaran ${data.tahunAjaran}. Error: ${createError.message}` 
            });
            continue;
          }
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(data.password, 10);

        // Buat user baru
        const user = await prisma.user.create({
          data: {
            username: data.username,
            email: data.email,
            password: hashedPassword,
            role: "santri",
          },
        });

        // Buat santri baru
        await prisma.santri.create({
          data: {
            userId: user.id,
            name: data.name,
            santriId: data.santriId,
            kelasId: kelas.id,
            phone: data.phone || null,
            namaBapak: data.namaBapak || null,
            namaIbu: data.namaIbu || null,
            alamat: data.alamat || null,
          },
        });
      } else {
        // Untuk preview, hanya validasi format data
        validData.push({
          ...data,
          rowNumber: i + 2
        });
      }

        success++;
      } catch (e: any) {
        failed++;
      if (e instanceof z.ZodError) {
        const fieldErrors = e.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
        errors.push({ 
          row: i + 2, 
          message: `Validasi error: ${fieldErrors}` 
        });
      } else {
        errors.push({ 
          row: i + 2, 
          message: e?.message || "Error tidak diketahui" 
        });
      }
    }
  }

  return { success, failed, errors, validData };
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    console.log("Preview import santri dimulai...");

    const url = new URL(req.url);
    const fileData = url.searchParams.get('fileData');
    const fileName = url.searchParams.get('fileName');
    
    console.log("File name:", fileName);
    
    if (!fileData) {
      return NextResponse.json({ message: "Data file tidak ditemukan" }, { status: 400 });
    }

    // Decode base64 file data
    const buffer = Buffer.from(fileData, 'base64');
    
    let rows: any[] = [];
    
    if (fileName?.toLowerCase().endsWith('.csv')) {
      // Parse CSV data
      const text = buffer.toString('utf-8');
      console.log("CSV text sample:", text.substring(0, 200));
      
      const parsed = Papa.parse(text, { 
        header: true, 
        skipEmptyLines: true,
        transform: (value) => value ? value.trim() : '',
        complete: (results) => {
          console.log("CSV parsing completed");
          console.log("CSV headers:", results.meta.fields);
          console.log("CSV first row:", results.data[0]);
        }
      });
      
      if (parsed.errors.length > 0) {
        console.log("CSV parsing errors:", parsed.errors);
        return NextResponse.json({ 
          message: "Format CSV tidak valid", 
          errors: parsed.errors 
        }, { status: 400 });
      }
      
      rows = parsed.data as any[];
      // Filter baris kosong: hanya baris yang minimal satu field terisi
      rows = rows.filter(row => Object.values(row).some(value => value && String(value).trim() !== ''));
      console.log("CSV rows after filter:", rows.length);
      console.log("CSV sample row:", rows[0]);
    } else if (fileName?.toLowerCase().endsWith('.xlsx') || fileName?.toLowerCase().endsWith('.xls')) {
      // Parse Excel data
      try {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        console.log("Excel sheet names:", workbook.SheetNames);
        console.log("Selected sheet:", sheetName);
        
        // Try to get objects directly first
        let jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          defval: '' // Default value for empty cells
        });
        
        console.log("Excel raw data sample:", jsonData.slice(0, 3));
        
        if (jsonData.length < 2) {
          return NextResponse.json({ 
            message: "File Excel kosong atau tidak memiliki data yang valid" 
          }, { status: 400 });
        }
        
        // Convert to array of objects with headers
        const headers = jsonData[0] as string[];
        const excelRows = jsonData.slice(1) as any[][];
        
        console.log("Excel headers:", headers);
        console.log("Excel first row:", excelRows[0]);
        
        rows = excelRows.map(row => {
          const obj: any = {};
          headers.forEach((header, index) => {
            // Handle empty cells and convert to string
            const value = row[index];
            obj[header] = value !== undefined && value !== null ? String(value).trim() : '';
          });
          return obj;
        });
        // Filter baris kosong: hanya baris yang minimal satu field terisi
        rows = rows.filter(row => Object.values(row).some(value => value && String(value).trim() !== ''));
        
        console.log("Parsed Excel rows sample:", rows.slice(0, 2));
        console.log("Excel rows after filter:", rows.length);
      } catch (error: any) {
        console.error("Excel parsing error:", error);
        return NextResponse.json({ 
          message: `Error parsing Excel file: ${error.message}` 
        }, { status: 400 });
      }
    } else {
      return NextResponse.json({ 
        message: "Format file tidak didukung. Gunakan CSV atau Excel (.xlsx/.xls)" 
      }, { status: 400 });
    }
    
    if (rows.length === 0) {
      return NextResponse.json({ 
        message: "File kosong atau tidak memiliki data yang valid" 
      }, { status: 400 });
    }

    // Validate data without saving to database
    const result = await validateImportData(rows, true);

    return NextResponse.json({
      message: `Preview selesai. Valid: ${result.success}, Error: ${result.failed}`,
      success: result.success,
      failed: result.failed,
      errors: result.errors.slice(0, 10),
      validData: result.validData.slice(0, 20), // Limit preview data
      totalRows: rows.length
    }, { status: 200 });

  } catch (error) {
    console.error("Error preview import santri:", error);
    return NextResponse.json({ 
      message: "Terjadi kesalahan saat preview import santri." 
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    console.log("Import santri dimulai...");

    // Parse form data
    const formData = await req.formData();
    const file = formData.get("file");
    
    if (!file || typeof file === "string") {
      return NextResponse.json({ message: "File tidak ditemukan" }, { status: 400 });
    }

    console.log("File diterima:", file.name, "Size:", file.size);

    // Parse file based on format
    let rows: any[];
    try {
      rows = await parseFile(file);
      console.log("File berhasil di-parse, jumlah baris:", rows.length);
      console.log("Sample data:", rows[0]);
    } catch (error: any) {
      console.error("Error parsing file:", error);
      return NextResponse.json({ 
        message: error.message 
      }, { status: 400 });
    }
    
    if (rows.length === 0) {
      return NextResponse.json({ 
        message: "File kosong atau tidak memiliki data yang valid" 
      }, { status: 400 });
    }

    let success = 0;
    let failed = 0;
    let errors: any[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        console.log('Row sebelum validasi:', row);
        const data = santriImportSchema.parse(row);
        console.log('Row setelah validasi:', data);
        // Cek duplikasi username
        const existingUser = await prisma.user.findUnique({ 
          where: { username: data.username } 
        });
        if (existingUser) {
          console.log('Username sudah ada:', data.username);
          failed++;
          errors.push({ 
            row: i + 2, 
            message: `Username sudah ada: ${data.username}` 
          });
          continue;
        }
        // Cek duplikasi email
        const existingEmail = await prisma.user.findUnique({ 
          where: { email: data.email } 
        });
        if (existingEmail) {
          console.log('Email sudah ada:', data.email);
          failed++;
          errors.push({ 
            row: i + 2, 
            message: `Email sudah ada: ${data.email}` 
          });
          continue;
        }
        // Cek duplikasi santriId
        const existingSantri = await prisma.santri.findUnique({ 
          where: { santriId: data.santriId } 
        });
        if (existingSantri) {
          console.log('SantriId sudah ada:', data.santriId);
          failed++;
          errors.push({ 
            row: i + 2, 
            message: `ID Santri sudah ada: ${data.santriId}` 
          });
          continue;
        }
        // Cari tahun ajaran terlebih dahulu
        const tahunAjaran = await prisma.tahunAjaran.findFirst({
          where: {
            name: data.tahunAjaran
          }
        });
        if (!tahunAjaran) {
          console.log('Tahun ajaran tidak ditemukan:', data.tahunAjaran);
          failed++;
          errors.push({ 
            row: i + 2, 
            message: `Tahun ajaran tidak ditemukan: ${data.tahunAjaran}` 
          });
          continue;
        }
        // Cari kelas berdasarkan nama dan tahun ajaran
        let kelas = await prisma.kelas.findFirst({
          where: {
            name: data.kelas,
            tahunAjaranId: tahunAjaran.id
          },
          include: {
            tahunAjaran: true
          }
        });
        if (!kelas) {
          // Coba buat kelas baru jika tidak ditemukan
          try {
            kelas = await prisma.kelas.create({
              data: {
                name: data.kelas,
                tahunAjaranId: tahunAjaran.id,
                level: "Aliyah" // Default level, bisa disesuaikan
              },
              include: {
                tahunAjaran: true
              }
            });
            console.log(`Kelas baru dibuat: ${data.kelas} untuk tahun ajaran ${data.tahunAjaran}`);
          } catch (createError: any) {
            console.log('Gagal membuat kelas:', data.kelas, createError);
            failed++;
            errors.push({ 
              row: i + 2, 
              message: `Gagal membuat kelas: ${data.kelas} pada tahun ajaran ${data.tahunAjaran}. Error: ${createError.message}` 
            });
            continue;
          }
        }
        // Hash password
        const hashedPassword = await bcrypt.hash(data.password, 10);
        // Buat user baru
        console.log('Menyimpan user:', data.username);
        const user = await prisma.user.create({
          data: {
            username: data.username,
            email: data.email,
            password: hashedPassword,
            role: "santri",
          },
        });
        // Buat santri baru
        await prisma.santri.create({
          data: {
            userId: user.id,
            name: data.name,
            santriId: data.santriId,
            kelasId: kelas.id,
            phone: data.phone || null,
            namaBapak: data.namaBapak || null,
            namaIbu: data.namaIbu || null,
            alamat: data.alamat || null,
          },
        });
        console.log('User dan santri berhasil disimpan:', data.username);
        success++;
      } catch (e: any) {
        failed++;
        if (e instanceof z.ZodError) {
          const fieldErrors = e.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
          errors.push({ 
            row: i + 2, 
            message: `Validasi error: ${fieldErrors}` 
          });
        } else {
          errors.push({ 
            row: i + 2, 
            message: e?.message || "Error tidak diketahui" 
          });
        }
        console.error('Gagal simpan:', row, e);
      }
    }

    return NextResponse.json({
      message: `Import selesai. Berhasil: ${success}, Gagal: ${failed}`,
      success,
      failed,
      errors: errors.slice(0, 10), // Batasi error yang dikembalikan
    }, { status: 200 });

  } catch (error) {
    console.error("Error import santri:", error);
    return NextResponse.json({ 
      message: "Terjadi kesalahan saat import santri." 
    }, { status: 500 });
  }
} 
import prisma from "@/lib/prisma";

/**
 * Generate NIS (Nomor Induk Santri) otomatis
 * Format: YYNNN (tahun 2 digit + nomor urut 3 digit tanpa titik)
 * Contoh: 25001, 25002, dst.
 */
export async function generateNIS(): Promise<string> {
  try {
    // Ambil tahun saat ini (2 digit terakhir)
    const currentYear = new Date().getFullYear();
    const yearPrefix = currentYear.toString().slice(-2); // Ambil 2 digit terakhir
    
    // Cari NIS terakhir dengan prefix tahun yang sama
    const lastSantri = await prisma.santri.findFirst({
      where: {
        santriId: {
          startsWith: yearPrefix
        }
      },
      orderBy: {
        santriId: 'desc'
      }
    });

    let nextNumber = 1;
    
    if (lastSantri && lastSantri.santriId) {
      // Extract nomor urut dari NIS terakhir
      const lastNIS = lastSantri.santriId;
      
      // Cek apakah NIS dimulai dengan tahun yang sama
      if (lastNIS.startsWith(yearPrefix) && lastNIS.length === 5) {
        const numberPart = lastNIS.substring(2); // Ambil 3 digit terakhir
        const lastNumber = parseInt(numberPart, 10);
        if (!isNaN(lastNumber)) {
          nextNumber = lastNumber + 1;
        }
      }
    }

    // Format nomor urut dengan padding 3 digit
    const formattedNumber = nextNumber.toString().padStart(3, '0');
    
    // Gabungkan tahun + nomor urut tanpa titik
    const nis = `${yearPrefix}${formattedNumber}`;
    
    return nis;
  } catch (error) {
    console.error('Error generating NIS:', error);
    throw new Error('Gagal membuat NIS otomatis');
  }
}

/**
 * Validasi format NIS
 * Format yang valid: YYNNN (2 digit tahun + 3 digit nomor tanpa titik)
 */
export function validateNISFormat(nis: string): boolean {
  const nisRegex = /^\d{5}$/;
  return nisRegex.test(nis);
}

/**
 * Extract tahun dari NIS
 */
export function extractYearFromNIS(nis: string): number {
  const yearPrefix = nis.substring(0, 2);
  return parseInt('20' + yearPrefix, 10); // Convert 25 to 2025
}

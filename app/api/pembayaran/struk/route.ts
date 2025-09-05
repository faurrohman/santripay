import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

const strukSchema = z.object({
  pembayaranId: z.string().min(1, "Pembayaran ID tidak boleh kosong"),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { pembayaranId } = strukSchema.parse(body);

    // Fetch transaksi data with related information
    const transaksi = await prisma.transaksi.findUnique({
      where: { id: pembayaranId },
      include: {
        santri: {
          include: {
            kelas: true
          }
        },
        tagihan: {
          include: {
            jenisTagihan: true
          }
        }
      }
    });

    if (!transaksi) {
      return NextResponse.json(
        { message: "Transaksi tidak ditemukan" },
        { status: 404 }
      );
    }

    // Generate HTML content for PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Struk Pembayaran - ${transaksi.santri.name}</title>
        <style>
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: white;
            color: #000;
            line-height: 1.4;
            font-size: 14px;
          }
          
          .struk-container {
            max-width: 600px;
            margin: 0 auto;
            border: 2px solid #000;
            border-radius: 8px;
            overflow: hidden;
            background: white;
          }
          
          .header {
            text-align: center;
            border-bottom: 3px solid #000;
            padding: 20px;
            background: #f8f9fa;
          }
          
          .header h1 {
            margin: 0 0 8px 0;
            font-size: 24px;
            font-weight: 700;
            letter-spacing: 0.5px;
            color: #000;
          }
          
          .header p {
            margin: 0;
            font-size: 16px;
            font-weight: 500;
            color: #666;
          }
          
          .content {
            padding: 20px;
          }
          
          .row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px dashed #ccc;
            min-height: 32px;
          }
          
          .row:last-child {
            border-bottom: none;
          }
          
          .label {
            font-weight: 600;
            font-size: 14px;
            flex: 1;
            color: #000;
          }
          
          .value {
            font-size: 14px;
            text-align: right;
            flex: 1;
            color: #000;
          }
          
          .amount {
            font-size: 18px;
            font-weight: 700;
            color: #000;
          }
          
          .status {
            font-weight: 700;
            padding: 4px 8px;
            border-radius: 4px;
            display: inline-block;
            font-size: 12px;
          }
          
          .status.approved {
            background-color: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
          }
          
          .status.rejected {
            background-color: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
          }
          
          .status.pending {
            background-color: #fff3cd;
            color: #856404;
            border: 1px solid #ffeaa7;
          }
          
          .footer {
            text-align: center;
            border-top: 3px solid #000;
            padding: 20px;
            background: #f8f9fa;
          }
          
          .footer p {
            margin: 4px 0;
            font-size: 12px;
            color: #666;
          }
          
          .footer .main-text {
            font-weight: 600;
            color: #000;
            font-size: 14px;
          }
          
          .note {
            margin-top: 16px;
            padding: 12px;
            background: #f8f9fa;
            border-radius: 6px;
            border: 1px solid #e9ecef;
          }
          
          .note-label {
            font-weight: 600;
            font-size: 14px;
            display: block;
            margin-bottom: 4px;
            color: #000;
          }
          
          .note-text {
            font-size: 14px;
            color: #666;
            margin: 0;
          }
          
          @media print {
            body {
              margin: 0;
              padding: 10px;
            }
            
            .struk-container {
              border: 2px solid #000 !important;
              box-shadow: none !important;
            }
            
            .no-print {
              display: none !important;
            }
            
            @page {
              margin: 0.5in;
              size: A4;
            }
          }
        </style>
      </head>
      <body>
        <div class="struk-container">
          <div class="header">
            <h1>STRUK VALIDASI PEMBAYARAN</h1>
            <p>Pondok Pesantren SantriPay</p>
          </div>
          
          <div class="content">
          <div class="row">
            <span class="label">No. Transaksi:</span>
            <span class="value">${transaksi.id}</span>
          </div>
          <div class="row">
            <span class="label">Tanggal:</span>
            <span class="value">${new Date(transaksi.paymentDate).toLocaleString('id-ID')}</span>
          </div>
          <div class="row">
            <span class="label">Nama Santri:</span>
            <span class="value">${transaksi.santri.name}</span>
          </div>
          <div class="row">
            <span class="label">Kelas:</span>
            <span class="value">${transaksi.santri.kelas.name}</span>
          </div>
          <div class="row">
            <span class="label">Jenis Tagihan:</span>
            <span class="value">${transaksi.tagihan?.jenisTagihan?.name || '-'}</span>
          </div>
          <div class="row">
            <span class="label">Jumlah:</span>
            <span class="value amount">${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(Number(transaksi.amount))}</span>
          </div>
          <div class="row">
            <span class="label">Metode Pembayaran:</span>
            <span class="value">${transaksi.paymentMethod || 'Manual'}</span>
          </div>
          <div class="row">
            <span class="label">Status:</span>
            <span class="value">
              <span class="status ${transaksi.status}">
                ${transaksi.status === 'approved' ? 'DISETUJUI' : 
                  transaksi.status === 'rejected' ? 'DITOLAK' : 
                  'MENUNGGU'}
              </span>
            </span>
          </div>
          ${transaksi.note ? `
          <div class="note">
            <strong>Catatan:</strong><br>
            ${transaksi.note}
          </div>
          ` : ''}
          </div>
          
          <div class="footer">
            <p class="main-text">Struk ini adalah bukti validasi pembayaran yang sah</p>
            <p>Dicetak pada: ${new Date().toLocaleString('id-ID')}</p>
            <p>Pondok Pesantren SantriPay - Sistem Pembayaran Digital</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // For now, return HTML content that can be converted to PDF by browser
    // In production, you would use a library like puppeteer or html-pdf-node
    return new NextResponse(htmlContent, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="struk-pembayaran-${transaksi.santri.name}-${new Date().toISOString().split('T')[0]}.html"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error("Error generating struk:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Data tidak valid", errors: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Terjadi kesalahan saat generate struk" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { markEntryEmailSent } from '@/lib/actions'
import { generateQRCode } from '@/lib/utils'
import nodemailer from 'nodemailer'
import path from 'path'
import fs from 'fs'

type EntryData = {
  entryId: string
  qrToken: string
  clientName: string
}

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions)
    if (!session || !['CAJERO', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()

    // Support both old single-entry format and new multi-entry format
    let entries: EntryData[]
    let clientEmail: string
    let eventName: string
    let eventDate: string | undefined
    let totalPrice: number

    if (body.entries && Array.isArray(body.entries)) {
      // New multi-entry format
      entries = body.entries
      clientEmail = body.clientEmail
      eventName = body.eventName
      eventDate = body.eventDate
      totalPrice = body.totalPrice
    } else {
      // Legacy single-entry format (from historial tab)
      entries = [{
        entryId: body.entryId,
        qrToken: body.qrToken,
        clientName: body.clientName,
      }]
      clientEmail = body.clientEmail
      eventName = body.eventName
      eventDate = body.eventDate
      totalPrice = body.totalPrice || 0
    }

    if (!entries.length || !clientEmail || !eventName) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
    }

    const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Generate QR codes for all entries
    const qrData = await Promise.all(
      entries.map(async (entry, i) => {
        const validationUrl = `${appUrl}/entradas/validar/${entry.qrToken}`
        const qrDataUrl = await generateQRCode(validationUrl)
        const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, '')
        return {
          ...entry,
          validationUrl,
          qrBase64,
          cid: `qrcode${i}`,
        }
      })
    )

    // Read logo file
    const logoPath = path.join(process.cwd(), 'public', 'LogoCasaBlanca.png')
    const logoBuffer = fs.readFileSync(logoPath)

    // Format event date
    const eventDateStr = eventDate
      ? new Date(eventDate).toLocaleDateString('es-HN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
      : ''

    const isBulk = entries.length > 1
    const firstGuestName = entries[0].clientName

    // Build QR sections HTML
    const qrSectionsHtml = qrData.map((qr) => `
                <div style="text-align:center;margin:0 0 24px;${isBulk ? 'border:1px solid #334155;border-radius:12px;padding:20px;' : ''}">
                  ${isBulk ? `<p style="color:#fff;font-size:15px;font-weight:bold;margin:0 0 8px;">${qr.clientName}</p>` : ''}
                  <p style="color:#94a3b8;font-size:13px;margin:0 0 12px;">
                    ${isBulk ? 'QR de entrada:' : 'Presenta este código QR en la entrada:'}
                  </p>
                  <div style="background:#fff;display:inline-block;padding:16px;border-radius:12px;">
                    <img src="cid:${qr.cid}" alt="QR Code" style="width:220px;height:220px;display:block;" />
                  </div>
                </div>
    `).join('')

    // Configure SMTP transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })

    // Send email
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: clientEmail,
      subject: `${isBulk ? `Tus ${entries.length} entradas` : 'Tu entrada'} para ${eventName} - Casa Blanca`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin:0;padding:0;background-color:#1a1a2e;font-family:Arial,sans-serif;">
          <div style="max-width:600px;margin:0 auto;padding:20px;">
            <div style="background:linear-gradient(135deg,#1e293b 0%,#0f172a 100%);border-radius:16px;overflow:hidden;border:1px solid #334155;">
              <!-- Header -->
              <div style="background:linear-gradient(135deg,#1a1a2e 0%,#0f172a 100%);padding:30px 20px;text-align:center;">
                <img src="cid:logo" alt="Casa Blanca" style="width:120px;height:120px;display:inline-block;" />
                <p style="color:#c9a84c;margin:8px 0 0;font-size:14px;letter-spacing:1px;">Confirmación de Entrada${isBulk ? 's' : ''}</p>
              </div>
              
              <!-- Content -->
              <div style="padding:30px 20px;">
                <h2 style="color:#fff;margin:0 0 20px;font-size:20px;text-align:center;">
                  ¡Hola ${firstGuestName}!
                </h2>
                <p style="color:#94a3b8;text-align:center;margin:0 0 24px;font-size:15px;">
                  ${isBulk
                    ? `Tus <strong style="color:#fff;">${entries.length} entradas</strong> para <strong style="color:#fff;">${eventName}</strong> han sido confirmadas.`
                    : `Tu entrada para <strong style="color:#fff;">${eventName}</strong> ha sido confirmada.`
                  }
                </p>
                
                <!-- Details card -->
                <div style="background:#0f172a;border:1px solid #334155;border-radius:12px;padding:20px;margin:0 0 24px;">
                  <table style="width:100%;border-collapse:collapse;">
                    <tr>
                      <td style="padding:8px 0;color:#94a3b8;font-size:14px;">Evento</td>
                      <td style="padding:8px 0;color:#fff;font-size:14px;text-align:right;font-weight:bold;">${eventName}</td>
                    </tr>
                    ${eventDateStr ? `<tr>
                      <td style="padding:8px 0;color:#94a3b8;font-size:14px;">Fecha</td>
                      <td style="padding:8px 0;color:#c9a84c;font-size:14px;text-align:right;font-weight:bold;text-transform:capitalize;">${eventDateStr}</td>
                    </tr>` : ''}
                    <tr>
                      <td style="padding:8px 0;color:#94a3b8;font-size:14px;">Entradas</td>
                      <td style="padding:8px 0;color:#fff;font-size:14px;text-align:right;font-weight:bold;">${entries.length}</td>
                    </tr>
                    <tr>
                      <td style="padding:8px 0;color:#94a3b8;font-size:14px;">Total Pagado</td>
                      <td style="padding:8px 0;color:#3b82f6;font-size:18px;text-align:right;font-weight:bold;">L ${Number(totalPrice).toLocaleString('es-HN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  </table>
                </div>
                
                <!-- QR Codes -->
                ${qrSectionsHtml}
                
                <p style="color:#64748b;text-align:center;font-size:12px;margin:0;">
                  Cada persona debe presentar su QR individual en la entrada.
                </p>
              </div>
              
              <!-- Footer -->
              <div style="border-top:1px solid #334155;padding:20px;text-align:center;">
                <p style="color:#64748b;font-size:12px;margin:0;">
                  Casa Blanca &copy; ${new Date().getFullYear()} · Todos los derechos reservados
                </p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      attachments: [
        {
          filename: 'LogoCasaBlanca.png',
          content: logoBuffer,
          cid: 'logo',
        },
        ...qrData.map((qr) => ({
          filename: `entrada-qr-${qr.clientName.replace(/\s+/g, '-').toLowerCase()}.png`,
          content: Buffer.from(qr.qrBase64, 'base64'),
          cid: qr.cid,
        })),
      ],
    })

    // Mark all entries as email sent
    for (const entry of entries) {
      await markEntryEmailSent(entry.entryId)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[send-entry-email] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Error al enviar el email' },
      { status: 500 }
    )
  }
}

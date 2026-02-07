import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { markEntryEmailSent } from '@/lib/actions'
import { generateQRCode } from '@/lib/utils'
import nodemailer from 'nodemailer'

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions)
    if (!session || !['CAJERO', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const { entryId, qrToken, clientName, clientEmail, numberOfEntries, totalPrice, eventName } = body

    if (!entryId || !qrToken || !clientEmail || !eventName) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
    }

    // Generate QR code with validation URL
    const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const validationUrl = `${appUrl}/entradas/validar/${qrToken}`
    const qrDataUrl = await generateQRCode(validationUrl)

    // Extract base64 from data URL for email attachment
    const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, '')

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
      subject: `Tu entrada para ${eventName} - Casa Blanca`,
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
              <div style="background:linear-gradient(135deg,#3b82f6 0%,#2563eb 100%);padding:30px 20px;text-align:center;">
                <h1 style="color:#fff;margin:0;font-size:24px;">Casa Blanca</h1>
                <p style="color:#e0e7ff;margin:8px 0 0;font-size:14px;">Confirmación de Entrada</p>
              </div>
              
              <!-- Content -->
              <div style="padding:30px 20px;">
                <h2 style="color:#fff;margin:0 0 20px;font-size:20px;text-align:center;">
                  ¡Hola ${clientName}!
                </h2>
                <p style="color:#94a3b8;text-align:center;margin:0 0 24px;font-size:15px;">
                  Tu entrada para <strong style="color:#fff;">${eventName}</strong> ha sido confirmada.
                </p>
                
                <!-- Details card -->
                <div style="background:#0f172a;border:1px solid #334155;border-radius:12px;padding:20px;margin:0 0 24px;">
                  <table style="width:100%;border-collapse:collapse;">
                    <tr>
                      <td style="padding:8px 0;color:#94a3b8;font-size:14px;">Evento</td>
                      <td style="padding:8px 0;color:#fff;font-size:14px;text-align:right;font-weight:bold;">${eventName}</td>
                    </tr>
                    <tr>
                      <td style="padding:8px 0;color:#94a3b8;font-size:14px;">Entradas</td>
                      <td style="padding:8px 0;color:#fff;font-size:14px;text-align:right;font-weight:bold;">${numberOfEntries}</td>
                    </tr>
                    <tr>
                      <td style="padding:8px 0;color:#94a3b8;font-size:14px;">Total Pagado</td>
                      <td style="padding:8px 0;color:#3b82f6;font-size:18px;text-align:right;font-weight:bold;">L ${Number(totalPrice).toLocaleString('es-HN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  </table>
                </div>
                
                <!-- QR Code -->
                <div style="text-align:center;margin:0 0 24px;">
                  <p style="color:#94a3b8;font-size:14px;margin:0 0 12px;">
                    Presenta este código QR en la entrada:
                  </p>
                  <div style="background:#fff;display:inline-block;padding:16px;border-radius:12px;">
                    <img src="cid:qrcode" alt="QR Code" style="width:250px;height:250px;display:block;" />
                  </div>
                </div>
                
                <p style="color:#64748b;text-align:center;font-size:12px;margin:0;">
                  También puedes verificar tu entrada en:<br>
                  <a href="${validationUrl}" style="color:#3b82f6;text-decoration:underline;">${validationUrl}</a>
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
          filename: 'entrada-qr.png',
          content: Buffer.from(qrBase64, 'base64'),
          cid: 'qrcode',
        },
      ],
    })

    // Mark email as sent
    await markEntryEmailSent(entryId)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[send-entry-email] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Error al enviar el email' },
      { status: 500 }
    )
  }
}

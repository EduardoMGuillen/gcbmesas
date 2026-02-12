import { NextRequest, NextResponse } from 'next/server'
import { generateQRCode } from '@/lib/utils'
import { prisma } from '@/lib/prisma'
import nodemailer from 'nodemailer'
import path from 'path'
import fs from 'fs'

const PAYPAL_API_BASE = process.env.PAYPAL_API_BASE || 'https://api-m.sandbox.paypal.com'

function generateToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let token = ''
  for (let i = 0; i < 12; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `E-${token}`
}

async function getPayPalAccessToken() {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID
  const secret = process.env.PAYPAL_CLIENT_SECRET

  if (!clientId || !secret) {
    throw new Error('PayPal credentials not configured')
  }

  const auth = Buffer.from(`${clientId}:${secret}`).toString('base64')
  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  if (!res.ok) throw new Error('PayPal auth failed')
  const data = await res.json()
  return data.access_token as string
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { orderId, eventId, clientName, clientEmail, clientPhone, numberOfEntries } = body

    if (!orderId || !eventId || !clientName || !clientEmail || !numberOfEntries) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
    }

    // Capture PayPal order
    const accessToken = await getPayPalAccessToken()
    const captureRes = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!captureRes.ok) {
      const error = await captureRes.text()
      console.error('[PayPal] Capture error:', error)
      return NextResponse.json({ error: 'Error al capturar el pago de PayPal' }, { status: 500 })
    }

    const captureData = await captureRes.json()

    if (captureData.status !== 'COMPLETED') {
      return NextResponse.json({ error: 'El pago no fue completado' }, { status: 400 })
    }

    // Create entries in database
    const event = await prisma.event.findFirst({
      where: { id: eventId, isActive: true },
    })

    if (!event || !event.paypalPrice) {
      return NextResponse.json({ error: 'Evento no encontrado o sin precio PayPal' }, { status: 404 })
    }

    const entries = []
    for (let i = 0; i < numberOfEntries; i++) {
      const qrToken = generateToken()
      const entry = await prisma.entry.create({
        data: {
          eventId,
          clientName: clientName.trim(),
          clientEmail: clientEmail.trim(),
          clientPhone: clientPhone?.trim() || null,
          numberOfEntries: 1,
          totalPrice: Number(event.paypalPrice),
          qrToken,
        },
        include: { event: true },
      })
      entries.push(entry)
    }

    // Log the sale
    await prisma.log.create({
      data: {
        action: 'ENTRY_SOLD',
        details: {
          eventId,
          clientName,
          clientEmail,
          numberOfEntries,
          totalPrice: Number(event.paypalPrice) * numberOfEntries,
          paypalOrderId: orderId,
          source: 'online_paypal',
        },
      },
    })

    // Send email automatically
    try {
      const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://gcbmesas.vercel.app'
      const eventName = entries[0].event.name
      const eventDate = String(entries[0].event.date)
      const totalPrice = entries.reduce((sum: number, e: any) => sum + Number(e.totalPrice), 0)

      const qrData = await Promise.all(
        entries.map(async (entry: any, i: number) => {
          const validationUrl = `${appUrl}/entradas/validar/${entry.qrToken}`
          const qrDataUrl = await generateQRCode(validationUrl)
          const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, '')
          return { ...entry, validationUrl, qrBase64, cid: `qrcode${i}` }
        })
      )

      const logoPath = path.join(process.cwd(), 'public', 'LogoCasaBlanca.png')
      const logoBuffer = fs.readFileSync(logoPath)

      const eventDateStr = new Date(eventDate).toLocaleDateString('es-HN', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
      })

      const isBulk = entries.length > 1

      const qrSectionsHtml = qrData.map((qr: any) => `
        <div style="text-align:center;margin:0 0 24px;${isBulk ? 'border:1px solid #334155;border-radius:12px;padding:20px;' : ''}">
          ${isBulk ? `<p style="color:#fff;font-size:15px;font-weight:bold;margin:0 0 8px;">${qr.clientName}</p>` : ''}
          <p style="color:#94a3b8;font-size:13px;margin:0 0 12px;">Presenta este código QR en la entrada:</p>
          <div style="background:#fff;display:inline-block;padding:16px;border-radius:12px;">
            <img src="cid:${qr.cid}" alt="QR Code" style="width:220px;height:220px;display:block;" />
          </div>
        </div>
      `).join('')

      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      })

      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: clientEmail,
        subject: `${isBulk ? `Tus ${entries.length} entradas` : 'Tu entrada'} para ${eventName} - Casa Blanca`,
        html: `
          <!DOCTYPE html><html><head><meta charset="utf-8"></head>
          <body style="margin:0;padding:0;background-color:#1a1a2e;font-family:Arial,sans-serif;">
            <div style="max-width:600px;margin:0 auto;padding:20px;">
              <div style="background:linear-gradient(135deg,#1e293b 0%,#0f172a 100%);border-radius:16px;overflow:hidden;border:1px solid #334155;">
                <div style="padding:30px 20px;text-align:center;">
                  <img src="cid:logo" alt="Casa Blanca" style="width:120px;height:120px;display:inline-block;" />
                  <p style="color:#c9a84c;margin:8px 0 0;font-size:14px;letter-spacing:1px;">Confirmacion de Compra Online</p>
                </div>
                <div style="padding:30px 20px;">
                  <h2 style="color:#fff;margin:0 0 20px;font-size:20px;text-align:center;">Hola ${clientName}!</h2>
                  <p style="color:#94a3b8;text-align:center;margin:0 0 24px;font-size:15px;">
                    ${isBulk ? `Tus <strong style="color:#fff;">${entries.length} entradas</strong>` : 'Tu entrada'} para <strong style="color:#fff;">${eventName}</strong> ${isBulk ? 'han sido confirmadas' : 'ha sido confirmada'}.
                  </p>
                  <div style="background:#0f172a;border:1px solid #334155;border-radius:12px;padding:20px;margin:0 0 24px;">
                    <table style="width:100%;border-collapse:collapse;">
                      <tr><td style="padding:8px 0;color:#94a3b8;font-size:14px;">Evento</td><td style="padding:8px 0;color:#fff;font-size:14px;text-align:right;font-weight:bold;">${eventName}</td></tr>
                      <tr><td style="padding:8px 0;color:#94a3b8;font-size:14px;">Fecha</td><td style="padding:8px 0;color:#c9a84c;font-size:14px;text-align:right;font-weight:bold;text-transform:capitalize;">${eventDateStr}</td></tr>
                      <tr><td style="padding:8px 0;color:#94a3b8;font-size:14px;">Entradas</td><td style="padding:8px 0;color:#fff;font-size:14px;text-align:right;font-weight:bold;">${entries.length}</td></tr>
                      <tr><td style="padding:8px 0;color:#94a3b8;font-size:14px;">Total Pagado</td><td style="padding:8px 0;color:#3b82f6;font-size:18px;text-align:right;font-weight:bold;">$${totalPrice.toFixed(2)} USD</td></tr>
                      <tr><td style="padding:8px 0;color:#94a3b8;font-size:14px;">PayPal Order</td><td style="padding:8px 0;color:#64748b;font-size:12px;text-align:right;">${orderId}</td></tr>
                    </table>
                  </div>
                  ${qrSectionsHtml}
                  <p style="color:#64748b;text-align:center;font-size:12px;margin:0;">Presenta tu QR en la entrada.</p>
                </div>
                <div style="border-top:1px solid #334155;padding:20px;text-align:center;">
                  <p style="color:#64748b;font-size:12px;margin:0;">Casa Blanca &copy; ${new Date().getFullYear()}</p>
                </div>
              </div>
            </div>
          </body></html>`,
        attachments: [
          { filename: 'LogoCasaBlanca.png', content: logoBuffer, cid: 'logo' },
          ...qrData.map((qr: any) => ({
            filename: `entrada-qr-${qr.clientName.replace(/\s+/g, '-').toLowerCase()}.png`,
            content: Buffer.from(qr.qrBase64, 'base64'),
            cid: qr.cid,
          })),
        ],
      })

      // Mark entries as email sent
      for (const entry of entries) {
        await prisma.entry.update({
          where: { id: entry.id },
          data: { emailSent: true },
        })
      }
    } catch (emailError: any) {
      console.error('[PayPal] Email send error (payment was successful):', emailError)
    }

    // Return entry data for confirmation UI
    return NextResponse.json({
      success: true,
      entries: entries.map((e: any) => ({
        entryId: e.id,
        qrToken: e.qrToken,
        clientName: e.clientName,
      })),
      clientEmail,
      eventName: entries[0].event.name,
      eventDate: String(entries[0].event.date),
      totalPrice: entries.reduce((sum: number, e: any) => sum + Number(e.totalPrice), 0),
      paypalOrderId: orderId,
    })
  } catch (error: any) {
    console.error('[PayPal] Capture order error:', error)
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 })
  }
}

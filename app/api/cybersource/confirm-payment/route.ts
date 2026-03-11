import { NextRequest, NextResponse } from 'next/server'
import { generateQRCode } from '@/lib/utils'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import nodemailer from 'nodemailer'
import path from 'path'
import fs from 'fs'
import { cyberSourcePost } from '@/lib/cybersource'

function generateToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let token = ''
  for (let i = 0; i < 12; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `E-${token}`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      paymentReference,
      eventId,
      clientEmail,
      numberOfEntries,
      transientToken,
    } = body

    if (!paymentReference || !eventId || !clientEmail || !numberOfEntries) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
    }

    // Until credentials are delivered, only mock confirmations are accepted.
    if (!(process.env.CYBERSOURCE_MOCK === 'true' && String(paymentReference).startsWith('mock_'))) {
      return NextResponse.json(
        { error: 'Confirmación real de CyberSource aún no habilitada. Pendiente de credenciales y firma.' },
        { status: 501 }
      )
    }

    if (!transientToken) {
      return NextResponse.json({ error: 'Falta transient token de Unified Checkout.' }, { status: 400 })
    }

    const recentLogs = await prisma.log.findMany({
      where: {
        action: 'EVENT_UPDATED',
        createdAt: {
          gte: new Date(Date.now() - 1000 * 60 * 60 * 48),
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
    const pendingLog = recentLogs.find((log: any) => {
      const details = log.details as any
      return (
        details?.type === 'CYBERSOURCE_PENDING' &&
        details?.paymentReference === paymentReference &&
        details?.eventId === eventId
      )
    })

    if (!pendingLog) {
      return NextResponse.json({ error: 'No se encontró la orden pendiente de CyberSource' }, { status: 404 })
    }

    const pendingDetails = pendingLog.details as any
    if (pendingDetails?.status === 'PROCESSED') {
      return NextResponse.json(
        { error: 'Esta transacción ya fue procesada anteriormente.' },
        { status: 409 }
      )
    }

    const names: string[] = pendingDetails?.clientNames || []
    if (!names.length) {
      return NextResponse.json({ error: 'Nombres de entradas requeridos' }, { status: 400 })
    }

    const event = await prisma.event.findFirst({
      where: { id: pendingDetails?.eventId || eventId, isActive: true },
    })

    if (!event || !event.paypalPrice) {
      return NextResponse.json({ error: 'Evento no encontrado o sin precio online' }, { status: 404 })
    }

    const paymentResponse = await cyberSourcePost<any>('/pts/v2/payments', {
      clientReferenceInformation: { code: paymentReference },
      processingInformation: {
        commerceIndicator: 'internet',
        capture: true,
      },
      tokenInformation: {
        transientTokenJwt: String(transientToken),
      },
      orderInformation: {
        amountDetails: {
          totalAmount: (Number(event.paypalPrice) * Number(pendingDetails?.numberOfEntries || numberOfEntries)).toFixed(2),
          currency: 'HNL',
        },
        billTo: {
          firstName: names[0]?.split(' ')[0] || 'Cliente',
          lastName: names[0]?.split(' ').slice(1).join(' ') || 'General',
          email: String(pendingDetails?.clientEmail || clientEmail).trim(),
          country: 'HN',
          locality: 'Tegucigalpa',
          address1: 'N/A',
          administrativeArea: 'FM',
          postalCode: '11101',
          phoneNumber: '00000000',
        },
      },
    })

    const status = String(paymentResponse?.status || '').toUpperCase()
    const transactionId = String(paymentResponse?.id || '')
    const reasonCode = String(paymentResponse?.processorInformation?.responseCode || paymentResponse?.errorInformation?.reason || '')
    if (!['AUTHORIZED', 'PENDING', 'AUTHORIZED_PENDING_REVIEW'].includes(status)) {
      await prisma.log.update({
        where: { id: pendingLog.id },
        data: {
          details: {
            ...pendingDetails,
            status: 'REJECTED',
            decision: status || 'REJECTED',
            reasonCode,
            transactionId,
            updatedAt: new Date().toISOString(),
          },
        },
      })
      return NextResponse.json(
        { error: `Pago rechazado por CyberSource (${reasonCode || status || 'sin-codigo'}).` },
        { status: 402 }
      )
    }

    const entries = []
    for (let i = 0; i < Number(pendingDetails?.numberOfEntries || numberOfEntries); i++) {
      const qrToken = generateToken()
      const entryName = (names[i] || names[0]).trim()
      const entry = await prisma.entry.create({
        data: {
          eventId: event.id,
          clientName: entryName,
          clientEmail: String(pendingDetails?.clientEmail || clientEmail).trim(),
          clientPhone: String(pendingDetails?.clientPhone || '').trim() || null,
          numberOfEntries: 1,
          totalPrice: Number(event.coverPrice),
          qrToken,
        },
        include: { event: true },
      })
      entries.push(entry)
    }

    await prisma.log.create({
      data: {
        action: 'ENTRY_SOLD',
        details: {
          eventId: event.id,
          clientNames: names,
          clientEmail: String(pendingDetails?.clientEmail || clientEmail).trim(),
          numberOfEntries: Number(pendingDetails?.numberOfEntries || numberOfEntries),
          totalPrice: Number(event.paypalPrice) * Number(pendingDetails?.numberOfEntries || numberOfEntries),
          paymentReference,
          source: 'online_cybersource',
          currency: 'HNL',
          cybersourceDecision: status,
          cybersourceReasonCode: reasonCode,
          cybersourceTransactionId: transactionId || null,
        },
      },
    })

    await prisma.log.update({
      where: { id: pendingLog.id },
      data: {
        details: {
          ...pendingDetails,
          status: 'PROCESSED',
          decision: status,
          reasonCode,
          transactionId: transactionId || null,
          updatedAt: new Date().toISOString(),
        },
      },
    })

    revalidatePath('/admin/entradas')

    try {
      const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://gcbmesas.vercel.app'
      const eventName = entries[0].event.name
      const eventDate = String(entries[0].event.date)
      const eventCoverImage = event.coverImage
      const totalPriceLps = Number(event.paypalPrice) * entries.length

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
        to: String(pendingDetails?.clientEmail || clientEmail).trim(),
        subject: `${isBulk ? `Tus ${entries.length} entradas` : 'Tu entrada'} para ${eventName} - Casa Blanca`,
        html: `
          <!DOCTYPE html><html><head><meta charset="utf-8"></head>
          <body style="margin:0;padding:0;background-color:#1a1a2e;font-family:Arial,sans-serif;">
            <div style="max-width:600px;margin:0 auto;padding:20px;">
              <div style="background:linear-gradient(135deg,#1e293b 0%,#0f172a 100%);border-radius:16px;overflow:hidden;border:1px solid #334155;">
                ${eventCoverImage ? `<div style="text-align:center;"><img src="${eventCoverImage}" alt="${eventName}" style="width:100%;max-height:250px;object-fit:cover;display:block;" /></div>` : ''}
                <div style="padding:30px 20px;text-align:center;">
                  <img src="cid:logo" alt="Casa Blanca" style="width:100px;height:100px;display:inline-block;" />
                  <p style="color:#c9a84c;margin:8px 0 0;font-size:14px;letter-spacing:1px;">Confirmacion de Compra Online</p>
                </div>
                <div style="padding:30px 20px;">
                  <h2 style="color:#fff;margin:0 0 20px;font-size:20px;text-align:center;">Hola ${names[0]}!</h2>
                  <p style="color:#94a3b8;text-align:center;margin:0 0 24px;font-size:15px;">
                    ${isBulk ? `Tus <strong style="color:#fff;">${entries.length} entradas</strong>` : 'Tu entrada'} para <strong style="color:#fff;">${eventName}</strong> ${isBulk ? 'han sido confirmadas' : 'ha sido confirmada'}.
                  </p>
                  <div style="background:#0f172a;border:1px solid #334155;border-radius:12px;padding:20px;margin:0 0 24px;">
                    <table style="width:100%;border-collapse:collapse;">
                      <tr><td style="padding:8px 0;color:#94a3b8;font-size:14px;">Evento</td><td style="padding:8px 0;color:#fff;font-size:14px;text-align:right;font-weight:bold;">${eventName}</td></tr>
                      <tr><td style="padding:8px 0;color:#94a3b8;font-size:14px;">Fecha</td><td style="padding:8px 0;color:#c9a84c;font-size:14px;text-align:right;font-weight:bold;text-transform:capitalize;">${eventDateStr}</td></tr>
                      <tr><td style="padding:8px 0;color:#94a3b8;font-size:14px;">Entradas</td><td style="padding:8px 0;color:#fff;font-size:14px;text-align:right;font-weight:bold;">${entries.length}</td></tr>
                      <tr><td style="padding:8px 0;color:#94a3b8;font-size:14px;">Total Pagado</td><td style="padding:8px 0;color:#3b82f6;font-size:18px;text-align:right;font-weight:bold;">L ${totalPriceLps.toFixed(2)} HNL</td></tr>
                      <tr><td style="padding:8px 0;color:#94a3b8;font-size:14px;">Referencia</td><td style="padding:8px 0;color:#64748b;font-size:12px;text-align:right;">${paymentReference}</td></tr>
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

      for (const entry of entries) {
        await prisma.entry.update({
          where: { id: entry.id },
          data: { emailSent: true },
        })
      }
    } catch (emailError: any) {
      console.error('[CyberSource] Email send error (payment was successful):', emailError)
    }

    return NextResponse.json({
      success: true,
      entries: entries.map((e: any) => ({
        entryId: e.id,
        qrToken: e.qrToken,
        clientName: e.clientName,
      })),
      clientEmail: String(pendingDetails?.clientEmail || clientEmail).trim(),
      eventName: entries[0].event.name,
      eventDate: String(entries[0].event.date),
      totalPriceLps: Number(event.paypalPrice) * entries.length,
      paymentReference,
    })
  } catch (error: any) {
    console.error('[CyberSource] Confirm payment error:', error)
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 })
  }
}

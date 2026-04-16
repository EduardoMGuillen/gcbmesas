import { Resend } from 'resend'
import nodemailer from 'nodemailer'

export type InlineImageAttachment = {
  filename: string
  content: Buffer
  /** Value referenced in HTML as cid:... (without the `cid:` prefix). */
  cid: string
}

function resolveResendFrom(): string | undefined {
  const v =
    process.env.RESEND_FROM?.trim() ||
    process.env.EMAIL_FROM?.trim() ||
    process.env.SMTP_FROM?.trim() ||
    process.env.SMTP_USER?.trim()
  return v || undefined
}

/**
 * Sends HTML email with inline images (CID). Uses Resend when `RESEND_API_KEY`
 * is set; otherwise falls back to SMTP via Nodemailer.
 */
export async function sendMailWithInlineImages(options: {
  to: string
  subject: string
  html: string
  attachments: InlineImageAttachment[]
}): Promise<void> {
  const { to, subject, html, attachments } = options
  const toTrimmed = to.trim()

  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (apiKey) {
    const from = resolveResendFrom()
    if (!from) {
      throw new Error(
        'Con Resend activo, define RESEND_FROM (ej: Casa Blanca <entradas@tudominio.com>) en Vercel.'
      )
    }

    const resend = new Resend(apiKey)
    const { error } = await resend.emails.send({
      from,
      to: [toTrimmed],
      subject,
      html,
      attachments: attachments.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: 'image/png',
        inlineContentId: a.cid,
      })),
    })

    if (error) {
      const msg =
        typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message?: string }).message)
          : JSON.stringify(error)
      throw new Error(msg || 'Resend: error al enviar')
    }
    return
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: toTrimmed,
    subject,
    html,
    attachments: attachments.map((a) => ({
      filename: a.filename,
      content: a.content,
      cid: a.cid,
    })),
  })
}

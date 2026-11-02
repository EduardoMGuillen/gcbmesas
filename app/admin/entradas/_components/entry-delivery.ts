/** Entrega de entradas: QR, impresión, correo y WhatsApp (movido sin cambios desde EntradasClient). */
import QRCode from 'qrcode'

export async function generateQRDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    width: 300,
    margin: 2,
    color: { dark: '#000000', light: '#FFFFFF' },
  })
}

export function buildPrintHtml(data: {
  entryId: string
  qrToken: string
  clientName: string
  clientEmail: string
  numberOfEntries: number
  totalPrice: number
  eventName: string
  eventDate: string
  qrDataUrl: string
  logoUrl: string
}) {
  const now = new Date()
  const dateStr = now.toLocaleDateString('es-HN', { year: 'numeric', month: 'long', day: 'numeric' })
  const timeStr = now.toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' })
  const eventDateStr = new Date(data.eventDate).toLocaleDateString('es-HN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
  const pricePerEntry = data.totalPrice / data.numberOfEntries

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Entrada - ${data.eventName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', monospace; width: 302px; margin: 0 auto; padding: 16px 12px; color: #000; background: #fff; }
    .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 12px; margin-bottom: 12px; }
    .header img { width: 120px; height: 120px; object-fit: contain; }
    .header p { font-size: 11px; margin-top: 4px; color: #444; }
    .title { text-align: center; font-size: 14px; font-weight: bold; padding: 8px 0; border-bottom: 1px dashed #999; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px; }
    .event-date { text-align: center; font-size: 11px; color: #555; margin-top: -6px; margin-bottom: 10px; text-transform: capitalize; }
    .info-row { display: flex; justify-content: space-between; font-size: 12px; padding: 3px 0; }
    .info-row .label { color: #555; }
    .info-row .value { font-weight: bold; text-align: right; max-width: 60%; }
    .divider { border-top: 1px dashed #999; margin: 10px 0; }
    .items-header { display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; padding: 4px 0; border-bottom: 1px solid #000; }
    .item-row { display: flex; justify-content: space-between; font-size: 12px; padding: 4px 0; }
    .total-section { border-top: 2px solid #000; margin-top: 8px; padding-top: 8px; }
    .total-row { display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; padding: 4px 0; }
    .qr-section { text-align: center; padding: 14px 0; border-top: 1px dashed #999; margin-top: 12px; }
    .qr-section img { width: 180px; height: 180px; }
    .qr-section p { font-size: 10px; color: #666; margin-top: 6px; }
    .footer { text-align: center; border-top: 2px dashed #000; padding-top: 12px; margin-top: 12px; font-size: 11px; color: #555; }
    .footer .thanks { font-size: 13px; font-weight: bold; color: #000; margin-bottom: 4px; }
    @media print { body { width: 100%; padding: 0 8px; } }
  </style>
</head>
<body>
  <div class="header">
    <img src="${data.logoUrl}" alt="Casa Blanca" />
    <p>Comprobante de Entrada</p>
  </div>
  <div class="title">${data.eventName}</div>
  <div class="event-date">${eventDateStr}</div>
  <div class="info-row"><span class="label">Fecha compra:</span><span class="value">${dateStr}</span></div>
  <div class="info-row"><span class="label">Hora:</span><span class="value">${timeStr}</span></div>
  <div class="info-row"><span class="label">No. Transacción:</span><span class="value">${data.entryId.slice(-8).toUpperCase()}</span></div>
  <div class="divider"></div>
  <div class="info-row"><span class="label">Cliente:</span><span class="value">${data.clientName}</span></div>
  <div class="info-row"><span class="label">Email:</span><span class="value" style="font-size:10px">${data.clientEmail}</span></div>
  <div class="divider"></div>
  <div class="items-header"><span>DESCRIPCIÓN</span><span>CANT</span><span>P/U</span><span>TOTAL</span></div>
  <div class="item-row">
    <span style="flex:2">Cover</span>
    <span style="flex:0.5;text-align:center">${data.numberOfEntries}</span>
    <span style="flex:1;text-align:right">L ${pricePerEntry.toFixed(2)}</span>
    <span style="flex:1;text-align:right">L ${data.totalPrice.toFixed(2)}</span>
  </div>
  <div class="total-section">
    <div class="total-row"><span>TOTAL</span><span>L ${data.totalPrice.toLocaleString('es-HN', { minimumFractionDigits: 2 })}</span></div>
  </div>
  <div class="qr-section">
    <img src="${data.qrDataUrl}" alt="QR Code" />
    <p>Presenta este QR en la entrada</p>
  </div>
  <div class="footer">
    <p class="thanks">¡Gracias por tu compra!</p>
    <p>Casa Blanca © ${now.getFullYear()}</p>
  </div>
  <script>window.onload=function(){window.print();}<\/script>
</body>
</html>`
}

export function printHtml(html: string) {
  // Use a hidden iframe to print — avoids the iOS PWA issue where
  // window.open() opens a view with no back/close button.
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.top = '-10000px'
  iframe.style.left = '-10000px'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = 'none'
  document.body.appendChild(iframe)

  const doc = iframe.contentDocument || iframe.contentWindow?.document
  if (!doc) { document.body.removeChild(iframe); return }

  // Strip the auto-print script — we'll trigger print manually
  const cleanHtml = html.replace(/<script>window\.onload=function\(\)\{window\.print\(\);\}<\/script>/g, '')
  doc.open()
  doc.write(cleanHtml)
  doc.close()

  // Wait for images (logo, QR) to load before printing
  const images = Array.from(doc.querySelectorAll('img'))
  const loadPromises = images.map(
    (img) => img.complete ? Promise.resolve() : new Promise<void>((resolve) => { img.onload = () => resolve(); img.onerror = () => resolve() })
  )

  Promise.all(loadPromises).then(() => {
    setTimeout(() => {
      iframe.contentWindow?.print()
      // Clean up after a delay to let the print dialog finish
      setTimeout(() => {
        try { document.body.removeChild(iframe) } catch {}
      }, 1000)
    }, 300)
  })
}

export async function handlePrintEntry(data: {
  entryId: string
  qrToken: string
  clientName: string
  clientEmail: string
  numberOfEntries: number
  totalPrice: number
  eventName: string
  eventDate: string
}) {
  const appUrl = window.location.origin
  const validationUrl = `${appUrl}/entradas/validar/${data.qrToken}`
  const qrDataUrl = await generateQRDataUrl(validationUrl)
  const logoUrl = `${appUrl}/LogoCasaBlanca.png`

  printHtml(buildPrintHtml({ ...data, qrDataUrl, logoUrl }))
}

export async function handleSendEntryEmail(data: {
  entryId: string
  qrToken: string
  clientName: string
  clientEmail: string
  numberOfEntries: number
  totalPrice: number
  eventName: string
  eventDate: string
  venueName?: string | null
  venueAddress?: string | null
}) {
  // Convert single entry to the new multi-entry format
  const res = await fetch('/api/send-entry-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      entries: [{ entryId: data.entryId, qrToken: data.qrToken, clientName: data.clientName }],
      clientEmail: data.clientEmail,
      eventName: data.eventName,
      eventDate: data.eventDate,
      totalPrice: data.totalPrice,
      venueName: data.venueName ?? undefined,
      venueAddress: data.venueAddress ?? undefined,
    }),
  })
  const result = await res.json()
  if (!res.ok) throw new Error(result.error || 'Error al enviar email')
  return result
}

export function buildWhatsAppUrl(data: {
  phone: string
  entries: { qrToken: string; clientName: string }[]
  eventName: string
  eventDate: string
  totalPrice: number
}): string {
  const appUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const eventDateStr = new Date(data.eventDate).toLocaleDateString('es-HN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })

  let message = `🎟️ *Tu entrada para ${data.eventName}*\n`
  message += `📅 ${eventDateStr}\n`
  message += `💰 Total: L ${data.totalPrice.toLocaleString('es-HN', { minimumFractionDigits: 2 })}\n\n`

  if (data.entries.length === 1) {
    const entry = data.entries[0]
    message += `👤 ${entry.clientName}\n`
    message += `🔗 Tu entrada y QR:\n${appUrl}/entradas/validar/${entry.qrToken}\n`
  } else {
    message += `👥 ${data.entries.length} entradas:\n`
    data.entries.forEach((entry, i) => {
      message += `\n${i + 1}. *${entry.clientName}*\n`
      message += `🔗 ${appUrl}/entradas/validar/${entry.qrToken}\n`
    })
  }

  message += `\nPresenta el QR en la entrada. ¡Te esperamos! 🎉`

  // Clean phone: remove spaces, dashes, parentheses
  let phone = data.phone.replace(/[\s\-\(\)]/g, '')
  // If starts with +, remove it (wa.me expects number without +)
  if (phone.startsWith('+')) phone = phone.slice(1)
  // If it's 8 digits (Honduras local), prepend 504
  if (/^\d{8}$/.test(phone)) phone = '504' + phone

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}

import { escapeHtml } from '@/lib/html-escape'

/**
 * Correo de confirmación de entradas (HTML compatible con Gmail, Outlook y Apple Mail).
 * Solo arma el HTML: los QR llegan como adjuntos inline (`cid:`) que prepara quien envía el correo.
 */
export type TicketEmailData = {
  firstName: string
  eventName: string
  eventDateLabel: string
  coverImageUrl: string | null
  venueName: string | null
  venueAddress: string | null
  totalLps: number
  paymentReference: string
  tickets: { holderName: string; qrCid: string; appleWalletUrl?: string | null }[]
  logoUrl?: string
  supportWhatsappUrl?: string
  supportPhoneLabel?: string
  refundPolicyUrl?: string
}

const C = {
  page: '#F4F4F3',
  card: '#FFFFFF',
  ink: '#0A0A0A',
  muted: '#6B6B6B',
  line: '#E7E5E4',
  gold: '#B8913A',
  goldSoft: '#F4ECD8',
}
const FONT = "'Plus Jakarta Sans','Helvetica Neue',Helvetica,Arial,sans-serif"

function lps(n: number) {
  return `L ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function detailRow(label: string, value: string, opts: { strong?: boolean; gold?: boolean } = {}) {
  return `<tr>
    <td style="padding:10px 0;border-bottom:1px solid ${C.line};font:14px ${FONT};color:${C.muted};">${label}</td>
    <td align="right" style="padding:10px 0;border-bottom:1px solid ${C.line};font:${opts.strong ? 700 : 500} ${opts.gold ? 18 : 14}px ${FONT};color:${opts.gold ? C.gold : C.ink};">${value}</td>
  </tr>`
}

function walletButton(url: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:18px auto 0;">
    <tr><td style="border-radius:999px;background:${C.ink};">
      <a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 22px;font:600 14px ${FONT};color:#FFFFFF;text-decoration:none;border-radius:999px;">Agregar a Apple Wallet</a>
    </td></tr>
  </table>`
}

function ticketStub(t: TicketEmailData['tickets'][number], index: number, total: number, eventName: string, dateLabel: string) {
  const counter = total > 1 ? `<p style="margin:0 0 4px;font:600 12px ${FONT};color:${C.gold};">Entrada ${index + 1} de ${total}</p>` : ''
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;border:1px solid ${C.line};border-radius:20px;border-collapse:separate;overflow:hidden;">
    <tr>
      <td style="padding:22px 24px;background:${C.ink};border-radius:20px 20px 0 0;">
        ${counter}
        <p style="margin:0;font:700 18px ${FONT};color:#FFFFFF;">${escapeHtml(t.holderName)}</p>
        <p style="margin:4px 0 0;font:14px ${FONT};color:#BDBDBD;">${escapeHtml(eventName)} &middot; ${escapeHtml(dateLabel)}</p>
      </td>
    </tr>
    <tr>
      <td style="padding:0;border-top:2px dashed ${C.line};line-height:0;font-size:0;">&nbsp;</td>
    </tr>
    <tr>
      <td align="center" style="padding:26px 24px 28px;background:${C.card};border-radius:0 0 20px 20px;">
        <img src="cid:${escapeHtml(t.qrCid)}" width="200" height="200" alt="Código QR de la entrada de ${escapeHtml(t.holderName)}" style="display:block;width:200px;height:200px;border:0;" />
        <p style="margin:14px 0 0;font:13px ${FONT};color:${C.muted};">Muestra este código en la entrada. Cada QR se valida una sola vez.</p>
        ${t.appleWalletUrl ? walletButton(t.appleWalletUrl) : ''}
      </td>
    </tr>
  </table>`
}

export function buildTicketEmailHtml(d: TicketEmailData): string {
  const total = d.tickets.length
  const plural = total > 1
  const dateLabel = cap(d.eventDateLabel)
  const logoUrl = d.logoUrl ?? 'https://gcbtickets.com/gcbtickets/logo-dark.png'
  const supportUrl = d.supportWhatsappUrl ?? 'https://wa.me/50498823627'
  const supportLabel = d.supportPhoneLabel ?? '+504 9882-3627'
  const refundUrl = d.refundPolicyUrl ?? 'https://gcbtickets.com/#reembolsos'
  const title = plural ? `Tus ${total} entradas están confirmadas` : 'Tu entrada está confirmada'
  const preheader = `${title} para ${d.eventName}, ${dateLabel}.`

  const details = [
    detailRow('Evento', escapeHtml(d.eventName), { strong: true }),
    detailRow('Fecha', escapeHtml(dateLabel)),
    d.venueName ? detailRow('Lugar', escapeHtml(d.venueName)) : '',
    d.venueAddress ? detailRow('Dirección', escapeHtml(d.venueAddress)) : '',
    detailRow('Entradas', String(total)),
    detailRow('Total pagado', `${lps(d.totalLps)} HNL`, { strong: true, gold: true }),
    detailRow('Referencia', `<span style="font-size:12px;color:${C.muted};">${escapeHtml(d.paymentReference)}</span>`),
  ].join('')

  return `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="color-scheme" content="light only" />
<title>${escapeHtml(title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
</head>
<body style="margin:0;padding:0;background:${C.page};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.page};">
<tr><td align="center" style="padding:32px 12px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
    <tr><td align="center" style="padding:0 0 22px;">
      <img src="${escapeHtml(logoUrl)}" width="172" alt="GCBTickets" style="display:block;width:172px;height:auto;border:0;" />
    </td></tr>

    <tr><td style="background:${C.card};border-radius:28px;overflow:hidden;border:1px solid ${C.line};">
      ${
        d.coverImageUrl
          ? `<img src="${escapeHtml(d.coverImageUrl)}" width="600" alt="${escapeHtml(d.eventName)}" style="display:block;width:100%;max-width:600px;height:auto;max-height:340px;object-fit:cover;border:0;border-radius:28px 28px 0 0;" />`
          : ''
      }
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td style="padding:34px 32px 8px;">
          <p style="margin:0;display:inline-block;padding:6px 12px;border-radius:999px;background:${C.goldSoft};font:600 12px ${FONT};color:${C.gold};">&#10003; Pago aprobado</p>
          <h1 style="margin:16px 0 0;font:800 28px/1.15 ${FONT};color:${C.ink};letter-spacing:-0.02em;">${escapeHtml(title)}</h1>
          <p style="margin:12px 0 0;font:16px/1.6 ${FONT};color:${C.muted};">Hola ${escapeHtml(d.firstName)}, ${plural ? 'aquí están tus entradas' : 'aquí está tu entrada'} para <strong style="color:${C.ink};">${escapeHtml(d.eventName)}</strong>. Guarda este correo: ${plural ? 'cada QR es' : 'el QR es'} tu acceso al evento.</p>
        </td></tr>

        <tr><td style="padding:22px 32px 6px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${details}</table>
        </td></tr>

        <tr><td style="padding:28px 32px 10px;">
          ${d.tickets.map((t, i) => ticketStub(t, i, total, d.eventName, dateLabel)).join('')}
        </td></tr>

        <tr><td style="padding:0 32px 32px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.page};border-radius:18px;">
            <tr><td style="padding:20px 22px;font:14px/1.6 ${FONT};color:${C.muted};">
              <strong style="color:${C.ink};">¿Necesitas ayuda?</strong> Escríbenos por
              <a href="${escapeHtml(supportUrl)}" style="color:${C.gold};font-weight:600;text-decoration:none;">WhatsApp ${escapeHtml(supportLabel)}</a>
              con el nombre y correo de tu compra.<br />
              Las entradas no son reembolsables salvo cancelación del evento.
              <a href="${escapeHtml(refundUrl)}" style="color:${C.ink};text-decoration:underline;">Ver política de reembolso</a>.
            </td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr>

    <tr><td align="center" style="padding:24px 12px 0;font:12px/1.6 ${FONT};color:#9A9A9A;">
      GCBTickets &middot; La ticketera de Honduras<br />
      Powered by <a href="https://www.nexusglobalsuministros.com/" style="color:${C.gold};text-decoration:none;">Nexus Global</a>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`
}

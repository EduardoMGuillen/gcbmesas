import { sendMailWithInlineImages } from './send-mail'
import { formatCurrency } from './utils'
import { escapeHtml } from './html-escape'
import { PAYMENT_METHOD_LABELS } from './ops-constants'
import { venueZoneLabel } from './venue-zones'

export const CASH_ARQUEO_MAIL_TO = 'eduardoguillendev@proton.me'

function hnStamp(date: Date) {
  return new Intl.DateTimeFormat('es-HN', {
    timeZone: 'America/Tegucigalpa',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}

function hnDate(date: Date) {
  return new Intl.DateTimeFormat('es-HN', {
    timeZone: 'America/Tegucigalpa',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

function row(label: string, value: string) {
  return `<tr>
    <td style="padding:8px 0;color:#94a3b8;font-size:14px;">${escapeHtml(label)}</td>
    <td style="padding:8px 0;color:#fff;font-size:14px;text-align:right;font-weight:bold;">${escapeHtml(value)}</td>
  </tr>`
}

function wrap(title: string, bodyRows: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:#1a1a2e;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:#0f172a;border-radius:16px;overflow:hidden;border:1px solid #334155;">
      <div style="padding:24px 20px;text-align:center;border-bottom:1px solid #334155;">
        <p style="color:#c9a84c;margin:0;font-size:13px;letter-spacing:1px;">GRAN CASA BLANCA</p>
        <h1 style="color:#fff;margin:8px 0 0;font-size:20px;">${escapeHtml(title)}</h1>
      </div>
      <div style="padding:24px 20px;">
        <table style="width:100%;border-collapse:collapse;">${bodyRows}</table>
      </div>
    </div>
  </div>
</body></html>`
}

export async function sendCashArqueoClosedMail(data: {
  registerName: string
  venueZone?: string | null
  openedAt: Date
  closedAt: Date
  openingFloat: number
  salesCash: number
  salesPosFicohsa: number
  salesPosBac: number
  salesTransfer: number
  countedCash: number
  systemTotal: number
  difference: number
  accountCount: number
  byMethod: Record<string, number>
  deliveredByName?: string | null
  receivedByName?: string | null
  openedBy: string
  closedBy: string
  notes?: string | null
}) {
  const date = hnDate(data.closedAt)
  const declared =
    data.salesCash + data.salesPosFicohsa + data.salesPosBac + data.salesTransfer
  const subject = `Arqueo de caja "${data.registerName}" ${date} — Cierre`
  const methodRows = Object.entries(data.byMethod)
    .filter(([, amount]) => amount)
    .map(([method, amount]) =>
      row(
        `Sistema ${PAYMENT_METHOD_LABELS[method as keyof typeof PAYMENT_METHOD_LABELS] || method}`,
        formatCurrency(amount)
      )
    )
    .join('')

  const html = wrap('Cierre / arqueo', [
    row('Caja', data.registerName),
    row('Zona', venueZoneLabel(data.venueZone) || '—'),
    row('Apertura', hnStamp(data.openedAt)),
    row('Cierre', hnStamp(data.closedAt)),
    row('Fondo', formatCurrency(data.openingFloat)),
    row('Ventas efectivo', formatCurrency(data.salesCash)),
    row('POS Ficohsa', formatCurrency(data.salesPosFicohsa)),
    row('POS BAC', formatCurrency(data.salesPosBac)),
    row('Transferencias', formatCurrency(data.salesTransfer)),
    row('Total declarado', formatCurrency(declared)),
    row('Efectivo contado', formatCurrency(data.countedCash)),
    row('Total sistema', formatCurrency(data.systemTotal)),
    row('Sobrante / faltante', formatCurrency(data.difference)),
    row('Cuentas en sesión', String(data.accountCount)),
    methodRows,
    row('Entrega', data.deliveredByName || '—'),
    row('Recibe', data.receivedByName || '—'),
    row('Abrió', data.openedBy),
    row('Cerró', data.closedBy),
    row('Observaciones', data.notes || '—'),
  ].join(''))

  await sendMailWithInlineImages({
    to: CASH_ARQUEO_MAIL_TO,
    subject,
    html,
  })
}

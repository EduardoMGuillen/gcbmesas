import { formatCurrency } from '@/lib/utils'
import { printInvoiceHtml } from '@/lib/invoice-print-basic'

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export type InvoiceSettingsLike = {
  invoiceLegalName?: string | null
  invoiceTradeName?: string | null
  invoiceRtn?: string | null
  invoiceAddress?: string | null
  invoicePhone?: string | null
  invoiceEmail?: string | null
  invoiceCaiBlock?: string | null
  invoiceFooterNote?: string | null
  invoiceIsvPercent?: unknown | null
}

function isvPercent(settings: InvoiceSettingsLike | null): number {
  const v = settings?.invoiceIsvPercent
  if (v == null) return 15
  const n = typeof v === 'object' && v !== null && 'toNumber' in v ? (v as { toNumber(): number }).toNumber() : Number(v)
  return Number.isFinite(n) && n >= 0 ? n : 15
}

/** Convierte entero HNL a texto (simplificado, hasta millones). */
export function amountToSpanishWordsHn(value: number): string {
  const n = Math.floor(Math.abs(value))
  if (n === 0) return 'cero lempiras con 00/100'

  const unidades = [
    '',
    'uno',
    'dos',
    'tres',
    'cuatro',
    'cinco',
    'seis',
    'siete',
    'ocho',
    'nueve',
    'diez',
    'once',
    'doce',
    'trece',
    'catorce',
    'quince',
    'dieciséis',
    'diecisiete',
    'dieciocho',
    'diecinueve',
    'veinte',
  ]
  const decenas = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa']
  const centenas = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos']

  function under100(x: number): string {
    if (x < 21) return unidades[x]
    if (x < 30) return `veinti${unidades[x - 20]}`
    const d = Math.floor(x / 10)
    const u = x % 10
    return `${decenas[d]}${u ? ` y ${unidades[u]}` : ''}`.trim()
  }

  function under1000(x: number): string {
    if (x < 100) return under100(x)
    const c = Math.floor(x / 100)
    const rest = x % 100
    const cPart = c === 1 && rest === 0 ? 'cien' : centenas[c]
    return `${cPart}${rest ? ` ${under100(rest)}` : ''}`.trim()
  }

  function chunk(n: number): string {
    if (n < 1000) return under1000(n)
    if (n < 1_000_000) {
      const mil = Math.floor(n / 1000)
      const r = n % 1000
      const mTxt = mil === 1 ? 'mil' : `${under1000(mil)} mil`
      return `${mTxt}${r ? ` ${under1000(r)}` : ''}`.trim()
    }
    const mill = Math.floor(n / 1_000_000)
    const r = n % 1_000_000
    return `${under1000(mill)} millón${mill > 1 ? 'es' : ''}${r ? ` ${chunk(r)}` : ''}`.trim()
  }

  const cents = Math.round((Math.abs(value) - n) * 100)
  const main = chunk(n)
  return `${main} lempiras con ${String(cents).padStart(2, '0')}/100`
}

export type HnInvoiceLine = {
  description: string
  quantity: number
  unitPrice: number
  lineTotal: number
  taxExempt: boolean
}

export function buildHnInvoiceHtml(opts: {
  logoUrl: string
  documentTitle: string
  ref: string
  settings: InvoiceSettingsLike | null
  receptorLines: string[]
  lines: HnInvoiceLine[]
  footerNote?: string
}): string {
  const pct = isvPercent(opts.settings)
  const trade = opts.settings?.invoiceTradeName?.trim() || 'La Gran Casa Blanca'
  const legal = opts.settings?.invoiceLegalName?.trim()
  const rtn = opts.settings?.invoiceRtn?.trim()
  const addr = opts.settings?.invoiceAddress?.trim()
  const phone = opts.settings?.invoicePhone?.trim()
  const email = opts.settings?.invoiceEmail?.trim()
  const caiBlock = opts.settings?.invoiceCaiBlock?.trim()
  const foot = opts.settings?.invoiceFooterNote?.trim()

  let gravado = 0
  let exento = 0
  for (const l of opts.lines) {
    if (l.taxExempt) exento += l.lineTotal
    else gravado += l.lineTotal
  }
  const isv = gravado * (pct / 100)
  const total = gravado + exento + isv
  const now = new Date()
  const dateStr = now.toLocaleDateString('es-HN', { year: 'numeric', month: 'long', day: 'numeric' })
  const timeStr = now.toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' })

  const rows = opts.lines
    .map(
      (l) => `<tr>
    <td style="padding:6px;border:1px solid #ccc;text-align:center">${l.quantity}</td>
    <td style="padding:6px;border:1px solid #ccc">${escapeHtml(l.description)}</td>
    <td style="padding:6px;border:1px solid #ccc;text-align:right">${formatCurrency(l.unitPrice)}</td>
    <td style="padding:6px;border:1px solid #ccc;text-align:center">${l.taxExempt ? 'E' : 'G'}</td>
    <td style="padding:6px;border:1px solid #ccc;text-align:right">${formatCurrency(l.lineTotal)}</td>
  </tr>`
    )
    .join('')

  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"/><title>${escapeHtml(opts.documentTitle)}</title>
<style>
  body{font-family:Georgia,serif;color:#111;margin:0;padding:20px;max-width:800px;margin:0 auto;background:#fff}
  .hdr{display:flex;justify-content:space-between;gap:16px;border-bottom:2px solid #0f172a;padding-bottom:12px;margin-bottom:12px}
  .hdr img{width:96px;height:auto}
  .emisor{font-size:12px;line-height:1.5}
  h1{font-size:18px;margin:8px 0;text-transform:uppercase;letter-spacing:.04em}
  table{width:100%;border-collapse:collapse;font-size:12px;margin-top:10px}
  th{background:#f1f5f9;padding:8px;border:1px solid #94a3b8;text-align:left}
  .tot{font-size:13px;margin-top:12px;max-width:320px;margin-left:auto}
  .tot div{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #e2e8f0}
  .tot .b{font-weight:700;font-size:14px;border:none;margin-top:6px}
  .cai{font-size:11px;white-space:pre-wrap;margin-top:14px;color:#334155}
  .pie{font-size:10px;color:#64748b;margin-top:16px;text-align:center;border-top:1px dashed #94a3b8;padding-top:8px}
  @media print{body{padding:12px}}
</style></head><body>
<div class="hdr">
  <div class="emisor">
    <strong style="font-size:15px">${escapeHtml(trade)}</strong>
    ${legal ? `<div>${escapeHtml(legal)}</div>` : ''}
    ${rtn ? `<div>RTN: ${escapeHtml(rtn)}</div>` : ''}
    ${addr ? `<div>${escapeHtml(addr)}</div>` : ''}
    ${phone ? `<div>Tel: ${escapeHtml(phone)}</div>` : ''}
    ${email ? `<div>${escapeHtml(email)}</div>` : ''}
  </div>
  <img src="${escapeHtml(opts.logoUrl)}" alt="Logo" />
</div>
<h1>${escapeHtml(opts.documentTitle)}</h1>
<div style="font-size:12px;margin-bottom:10px"><strong>Ref.:</strong> ${escapeHtml(opts.ref)} · <strong>Fecha:</strong> ${dateStr} ${timeStr}</div>
<div style="font-size:12px;line-height:1.6;margin-bottom:12px">
  ${opts.receptorLines.map((l) => `<div>${escapeHtml(l)}</div>`).join('')}
</div>
<table><thead><tr>
  <th style="width:48px">Cant.</th><th>Descripción</th><th style="width:90px">P. unit.</th><th style="width:40px">G/E</th><th style="width:100px">Total</th>
</tr></thead><tbody>${rows}</tbody></table>
<div class="tot">
  <div><span>Subtotal gravado (${pct}%)</span><span>${formatCurrency(gravado)}</span></div>
  <div><span>Subtotal exento</span><span>${formatCurrency(exento)}</span></div>
  <div><span>ISV (${pct}%)</span><span>${formatCurrency(isv)}</span></div>
  <div class="b"><span>Total</span><span>${formatCurrency(total)}</span></div>
</div>
<div style="font-size:11px;margin-top:10px;font-style:italic">${escapeHtml(amountToSpanishWordsHn(total))}</div>
${caiBlock ? `<div class="cai">${escapeHtml(caiBlock)}</div>` : ''}
<div class="pie">${escapeHtml(opts.footerNote || foot || 'Documento informativo. Correlativo SAR no incluido hasta numeración oficial.')}</div>
</body></html>`
}

export function printHnInvoice(html: string) {
  printInvoiceHtml(html)
}

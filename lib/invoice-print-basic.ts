import { formatCurrency } from '@/lib/utils'

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export type AccountPrecuentaLine = {
  quantity: number
  productName: string
  lineTotal: number
  served: boolean
  rejected?: boolean
}

export type AccountPrecuentaInput = {
  logoUrl: string
  tableName: string
  tableShortCode: string
  zone?: string | null
  clientName?: string | null
  meseroLabel: string
  accountOpenedAt: string | Date
  initialBalance: number
  currentBalance: number
  lines: AccountPrecuentaLine[]
}

function num(v: string | number | { toString(): string }): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string') return parseFloat(v) || 0
  return parseFloat(v.toString()) || 0
}

/** HTML para precuenta / comprobante de cuenta (impresión básica). */
export function buildAccountPrecuentaHtml(data: AccountPrecuentaInput): string {
  const now = new Date()
  const dateStr = now.toLocaleDateString('es-HN', { year: 'numeric', month: 'long', day: 'numeric' })
  const timeStr = now.toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' })
  const openedStr = new Date(data.accountOpenedAt).toLocaleString('es-HN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const subtotalPedidos = data.lines
    .filter((l) => !l.rejected)
    .reduce((s, l) => s + l.lineTotal, 0)

  const consumed = data.initialBalance - data.currentBalance

  const rowsHtml = data.lines
    .map((l) => {
      const status = l.rejected ? 'Rechazado' : l.served ? 'Aceptado' : 'Pendiente caja'
      const rowStyle = l.rejected ? 'text-decoration:line-through;opacity:0.75' : ''
      const unit = l.quantity > 0 ? l.lineTotal / l.quantity : 0
      return `<tr style="${rowStyle}">
        <td style="padding:8px 6px;border-bottom:1px solid #ddd;text-align:center">${l.quantity}</td>
        <td style="padding:8px 6px;border-bottom:1px solid #ddd">${escapeHtml(l.productName)}</td>
        <td style="padding:8px 6px;border-bottom:1px solid #ddd;text-align:right">${formatCurrency(unit)}</td>
        <td style="padding:8px 6px;border-bottom:1px solid #ddd;text-align:right">${formatCurrency(l.lineTotal)}</td>
        <td style="padding:8px 6px;border-bottom:1px solid #ddd;font-size:11px">${status}</td>
      </tr>`
    })
    .join('')

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Precuenta — ${escapeHtml(data.tableShortCode)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; color: #111; background: #fff; margin: 0; padding: 24px; max-width: 720px; margin-left: auto; margin-right: auto; }
    .header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; border-bottom: 2px solid #1e293b; padding-bottom: 16px; margin-bottom: 16px; }
    .header img { width: 100px; height: auto; object-fit: contain; }
    .title { font-size: 20px; font-weight: 700; margin: 0 0 4px 0; }
    .subtitle { font-size: 13px; color: #444; margin: 0; }
    .meta { font-size: 13px; margin: 16px 0; line-height: 1.6; }
    .meta strong { color: #000; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 8px; }
    th { text-align: left; padding: 10px 6px; border-bottom: 2px solid #1e293b; background: #f8fafc; }
    th:nth-child(1), td:nth-child(1) { text-align: center; width: 48px; }
    th:nth-child(3), th:nth-child(4), td:nth-child(3), td:nth-child(4) { text-align: right; }
    .totals { margin-top: 20px; font-size: 14px; max-width: 280px; margin-left: auto; }
    .totals-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e2e8f0; }
    .totals-row.bold { font-weight: 700; font-size: 15px; border-bottom: none; margin-top: 4px; }
    .footer { margin-top: 28px; padding-top: 12px; border-top: 1px dashed #94a3b8; font-size: 11px; color: #64748b; text-align: center; }
    @media print { body { padding: 12px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="title">Precuenta / Comprobante</h1>
      <p class="subtitle">La Gran Casa Blanca</p>
    </div>
    <img src="${escapeHtml(data.logoUrl)}" alt="Casa Blanca" width="100" height="100" />
  </div>
  <div class="meta">
    <div><strong>Mesa:</strong> ${escapeHtml(data.tableShortCode)} — ${escapeHtml(data.tableName)}${data.zone ? ` · Zona: ${escapeHtml(data.zone)}` : ''}</div>
    <div><strong>Cuenta abierta:</strong> ${openedStr}</div>
    <div><strong>Impreso:</strong> ${dateStr} ${timeStr}</div>
    ${data.clientName ? `<div><strong>Cliente:</strong> ${escapeHtml(data.clientName)}</div>` : ''}
    <div><strong>Mesero:</strong> ${escapeHtml(data.meseroLabel)}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Cant.</th>
        <th>Descripción</th>
        <th>P. unit.</th>
        <th>Total</th>
        <th>Estado</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || '<tr><td colspan="5" style="padding:16px;text-align:center;color:#64748b">Sin líneas de pedido</td></tr>'}
    </tbody>
  </table>
  <div class="totals">
    <div class="totals-row"><span>Subtotal pedidos (no rechazados)</span><span>${formatCurrency(subtotalPedidos)}</span></div>
    <div class="totals-row"><span>Saldo inicial cuenta</span><span>${formatCurrency(data.initialBalance)}</span></div>
    <div class="totals-row"><span>Saldo disponible</span><span>${formatCurrency(data.currentBalance)}</span></div>
    <div class="totals-row bold"><span>Consumido (inicial − disponible)</span><span>${formatCurrency(consumed)}</span></div>
  </div>
  <div class="footer">
    Documento informativo. No constituye factura fiscal. Verificar totales con el sistema.
  </div>
</body>
</html>`
}

/** Imprime HTML en un iframe oculto (mismo enfoque que entradas; evita problemas en iOS/PWA). */
export function printInvoiceHtml(html: string): void {
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.top = '-10000px'
  iframe.style.left = '-10000px'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = 'none'
  document.body.appendChild(iframe)

  const doc = iframe.contentDocument || iframe.contentWindow?.document
  if (!doc) {
    document.body.removeChild(iframe)
    return
  }

  const cleanHtml = html.replace(/<script>[\s\S]*?<\/script>/gi, '')
  doc.open()
  doc.write(cleanHtml)
  doc.close()

  const images = Array.from(doc.querySelectorAll('img'))
  const loadPromises = images.map(
    (img) =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            img.onload = () => resolve()
            img.onerror = () => resolve()
          })
  )

  void Promise.all(loadPromises).then(() => {
    setTimeout(() => {
      iframe.contentWindow?.print()
      setTimeout(() => {
        try {
          document.body.removeChild(iframe)
        } catch {
          /* ignore */
        }
      }, 1000)
    }, 300)
  })
}

export function buildPrecuentaInputFromAccount(
  account: {
    id: string
    table: { name: string; shortCode: string; zone?: string | null }
    initialBalance: string | number | { toString(): string }
    currentBalance: string | number | { toString(): string }
    createdAt: string | Date
    openedBy?: { id: string; name: string | null; username: string } | null
    clientName?: string | null
    orders: Array<{
      quantity: number
      price: string | number | { toString(): string }
      served: boolean
      rejected?: boolean
      product: { name: string; price?: string | number | { toString(): string } }
    }>
  },
  origin: string
): AccountPrecuentaInput {
  const meseroLabel =
    account.openedBy?.name?.trim() ||
    account.openedBy?.username ||
    '—'

  const lines: AccountPrecuentaLine[] = account.orders.map((o) => ({
    quantity: o.quantity,
    productName: o.product.name,
    lineTotal: num(o.price),
    served: o.served,
    rejected: o.rejected === true,
  }))

  return {
    logoUrl: `${origin.replace(/\/$/, '')}/LogoCasaBlanca.png`,
    tableName: account.table.name,
    tableShortCode: account.table.shortCode,
    zone: account.table.zone,
    clientName: account.clientName,
    meseroLabel,
    accountOpenedAt: account.createdAt,
    initialBalance: num(account.initialBalance),
    currentBalance: num(account.currentBalance),
    lines,
  }
}

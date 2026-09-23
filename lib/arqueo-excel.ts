import ExcelJS from 'exceljs'
import { PAYMENT_METHOD_LABELS } from './ops-constants'
import { venueZoneLabel } from './venue-zones'

const GOLD = 'FFC9A84C'
const NAVY = 'FF0F172A'
const NAVY2 = 'FF1E293B'
const WHITE = 'FFFFFFFF'
const INK = 'FF0F172A'
const MUTED = 'FF475569'
const LINE = 'FFE2E8F0'
const ZEBRA = 'FFF8FAFC'
const GREEN = 'FF047857'
const RED = 'FFB91C1C'

export type ArqueoAccountRow = {
  clientName: string | null
  initialBalance: unknown
  currentBalance: unknown
  paymentMethod: string | null
  closedAt: Date | string | null
  table: { name: string; zone: string | null; shortCode: string }
}

export type ArqueoSessionRow = {
  status: string
  openedAt: Date | string
  closedAt?: Date | string | null
  openingFloat: unknown
  salesCash?: unknown
  salesPosFicohsa?: unknown
  salesPosBac?: unknown
  salesTransfer?: unknown
  countedCash?: unknown
  systemTotal?: unknown
  difference?: unknown
  notes?: string | null
  deliveredByName?: string | null
  receivedByName?: string | null
  register: { name: string; venueZone?: string | null }
  openedBy?: { name: string | null; username: string } | null
  closedBy?: { name: string | null; username: string } | null
  accounts: ArqueoAccountRow[]
}

function money(value: unknown) {
  const n = Number(value)
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0
}

function hnDateTime(value: Date | string | null | undefined) {
  if (!value) return '—'
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('es-HN', {
    timeZone: 'America/Tegucigalpa',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d)
}

function hnDate(value: Date | string | null | undefined) {
  if (!value) return ''
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('es-HN', {
    timeZone: 'America/Tegucigalpa',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
}

function person(user?: { name: string | null; username: string } | null) {
  return user?.name || user?.username || '—'
}

function payLabel(method: string | null) {
  if (!method) return 'Sin método'
  return PAYMENT_METHOD_LABELS[method as keyof typeof PAYMENT_METHOD_LABELS] || method
}

function fill(cell: ExcelJS.Cell, argb: string) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } }
}

function font(cell: ExcelJS.Cell, opts: Partial<ExcelJS.Font> = {}) {
  cell.font = { name: 'Calibri', size: 11, color: { argb: INK }, ...opts }
}

function border(cell: ExcelJS.Cell) {
  const edge: ExcelJS.Border = { style: 'thin', color: { argb: LINE } }
  cell.border = { top: edge, left: edge, bottom: edge, right: edge }
}

function moneyCell(cell: ExcelJS.Cell, value: number | '') {
  cell.value = value === '' ? '' : value
  cell.numFmt = '"L"#,##0.00'
  cell.alignment = { horizontal: 'right', vertical: 'middle' }
}

function headerBar(sheet: ExcelJS.Worksheet, lastCol: number, title: string, subtitle: string) {
  sheet.mergeCells(1, 1, 1, lastCol)
  const brand = sheet.getCell(1, 1)
  brand.value = 'GRAN CASA BLANCA'
  fill(brand, NAVY)
  font(brand, { bold: true, size: 12, color: { argb: GOLD } })
  brand.alignment = { horizontal: 'center', vertical: 'middle' }
  sheet.getRow(1).height = 22

  sheet.mergeCells(2, 1, 2, lastCol)
  const head = sheet.getCell(2, 1)
  head.value = title
  fill(head, NAVY2)
  font(head, { bold: true, size: 16, color: { argb: WHITE } })
  head.alignment = { horizontal: 'center', vertical: 'middle' }
  sheet.getRow(2).height = 28

  sheet.mergeCells(3, 1, 3, lastCol)
  const sub = sheet.getCell(3, 1)
  sub.value = subtitle
  fill(sub, GOLD)
  font(sub, { bold: true, size: 11, color: { argb: NAVY } })
  sub.alignment = { horizontal: 'center', vertical: 'middle' }
  sheet.getRow(3).height = 20
}

function tableHeader(sheet: ExcelJS.Worksheet, row: number, labels: string[]) {
  labels.forEach((label, i) => {
    const cell = sheet.getCell(row, i + 1)
    cell.value = label
    fill(cell, NAVY)
    font(cell, { bold: true, size: 10, color: { argb: WHITE } })
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    border(cell)
  })
  sheet.getRow(row).height = 22
}

function addSingleReport(wb: ExcelJS.Workbook, session: ArqueoSessionRow) {
  const sheet = wb.addWorksheet('Arqueo', {
    pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 1 },
  })
  sheet.columns = [{ width: 28 }, { width: 22 }, { width: 22 }, { width: 22 }]
  const dateLabel = hnDate(session.closedAt || session.openedAt)
  const zone = venueZoneLabel(session.register.venueZone) || 'Sin zona'
  headerBar(sheet, 4, 'ARQUEO DE CAJA', `${session.register.name}  ·  ${dateLabel}`)

  const cash = money(session.salesCash)
  const ficohsa = money(session.salesPosFicohsa)
  const bac = money(session.salesPosBac)
  const transfer = money(session.salesTransfer)
  const declared = cash + ficohsa + bac + transfer
  const difference = session.difference == null ? null : money(session.difference)

  const kv = (r: number, label: string, value: string | number, moneyFmt = false) => {
    const l = sheet.getCell(r, 1)
    const v = sheet.getCell(r, 2)
    sheet.mergeCells(r, 2, r, 4)
    l.value = label
    fill(l, ZEBRA)
    font(l, { bold: true, size: 11, color: { argb: MUTED } })
    border(l)
    if (moneyFmt && typeof value === 'number') moneyCell(v, value)
    else {
      v.value = value
      v.alignment = { horizontal: 'right', vertical: 'middle', wrapText: true }
    }
    font(v, { bold: true, size: 11 })
    border(v)
    sheet.getRow(r).height = 20
  }

  kv(5, 'Estado', session.status === 'OPEN' ? 'Abierta' : 'Cerrada')
  kv(6, 'Zona', zone)
  kv(7, 'Apertura', hnDateTime(session.openedAt))
  kv(8, 'Cierre', hnDateTime(session.closedAt))
  kv(9, 'Fondo asignado', money(session.openingFloat), true)
  kv(10, 'Entrega', session.deliveredByName || '—')
  kv(11, 'Recibe', session.receivedByName || '—')
  kv(12, 'Abrió', person(session.openedBy))
  kv(13, 'Cerró', person(session.closedBy))

  sheet.mergeCells(15, 1, 15, 4)
  const ventas = sheet.getCell(15, 1)
  ventas.value = 'VENTAS DECLARADAS'
  fill(ventas, NAVY)
  font(ventas, { bold: true, color: { argb: WHITE } })
  ventas.alignment = { horizontal: 'center' }

  kv(16, 'Efectivo', cash, true)
  kv(17, 'POS Ficohsa', ficohsa, true)
  kv(18, 'POS BAC', bac, true)
  kv(19, 'Transferencias', transfer, true)
  kv(20, 'Total declarado', declared, true)

  sheet.mergeCells(22, 1, 22, 4)
  const arqueo = sheet.getCell(22, 1)
  arqueo.value = 'ARQUEO'
  fill(arqueo, NAVY)
  font(arqueo, { bold: true, color: { argb: WHITE } })
  arqueo.alignment = { horizontal: 'center' }

  kv(23, 'Efectivo contado', session.countedCash == null ? '—' : money(session.countedCash), session.countedCash != null)
  kv(24, 'Total sistema', session.systemTotal == null ? '—' : money(session.systemTotal), session.systemTotal != null)
  kv(25, 'Sobrante / faltante', difference == null ? '—' : difference, difference != null)
  if (difference != null) {
    const cell = sheet.getCell(25, 2)
    font(cell, { bold: true, color: { argb: difference === 0 ? GREEN : RED } })
  }
  kv(26, 'Cuentas en sesión', session.accounts.length)
  kv(27, 'Observaciones', session.notes || '—')

  if (session.accounts.length > 0) {
    sheet.mergeCells(29, 1, 29, 4)
    const accHead = sheet.getCell(29, 1)
    accHead.value = 'CUENTAS DE ESTA CAJA'
    fill(accHead, GOLD)
    font(accHead, { bold: true, color: { argb: NAVY } })
    accHead.alignment = { horizontal: 'center' }
    tableHeader(sheet, 30, ['Mesa', 'Zona', 'Pago', 'Consumo'])
    session.accounts.forEach((a, i) => {
      const r = 31 + i
      const consumed = money(a.initialBalance) - money(a.currentBalance)
      const values = [a.table.name, venueZoneLabel(a.table.zone) || a.table.zone || '—', payLabel(a.paymentMethod)]
      values.forEach((val, c) => {
        const cell = sheet.getCell(r, c + 1)
        cell.value = val
        font(cell, { size: 10 })
        border(cell)
        if (i % 2 === 1) fill(cell, ZEBRA)
      })
      const m = sheet.getCell(r, 4)
      moneyCell(m, consumed)
      font(m, { size: 10 })
      border(m)
      if (i % 2 === 1) fill(m, ZEBRA)
    })
  }
}

function addListSheet(wb: ExcelJS.Workbook, sessions: ArqueoSessionRow[], subtitle: string) {
  const sheet = wb.addWorksheet('Arqueos', {
    views: [{ state: 'frozen', ySplit: 4 }],
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
  })
  const headers = [
    'Caja',
    'Zona',
    'Estado',
    'Apertura',
    'Cierre',
    'Fondo',
    'Efectivo',
    'POS Ficohsa',
    'POS BAC',
    'Transferencias',
    'Total declarado',
    'Contado',
    'Sistema',
    'Sobrante / faltante',
    'Cuentas',
    'Entrega',
    'Recibe',
    'Abrió',
    'Cerró',
    'Observaciones',
  ]
  sheet.columns = headers.map((h) => ({ width: Math.max(14, Math.min(22, h.length + 4)) }))
  headerBar(sheet, headers.length, 'ARQUEOS DE CAJA', subtitle)
  tableHeader(sheet, 4, headers)

  sessions.forEach((s, i) => {
    const cash = money(s.salesCash)
    const ficohsa = money(s.salesPosFicohsa)
    const bac = money(s.salesPosBac)
    const transfer = money(s.salesTransfer)
    const r = sheet.getRow(5 + i)
    const values: (string | number)[] = [
      s.register.name,
      venueZoneLabel(s.register.venueZone) || '',
      s.status === 'OPEN' ? 'Abierta' : 'Cerrada',
      hnDateTime(s.openedAt),
      s.closedAt ? hnDateTime(s.closedAt) : '',
      money(s.openingFloat),
      cash,
      ficohsa,
      bac,
      transfer,
      cash + ficohsa + bac + transfer,
      s.countedCash == null ? '' : money(s.countedCash),
      s.systemTotal == null ? '' : money(s.systemTotal),
      s.difference == null ? '' : money(s.difference),
      s.accounts.length,
      s.deliveredByName || '',
      s.receivedByName || '',
      person(s.openedBy),
      person(s.closedBy),
      s.notes || '',
    ]
    values.forEach((val, c) => {
      const cell = r.getCell(c + 1)
      const moneyCols = [6, 7, 8, 9, 10, 11, 12, 13, 14]
      if (moneyCols.includes(c + 1) && val !== '') moneyCell(cell, Number(val))
      else {
        cell.value = val
        cell.alignment = { vertical: 'middle' }
      }
      font(cell, { size: 10 })
      border(cell)
      if (i % 2 === 1) fill(cell, ZEBRA)
      if (c + 1 === 14 && typeof val === 'number') {
        font(cell, { size: 10, bold: true, color: { argb: val === 0 ? GREEN : RED } })
      }
    })
    r.height = 18
  })
  if (sessions.length > 0) {
    sheet.autoFilter = {
      from: { row: 4, column: 1 },
      to: { row: 4 + sessions.length, column: headers.length },
    }
  }
}

function addResumenSheet(wb: ExcelJS.Workbook, sessions: ArqueoSessionRow[]) {
  const sheet = wb.addWorksheet('Resumen')
  sheet.columns = [18, 12, 14, 12, 16, 16, 20].map((width) => ({ width }))
  headerBar(sheet, 7, 'RESUMEN POR CAJA', `${sessions.length} sesión${sessions.length === 1 ? '' : 'es'}`)
  tableHeader(sheet, 4, ['Caja', 'Sesiones', 'Efectivo', 'POS', 'Transferencias', 'Sistema', 'Sobrante / faltante'])

  const byRegister = new Map<
    string,
    { sessions: number; cash: number; pos: number; transfer: number; system: number; difference: number }
  >()
  for (const s of sessions) {
    const key = s.register.name
    const prev = byRegister.get(key) || { sessions: 0, cash: 0, pos: 0, transfer: 0, system: 0, difference: 0 }
    prev.sessions += 1
    prev.cash += money(s.salesCash)
    prev.pos += money(s.salesPosFicohsa) + money(s.salesPosBac)
    prev.transfer += money(s.salesTransfer)
    prev.system += money(s.systemTotal)
    prev.difference += money(s.difference)
    byRegister.set(key, prev)
  }
  Array.from(byRegister.entries()).forEach(([name, t], i) => {
    const r = sheet.getRow(5 + i)
    r.getCell(1).value = name
    r.getCell(2).value = t.sessions
    moneyCell(r.getCell(3), t.cash)
    moneyCell(r.getCell(4), t.pos)
    moneyCell(r.getCell(5), t.transfer)
    moneyCell(r.getCell(6), t.system)
    moneyCell(r.getCell(7), t.difference)
    for (let c = 1; c <= 7; c++) {
      border(r.getCell(c))
      font(r.getCell(c), { size: 11 })
      if (i % 2 === 1) fill(r.getCell(c), ZEBRA)
    }
    font(r.getCell(7), { bold: true, color: { argb: t.difference === 0 ? GREEN : RED } })
  })
}

function addCuentasSheet(wb: ExcelJS.Workbook, sessions: ArqueoSessionRow[]) {
  const sheet = wb.addWorksheet('Cuentas', { views: [{ state: 'frozen', ySplit: 4 }] })
  sheet.columns = [18, 16, 14, 22, 20, 16, 14].map((width) => ({ width }))
  headerBar(sheet, 7, 'CUENTAS COBRADAS', 'Ligadas a los arqueos exportados')
  tableHeader(sheet, 4, ['Caja', 'Mesa', 'Zona', 'Cliente', 'Cierre', 'Método de pago', 'Consumo'])
  let row = 5
  sessions.forEach((s) => {
    s.accounts.forEach((a) => {
      const r = sheet.getRow(row)
      r.getCell(1).value = s.register.name
      r.getCell(2).value = a.table.name
      r.getCell(3).value = venueZoneLabel(a.table.zone) || a.table.zone || ''
      r.getCell(4).value = a.clientName || ''
      r.getCell(5).value = hnDateTime(a.closedAt)
      r.getCell(6).value = payLabel(a.paymentMethod)
      moneyCell(r.getCell(7), money(a.initialBalance) - money(a.currentBalance))
      for (let c = 1; c <= 7; c++) {
        border(r.getCell(c))
        font(r.getCell(c), { size: 10 })
        if ((row - 5) % 2 === 1) fill(r.getCell(c), ZEBRA)
      }
      row += 1
    })
  })
}

export async function buildArqueoExcelBuffer(
  sessions: ArqueoSessionRow[],
  opts: { from?: string; to?: string; single?: boolean }
) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Gran Casa Blanca'
  wb.created = new Date()

  if (opts.single && sessions[0]) {
    addSingleReport(wb, sessions[0])
    addCuentasSheet(wb, sessions)
  } else {
    const subtitle = opts.from && opts.to ? `${opts.from}  →  ${opts.to}` : 'Periodo seleccionado'
    addListSheet(wb, sessions, subtitle)
    addResumenSheet(wb, sessions)
    addCuentasSheet(wb, sessions)
  }

  const buf = await wb.xlsx.writeBuffer()
  return Buffer.from(buf)
}

export function arqueoFileName(sessions: ArqueoSessionRow[], opts: { from?: string; to?: string; single?: boolean }) {
  if (opts.single && sessions[0]) {
    const safe = sessions[0].register.name.replace(/\s+/g, '')
    const day = hnDate(sessions[0].closedAt || sessions[0].openedAt).replace(/\//g, '-')
    return `Arqueo_${safe}_${day}.xlsx`
  }
  return `Arqueos_${opts.from || 'inicio'}_${opts.to || 'fin'}.xlsx`
}

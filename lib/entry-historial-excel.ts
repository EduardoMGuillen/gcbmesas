import ExcelJS from 'exceljs'
import { entryOriginLabel } from './entry-historial'

const GOLD = 'FFC9A84C'
const NAVY = 'FF0F172A'
const NAVY2 = 'FF1E293B'
const WHITE = 'FFFFFFFF'
const INK = 'FF0F172A'
const MUTED = 'FF475569'
const LINE = 'FFE2E8F0'
const ZEBRA = 'FFF8FAFC'

export type EntryHistorialRow = {
  clientName: string
  clientEmail: string
  clientPhone: string | null
  numberOfEntries: number
  totalPrice: unknown
  status: string
  createdAt: Date | string
  createdBy?: { username: string; name: string | null } | null
}

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Activa',
  USED: 'Usada',
  CANCELLED: 'Cancelada',
}

function money(value: unknown) {
  const n = Number(value)
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0
}

function hnDateTime(value: Date | string) {
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

function hnDate(value: Date | string) {
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('es-HN', {
    timeZone: 'America/Tegucigalpa',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
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

function moneyCell(cell: ExcelJS.Cell, value: number) {
  cell.value = value
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

export async function buildEntryHistorialExcelBuffer(
  event: { name: string; date: Date | string; venueName?: string | null },
  rows: EntryHistorialRow[]
) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Gran Casa Blanca'
  wb.created = new Date()

  const counted = rows.filter((r) => r.status !== 'CANCELLED')
  const tickets = counted.reduce((s, r) => s + r.numberOfEntries, 0)
  const revenue = counted.reduce((s, r) => s + money(r.totalPrice), 0)
  const online = counted.filter((r) => !r.createdBy).length
  const door = counted.filter((r) => r.createdBy).length

  const resumen = wb.addWorksheet('Resumen')
  resumen.columns = [{ width: 28 }, { width: 28 }, { width: 22 }, { width: 18 }]
  const dateLabel = hnDate(event.date)
  const venue = event.venueName?.trim()
  headerBar(
    resumen,
    4,
    'HISTORIAL DE ENTRADAS',
    venue ? `${event.name}  ·  ${dateLabel}  ·  ${venue}` : `${event.name}  ·  ${dateLabel}`
  )
  const kv = (r: number, label: string, value: string | number, asMoney = false) => {
    const l = resumen.getCell(r, 1)
    const v = resumen.getCell(r, 2)
    resumen.mergeCells(r, 2, r, 4)
    l.value = label
    fill(l, ZEBRA)
    font(l, { bold: true, size: 11, color: { argb: MUTED } })
    border(l)
    if (asMoney && typeof value === 'number') moneyCell(v, value)
    else {
      v.value = value
      v.alignment = { horizontal: 'right', vertical: 'middle' }
    }
    font(v, { bold: true, size: 11 })
    border(v)
  }
  kv(5, 'Evento', event.name)
  kv(6, 'Fecha', dateLabel)
  kv(7, 'Lugar', venue || '—')
  kv(8, 'Personas (sin canceladas)', tickets)
  kv(9, 'Total L', revenue, true)
  kv(10, 'Vendidas en línea', online)
  kv(11, 'Creadas en taquilla', door)
  kv(12, 'Filas en este archivo', rows.length)

  const sheet = wb.addWorksheet('Entradas', { views: [{ state: 'frozen', ySplit: 4 }] })
  const headers = ['Fecha', 'Nombre', 'Email', 'Teléfono', 'Cantidad', 'Total', 'Estado', 'Origen']
  sheet.columns = [{ width: 22 }, { width: 24 }, { width: 28 }, { width: 16 }, { width: 12 }, { width: 14 }, { width: 12 }, { width: 28 }]
  headerBar(sheet, headers.length, 'ENTRADAS', event.name)
  tableHeader(sheet, 4, headers)
  rows.forEach((row, i) => {
    const r = sheet.getRow(5 + i)
    const values: (string | number)[] = [
      hnDateTime(row.createdAt),
      row.clientName,
      row.clientEmail,
      row.clientPhone || '',
      row.numberOfEntries,
      money(row.totalPrice),
      STATUS_LABEL[row.status] || row.status,
      entryOriginLabel(row.createdBy),
    ]
    values.forEach((val, c) => {
      const cell = r.getCell(c + 1)
      if (c + 1 === 6 && typeof val === 'number') moneyCell(cell, val)
      else {
        cell.value = val
        cell.alignment = { vertical: 'middle' }
      }
      font(cell, { size: 10 })
      border(cell)
      if (i % 2 === 1) fill(cell, ZEBRA)
    })
    r.height = 18
  })
  if (rows.length > 0) {
    sheet.autoFilter = {
      from: { row: 4, column: 1 },
      to: { row: 4 + rows.length, column: headers.length },
    }
  }

  const buf = await wb.xlsx.writeBuffer()
  return Buffer.from(buf)
}

export function entryHistorialFileName(eventName: string, eventDate: Date | string) {
  const safe = eventName.replace(/[^\wáéíóúñÁÉÍÓÚÑ]+/gi, '_').slice(0, 40)
  const day = hnDate(eventDate).replace(/\//g, '-')
  return `Entradas_${safe}_${day}.xlsx`
}

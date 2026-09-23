import ExcelJS from 'exceljs'
import { STOCK_CATEGORIES, STOCK_LOCATION_LABELS } from './ops-constants'
import { VENUE_ZONE_LABELS, type VenueZone } from './venue-zones'

const GOLD = 'FFC9A84C'
const NAVY = 'FF0F172A'
const NAVY2 = 'FF1E293B'
const WHITE = 'FFFFFFFF'
const INK = 'FF0F172A'
const MUTED = 'FF475569'
const LINE = 'FFE2E8F0'
const ZEBRA = 'FFF8FAFC'
const SECTION = 'FF1E293B'
const BLANK_HINT = 'FFFFFBEB'

const HEADERS = [
  'ID',
  'Proveedor',
  'Producto',
  'Presentación',
  'Precio',
  'Cantidad',
  'Ubicación',
  'Zona',
  'Categoría',
  'Caduca',
  'Teléfono',
  'Notas',
] as const

const COL_WIDTHS = [22, 18, 30, 14, 12, 12, 20, 14, 12, 14, 14, 32]
const LAST_COL = HEADERS.length
const BLANK_ROWS = 20

const SECTION_ORDER = [
  'Inventario Bodega',
  'Inventario Barra — Astro',
  'Inventario Barra — Studio54',
  'Inventario Barra — Garden',
  'Inventario Barra',
  'Abierto',
  'Mal Estado (Expirado/Perdida)',
] as const

export type StockExcelItem = {
  id: string
  name: string
  presentation: string | null
  category: string | null
  supplier: string | null
  supplierPhone: string | null
  location: string
  venueZone: string | null
  quantity: unknown
  salePrice: unknown
  expiresAt: Date | string | null
  notes: string | null
}

export type StockExcelParsedRow = {
  rowNumber: number
  id: string | null
  name: string
  presentation: string | null
  category: string | null
  supplier: string | null
  supplierPhone: string | null
  location: 'BODEGA' | 'BARRA' | 'ABIERTO' | 'MERMA'
  venueZone: VenueZone | null
  quantity: number | null
  salePrice: number | null
  expiresAt: string | null
  notes: string | null
}

type BuildMode = 'export' | 'template'

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

function num(v: unknown) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
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

function todayFile() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Tegucigalpa',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function locationLabel(location: string) {
  return STOCK_LOCATION_LABELS[location as keyof typeof STOCK_LOCATION_LABELS] || location
}

function zoneLabel(zone: string | null) {
  if (!zone) return ''
  return VENUE_ZONE_LABELS[zone as VenueZone] || zone
}

function sectionOf(item: StockExcelItem) {
  if (item.location === 'MERMA') return 'Mal Estado (Expirado/Perdida)'
  if (item.location === 'ABIERTO') return 'Abierto'
  if (item.location === 'BARRA') {
    if (item.venueZone === 'ASTRO') return 'Inventario Barra — Astro'
    if (item.venueZone === 'STUDIO54') return 'Inventario Barra — Studio54'
    if (item.venueZone === 'GARDEN') return 'Inventario Barra — Garden'
    return 'Inventario Barra'
  }
  return 'Inventario Bodega'
}

function toDateValue(value: Date | string | null) {
  if (!value) return null
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return null
  return d
}

function applyRowStyle(row: ExcelJS.Row, zebra: boolean, blank: boolean) {
  row.height = 20
  row.eachCell({ includeEmpty: true }, (cell) => {
    border(cell)
    font(cell, { color: { argb: INK }, size: 11 })
    cell.alignment = { vertical: 'middle', wrapText: true }
    if (blank) fill(cell, BLANK_HINT)
    else if (zebra) fill(cell, ZEBRA)
    else fill(cell, WHITE)
  })
}

export function stockExcelFileName(mode: BuildMode) {
  const day = todayFile()
  return mode === 'template' ? `Plantilla_Inventario_${day}.xlsx` : `Inventario_${day}.xlsx`
}

export async function buildStockExcelBuffer(items: StockExcelItem[], mode: BuildMode) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'GCB Mesas'
  wb.created = new Date()

  const sheet = wb.addWorksheet('Inventario', {
    views: [{ state: 'frozen', ySplit: 4 }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 },
  })
  COL_WIDTHS.forEach((w, i) => {
    sheet.getColumn(i + 1).width = w
  })

  sheet.mergeCells(1, 1, 1, LAST_COL)
  const title = sheet.getCell(1, 1)
  title.value = 'Inventarios Producciones Casa Blanca'
  fill(title, NAVY)
  font(title, { bold: true, size: 16, color: { argb: GOLD } })
  title.alignment = { vertical: 'middle', horizontal: 'left' }
  sheet.getRow(1).height = 28

  sheet.mergeCells(2, 1, 2, LAST_COL)
  const sub = sheet.getCell(2, 1)
  sub.value =
    mode === 'template'
      ? `Plantilla · inventario actual al ${hnDate(new Date())} · deja el ID en blanco para agregar productos`
      : `Inventario al ${hnDate(new Date())}`
  fill(sub, NAVY2)
  font(sub, { size: 11, color: { argb: WHITE } })
  sheet.getRow(2).height = 20

  sheet.mergeCells(3, 1, 3, LAST_COL)
  const hint = sheet.getCell(3, 1)
  hint.value =
    'No borres ni cambies la columna ID de filas existentes. Ubicación: Bodega, Barra, Abierto o Expirado/Perdida. Zona: Astro, Studio54 o Garden (obligatoria en Barra/Abierto).'
  fill(hint, GOLD)
  font(hint, { size: 10, color: { argb: NAVY }, italic: true })
  sheet.getRow(3).height = 22

  const headerRow = sheet.getRow(4)
  HEADERS.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1)
    cell.value = h
    fill(cell, GOLD)
    font(cell, { bold: true, size: 11, color: { argb: NAVY } })
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
    border(cell)
  })
  headerRow.height = 22

  const grouped = new Map<string, StockExcelItem[]>()
  for (const key of SECTION_ORDER) grouped.set(key, [])
  for (const item of items) {
    const key = sectionOf(item)
    const list = grouped.get(key) || []
    list.push(item)
    grouped.set(key, list)
  }

  let rowIdx = 5
  let zebra = false
  for (const section of SECTION_ORDER) {
    const list = grouped.get(section) || []
    if (list.length === 0 && section === 'Inventario Barra') continue
    if (list.length === 0 && mode === 'export') continue

    sheet.mergeCells(rowIdx, 1, rowIdx, LAST_COL)
    const sectionCell = sheet.getCell(rowIdx, 1)
    sectionCell.value = section
    fill(sectionCell, SECTION)
    font(sectionCell, { bold: true, size: 12, color: { argb: GOLD } })
    sectionCell.alignment = { vertical: 'middle' }
    sheet.getRow(rowIdx).height = 22
    rowIdx += 1

    list.sort((a, b) => {
      const cat = (a.category || '').localeCompare(b.category || '', 'es')
      if (cat !== 0) return cat
      return a.name.localeCompare(b.name, 'es')
    })

    for (const item of list) {
      const row = sheet.getRow(rowIdx)
      row.getCell(1).value = item.id
      row.getCell(2).value = item.supplier || ''
      row.getCell(3).value = item.name
      row.getCell(4).value = item.presentation || ''
      const price = item.salePrice == null || item.salePrice === '' ? null : num(item.salePrice)
      row.getCell(5).value = price
      row.getCell(5).numFmt = '"L"#,##0.00'
      row.getCell(6).value = num(item.quantity)
      row.getCell(6).numFmt = '0.##'
      row.getCell(7).value = locationLabel(item.location)
      row.getCell(8).value = zoneLabel(item.venueZone)
      row.getCell(9).value = item.category || ''
      const exp = toDateValue(item.expiresAt)
      if (exp) {
        row.getCell(10).value = exp
        row.getCell(10).numFmt = 'dd/mm/yyyy'
      }
      row.getCell(11).value = item.supplierPhone || ''
      row.getCell(12).value = item.notes || ''
      applyRowStyle(row, zebra, false)
      zebra = !zebra
      rowIdx += 1
    }
  }

  if (mode === 'template') {
    sheet.mergeCells(rowIdx, 1, rowIdx, LAST_COL)
    const addCell = sheet.getCell(rowIdx, 1)
    addCell.value = 'Agregar productos (deja ID vacío)'
    fill(addCell, SECTION)
    font(addCell, { bold: true, size: 12, color: { argb: GOLD } })
    sheet.getRow(rowIdx).height = 22
    rowIdx += 1

    for (let i = 0; i < BLANK_ROWS; i++) {
      const row = sheet.getRow(rowIdx)
      for (let c = 1; c <= LAST_COL; c++) row.getCell(c).value = ''
      row.getCell(7).value = 'Bodega'
      applyRowStyle(row, false, true)
      rowIdx += 1
    }
  }

  const lastData = rowIdx - 1
  if (lastData >= 5) {
    sheet.dataValidations.add(`G5:G${lastData}`, {
      type: 'list',
      allowBlank: true,
      formulae: ['"Bodega,Barra,Abierto,Expirado/Perdida"'],
      showErrorMessage: true,
      errorTitle: 'Ubicación',
      error: 'Usa Bodega, Barra, Abierto o Expirado/Perdida.',
    })
    sheet.dataValidations.add(`H5:H${lastData}`, {
      type: 'list',
      allowBlank: true,
      formulae: ['"Astro,Studio54,Garden"'],
    })
    sheet.dataValidations.add(`I5:I${lastData}`, {
      type: 'list',
      allowBlank: true,
      formulae: [`"${STOCK_CATEGORIES.join(',')}"`],
    })
  }

  const leyenda = wb.addWorksheet('Leyenda')
  leyenda.getColumn(1).width = 28
  leyenda.getColumn(2).width = 72
  leyenda.mergeCells(1, 1, 1, 2)
  const lTitle = leyenda.getCell(1, 1)
  lTitle.value = 'Cómo usar este Excel'
  fill(lTitle, NAVY)
  font(lTitle, { bold: true, size: 14, color: { argb: GOLD } })
  leyenda.getRow(1).height = 24

  const help: [string, string][] = [
    ['Exportar', 'Baja el inventario actual. Puedes reimportarlo después de editar cantidades o precios.'],
    ['Plantilla', 'Es el inventario actual más filas amarillas vacías para productos nuevos.'],
    ['ID', 'No lo cambies en filas que ya existen. Déjalo vacío solo al agregar.'],
    ['Producto', 'Obligatorio. Si está vacío, la fila se ignora.'],
    ['Presentación', 'Ej. 750 ml, 1 L. Sirve para no mezclar el mismo licor en distinto tamaño.'],
    ['Precio', 'Precio de venta (el que usa el mesero).'],
    ['Cantidad', 'Si lo dejas vacío en un ítem existente, no se cambia la cantidad.'],
    ['Ubicación', 'Bodega, Barra, Abierto o Expirado/Perdida (antes Mal Estado).'],
    ['Zona', 'Astro, Studio54 o Garden. Obligatoria si la ubicación es Barra o Abierto.'],
    ['Caduca', 'Fecha dd/mm/aaaa. Déjala vacía si no aplica.'],
    ['Importar', 'Actualiza por ID (o por producto + presentación + ubicación + zona) y crea las filas nuevas.'],
  ]
  help.forEach(([k, v], i) => {
    const r = leyenda.getRow(i + 3)
    r.getCell(1).value = k
    r.getCell(2).value = v
    fill(r.getCell(1), i % 2 ? ZEBRA : WHITE)
    fill(r.getCell(2), i % 2 ? ZEBRA : WHITE)
    font(r.getCell(1), { bold: true })
    font(r.getCell(2))
    border(r.getCell(1))
    border(r.getCell(2))
    r.height = 22
  })

  const buf = await wb.xlsx.writeBuffer()
  return Buffer.from(buf)
}

function cellText(value: ExcelJS.CellValue): string {
  if (value == null || value === '') return ''
  if (typeof value === 'number') return String(value)
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'string') return value.trim()
  if (value instanceof Date) return ''
  if (typeof value === 'object') {
    const v = value as { text?: string; result?: ExcelJS.CellValue; richText?: { text: string }[]; hyperlink?: string }
    if (Array.isArray(v.richText)) return v.richText.map((t) => t.text).join('').trim()
    if (typeof v.text === 'string') return v.text.trim()
    if (v.result != null) return cellText(v.result)
    if (typeof v.hyperlink === 'string') return v.hyperlink.trim()
  }
  return String(value).trim()
}

function cellNumber(value: ExcelJS.CellValue): number | null {
  if (value == null || value === '') return null
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'object' && value && 'result' in value) {
    return cellNumber((value as { result?: ExcelJS.CellValue }).result ?? null)
  }
  const raw = cellText(value).replace(/[L\s,]/gi, '').replace(',', '.')
  if (!raw) return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

function cellDateIso(value: ExcelJS.CellValue): string | null {
  if (value == null || value === '') return null
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10)
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const d = new Date(Math.round((value - 25569) * 86400 * 1000))
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  }
  const text = cellText(value)
  if (!text) return null
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  const dmy = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/)
  if (dmy) {
    const day = dmy[1].padStart(2, '0')
    const month = dmy[2].padStart(2, '0')
    let year = dmy[3]
    if (year.length === 2) year = Number(year) > 50 ? `19${year}` : `20${year}`
    return `${year}-${month}-${day}`
  }
  const parsed = new Date(text)
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10)
  return null
}

function normHeader(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '')
}

function parseLocation(raw: string): 'BODEGA' | 'BARRA' | 'ABIERTO' | 'MERMA' | null {
  const n = normHeader(raw)
  if (!n) return 'BODEGA'
  if (n.includes('merma') || n.includes('expir') || n.includes('perd') || n.includes('malestado') || n === 'mal') {
    return 'MERMA'
  }
  if (n.includes('abierto')) return 'ABIERTO'
  if (n.includes('barra')) return 'BARRA'
  if (n.includes('bodega')) return 'BODEGA'
  return null
}

function parseZone(raw: string): VenueZone | null {
  const n = normHeader(raw)
  if (!n) return null
  if (n.includes('studio')) return 'STUDIO54'
  if (n.includes('garden') || n.includes('beer')) return 'GARDEN'
  if (n.includes('astro')) return 'ASTRO'
  return null
}

function mapHeaderIndex(row: ExcelJS.Row) {
  const map: Record<string, number> = {}
  row.eachCell((cell, col) => {
    const key = normHeader(cellText(cell.value))
    if (!key) return
    if (key === 'id' || key === 'noid' || key === 'codigo') map.id = col
    else if (key === 'proveedor') map.supplier = col
    else if (key === 'producto' || key === 'productos') map.name = col
    else if (key.includes('present')) map.presentation = col
    else if (key === 'precio' || key === 'precioventa' || key === 'precios') map.salePrice = col
    else if (key === 'cantidad' || key === 'qty' || key === 'cant') map.quantity = col
    else if (key.includes('ubic') || key === 'lugar') map.location = col
    else if (key === 'zona') map.venueZone = col
    else if (key.includes('categ')) map.category = col
    else if (key.includes('caduc') || key.includes('venc') || key === 'expira') map.expiresAt = col
    else if (key.includes('tel') || key.includes('phone')) map.supplierPhone = col
    else if (key.includes('nota')) map.notes = col
  })
  return map
}

export async function parseStockExcelBuffer(buffer: Buffer) {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buffer as unknown as ArrayBuffer)
  const sheet =
    wb.getWorksheet('Inventario') ||
    wb.worksheets.find((s) => normHeader(s.name).includes('inventario')) ||
    wb.worksheets[0]
  if (!sheet) throw new Error('El Excel no tiene hojas')

  let headerMap: Record<string, number> | null = null
  let headerRow = 0
  sheet.eachRow((row, rowNumber) => {
    if (headerMap) return
    const map = mapHeaderIndex(row)
    if (map.name && map.quantity) {
      headerMap = map
      headerRow = rowNumber
    }
  })
  if (!headerMap || !headerRow) {
    throw new Error('No se encontró la fila de encabezados (Producto y Cantidad). Usa la plantilla.')
  }

  const rows: StockExcelParsedRow[] = []
  const errors: string[] = []

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRow) return
    const name = cellText(row.getCell(headerMap!.name).value)
    if (!name) return
    if (/^inventario\b|^mal estado|^abierto$|^agregar productos/i.test(name)) return

    const locRaw = headerMap!.location ? cellText(row.getCell(headerMap!.location).value) : 'Bodega'
    const location = parseLocation(locRaw)
    if (!location) {
      errors.push(`Fila ${rowNumber}: ubicación "${locRaw}" no válida`)
      return
    }
    const zoneRaw = headerMap!.venueZone ? cellText(row.getCell(headerMap!.venueZone).value) : ''
    const venueZone = parseZone(zoneRaw)
    if ((location === 'BARRA' || location === 'ABIERTO') && !venueZone) {
      errors.push(`Fila ${rowNumber} (${name}): falta zona (Astro, Studio54 o Garden)`)
      return
    }

    const idRaw = headerMap!.id ? cellText(row.getCell(headerMap!.id).value) : ''
    rows.push({
      rowNumber,
      id: idRaw || null,
      name,
      presentation: headerMap!.presentation ? cellText(row.getCell(headerMap!.presentation).value) || null : null,
      category: headerMap!.category ? cellText(row.getCell(headerMap!.category).value) || null : null,
      supplier: headerMap!.supplier ? cellText(row.getCell(headerMap!.supplier).value) || null : null,
      supplierPhone: headerMap!.supplierPhone ? cellText(row.getCell(headerMap!.supplierPhone).value) || null : null,
      location,
      venueZone,
      quantity: headerMap!.quantity ? cellNumber(row.getCell(headerMap!.quantity).value) : null,
      salePrice: headerMap!.salePrice ? cellNumber(row.getCell(headerMap!.salePrice).value) : null,
      expiresAt: headerMap!.expiresAt ? cellDateIso(row.getCell(headerMap!.expiresAt).value) : null,
      notes: headerMap!.notes ? cellText(row.getCell(headerMap!.notes).value) || null : null,
    })
  })

  return { rows, errors }
}

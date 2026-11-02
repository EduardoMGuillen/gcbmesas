/**
 * Agregaciones puras para el panel de entradas por evento.
 * Honduras está en UTC−6 sin horario de verano, así que se usa un desfase fijo.
 */

const HN_OFFSET_MS = 6 * 60 * 60 * 1000
const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

export type Bucket = { key: string; label: string; count: number }
export type EntryOrigin = 'online' | 'taquilla' | 'cortesia'
type Status = 'ACTIVE' | 'USED' | 'CANCELLED'

/** Fecha "corrida" a hora local de Honduras: leer con getUTC*. */
function toHn(d: Date) {
  return new Date(d.getTime() - HN_OFFSET_MS)
}

const pad = (n: number) => String(n).padStart(2, '0')

function hourLabel(h: number) {
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12} ${h < 12 ? 'a. m.' : 'p. m.'}`
}

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/** Cantidad por hora local, contigua desde la primera hasta la última (huecos en 0). */
export function bucketByHour(dates: Date[]): Bucket[] {
  if (!dates.length) return []
  const counts = new Map<number, number>()
  for (const d of dates) {
    const slot = Math.floor(toHn(d).getTime() / HOUR_MS)
    counts.set(slot, (counts.get(slot) ?? 0) + 1)
  }
  const slots = Array.from(counts.keys())
  const [min, max] = [Math.min(...slots), Math.max(...slots)]
  const out: Bucket[] = []
  for (let slot = min; slot <= max; slot++) {
    const t = new Date(slot * HOUR_MS)
    out.push({
      key: `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}T${pad(t.getUTCHours())}`,
      label: hourLabel(t.getUTCHours()),
      count: counts.get(slot) ?? 0,
    })
  }
  return out
}

/** Cantidad por día local, contigua desde el primero hasta el último (huecos en 0). */
export function bucketByDay(dates: Date[]): Bucket[] {
  if (!dates.length) return []
  const counts = new Map<number, number>()
  for (const d of dates) {
    const slot = Math.floor(toHn(d).getTime() / DAY_MS)
    counts.set(slot, (counts.get(slot) ?? 0) + 1)
  }
  const slots = Array.from(counts.keys())
  const [min, max] = [Math.min(...slots), Math.max(...slots)]
  const out: Bucket[] = []
  for (let slot = min; slot <= max; slot++) {
    const t = new Date(slot * DAY_MS)
    out.push({
      key: `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`,
      label: `${t.getUTCDate()} ${MONTHS[t.getUTCMonth()]}`,
      count: counts.get(slot) ?? 0,
    })
  }
  return out
}

/** Ventas en línea no tienen creador; las de usuarios de cortesía no son venta. */
export function entryOrigin(createdByUserId: string | null, nonSaleCreatorIds: string[]): EntryOrigin {
  if (!createdByUserId) return 'online'
  if (nonSaleCreatorIds.includes(createdByUserId)) return 'cortesia'
  return 'taquilla'
}

export type EntrySummary = {
  /** Entradas no canceladas (cada Entry = 1 persona) */
  sold: number
  used: number
  pending: number
  cancelled: number
  /** Lempiras, sin canceladas ni cortesías */
  revenue: number
  /** % de vendidas que ya ingresaron (entero) */
  usedPct: number
  byOrigin: Record<EntryOrigin, number>
}

export function summarizeEntries(
  rows: { status: Status; totalPrice: number; createdByUserId: string | null }[],
  nonSaleCreatorIds: string[]
): EntrySummary {
  const s: EntrySummary = {
    sold: 0,
    used: 0,
    pending: 0,
    cancelled: 0,
    revenue: 0,
    usedPct: 0,
    byOrigin: { online: 0, taquilla: 0, cortesia: 0 },
  }
  for (const r of rows) {
    if (r.status === 'CANCELLED') {
      s.cancelled++
      continue
    }
    s.sold++
    if (r.status === 'USED') s.used++
    else s.pending++
    const origin = entryOrigin(r.createdByUserId, nonSaleCreatorIds)
    s.byOrigin[origin]++
    if (origin !== 'cortesia') s.revenue += Number(r.totalPrice) || 0
  }
  s.revenue = Math.round(s.revenue * 100) / 100
  s.usedPct = s.sold ? Math.round((s.used / s.sold) * 100) : 0
  return s
}

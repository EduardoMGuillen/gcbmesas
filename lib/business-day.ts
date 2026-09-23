const HN_TZ = 'America/Tegucigalpa'
export const BUSINESS_DAY_START_HOUR = 16

function hondurasParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: HN_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const get = (type: string) => parts.find((p) => p.type === type)?.value || '0'
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour: Number(get('hour')),
  }
}

function ymd(year: number, month: number, day: number) {
  const y = String(year).padStart(4, '0')
  const m = String(month).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function addDays(year: number, month: number, day: number, delta: number) {
  const dt = new Date(Date.UTC(year, month - 1, day + delta))
  return {
    year: dt.getUTCFullYear(),
    month: dt.getUTCMonth() + 1,
    day: dt.getUTCDate(),
  }
}

/** Día operativo: de 4:00 p.m. a 4:00 p.m. (hora de Honduras). */
export function getBusinessDate(now = new Date()): string {
  const p = hondurasParts(now)
  if (p.hour < BUSINESS_DAY_START_HOUR) {
    const prev = addDays(p.year, p.month, p.day, -1)
    return ymd(prev.year, prev.month, prev.day)
  }
  return ymd(p.year, p.month, p.day)
}

export function businessDateToDate(isoDate: string) {
  return new Date(`${isoDate}T12:00:00.000Z`)
}

export function formatBusinessDayLabel(isoDate: string) {
  const [year, month, day] = isoDate.split('-').map(Number)
  const end = addDays(year, month, day, 1)
  const startLabel = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`
  const endLabel = `${String(end.day).padStart(2, '0')}/${String(end.month).padStart(2, '0')}`
  return `${startLabel} 4:00 p.m. → ${endLabel} 4:00 p.m.`
}

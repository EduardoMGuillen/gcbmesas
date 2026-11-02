/**
 * Lógica pura del escaneo en puerta.
 *
 * html5-qrcode dispara el callback en cada cuadro que decodifica (fps 10), así que un mismo
 * QR llega varias veces antes de que la cámara termine de apagarse. Sin candado, dos
 * validaciones corren en paralelo: la primera marca USADA (verde) y la segunda falla y
 * muestra "ya usada" (rojo) encima.
 */

/** Ventana en la que volver a escanear la entrada recién marcada se considera "repetido". */
export const REPEAT_SCAN_WINDOW_MS = 60_000

/** Candado síncrono: solo la primera lectura pasa hasta que se llame release(). */
export function createScanGate() {
  let busy = false
  return {
    tryAcquire(): boolean {
      if (busy) return false
      busy = true
      return true
    },
    release() {
      busy = false
    },
    get busy() {
      return busy
    },
  }
}

export type LastMarked = { entryId: string; at: Date } | null

/** La entrada ya figura USADA, pero fue este mismo dispositivo quien la marcó hace instantes. */
export function isRepeatScan(last: LastMarked, entryId: string, now: Date): boolean {
  if (!last || last.entryId !== entryId) return false
  return now.getTime() - last.at.getTime() <= REPEAT_SCAN_WINDOW_MS
}

export type DoorScanKind = 'valid' | 'used' | 'cancelled' | 'wrong_event' | 'not_found'

/** Qué hacer con una entrada leída en puerta para el evento seleccionado. */
export function classifyDoorScan(
  entry: { eventId: string; status: 'ACTIVE' | 'USED' | 'CANCELLED' } | null,
  selectedEventId: string
): DoorScanKind {
  if (!entry) return 'not_found'
  if (entry.eventId !== selectedEventId) return 'wrong_event'
  if (entry.status === 'CANCELLED') return 'cancelled'
  if (entry.status === 'USED') return 'used'
  return 'valid'
}

/** Extrae el token de un QR: acepta la URL /entradas/validar/<token> o el token solo. */
export function parseScanToken(text: string): string {
  const cleaned = text.trim()
  if (!cleaned) return ''
  try {
    const parts = new URL(cleaned).pathname.split('/').filter(Boolean)
    const i = parts.indexOf('validar')
    if (i !== -1 && parts[i + 1]) return parts[i + 1]
    return parts.pop() || cleaned
  } catch {
    return cleaned
  }
}

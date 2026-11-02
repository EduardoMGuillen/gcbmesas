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

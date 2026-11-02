import { describe, it, expect } from 'vitest'
import { createScanGate, isRepeatScan, REPEAT_SCAN_WINDOW_MS } from '@/lib/entry-scan'

describe('createScanGate', () => {
  it('deja pasar la primera lectura y bloquea las siguientes mientras está ocupado', () => {
    const gate = createScanGate()
    expect(gate.tryAcquire()).toBe(true)
    expect(gate.tryAcquire()).toBe(false)
    expect(gate.tryAcquire()).toBe(false)
  })

  it('vuelve a dejar pasar después de release()', () => {
    const gate = createScanGate()
    gate.tryAcquire()
    gate.release()
    expect(gate.tryAcquire()).toBe(true)
  })

  it('simula 3 lecturas del mismo QR en ráfaga: solo una se procesa', () => {
    const gate = createScanGate()
    const processed = [1, 2, 3].filter(() => gate.tryAcquire())
    expect(processed).toHaveLength(1)
  })
})

describe('isRepeatScan', () => {
  const now = new Date('2026-11-01T03:00:10Z')

  it('es repetido si la misma entrada se marcó en este dispositivo hace poco', () => {
    const last = { entryId: 'e1', at: new Date(now.getTime() - 5_000) }
    expect(isRepeatScan(last, 'e1', now)).toBe(true)
  })

  it('no es repetido si es otra entrada', () => {
    const last = { entryId: 'e1', at: new Date(now.getTime() - 5_000) }
    expect(isRepeatScan(last, 'e2', now)).toBe(false)
  })

  it('no es repetido si pasó la ventana', () => {
    const last = { entryId: 'e1', at: new Date(now.getTime() - REPEAT_SCAN_WINDOW_MS - 1) }
    expect(isRepeatScan(last, 'e1', now)).toBe(false)
  })

  it('no es repetido si no hay marca previa', () => {
    expect(isRepeatScan(null, 'e1', now)).toBe(false)
  })
})

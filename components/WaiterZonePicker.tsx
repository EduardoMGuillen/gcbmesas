'use client'

import { useState, useTransition } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { assignWaiterZone } from '@/lib/ops-actions'
import { VENUE_ZONE_LABELS, VENUE_ZONES, type VenueZone } from '@/lib/venue-zones'

export function WaiterShiftGate({
  zone,
  businessDayLabel,
  role,
  children,
}: {
  zone: VenueZone | null
  businessDayLabel: string
  role: string
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const skip = role !== 'MESERO' || pathname?.startsWith('/mesero/marcajes')
  if (skip || zone) return <>{children}</>
  return <WaiterZonePicker businessDayLabel={businessDayLabel} />
}

export function WaiterZonePicker({
  businessDayLabel,
  currentZone,
  compact = false,
}: {
  businessDayLabel: string
  currentZone?: VenueZone | null
  compact?: boolean
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState('')
  const [open, setOpen] = useState(!currentZone)

  const pick = (zone: VenueZone) => {
    setError('')
    start(async () => {
      try {
        await assignWaiterZone(zone)
        setOpen(false)
        router.refresh()
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'No se pudo guardar la zona')
      }
    })
  }

  if (compact && currentZone && !open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-primary-400 px-3 py-2 rounded-xl border border-staff-border"
      >
        Zona: {VENUE_ZONE_LABELS[currentZone]} · cambiar
      </button>
    )
  }

  return (
    <div className="max-w-lg mx-auto py-6 space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-staff-fg mb-2">
          {currentZone ? 'Cambiar zona' : '¿En qué zona vas a atender?'}
        </h1>
        <p className="text-staff-muted text-sm">
          El día de trabajo es de 4:00 p.m. a 4:00 p.m. Hoy: {businessDayLabel}.
        </p>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="grid grid-cols-1 gap-3">
        {VENUE_ZONES.map((zone) => (
          <button
            key={zone}
            type="button"
            disabled={pending}
            onClick={() => pick(zone)}
            className={`min-h-[72px] rounded-2xl text-2xl font-bold border touch-manipulation ${
              currentZone === zone
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-staff-surface text-staff-fg border-staff-border hover:border-primary-500'
            }`}
          >
            {VENUE_ZONE_LABELS[zone]}
          </button>
        ))}
      </div>
      {compact && currentZone && (
        <button type="button" className="text-sm text-staff-muted" onClick={() => setOpen(false)}>
          Cancelar
        </button>
      )}
    </div>
  )
}

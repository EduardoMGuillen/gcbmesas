'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { parseVenueZone, VENUE_ZONE_LABELS, VENUE_ZONES } from '@/lib/venue-zones'

interface TableSelectorProps {
  tables: Array<{
    id: string
    name: string
    zone?: string | null
  }>
  walkInTableId: string
}

export function TableSelector({ tables, walkInTableId }: TableSelectorProps) {
  const router = useRouter()
  const zonesInTables = useMemo(() => {
    const present = new Set(
      tables
        .map((t) => parseVenueZone(t.zone))
        .filter((zone): zone is NonNullable<typeof zone> => Boolean(zone))
    )
    return VENUE_ZONES.filter((zone) => present.has(zone))
  }, [tables])
  const [selectedZone, setSelectedZone] = useState<string>(zonesInTables[0] || '')

  const filteredTables = selectedZone
    ? tables.filter((t) => parseVenueZone(t.zone) === selectedZone)
    : []

  return (
    <div className="bg-dark-100 border border-dark-200 rounded-xl p-8 space-y-4">
      <div className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 p-4">
        <button
          type="button"
          onClick={() => router.push(`/mesero/pedidos?tableId=${walkInTableId}&newWalkIn=1`)}
          className="w-full min-h-[52px] rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-lg font-bold"
        >
          Cliente de pie
        </button>
      </div>

      {zonesInTables.length > 1 && (
        <div>
          <label className="block text-sm font-medium text-white mb-2">Zona</label>
          <div className="grid grid-cols-1 gap-2">
            {zonesInTables.map((zone) => (
              <button
                key={zone}
                type="button"
                onClick={() => setSelectedZone(zone)}
                className={`min-h-[48px] rounded-xl font-bold ${
                  selectedZone === zone ? 'bg-primary-600 text-white' : 'bg-dark-50 text-white border border-dark-200'
                }`}
              >
                {VENUE_ZONE_LABELS[zone]}
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedZone && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filteredTables.map((table) => (
            <button
              key={table.id}
              type="button"
              onClick={() => router.push(`/mesero/pedidos?tableId=${table.id}`)}
              className="min-h-[72px] rounded-2xl bg-dark-50 border border-dark-200 text-white font-bold"
            >
              {table.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

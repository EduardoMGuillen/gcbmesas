'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

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
  const [selectedZone, setSelectedZone] = useState<string>('')

  // Obtener zonas únicas
  const zones = Array.from(
    new Set(
      tables
        .map((t) => t.zone)
        .filter((zone): zone is string => Boolean(zone) && zone !== 'SIN_MESA')
    )
  ).sort()

  // Filtrar mesas por zona seleccionada
  const filteredTables = selectedZone
    ? tables.filter(t => t.zone === selectedZone)
    : []

  const handleZoneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedZone(e.target.value)
  }

  const handleTableChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value) {
      router.push(`/mesero/pedidos?tableId=${e.target.value}`)
    }
  }

  return (
    <div className="bg-dark-100 border border-dark-200 rounded-xl p-8 space-y-4">
      <div className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 p-4">
        <p className="text-cyan-100 text-sm">
          Si el cliente no tiene mesa, puedes abrir una cuenta como <strong>Cliente de pie</strong>.
        </p>
        <button
          type="button"
          onClick={() => router.push(`/mesero/pedidos?tableId=${walkInTableId}`)}
          className="mt-3 w-full sm:w-auto px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold transition-colors"
        >
          Crear cuenta cliente de pie
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Seleccionar Zona
        </label>
        <select
          value={selectedZone}
          onChange={handleZoneChange}
          className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">Selecciona una zona</option>
          {zones.map((zone) => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </select>
      </div>

      {selectedZone && (
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Seleccionar Mesa
          </label>
          <select
            defaultValue=""
            onChange={handleTableChange}
            className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Selecciona una mesa</option>
            {filteredTables.map((table) => (
              <option key={table.id} value={table.id}>
                {table.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}

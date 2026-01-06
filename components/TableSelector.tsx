'use client'

import { useRouter } from 'next/navigation'

interface TableSelectorProps {
  tables: Array<{
    id: string
    name: string
    zone?: string | null
  }>
}

export function TableSelector({ tables }: TableSelectorProps) {
  const router = useRouter()

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.target.value) {
      router.push(`/mesero/pedidos?tableId=${e.target.value}`)
    }
  }

  return (
    <div className="bg-dark-100 border border-dark-200 rounded-xl p-8">
      <label className="block text-sm font-medium text-dark-300 mb-2">
        Seleccionar Mesa
      </label>
      <select
        defaultValue=""
        onChange={handleChange}
        className="w-full px-4 py-3 bg-dark-50 border border-dark-200 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        <option value="">Selecciona una mesa</option>
        {tables.map((table) => (
          <option key={table.id} value={table.id}>
            {table.name} {table.zone ? `- ${table.zone}` : ''}
          </option>
        ))}
      </select>
    </div>
  )
}

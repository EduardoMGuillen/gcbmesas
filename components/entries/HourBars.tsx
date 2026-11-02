import type { Bucket } from '@/lib/entry-stats'

/** Barras verticales simples (ingreso por hora, ventas por día). Usa colores del tema staff. */
export function HourBars({
  buckets,
  height = 72,
  emptyText = 'Sin datos todavía',
}: {
  buckets: Bucket[]
  height?: number
  emptyText?: string
}) {
  if (!buckets.length) {
    return <p className="py-4 text-center text-xs text-staff-muted">{emptyText}</p>
  }
  const max = Math.max(1, ...buckets.map((b) => b.count))
  const peak = buckets.reduce((a, b) => (b.count > a.count ? b : a), buckets[0])
  // Etiquetas: cada n barras para que no se encimen
  const every = Math.max(1, Math.ceil(buckets.length / 6))

  return (
    <div>
      <div className="flex items-end gap-1" style={{ height }} role="img" aria-label="Gráfico de barras">
        {buckets.map((b) => (
          <div key={b.key} className="group relative flex h-full flex-1 flex-col justify-end">
            <div
              className={`w-full rounded-t-md transition-all ${
                b.key === peak.key ? 'bg-primary-500' : 'bg-primary-500/40'
              }`}
              style={{ height: `${Math.max(b.count ? 6 : 2, (b.count / max) * 100)}%` }}
              title={`${b.label}: ${b.count}`}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1">
        {buckets.map((b, i) => (
          <span key={b.key} className="flex-1 truncate text-center text-[10px] text-staff-muted">
            {i % every === 0 ? b.label.replace(' a. m.', 'a').replace(' p. m.', 'p') : ''}
          </span>
        ))}
      </div>
    </div>
  )
}

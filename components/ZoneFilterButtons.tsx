'use client'

import { VENUE_ZONE_LABELS, VENUE_ZONES, type VenueZone } from '@/lib/venue-zones'

export function ZoneFilterButtons({
  value,
  onChange,
  includeAll = true,
}: {
  value: VenueZone | 'ALL'
  onChange: (zone: VenueZone | 'ALL') => void
  includeAll?: boolean
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {includeAll && (
        <button
          type="button"
          onClick={() => onChange('ALL')}
          className={`min-h-[48px] rounded-xl text-sm font-semibold border ${
            value === 'ALL'
              ? 'bg-primary-600 text-white border-primary-600'
              : 'bg-staff-raised text-staff-fg border-staff-border'
          }`}
        >
          Todas
        </button>
      )}
      {VENUE_ZONES.map((zone) => (
        <button
          key={zone}
          type="button"
          onClick={() => onChange(zone)}
          className={`min-h-[48px] rounded-xl text-base font-bold border ${
            value === zone
              ? 'bg-primary-600 text-white border-primary-600'
              : 'bg-staff-raised text-staff-fg border-staff-border'
          }`}
        >
          {VENUE_ZONE_LABELS[zone]}
        </button>
      ))}
    </div>
  )
}

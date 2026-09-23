export const VENUE_ZONES = ['ASTRO', 'STUDIO54', 'GARDEN'] as const
export type VenueZone = (typeof VENUE_ZONES)[number]

export const VENUE_ZONE_LABELS: Record<VenueZone, string> = {
  ASTRO: 'Astro',
  STUDIO54: 'Studio54',
  GARDEN: 'Garden',
}

/** Valor guardado en Table.zone (mesas ya existentes). */
export const VENUE_ZONE_TABLE_VALUE: Record<VenueZone, string> = {
  ASTRO: 'Astronomical',
  STUDIO54: 'Studio54',
  GARDEN: 'Beer Garden',
}

export function parseVenueZone(raw: string | null | undefined): VenueZone | null {
  if (!raw) return null
  const n = raw.trim().toLowerCase().replace(/[\s_-]+/g, '')
  if (n === 'astro' || n === 'astronomical' || n.includes('astro')) return 'ASTRO'
  if (n.includes('studio')) return 'STUDIO54'
  if (n.includes('garden') || n.includes('beer')) return 'GARDEN'
  return null
}

export function tableZoneMatches(tableZone: string | null | undefined, zone: VenueZone) {
  return parseVenueZone(tableZone) === zone
}

export function venueZoneLabel(raw: string | null | undefined) {
  const zone = parseVenueZone(raw)
  return zone ? VENUE_ZONE_LABELS[zone] : raw || ''
}

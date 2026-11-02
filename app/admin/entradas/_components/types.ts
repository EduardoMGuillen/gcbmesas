/** Tipos compartidos del módulo Entradas (admin). */

export type EventItem = {
  id: string
  name: string
  date: string | Date
  description: string | null
  coverImage: string | null
  coverPrice: number
  paypalPrice: number | null
  maxEntries: number | null
  entriesSoldSum: number
  /** Entradas ya escaneadas en puerta */
  entriesUsedSum?: number
  /** Lempiras sin canceladas ni cortesías */
  revenueLps?: number
  isActive: boolean
  publishOnLcb: boolean
  publishOnCbtickets: boolean
  isFeatured?: boolean
  venueName: string | null
  venueAddress: string | null
  createdAt: string | Date
  _count: { entries: number }
  createdBy?: { name: string | null; username: string } | null
}

export type EventStatRow = {
  eventId: string
  name: string
  date: string | Date
  venueName: string | null
  entriesSold: number
  revenueLps: number
}

export type EntryItem = {
  id: string
  clientName: string
  clientEmail: string
  clientPhone: string | null
  numberOfEntries: number
  totalPrice: number
  qrToken: string
  status: 'ACTIVE' | 'USED' | 'CANCELLED'
  emailSent: boolean
  whatsappSent: boolean
  createdAt: string | Date
  event: { name: string; date: string | Date; coverPrice: number; venueName?: string | null; venueAddress?: string | null }
  createdBy?: { name: string | null; username: string } | null
}

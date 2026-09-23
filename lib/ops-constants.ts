import type { PaymentMethod, StockLocation } from '@prisma/client'

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Efectivo',
  POS_FICOHSA: 'POS Ficohsa',
  POS_BAC: 'POS BAC',
  TRANSFER: 'Transferencia',
}

export const PAYMENT_METHODS = Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]

export const STOCK_LOCATION_LABELS: Record<StockLocation, string> = {
  BODEGA: 'Bodega',
  BARRA: 'Barra',
  ABIERTO: 'Abierto',
  MERMA: 'Mal estado / merma',
}

export const EXPENSE_CATEGORIES = [
  'Personal',
  'Licores',
  'Cerveza',
  'Hielo',
  'Vapes',
  'Servicios',
  'Otros',
] as const

export const STOCK_CATEGORIES = [
  'Licores',
  'Vinos',
  'Cerveza',
  'Mixers',
  'Vapes',
  'Otros',
] as const

export const CASH_REGISTERS = [
  { slug: 'cover', name: 'Caja Cover', defaultFloat: 4000 },
  { slug: 'astro', name: 'Caja Astro', defaultFloat: 4000 },
  { slug: 'eventos', name: 'Caja Eventos', defaultFloat: 4000 },
] as const

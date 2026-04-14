/** Cover 0 y sin venta online (paypal null o 0): solo cartel público, sin checkout. */
export function isPublicFreeCoverOnly(coverPrice: unknown, paypalPrice: unknown): boolean {
  const c = Number(coverPrice)
  if (!Number.isFinite(c) || c !== 0) return false
  if (paypalPrice === null || paypalPrice === undefined) return true
  const p = Number(paypalPrice as string | number)
  return Number.isFinite(p) && p === 0
}

export function hasOnlineTicketSale(paypalPrice: unknown): boolean {
  if (paypalPrice === null || paypalPrice === undefined) return false
  const p = Number(paypalPrice as string | number)
  return Number.isFinite(p) && p > 0
}

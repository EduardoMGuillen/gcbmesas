/**
 * Evento de portada: el destacado más próximo (marcado en admin) o, si no hay, el más próximo.
 * Espera la lista ya ordenada por fecha ascendente, como la devuelve getPublicEvents.
 */
export function pickFeaturedEvent<T extends { isFeatured?: boolean | null }>(events: T[]): T | null {
  return events.find((e) => e.isFeatured === true) ?? events[0] ?? null
}

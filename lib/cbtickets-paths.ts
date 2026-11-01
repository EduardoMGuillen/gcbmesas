/** Rutas públicas de GCBTickets (tal como las ve el cliente en gcbtickets.com). */
export const CBT_HOME = '/'
export const CBT_EVENTS = '/eventos'

export function cbtEventPath(id: string): string {
  return `${CBT_EVENTS}/${id}`
}

/** Mensaje unificado cuando el saldo de la cuenta no alcanza para el pedido */
export const INSUFFICIENT_BALANCE_MESSAGE = 'No hay saldo disponible'

export function isInsufficientBalanceError(message: string | undefined): boolean {
  if (!message) return false
  return (
    message === INSUFFICIENT_BALANCE_MESSAGE ||
    message.includes('Saldo insuficiente')
  )
}

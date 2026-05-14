/**
 * Mensajes de error legibles para el comprador (español).
 * Solo presentación: no altera flujo ni decisiones de pago.
 */

const DEFAULT_PURCHASE =
  'No pudimos completar el pago en este momento. Revisa los datos de tu tarjeta e inténtalo de nuevo. Si el problema continúa, contacta a tu banco o prueba otra tarjeta.'

function extractMessage(raw: unknown): string {
  if (raw == null) return ''
  if (typeof raw === 'string') return raw
  if (typeof raw === 'object' && raw !== null && 'message' in raw) {
    const m = (raw as { message?: unknown }).message
    if (typeof m === 'string') return m
  }
  return String(raw)
}

/** Mensajes que ya redactamos en español para UX local — no reescribir. */
function shouldPassThrough(s: string): boolean {
  const prefixes = [
    'Completa ',
    'La sesión de pago expiró',
    'La librería de CyberSource Microform',
    'Microform no está listo',
    'No se pudo cargar la librería',
    'Verificación 3DS cancelada',
    'Los datos sensibles',
    'Evento no encontrado',
    'Nombres de entradas',
    'Esta transacción ya fue',
    'Sin cupo',
    'requeridos',
    'mínimos de facturación',
    'datos de tarjeta para pago directo',
    'CyberSource no devolvió datos válidos',
    'La autenticación 3DS',
    'Error al confirmar el pago directo',
    'Error al obtener resultado 3DS',
    'Error al procesar el pago',
    'Error al completar el pago con 3DS',
    'No se pudo iniciar el pago',
    'No se pudo tokenizar',
  ]
  if (prefixes.some((p) => s.startsWith(p))) return true
  if (s.startsWith('Error al confirmar el pago') && !s.includes('CyberSource')) return true
  return false
}

function mapByPatterns(lower: string, original: string): string | null {
  if (
    (lower.includes('one or more params') && lower.includes('validation')) ||
    (lower.includes('validation error') && lower.includes('param'))
  ) {
    return 'Revisa los datos ingresados: número de tarjeta, fecha de vencimiento, CVV, nombre del titular y dirección de facturación. Algún dato no es válido o falta.'
  }
  if (lower.includes('validation error') || lower.includes('invalid request')) {
    return 'Los datos enviados no son válidos. Revisa tarjeta, vencimiento, CVV y dirección de facturación.'
  }
  if (lower.includes('failed to fetch') || lower.includes('networkerror') || lower.includes('load failed')) {
    return 'No hubo conexión con el sistema de pago. Comprueba tu internet e inténtalo de nuevo.'
  }
  if (lower.includes('timeout') || lower.includes('timed out')) {
    return 'La operación tardó demasiado. Inténtalo de nuevo.'
  }
  if (lower.includes('insufficient funds') || lower.includes('not sufficient funds')) {
    return 'Fondos insuficientes en la tarjeta. Prueba con otra tarjeta o otro método.'
  }
  if (lower.includes('expired card') || lower.includes('invalid expiration') || lower.includes('expiration date')) {
    return 'La tarjeta está vencida o la fecha de vencimiento no es válida. Verifica mes y año.'
  }
  if (
    lower.includes('invalid account') ||
    lower.includes('invalid card') ||
    lower.includes('invalid account number') ||
    lower.includes('incorrect card number')
  ) {
    return 'El número de tarjeta no es válido. Revísalo e inténtalo de nuevo.'
  }
  if (lower.includes('invalid cvn') || lower.includes('invalid cvv') || lower.includes('bad cvv') || lower.includes('security code')) {
    return 'El código de seguridad (CVV) no es correcto. Revísalo en el reverso de la tarjeta.'
  }
  if (
    lower.includes('declined') ||
    lower.includes('decline') ||
    lower.includes('do not honor') ||
    lower.includes('not permitted') ||
    lower.includes('transaction not allowed')
  ) {
    return 'Tu banco rechazó el pago. Prueba otra tarjeta o contacta a tu banco para autorizar la compra.'
  }
  if (lower.includes('pick up') || lower.includes('lost card') || lower.includes('stolen card')) {
    return 'La tarjeta fue rechazada por seguridad. Usa otra tarjeta o consulta con tu banco.'
  }
  if (lower.includes('exceeds') && lower.includes('limit')) {
    return 'Se superó el límite permitido para esta tarjeta. Prueba con otro monto o otra tarjeta.'
  }
  if (lower.includes('duplicate') && lower.includes('transaction')) {
    return 'Detectamos un intento duplicado. Espera un momento e inténtalo de nuevo.'
  }
  if (lower.includes('fraud') || lower.includes('suspicious')) {
    return 'El pago fue bloqueado por seguridad. Prueba con otra tarjeta o contacta a tu banco.'
  }
  if (lower.includes('authentication failed') || lower.includes('3ds') || lower.includes('payer authentication')) {
    return 'La verificación del banco (3D Secure) no se completó. Intenta de nuevo o usa otra tarjeta.'
  }
  if (lower.includes('invalid token') || lower.includes('transient token') || lower.includes('token expired')) {
    return 'La sesión de pago expiró. Recarga la página e ingresa la tarjeta de nuevo.'
  }
  if (lower.includes('404') && lower.includes('payment')) {
    return 'La sesión de pago ya no es válida. Empieza de nuevo la compra desde el principio.'
  }
  if (lower.includes('unauthorized') || lower.includes('forbidden')) {
    return 'No pudimos autorizar la operación con el banco. Inténtalo más tarde o usa otra tarjeta.'
  }
  if (/^Pago rechazado por CyberSource/i.test(original)) {
    const m = original.match(/\(([^)]+)\)/)
    const code = m?.[1]?.trim()
    return code && code !== 'sin-codigo'
      ? `El pago fue rechazado (código ${code}). Prueba otra tarjeta o consulta con tu banco.`
      : 'El pago fue rechazado por el banco o la red de la tarjeta. Prueba otra tarjeta o consulta con tu banco.'
  }
  if (lower.includes('captura rechazada')) {
    return 'El cobro no pudo completarse tras la autorización. Inténtalo de nuevo o contacta soporte con el comprobante.'
  }
  if (lower.includes('no se encontró la orden pendiente')) {
    return 'La sesión de pago expiró o no es válida. Recarga la página y vuelve a intentar la compra desde el inicio.'
  }
  return null
}

/**
 * Texto amigable para mostrar al usuario en el flujo de compra (entradas / pago en línea).
 */
export function formatPurchaseErrorForUser(raw: unknown): string {
  const s0 = extractMessage(raw).trim()
  if (!s0) return DEFAULT_PURCHASE

  if (shouldPassThrough(s0)) return s0

  let working = s0.replace(/\s+/g, ' ')
  const cyb = working.match(/^CyberSource\s*\d+\s*:\s*(.+)$/i)
  if (cyb) working = cyb[1].trim()

  const lower = working.toLowerCase()
  const mapped = mapByPatterns(lower, s0)
  if (mapped) return mapped

  if (/[áéíóúñ¿¡]/i.test(s0) && s0.length < 160 && !lower.includes('validation') && !lower.includes('params')) {
    return s0
  }

  if (working.length > 220 || /[{[\]}]/.test(working)) {
    return DEFAULT_PURCHASE
  }

  if (
    working.length <= 140 &&
    !/\b(error|invalid|validation|failed|declined|params|required|missing|unauthorized|forbidden|timeout|request|decline)\b/i.test(
      lower
    )
  ) {
    return s0
  }

  return DEFAULT_PURCHASE
}

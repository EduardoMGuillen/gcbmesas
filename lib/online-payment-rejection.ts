import { prisma } from '@/lib/prisma'
import { formatPurchaseErrorForUser } from '@/lib/purchase-user-friendly-error'

/** Claves estables para filtrar en admin (motivo del rechazo). */
export const ONLINE_PAYMENT_REJECTION_REASON_LABELS: Record<string, string> = {
  validacion_datos: 'Validación de datos',
  banco_rechazo: 'Rechazo del banco / emisor',
  cybersource_api: 'CyberSource (API / procesador)',
  captura: 'Captura del cobro',
  tres_ds: '3D Secure / verificación',
  cupo_negocio: 'Cupo o regla de negocio',
  sesion_orden: 'Sesión u orden pendiente',
  emision_entradas: 'Emisión de entradas',
  red_servidor: 'Red o error de servidor',
  otro: 'Otro / no clasificado',
}

export function classifyOnlinePaymentRejection(raw: string, friendlySpanish: string): string {
  const r = `${raw} ${friendlySpanish}`.toLowerCase()

  if (
    /3ds|payer auth|verificación del banco|challenge|cavv|eci|pares|directory server|authenticationtransactionid|step.?up|acs/i.test(
      r
    )
  ) {
    return 'tres_ds'
  }
  if (/captura rechazada|missing_capture|no_capture|capturestatus|rejected_capture/i.test(r)) {
    return 'captura'
  }
  if (
    (/sin cupo|cupo|capacity|disponible|no hay entradas|ya fue procesada|duplicate transaction/i.test(r) &&
      !/emitir las entradas|no se pudieron emitir/i.test(r)) ||
    (/cupo/i.test(r) && /entrada/i.test(r) && !/emitir/i.test(r))
  ) {
    return 'cupo_negocio'
  }
  if (/no se pudieron emitir|emitir las entradas|entry creation/i.test(r)) {
    return 'emision_entradas'
  }
  if (/no se encontró la orden|orden pendiente|token expir|invalid token|sesión de pago|transient token/i.test(r)) {
    return 'sesion_orden'
  }
  if (
    /tu banco rechazó|declined|decline|do not honor|insufficient funds|pick up|lost card|stolen|not permitted|transaction not allowed|fraud|suspicious|rechazado \(código/i.test(
      r
    )
  ) {
    return 'banco_rechazo'
  }
  if (/pago rechazado por cybersource|cybersource\s*\d+|processorinformation|rejected_auth/i.test(r)) {
    return 'cybersource_api'
  }
  if (
    /validation|params|invalid request|incompletos|faltan datos|número de tarjeta|cvv|facturaci|nombres de entradas|jwt|microform|authenticationtransactionid requerido/i.test(
      r
    )
  ) {
    return 'validacion_datos'
  }
  if (/timeout|failed to fetch|network|conexión|error interno|load failed|no está configurado|503|502|500/i.test(r)) {
    return 'red_servidor'
  }
  return 'otro'
}

export type ScheduleOnlinePaymentRejectionInput = {
  source: string
  httpStatus: number
  rawMessage: unknown
  /** Si se omite, se deriva con formatPurchaseErrorForUser(rawMessage). */
  friendlyMessage?: string
  eventId?: string | null
  paymentReference?: string | null
  clientEmail?: string | null
}

/**
 * Persiste un rechazo de pago online (no bloquea la respuesta HTTP ante fallo de DB).
 */
export function scheduleOnlinePaymentRejectionLog(input: ScheduleOnlinePaymentRejectionInput): void {
  const raw =
    input.rawMessage == null
      ? ''
      : typeof input.rawMessage === 'string'
        ? input.rawMessage
        : String(input.rawMessage)
  const friendly = (input.friendlyMessage ?? formatPurchaseErrorForUser(raw)).trim() || formatPurchaseErrorForUser('')
  const reasonCategory = classifyOnlinePaymentRejection(raw, friendly)

  prisma.onlinePaymentRejection
    .create({
      data: {
        source: input.source.slice(0, 64),
        httpStatus: input.httpStatus,
        reasonCategory,
        friendlyMessage: friendly.slice(0, 4000),
        rawMessage: raw.slice(0, 8000),
        eventId: input.eventId || undefined,
        paymentReference: input.paymentReference ? String(input.paymentReference).slice(0, 120) : undefined,
        clientEmail: input.clientEmail ? String(input.clientEmail).trim().slice(0, 200) : undefined,
      },
    })
    .catch((e) => console.error('[OnlinePaymentRejection] persist failed:', e))
}

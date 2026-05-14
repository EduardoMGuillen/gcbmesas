import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getOnlinePaymentRejections } from '@/lib/actions'
import { RechazosPagoClient } from './RechazosPagoClient'

export const dynamic = 'force-dynamic'

export default async function RechazosPagoPage({
  searchParams,
}: {
  searchParams: { motivo?: string; evento?: string; ref?: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session || !['ADMIN', 'CLIENTE_TICKETERA'].includes(session.user.role)) {
    redirect('/login')
  }

  const motivo = searchParams.motivo?.trim() || ''
  const evento = searchParams.evento?.trim() || ''
  const ref = searchParams.ref?.trim() || ''

  const { rows, eventOptions } = await getOnlinePaymentRejections({
    reasonCategory: motivo || undefined,
    eventId: evento || undefined,
    paymentReferenceContains: ref || undefined,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">Rechazos de pago online</h1>
        <p className="text-sm sm:text-base text-dark-300">
          Registro de intentos fallidos (validación, banco, 3DS, captura, etc.). Los mensajes en español coinciden con
          lo que ve el comprador cuando aplica.
        </p>
      </div>
      <RechazosPagoClient
        rows={rows}
        eventOptions={eventOptions}
        initialMotivo={motivo}
        initialEvento={evento}
        initialRef={ref}
      />
    </div>
  )
}

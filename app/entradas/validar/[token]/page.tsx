import { validateEntryByToken } from '@/lib/actions'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function ValidarEntradaPage({
  params,
}: {
  params: { token: string }
}) {
  const entry = await validateEntryByToken(params.token)

  if (!entry) {
    notFound()
  }

  const statusConfig = {
    ACTIVE: {
      label: 'VÁLIDA',
      bg: 'bg-green-500/20',
      border: 'border-green-500/50',
      text: 'text-green-400',
      icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      headerBg: 'from-green-600 to-green-700',
    },
    USED: {
      label: 'YA UTILIZADA',
      bg: 'bg-blue-500/20',
      border: 'border-blue-500/50',
      text: 'text-blue-400',
      icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
      headerBg: 'from-blue-600 to-blue-700',
    },
    CANCELLED: {
      label: 'CANCELADA',
      bg: 'bg-red-500/20',
      border: 'border-red-500/50',
      text: 'text-red-400',
      icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
      headerBg: 'from-red-600 to-red-700',
    },
  }

  const sc = statusConfig[entry.status]

  // Check if the event date has already passed (give 1 day buffer after event)
  const eventDate = new Date(entry.event.date)
  const now = new Date()
  const oneDayAfterEvent = new Date(eventDate.getTime() + 24 * 60 * 60 * 1000)
  const eventHasPassed = now > oneDayAfterEvent

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-300 via-dark-200 to-dark-300 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-dark-100 border border-dark-200 rounded-2xl overflow-hidden shadow-2xl">
          {/* Header */}
          <div className={`bg-gradient-to-r ${eventHasPassed ? 'from-gray-600 to-gray-700' : sc.headerBg} p-6 text-center`}>
            <svg className="w-16 h-16 mx-auto text-white mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={eventHasPassed ? 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' : sc.icon} />
            </svg>
            <h1 className="text-2xl font-bold text-white">
              {eventHasPassed ? 'Evento Finalizado' : `Entrada ${sc.label}`}
            </h1>
            <p className="text-white/80 text-sm mt-1">Casa Blanca</p>
          </div>

          {/* Event passed banner */}
          {eventHasPassed && (
            <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-3 text-center">
              <p className="text-amber-400 text-sm font-medium">Este evento ya pas&oacute;. Esta entrada ya no es v&aacute;lida para acceso.</p>
            </div>
          )}

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Event info */}
            <div className="text-center">
              <h2 className="text-xl font-bold text-white">{entry.event.name}</h2>
              <p className="text-dark-300 text-sm">
                {new Date(entry.event.date).toLocaleDateString('es-HN', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  timeZone: 'UTC',
                })}
              </p>
            </div>

            {/* Details */}
            <div className={`bg-dark-50 border border-dark-200 rounded-xl p-4 space-y-3 ${eventHasPassed ? 'opacity-60' : ''}`}>
              <div className="flex justify-between items-center">
                <span className="text-sm text-dark-300">Cliente</span>
                <span className="text-white font-medium">{entry.clientName}</span>
              </div>
              <div className="border-t border-dark-200" />
              <div className="flex justify-between items-center">
                <span className="text-sm text-dark-300">Email</span>
                <span className="text-white text-sm">{entry.clientEmail}</span>
              </div>
              <div className="border-t border-dark-200" />
              <div className="flex justify-between items-center">
                <span className="text-sm text-dark-300">Entradas</span>
                <span className="text-white font-bold text-lg">{entry.numberOfEntries}</span>
              </div>
              <div className="border-t border-dark-200" />
              <div className="flex justify-between items-center">
                <span className="text-sm text-dark-300">Total Pagado</span>
                <span className="text-primary-400 font-bold text-lg">
                  L {entry.totalPrice.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Status badge */}
            {eventHasPassed ? (
              <div className="bg-gray-500/20 border border-gray-500/50 rounded-xl p-4 text-center">
                <p className="text-lg font-bold text-gray-400">Evento finalizado</p>
                <p className="text-sm text-gray-500 mt-1">Gracias por asistir</p>
              </div>
            ) : (
              <div className={`${sc.bg} ${sc.border} border rounded-xl p-4 text-center`}>
                <p className={`text-lg font-bold ${sc.text}`}>
                  {entry.status === 'ACTIVE' && 'Entrada válida para acceso'}
                  {entry.status === 'USED' && 'Esta entrada ya fue utilizada'}
                  {entry.status === 'CANCELLED' && 'Esta entrada fue cancelada'}
                </p>
              </div>
            )}

            {/* Timestamp */}
            <p className="text-center text-xs text-dark-300/60">
              Comprada el {new Date(entry.createdAt).toLocaleString('es-HN')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

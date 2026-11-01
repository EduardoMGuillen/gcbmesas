import Link from 'next/link'

type Props = {
  name: string
  eventDateLabel: string
  description: string | null
  coverImage: string | null
  listHref: '/eventos' | '/cbtickets'
  /** Canal GCBTickets: blanco, negro y dorado; LCB: índigo y amarillo. */
  theme?: 'lcb' | 'cbtickets'
}

export function FreeCoverEventView({ name, eventDateLabel, description, coverImage, listHref, theme = 'lcb' }: Props) {
  const isCb = theme === 'cbtickets'
  return (
    <div className="max-w-4xl mx-auto text-center py-8 px-4">
      {coverImage ? (
        <div
          className={`mb-8 flex justify-center rounded-2xl p-2 sm:p-3 ${
            isCb ? 'border border-[#E7E5E4] bg-white' : 'bg-[#1C1640] ring-1 ring-white/15'
          }`}
        >
          <img
            src={coverImage}
            alt={name}
            className="max-h-[min(88vh,1600px)] w-auto max-w-full object-contain rounded-xl"
            loading="eager"
            decoding="async"
          />
        </div>
      ) : null}
      <p
        className={`text-sm uppercase tracking-widest mb-2 ${
          isCb ? 'text-[#B8913A]' : 'text-[#E8C531]'
        }`}
      >
        {eventDateLabel}
      </p>
      <h1 className={`text-2xl sm:text-3xl font-bold mb-4 ${isCb ? 'text-neutral-950' : 'lcb-display uppercase text-white'}`}>{name}</h1>
      <div
        className="inline-block px-5 py-2.5 rounded-full text-sm font-bold mb-6"
        style={
          isCb
            ? {
                background: '#F4ECD8',
                border: '1px solid rgba(184,145,58,0.35)',
                color: '#7A5F22',
              }
            : {
                background: 'rgba(232,197,49,0.14)',
                border: '1px solid rgba(232,197,49,0.45)',
                color: '#F0D04A',
              }
        }
      >
        Cover gratuito
      </div>
      <p className={`text-sm mb-6 ${isCb ? 'text-neutral-500' : 'text-white/60'}`}>
        Sin venta de entradas en línea para este evento.
      </p>
      {description ? (
        <p className={`text-sm text-left leading-relaxed mb-8 whitespace-pre-wrap ${isCb ? 'text-neutral-700' : 'text-white/75'}`}>
          {description}
        </p>
      ) : null}
      <Link
        href={listHref}
        className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-full transition-all hover:scale-105"
        style={
          isCb
            ? {
                background: '#0A0A0A',
                color: '#ffffff',
                boxShadow: '0 8px 24px -10px rgba(10,10,10,0.5)',
              }
            : {
                background: '#E8C531',
                color: '#140F2E',
                boxShadow: '0 12px 34px -12px rgba(232,197,49,0.8)',
              }
        }
      >
        Volver a eventos
      </Link>
    </div>
  )
}

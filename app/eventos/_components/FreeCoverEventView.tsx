import Link from 'next/link'

type Props = {
  name: string
  eventDateLabel: string
  description: string | null
  coverImage: string | null
  listHref: '/eventos' | '/cbtickets'
  /** Canal CBTickets: paleta negro / dorado acorde al sitio. */
  theme?: 'lcb' | 'cbtickets'
}

export function FreeCoverEventView({ name, eventDateLabel, description, coverImage, listHref, theme = 'lcb' }: Props) {
  const isCb = theme === 'cbtickets'
  return (
    <div className="max-w-4xl mx-auto text-center py-8 px-4">
      {coverImage ? (
        <div
          className={`mb-8 flex justify-center rounded-2xl p-2 sm:p-3 ${
            isCb ? 'border border-white/10 bg-[#173329]' : 'border border-white/10 bg-black/20'
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
          isCb ? 'text-[#C8A257]' : 'text-cyan-300/90'
        }`}
      >
        {eventDateLabel}
      </p>
      <h1 className={`text-2xl sm:text-3xl font-bold mb-4 ${isCb ? 'cbt-display text-[#F3ECDD]' : 'text-white'}`}>{name}</h1>
      <div
        className="inline-block px-5 py-2.5 rounded-full text-sm font-bold mb-6"
        style={
          isCb
            ? {
                background: 'rgba(176,143,66,0.12)',
                border: '1px solid rgba(176,143,66,0.5)',
                color: '#D9BE7A',
              }
            : {
                background: 'linear-gradient(45deg, rgba(34,197,94,0.25), rgba(16,185,129,0.15))',
                border: '1px solid rgba(52,211,153,0.45)',
                color: '#6ee7b7',
              }
        }
      >
        Cover gratuito
      </div>
      <p className={`text-sm mb-6 ${isCb ? 'text-[#F3ECDD]/55' : 'text-white/45'}`}>
        Sin venta de entradas en línea para este evento.
      </p>
      {description ? (
        <p className={`text-sm text-left leading-relaxed mb-8 whitespace-pre-wrap ${isCb ? 'text-[#F3ECDD]/75' : 'text-white/65'}`}>
          {description}
        </p>
      ) : null}
      <Link
        href={listHref}
        className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-full transition-all hover:scale-105"
        style={
          isCb
            ? {
                background: 'linear-gradient(180deg, #E6CB86, #C8A257 55%, #A9843A)',
                color: '#1D1B16',
                boxShadow: '0 6px 22px rgba(176,143,66,0.28)',
              }
            : {
                background: 'linear-gradient(45deg, #00ffff, #a855f7)',
                color: '#0a0a15',
                boxShadow: '0 4px 20px rgba(0,255,255,0.2)',
              }
        }
      >
        Volver a eventos
      </Link>
    </div>
  )
}

import Link from 'next/link'

type Props = {
  name: string
  eventDateLabel: string
  description: string | null
  coverImage: string | null
  listHref: '/eventos' | '/cbtickets'
}

export function FreeCoverEventView({ name, eventDateLabel, description, coverImage, listHref }: Props) {
  return (
    <div className="max-w-xl mx-auto text-center py-8 px-4">
      {coverImage ? (
        <div className="mb-8 rounded-2xl overflow-hidden border border-white/10">
          <img src={coverImage} alt={name} className="w-full max-h-72 object-cover" />
        </div>
      ) : null}
      <p className="text-sm uppercase tracking-widest text-cyan-300/90 mb-2">{eventDateLabel}</p>
      <h1 className="text-2xl sm:text-3xl font-bold text-white mb-4">{name}</h1>
      <div
        className="inline-block px-5 py-2.5 rounded-full text-sm font-bold mb-6"
        style={{
          background: 'linear-gradient(45deg, rgba(34,197,94,0.25), rgba(16,185,129,0.15))',
          border: '1px solid rgba(52,211,153,0.45)',
          color: '#6ee7b7',
        }}
      >
        Cover gratuito
      </div>
      <p className="text-white/45 text-sm mb-6">Sin venta de entradas en línea para este evento.</p>
      {description ? (
        <p className="text-white/65 text-sm text-left leading-relaxed mb-8 whitespace-pre-wrap">{description}</p>
      ) : null}
      <Link
        href={listHref}
        className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-full transition-all hover:scale-105"
        style={{
          background: 'linear-gradient(45deg, #00ffff, #a855f7)',
          color: '#0a0a15',
          boxShadow: '0 4px 20px rgba(0,255,255,0.2)',
        }}
      >
        Volver a eventos
      </Link>
    </div>
  )
}

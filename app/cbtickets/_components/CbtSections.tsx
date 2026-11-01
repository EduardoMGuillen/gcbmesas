import { CBT_FAQ, CBT_ORGANIZERS_WHATSAPP, CBT_SELL_CTA } from './contact'

const STEPS = [
  { title: 'Elige tu evento', text: 'Encuentra la fiesta o el concierto y cuántas entradas necesitas.' },
  { title: 'Paga con tarjeta', text: 'Pago seguro procesado por BAC. Sin crear cuenta.' },
  { title: 'Entra con tu QR', text: 'Llega a tu correo al instante. Lo muestras desde el celular.' },
]

export function CbtHowItWorks() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6" aria-labelledby="como-comprar">
      <h2 id="como-comprar" className="cbt-display max-w-xl text-4xl font-medium leading-tight sm:text-5xl">
        Comprar tu entrada toma menos de un minuto
      </h2>
      <ol className="relative mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
        <div className="absolute left-0 right-0 top-6 hidden border-t-2 border-dashed border-cbt-gold/30 md:block" aria-hidden />
        {STEPS.map((s, i) => (
          <li key={s.title} className="relative">
            <span className="cbt-display relative flex h-12 w-12 items-center justify-center rounded-full bg-cbt-night text-xl font-semibold text-cbt-gold-hi ring-1 ring-cbt-gold/50">
              {i + 1}
            </span>
            <h3 className="mt-5 text-lg font-semibold">{s.title}</h3>
            <p className="mt-2 max-w-xs leading-relaxed text-cbt-ivory/60">{s.text}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

const ORGANIZER_BENEFITS = [
  { title: 'Cobros con tarjeta', text: 'Tus clientes pagan en línea y tú no manejas efectivo.' },
  { title: 'QR imposible de copiar', text: 'Cada entrada es única y se invalida al escanearla.' },
  { title: 'Puerta sin filas', text: 'Tu equipo escanea con nuestra app desde el celular.' },
  { title: 'Ventas en tiempo real', text: 'Sabes cuántas entradas llevas vendidas en todo momento.' },
]

export function CbtOrganizers() {
  return (
    <section id="organizadores" className="cbt-paper scroll-mt-20 text-cbt-ink" aria-labelledby="organizadores-titulo">
      <div className="mx-auto grid max-w-6xl gap-14 px-4 py-24 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:items-center">
        <div>
          <p className="text-sm font-semibold text-cbt-gold-lo">Para organizadores de eventos</p>
          <h2 id="organizadores-titulo" className="cbt-display mt-3 text-[2.6rem] font-medium leading-[1.04] sm:text-6xl">
            {CBT_SELL_CTA}
          </h2>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-cbt-ink/70">
            Publicamos tu evento, activamos la venta en línea y te damos todo para controlar la puerta. Tú te enfocas en llenar el lugar.
          </p>
          <a href={CBT_ORGANIZERS_WHATSAPP} target="_blank" rel="noopener noreferrer" className="cbt-btn-ink mt-9 px-8 py-4 text-[15px]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm5.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
            </svg>
            Escríbenos por WhatsApp
          </a>
        </div>
        <ul className="grid gap-px overflow-hidden rounded-3xl bg-cbt-ink/10 sm:grid-cols-2">
          {ORGANIZER_BENEFITS.map((b) => (
            <li key={b.title} className="bg-cbt-ivory p-7">
              <h3 className="cbt-display text-xl font-semibold">{b.title}</h3>
              <p className="mt-2 leading-relaxed text-cbt-ink/65">{b.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export function CbtFaq() {
  return (
    <section id="faq" className="mx-auto grid max-w-6xl scroll-mt-20 gap-12 px-4 py-24 sm:px-6 lg:grid-cols-[0.8fr_1.2fr]" aria-labelledby="faq-titulo">
      <div>
        <h2 id="faq-titulo" className="cbt-display text-4xl font-medium leading-tight sm:text-5xl">
          Preguntas frecuentes
        </h2>
        <p className="mt-4 max-w-sm text-cbt-ivory/60">Todo lo que necesitas saber para comprar o vender entradas en Honduras.</p>
      </div>
      <div className="border-t border-cbt-gold/20">
        {CBT_FAQ.map((f) => (
          <details key={f.q} id={f.id} className="cbt-faq group scroll-mt-24 border-b border-cbt-gold/20">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-lg font-medium">
              {f.q}
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 ring-cbt-gold/40 transition-transform duration-300 group-open:rotate-45" aria-hidden>
                <svg width="12" height="12" viewBox="0 0 12 12" stroke="#E6CB86" strokeWidth="1.5"><path d="M6 1v10M1 6h10" /></svg>
              </span>
            </summary>
            <p className="max-w-2xl pb-6 leading-relaxed text-cbt-ivory/65">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}

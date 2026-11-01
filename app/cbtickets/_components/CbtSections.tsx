import { CBT_FAQ, CBT_ORGANIZERS_WHATSAPP, CBT_SELL_CTA } from './contact'

const ORGANIZER_FEATURES = [
  ['Venta en línea con tarjeta', 'Tus clientes pagan con Visa o Mastercard y tú recibes el reporte.'],
  ['QR único por entrada', 'Cada entrada se valida una sola vez en la puerta.'],
  ['Escaneo desde el celular', 'Tu equipo controla el acceso con nuestra app, sin listas.'],
  ['Ventas en tiempo real', 'Sabes cuántas entradas llevas vendidas en todo momento.'],
]

export function CbtOrganizers() {
  return (
    <section id="organizadores" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-20 sm:px-6" aria-labelledby="organizadores-titulo">
      <div className="relative overflow-hidden rounded-[28px] bg-gcb-ink text-white sm:rounded-[36px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/Eventos/4.png" alt="" className="absolute inset-y-0 right-0 hidden h-full w-1/2 object-cover opacity-60 lg:block" aria-hidden />
        <div className="absolute inset-0 hidden bg-gradient-to-r from-gcb-ink via-gcb-ink/90 to-transparent lg:block" aria-hidden />
        <div className="relative grid gap-10 p-8 sm:p-12 lg:grid-cols-2 lg:p-16">
          <div>
            <p className="text-sm font-semibold text-gcb-gold-hi">Para organizadores</p>
            <h2 id="organizadores-titulo" className="mt-3 text-3xl font-extrabold tracking-tight sm:text-5xl">
              {CBT_SELL_CTA}
            </h2>
            <p className="mt-4 max-w-md text-white/70">
              Publicamos tu evento, activamos la venta en línea y te damos todo para controlar la puerta.
            </p>
            <a href={CBT_ORGANIZERS_WHATSAPP} target="_blank" rel="noopener noreferrer" className="gcb-btn gcb-btn-gold mt-8 px-8 py-4">
              Hablar con un asesor
            </a>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:self-end">
            {ORGANIZER_FEATURES.map(([t, d]) => (
              <li key={t} className="gcb-glass-dark rounded-2xl p-5">
                <p className="font-semibold">{t}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-white/65">{d}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

export function CbtFaq() {
  return (
    <section id="faq" className="mx-auto grid max-w-7xl scroll-mt-20 gap-10 px-4 pb-24 sm:px-6 lg:grid-cols-[1fr_1.6fr]" aria-labelledby="faq-titulo">
      <div>
        <h2 id="faq-titulo" className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Preguntas frecuentes
        </h2>
        <p className="mt-3 text-neutral-500">Sobre compras, entradas y reembolsos.</p>
      </div>
      <div className="divide-y divide-gcb-line border-y border-gcb-line">
        {CBT_FAQ.map((f) => (
          <details key={f.q} id={f.id} className="gcb-faq group scroll-mt-24">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 font-semibold">
              {f.q}
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gcb-mist transition-transform duration-300 group-open:rotate-45" aria-hidden>
                <svg width="11" height="11" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="1.6"><path d="M6 1v10M1 6h10" /></svg>
              </span>
            </summary>
            <p className="max-w-2xl pb-5 text-sm leading-relaxed text-neutral-600">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}

import { CBT_ORGANIZERS_WHATSAPP, CBT_REFUND_POLICY, CBT_SUPPORT_PHONE_LABEL } from './contact'

function SectionHeader({ eyebrow, title, lead }: { eyebrow: string; title: string; lead?: string }) {
  return (
    <header className="mb-10 max-w-2xl">
      <p className="cbt-eyebrow">{eyebrow}</p>
      <h2 className="cbt-serif mt-3 text-4xl font-semibold leading-tight sm:text-5xl">{title}</h2>
      {lead && <p className="mt-4 text-[#EDE6D6]/60">{lead}</p>}
    </header>
  )
}

const STEPS = [
  { title: 'Elige tu evento', text: 'Encuentra el evento y la cantidad de entradas que necesitas.' },
  { title: 'Paga con tarjeta', text: 'Pago seguro procesado por BAC. Sin cuentas ni registros.' },
  { title: 'Recibe tu QR', text: 'Te llega al correo al instante. Preséntalo desde el celular en la entrada.' },
]

export function CbtHowItWorks() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <SectionHeader eyebrow="Cómo funciona" title="Tres pasos y estás dentro" />
      <ol className="grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <li key={s.title} className="bg-[#0B0B0B] p-8">
            <span className="cbt-serif text-5xl font-semibold text-[#B08F42]">0{i + 1}</span>
            <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-[#EDE6D6]/60">{s.text}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

const WHY = [
  { title: 'Pago seguro', text: 'Transacciones con tarjeta procesadas por BAC Credomatic.' },
  { title: 'Entrada oficial', text: 'Cada QR es único y se valida en puerta: no se puede duplicar.' },
  { title: 'Al instante', text: 'Tu entrada llega al correo apenas se confirma el pago.' },
  { title: 'Soporte real', text: `Te atendemos por WhatsApp al ${CBT_SUPPORT_PHONE_LABEL}.` },
]

export function CbtWhy() {
  return (
    <section className="border-y border-white/10 bg-[#141210]">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <SectionHeader eyebrow="Por qué GCBTickets" title="Compra con confianza" />
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {WHY.map((w) => (
            <div key={w.title} className="border-t border-[#B08F42]/40 pt-5">
              <h3 className="text-lg font-semibold">{w.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#EDE6D6]/60">{w.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const ORGANIZER_BENEFITS = [
  'Venta en línea con tarjeta, sin que tengas que manejar pagos.',
  'QR anti-falsificación para cada entrada.',
  'Escaneo en puerta con nuestra app: rápido y sin listas de papel.',
  'Reporte de ventas en tiempo real.',
]

export function CbtOrganizers() {
  return (
    <section id="organizadores" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-20 sm:px-6">
      <div className="grid gap-10 rounded-3xl border border-[#B08F42]/35 bg-gradient-to-br from-[#1a1610] to-[#0B0B0B] p-8 sm:p-12 lg:grid-cols-2">
        <div>
          <p className="cbt-eyebrow">Para organizadores</p>
          <h2 className="cbt-serif mt-3 text-4xl font-semibold leading-tight sm:text-5xl">¿Tienes un evento? Vende tus entradas con nosotros</h2>
          <a href={CBT_ORGANIZERS_WHATSAPP} target="_blank" rel="noopener noreferrer" className="cbt-btn-gold mt-8 px-7 py-3">
            Hablemos por WhatsApp
          </a>
        </div>
        <ul className="flex flex-col justify-center gap-4">
          {ORGANIZER_BENEFITS.map((b) => (
            <li key={b} className="flex gap-3 text-[#EDE6D6]/80">
              <svg className="mt-0.5 h-5 w-5 shrink-0 text-[#B08F42]" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-4-4a1 1 0 011.4-1.4L8 12.6l7.3-7.3a1 1 0 011.4 0z" clipRule="evenodd" />
              </svg>
              {b}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

const FAQ = [
  {
    q: '¿Cómo recibo mi entrada?',
    a: 'Tu código QR llega al correo que indicaste al comprar, apenas se confirma el pago.',
  },
  {
    q: '¿Qué hago si no me llega el correo?',
    a: `Revisa tu carpeta de spam o promociones. Si no aparece, escríbenos por WhatsApp al ${CBT_SUPPORT_PHONE_LABEL} con el nombre y el correo que usaste en la compra.`,
  },
  {
    q: '¿Tengo que imprimir la entrada?',
    a: 'No. Muestra el QR desde tu celular en la entrada del evento.',
  },
]

export function CbtFaq() {
  return (
    <section id="faq" className="mx-auto max-w-3xl scroll-mt-24 px-4 py-20 sm:px-6">
      <SectionHeader eyebrow="Preguntas frecuentes" title="Resolvemos tus dudas" />
      <div className="divide-y divide-white/10 border-y border-white/10">
        {FAQ.map((f) => (
          <details key={f.q} className="group py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold [&::-webkit-details-marker]:hidden">
              {f.q}
              <span className="text-2xl text-[#B08F42] transition-transform group-open:rotate-45" aria-hidden>+</span>
            </summary>
            <p className="mt-3 leading-relaxed text-[#EDE6D6]/65">{f.a}</p>
          </details>
        ))}
        <details id="reembolsos" className="group scroll-mt-24 py-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold [&::-webkit-details-marker]:hidden">
            ¿Hay reembolsos?
            <span className="text-2xl text-[#B08F42] transition-transform group-open:rotate-45" aria-hidden>+</span>
          </summary>
          <p className="mt-3 leading-relaxed text-[#EDE6D6]/65">{CBT_REFUND_POLICY}</p>
        </details>
      </div>
    </section>
  )
}

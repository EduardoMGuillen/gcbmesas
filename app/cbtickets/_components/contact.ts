/** Contacto y textos fijos de GCBTickets (soporte y ventas operados por Nexus Global). */
export const CBT_SUPPORT_WHATSAPP = 'https://wa.me/50498823627'
export const CBT_SUPPORT_PHONE_LABEL = '+504 9882-3627'
export const CBT_SELL_CTA = 'Vende tus entradas con nosotros'
export const CBT_ORGANIZERS_WHATSAPP = `${CBT_SUPPORT_WHATSAPP}?text=${encodeURIComponent(
  'Hola, quiero vender las entradas de mi evento con GCBTickets'
)}`
export const CBT_INSTAGRAM = 'https://www.instagram.com/casablanca_sps/'

export const CBT_REFUND_POLICY =
  'Las entradas no son reembolsables. La única excepción es la cancelación del evento por parte del organizador: en ese caso se reembolsa el 100 % del valor pagado al mismo método de pago, en un plazo de hasta 15 días hábiles, sin necesidad de solicitarlo. Si el evento cambia de fecha, la entrada sigue siendo válida para la nueva fecha. No aplican reembolsos por inasistencia, llegada tarde, negación de acceso por incumplir las políticas del lugar ni por cambios en el line-up.'

/** Se usa en la página y en el JSON-LD FAQPage: el texto debe ser idéntico en ambos. */
export const CBT_FAQ: { id?: string; q: string; a: string }[] = [
  {
    q: '¿Qué es GCBTickets?',
    a: 'GCBTickets es una ticketera en línea de Honduras para comprar entradas de fiestas, conciertos y eventos. Pagas con tarjeta y recibes tu entrada con código QR al instante en tu correo.',
  },
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
  { id: 'reembolsos', q: '¿Hay reembolsos?', a: CBT_REFUND_POLICY },
  {
    q: '¿Cómo vendo las entradas de mi evento con GCBTickets?',
    a: `Escríbenos por WhatsApp al ${CBT_SUPPORT_PHONE_LABEL}. Publicamos tu evento, activamos la venta en línea con tarjeta y te damos la app para escanear las entradas en la puerta.`,
  },
]

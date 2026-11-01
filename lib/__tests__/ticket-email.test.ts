import { describe, it, expect } from 'vitest'
import { buildTicketEmailHtml, type TicketEmailData } from '@/lib/ticket-email'

const base: TicketEmailData = {
  firstName: 'Ana',
  eventName: 'Noche <X>',
  eventDateLabel: 'sábado, 12 de diciembre de 2026',
  coverImageUrl: 'https://x/p.jpg',
  venueName: 'Studio 54',
  venueAddress: 'CA-5, San Pedro Sula',
  totalLps: 2000,
  paymentReference: 'REF123',
  tickets: [
    { holderName: 'Ana López', qrCid: 'qrcode0' },
    { holderName: 'Luis Pérez', qrCid: 'qrcode1' },
  ],
}

describe('buildTicketEmailHtml', () => {
  it('incluye un QR por entrada usando los cid adjuntos', () => {
    const html = buildTicketEmailHtml(base)
    expect(html).toContain('src="cid:qrcode0"')
    expect(html).toContain('src="cid:qrcode1"')
    expect(html).toContain('Entrada 1 de 2')
    expect(html).toContain('Entrada 2 de 2')
  })
  it('escapa los textos del evento y del cliente', () => {
    const html = buildTicketEmailHtml({ ...base, firstName: '<b>Ana</b>' })
    expect(html).toContain('Noche &lt;X&gt;')
    expect(html).not.toContain('<b>Ana</b>')
  })
  it('muestra total en lempiras y referencia', () => {
    const html = buildTicketEmailHtml(base)
    expect(html).toContain('L 2,000.00')
    expect(html).toContain('REF123')
  })
  it('una sola entrada usa singular', () => {
    const html = buildTicketEmailHtml({ ...base, tickets: [base.tickets[0]] })
    expect(html).toContain('Tu entrada está confirmada')
    expect(html).not.toContain('Entrada 1 de 1')
  })
  it('el botón de Apple Wallet solo aparece si hay URL', () => {
    expect(buildTicketEmailHtml(base)).not.toContain('Apple Wallet')
    const html = buildTicketEmailHtml({ ...base, tickets: [{ ...base.tickets[0], appleWalletUrl: 'https://w/1.pkpass' }] })
    expect(html).toContain('href="https://w/1.pkpass"')
    expect(html).toContain('Apple Wallet')
  })
  it('sin afiche ni lugar no rompe la estructura', () => {
    const html = buildTicketEmailHtml({ ...base, coverImageUrl: null, venueName: null, venueAddress: null })
    expect(html).not.toContain('https://x/p.jpg')
    expect(html).not.toContain('>Lugar<')
  })
})

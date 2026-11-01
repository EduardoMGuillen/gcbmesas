import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPublicEvents } from '@/lib/public-events'
import LandingPage from './_components/LandingPage'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'La Gran Casa Blanca | Astronomical, Studio 54 y Beer Garden en San Pedro Sula',
  description: 'Tres ambientes, una sola noche: Astronomical, Studio 54 y Casa Blanca Beer Garden en San Pedro Sula. Compra tus entradas en línea y reserva tu mesa por WhatsApp.',
  keywords: [
    'La Gran Casa Blanca',
    'Casa Blanca SPS',
    'Astronomical',
    'Studio 54',
    'discoteca San Pedro Sula',
    'discoteca Honduras',
    'eventos San Pedro Sula',
    'fiesta San Pedro Sula',
    'vida nocturna Honduras',
    'entradas en linea',
  ],
}

export default async function Home() {
  try {
    const session = await getServerSession(authOptions)

    if (session?.user?.role) {
      if (session.user.role === 'ADMIN')    redirect('/admin')
      if (session.user.role === 'CLIENTE_TICKETERA') redirect('/admin/entradas')
      if (session.user.role === 'MESERO')   redirect('/mesero')
      if (session.user.role === 'CAJERO')   redirect('/cajero')
      if (session.user.role === 'TAQUILLA') redirect('/taquilla')
      if (session.user.role === 'COCINA') redirect('/cocina')
      if (session.user.role === 'BAR') redirect('/bar')
    }
  } catch {
    // Not authenticated — show landing page
  }

  const rawEvents = await getPublicEvents('lcb')
  const events = rawEvents.map((e) => ({
    id: e.id,
    name: e.name,
    date: e.date,
    description: e.description,
    coverImage: e.coverImage,
    coverPrice: Number(e.coverPrice),
    paypalPrice: e.paypalPrice != null ? e.paypalPrice.toString() : null,
    maxEntries: e.maxEntries,
    entriesSoldSum: e.entriesSoldSum,
    isFeatured: e.isFeatured,
  }))

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NightClub',
    name: 'La Gran Casa Blanca',
    url: 'https://lagrancasablanca.com',
    logo: 'https://lagrancasablanca.com/LogoCasaBlanca.png',
    image: 'https://lagrancasablanca.com/Eventos/3.png',
    description: 'Astronomical, Studio 54 y Casa Blanca Beer Garden: tres ambientes en un mismo lugar en San Pedro Sula.',
    telephone: '+504-9824-0217',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'CA-5',
      addressLocality: 'San Pedro Sula',
      addressRegion: 'Cortés',
      addressCountry: 'HN',
    },
    geo: { '@type': 'GeoCoordinates', latitude: 15.5056, longitude: -88.0337 },
    openingHoursSpecification: [
      { '@type': 'OpeningHoursSpecification', dayOfWeek: 'Thursday', opens: '22:00', closes: '02:00' },
      { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Friday', 'Saturday'], opens: '22:00', closes: '04:00' },
    ],
    sameAs: ['https://www.instagram.com/casablanca_sps/', 'https://www.facebook.com/profile.php?id=61576409706854'],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <LandingPage events={events} />
    </>
  )
}

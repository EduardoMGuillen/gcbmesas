import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPublicEvents } from '@/lib/public-events'
import LandingPage from './_components/LandingPage'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'La Gran Casa Blanca | Astronomical · Studio 54 · San Pedro Sula',
  description: 'La mejor experiencia nocturna de San Pedro Sula. Astronomical, Studio 54 y Casa Blanca. Compra tus entradas en línea.',
}

export default async function Home() {
  try {
    const session = await getServerSession(authOptions)

    if (session?.user?.role) {
      if (session.user.role === 'ADMIN')    redirect('/admin')
      if (session.user.role === 'MESERO')   redirect('/mesero')
      if (session.user.role === 'CAJERO')   redirect('/cajero')
      if (session.user.role === 'TAQUILLA') redirect('/taquilla')
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
  }))

  return <LandingPage events={events} />
}

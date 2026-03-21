import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPublicEvents } from '@/lib/actions'
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

  const rawEvents = await getPublicEvents()
  const events = rawEvents.map(e => ({
    ...e,
    paypalPrice: e.paypalPrice?.toString() ?? null,
    coverPrice:  e.coverPrice?.toString()  ?? null,
  }))

  return <LandingPage events={events} />
}

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { AttendanceMarkCard } from '@/components/AttendanceMarkCard'
import { PushSubscriptionButton } from '@/components/PushSubscriptionButton'

export const dynamic = 'force-dynamic'

export default async function MeseroMarcajesPage() {
  const session = await getServerSession(authOptions)

  if (!session || !['MESERO', 'ADMIN'].includes(session.user.role)) {
    redirect('/login')
  }

  const isAdmin = session.user.role === 'ADMIN'

  return (
    <div className="min-h-screen flex flex-col">
      {!isAdmin && <Navbar />}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1 w-full">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">Marcaje</h1>
            <p className="text-sm text-dark-400">Entrada y salida con ubicación y selfie</p>
          </div>
          <PushSubscriptionButton />
        </div>
        <AttendanceMarkCard />
      </main>
      {!isAdmin && <Footer />}
    </div>
  )
}

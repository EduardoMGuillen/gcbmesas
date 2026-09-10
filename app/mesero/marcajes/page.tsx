import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AttendanceMarkCard } from '@/components/AttendanceMarkCard'

export const dynamic = 'force-dynamic'

export default async function MeseroMarcajesPage() {
  const session = await getServerSession(authOptions)

  if (!session || !['MESERO', 'ADMIN'].includes(session.user.role)) {
    redirect('/login')
  }

  return (
    <div className="max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">Marcaje</h1>
          <p className="text-sm text-dark-400">Entrada y salida con ubicación y selfie</p>
        </div>
        <AttendanceMarkCard />
    </div>
  )
}

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getLogs } from '@/lib/actions'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { LogsList } from '@/components/LogsList'

export default async function LogsPage({
  searchParams,
}: {
  searchParams: { tableId?: string; userId?: string; action?: string }
}) {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'ADMIN') {
    redirect('/login')
  }

  const logs = await getLogs({
    tableId: searchParams.tableId,
    userId: searchParams.userId,
    action: searchParams.action as any,
  })

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="max-w-7xl mx-auto px-0 sm:px-6 lg:px-8 py-8 flex-1">
        <div className="px-4 sm:px-0">
          <LogsList initialLogs={logs} />
        </div>
      </main>
      <Footer />
    </div>
  )
}


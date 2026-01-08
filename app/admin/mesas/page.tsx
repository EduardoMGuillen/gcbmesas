import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getTables } from '@/lib/actions'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { TablesList } from '@/components/TablesList'

export default async function MesasPage() {
  let session = null
  try {
    session = await getServerSession(authOptions)
  } catch (error: any) {
    console.error('[MesasPage] Error getting session:', error?.message)
    redirect('/login')
    return
  }

  if (!session || session.user.role !== 'ADMIN') {
    redirect('/login')
    return
  }

  const tables = await getTables()

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        <TablesList initialTables={tables} />
      </main>
      <Footer />
    </div>
  )
}


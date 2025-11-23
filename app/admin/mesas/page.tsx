import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getTables } from '@/lib/actions'
import { Navbar } from '@/components/Navbar'
import { TablesList } from '@/components/TablesList'

export default async function MesasPage() {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'ADMIN') {
    redirect('/login')
  }

  const tables = await getTables()

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <TablesList initialTables={tables} />
      </main>
    </div>
  )
}


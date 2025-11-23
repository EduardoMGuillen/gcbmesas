import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getUsers } from '@/lib/actions'
import { Navbar } from '@/components/Navbar'
import { UsersList } from '@/components/UsersList'

export default async function UsuariosPage() {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'ADMIN') {
    redirect('/login')
  }

  const users = await getUsers()

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <UsersList initialUsers={users} />
      </main>
    </div>
  )
}


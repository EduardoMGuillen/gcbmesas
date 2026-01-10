import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getUsers } from '@/lib/actions'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { UsersList } from '@/components/UsersList'

export default async function UsuariosPage() {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'ADMIN') {
    redirect('/login')
  }

  const users = await getUsers()

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="max-w-7xl mx-auto px-0 sm:px-6 lg:px-8 py-8 flex-1">
        <div className="px-4 sm:px-0">
          <UsersList initialUsers={users} />
        </div>
      </main>
      <Footer />
    </div>
  )
}


import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Navbar } from '@/components/Navbar'
import { AccountsList } from '@/components/AccountsList'

export default async function CuentasPage() {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'ADMIN') {
    redirect('/login')
  }

  const accounts = await prisma.account.findMany({
    include: {
      table: true,
      orders: {
        include: {
          product: true,
          user: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AccountsList initialAccounts={accounts} />
      </main>
    </div>
  )
}


import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AdminShell } from '@/components/AdminShell'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'

export default async function BarLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (!['BAR', 'ADMIN'].includes(session.user.role)) redirect('/login')

  if (session.user.role === 'ADMIN') {
    return <AdminShell userRole="ADMIN">{children}</AdminShell>
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">{children}</main>
      <Footer />
    </div>
  )
}

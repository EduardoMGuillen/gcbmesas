import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getTableById, getProducts } from '@/lib/actions'
import { Navbar } from '@/components/Navbar'
import { TableView } from '@/components/TableView'

export default async function MesaPage({
  params,
}: {
  params: { id: string }
}) {
  // Intentar obtener sesión, pero si hay error de configuración, tratar como sin sesión
  let session = null
  try {
    session = await getServerSession(authOptions)
  } catch (error: any) {
    // Si hay error de configuración de NextAuth (como NEXTAUTH_URL no coincide),
    // tratar como usuario no autenticado y redirigir a clientes
    console.warn('[MesaPage] Error checking session, redirecting to clientes:', error?.message)
    redirect(`/clientes?tableId=${params.id}`)
  }

  // Si no hay sesión, redirigir a página de clientes
  if (!session) {
    redirect(`/clientes?tableId=${params.id}`)
  }

  // Si hay sesión pero no es MESERO o ADMIN, redirigir a login
  if (!['MESERO', 'ADMIN'].includes(session.user.role)) {
    redirect('/login')
  }

  const table = await getTableById(params.id)
  const products = await getProducts(true)

  if (!table) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-6 py-4 rounded-lg">
            Mesa no encontrada
          </div>
        </main>
      </div>
    )
  }

  const account = table.accounts[0]

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <TableView table={table} account={account} products={products} />
      </main>
    </div>
  )
}


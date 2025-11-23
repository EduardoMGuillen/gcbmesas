import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getTables, getProducts } from '@/lib/actions'
import { Navbar } from '@/components/Navbar'
import { ManualOrderForm } from '@/components/ManualOrderForm'

export default async function PedidosPage() {
  const session = await getServerSession(authOptions)

  if (!session || !['MESERO', 'ADMIN'].includes(session.user.role)) {
    redirect('/login')
  }

  const tables = await getTables()
  const products = await getProducts(true)

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Agregar Pedido Manual
          </h1>
          <p className="text-dark-400">
            Selecciona una mesa y agrega productos a su cuenta
          </p>
        </div>

        <ManualOrderForm tables={tables} products={products} />
      </main>
    </div>
  )
}


import { getTableByIdPublic, getTableByShortCodePublic, getProductsPublic } from '@/lib/actions'
import { redirect } from 'next/navigation'
import { CustomerOrderView } from '@/components/CustomerOrderView'
import { CustomerPageClient } from './CustomerPageClient'

export const dynamic = 'force-dynamic'

interface ClientesPageProps {
  searchParams: { tableId?: string }
}

export default async function ClientesPage({ searchParams }: ClientesPageProps) {
  const tableId = searchParams.tableId

  // Si hay tableId, mostrar la vista de pedidos
  if (tableId) {
    const table = await getTableByIdPublic(tableId)

    if (!table) {
      return (
        <div className="min-h-screen bg-dark-900">
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-6 py-4 rounded-lg">
              Mesa no encontrada
            </div>
          </main>
        </div>
      )
    }

    const account = table.accounts[0]

    if (!account) {
      return (
        <div className="min-h-screen bg-dark-900">
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-amber-500/20 border border-amber-500/50 text-amber-400 px-6 py-4 rounded-lg">
              Esta mesa no tiene una cuenta abierta. Por favor, solicita al personal que abra una cuenta.
            </div>
          </main>
        </div>
      )
    }

    const products = await getProductsPublic()

    // Convertir Decimal a number para el componente
    const accountForView = {
      id: account.id,
      initialBalance: Number(account.initialBalance),
      currentBalance: Number(account.currentBalance),
      orders: account.orders.map((order: any) => ({
        id: order.id,
        product: {
          name: order.product.name,
          price: Number(order.product.price),
        },
        quantity: order.quantity,
        price: Number(order.price),
        createdAt: order.createdAt,
        served: order.served,
      })),
    }

    const productsForView = products.map((p: any) => ({
      id: p.id,
      name: p.name,
      price: Number(p.price),
      category: p.category,
    }))

    return (
      <div className="min-h-screen bg-dark-900">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <CustomerOrderView table={table} account={accountForView} products={productsForView} />
        </main>
      </div>
    )
  }

  // Si no hay tableId, mostrar la página de escaneo/búsqueda
  return <CustomerPageClient />
}

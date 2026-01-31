import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getTables, getProducts, getTableById, createAccount } from '@/lib/actions'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { CustomerOrderView } from '@/components/CustomerOrderView'
import { TableSelector } from '@/components/TableSelector'

interface PedidosPageProps {
  searchParams: { tableId?: string }
}

async function createAccountAction(tableId: string, initialBalance: number, clientName?: string | null) {
  'use server'
  await createAccount({ tableId, initialBalance, clientName })
}

export default async function PedidosPage({ searchParams }: PedidosPageProps) {
  const session = await getServerSession(authOptions)

  if (!session || !['MESERO', 'ADMIN'].includes(session.user.role)) {
    redirect('/login')
  }

  const tables = await getTables()
  const products = await getProducts(true)
  const initialTableId = searchParams.tableId || ''

  // Si hay una mesa inicial seleccionada, obtener sus datos
  let initialTable = null
  let initialAccount = null

  if (initialTableId) {
    const tableData = await getTableById(initialTableId)
    if (tableData) {
      initialTable = {
        id: tableData.id,
        name: tableData.name,
        shortCode: tableData.shortCode || '',
        zone: tableData.zone || null,
      }
      initialAccount = tableData.accounts[0]
        ? {
            id: tableData.accounts[0].id,
            initialBalance: Number(tableData.accounts[0].initialBalance),
            currentBalance: Number(tableData.accounts[0].currentBalance),
            clientName: tableData.accounts[0].clientName || null,
            openedBy: tableData.accounts[0].openedBy ? { name: tableData.accounts[0].openedBy.name, username: tableData.accounts[0].openedBy.username } : null,
            orders: tableData.accounts[0].orders.map((order: any) => ({
              id: order.id,
              product: {
                name: order.product.name,
                price: Number(order.product.price),
              },
              quantity: order.quantity,
              price: Number(order.price),
              createdAt: order.createdAt,
              served: order.served,
              rejected: order.rejected || false,
            })),
          }
        : null
    }
  }

  // Preparar productos para la vista
  const productsForView = products.map((p: any) => ({
    id: p.id,
    name: p.name,
    price: Number(p.price),
    category: p.category || null,
    emoji: p.emoji || null,
  }))

  // Preparar tables para la vista
  const tablesForView = tables.map((t: any) => ({
    id: t.id,
    name: t.name,
    zone: t.zone || null,
    accounts: t.accounts || [],
  }))

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(to bottom, transparent, rgb(30, 41, 59)) rgb(15, 23, 42)' }}>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Agregar Pedido
          </h1>
          <p className="text-dark-400">
            Selecciona una mesa y agrega productos a su cuenta
          </p>
        </div>
        {initialTable ? (
          <CustomerOrderView
            table={initialTable}
            account={initialAccount || {
              id: '',
              initialBalance: 0,
              currentBalance: 0,
              orders: [],
            }}
            products={productsForView}
            tables={tablesForView}
            initialTableId={initialTableId}
            isMesero={true}
            onCreateAccount={createAccountAction}
            backUrl="/mesero/pedidos"
          />
        ) : (
          <TableSelector tables={tablesForView} />
        )}
      </main>
      <Footer />
    </div>
  )
}

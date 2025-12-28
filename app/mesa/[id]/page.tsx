import { redirect } from 'next/navigation'

export default async function MesaPage({
  params,
}: {
  params: { id: string }
}) {
  // Esta ruta siempre redirige a /clientes
  // El middleware debería manejar esto, pero por si acaso también lo hacemos aquí
  redirect(`/clientes?tableId=${params.id}`)

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


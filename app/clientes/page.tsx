import { redirect } from 'next/navigation'
import Image from 'next/image'
import { getTableByIdPublic, getTableByShortCodePublic } from '@/lib/actions'
import { formatCurrency, isOpenAccount } from '@/lib/utils'
import { Footer } from '@/components/Footer'

export const dynamic = 'force-dynamic'

/**
 * Vista pública del QR de mesa: solo lectura (saldo y consumos).
 * Los pedidos los toma el personal; aquí no se puede pedir.
 */
export default async function ClientesPage({
  searchParams,
}: {
  searchParams: { tableId?: string; codigo?: string }
}) {
  const codigo = searchParams.codigo?.trim()
  if (codigo && !searchParams.tableId) {
    const found = await getTableByShortCodePublic(codigo)
    if (found) redirect(`/clientes?tableId=${found.id}`)
    return <Shell><CodeForm error="No encontramos una mesa con ese código." /></Shell>
  }

  if (!searchParams.tableId) {
    return <Shell><CodeForm /></Shell>
  }

  const table = await getTableByIdPublic(searchParams.tableId)
  if (!table) {
    return <Shell><Notice tone="error">Mesa no encontrada.</Notice></Shell>
  }

  const account = table.accounts[0]
  if (!account) {
    return (
      <Shell>
        <TableTitle name={table.name} />
        <Notice tone="info">Esta mesa no tiene una cuenta abierta. Pide al personal que la abra.</Notice>
      </Shell>
    )
  }

  const open = isOpenAccount(account.initialBalance)
  const orders = account.orders
  const consumed = orders.reduce((sum, o) => sum + Number(o.price) * o.quantity, 0)

  return (
    <Shell>
      <TableTitle name={table.name} client={account.clientName} />

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs text-white/60">{open ? 'Tipo de cuenta' : 'Saldo disponible'}</p>
          <p className="mt-1 text-2xl font-bold text-white">
            {open ? 'Abierta' : formatCurrency(Number(account.currentBalance))}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs text-white/60">Consumido</p>
          <p className="mt-1 text-2xl font-bold text-white">{formatCurrency(consumed)}</p>
        </div>
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/5">
        <p className="border-b border-white/10 px-4 py-3 text-sm font-semibold text-white">Tus consumos</p>
        {orders.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-white/50">Todavía no hay pedidos.</p>
        ) : (
          <ul className="divide-y divide-white/10">
            {orders.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    {o.quantity > 1 ? `${o.quantity} × ` : ''}
                    {o.product.name}
                  </p>
                  <p className="text-xs text-white/50">
                    {new Date(o.createdAt).toLocaleTimeString('es-HN', {
                      hour: 'numeric',
                      minute: '2-digit',
                      timeZone: 'America/Tegucigalpa',
                    })}
                    {' · '}
                    {o.served ? 'Entregado' : 'En preparación'}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-white">{formatCurrency(Number(o.price) * o.quantity)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-center text-xs text-white/50">Para pedir, llama a tu mesero.</p>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex min-h-screen flex-col pt-safe"
      style={{ background: 'linear-gradient(to bottom, transparent, rgb(30, 41, 59)) rgb(15, 23, 42)' }}
    >
      <main className="mx-auto w-full max-w-md flex-1 space-y-4 px-4 py-8">
        <div className="flex justify-center">
          <Image src="/LogoCasaBlanca.png" alt="Casa Blanca" width={64} height={64} className="h-14 w-auto" />
        </div>
        {children}
      </main>
      <Footer />
    </div>
  )
}

function TableTitle({ name, client }: { name: string; client?: string | null }) {
  return (
    <div className="text-center">
      <p className="text-xs uppercase tracking-wider text-white/50">Mesa</p>
      <h1 className="text-2xl font-bold text-white">{name}</h1>
      {client && <p className="text-sm text-white/70">{client}</p>}
    </div>
  )
}

function Notice({ tone, children }: { tone: 'error' | 'info'; children: React.ReactNode }) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm ${
        tone === 'error' ? 'border-red-500/50 bg-red-500/20 text-red-300' : 'border-amber-500/50 bg-amber-500/20 text-amber-300'
      }`}
    >
      {children}
    </div>
  )
}

function CodeForm({ error }: { error?: string }) {
  return (
    <form method="GET" action="/clientes" className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-5">
      <p className="text-center text-sm text-white/80">Escanea el QR de tu mesa o escribe su código.</p>
      <input
        name="codigo"
        maxLength={8}
        autoCapitalize="characters"
        autoComplete="off"
        placeholder="Código de mesa"
        className="w-full rounded-xl border border-white/20 bg-black/30 px-4 py-3 text-center text-lg font-semibold uppercase tracking-widest text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary-500"
      />
      {error && <p className="text-center text-sm text-red-300">{error}</p>}
      <button type="submit" className="w-full rounded-xl bg-primary-600 py-3 font-semibold text-white hover:bg-primary-700">
        Ver mi cuenta
      </button>
    </form>
  )
}

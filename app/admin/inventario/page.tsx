import { getProducts } from '@/lib/actions'
import { getStockItems } from '@/lib/ops-actions'
import { InventarioClient } from './InventarioClient'

export const dynamic = 'force-dynamic'

export default async function InventarioPage() {
  const [products, stock] = await Promise.all([getProducts(), getStockItems()])
  return <InventarioClient products={products} stock={stock} />
}

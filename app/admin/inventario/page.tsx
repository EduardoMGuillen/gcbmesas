import { getProducts } from '@/lib/actions'
import { ProductsList } from '@/components/ProductsList'

export default async function InventarioPage() {
  const products = await getProducts()

  return <ProductsList initialProducts={products} />
}


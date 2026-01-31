import { getTables } from '@/lib/actions'
import { TablesList } from '@/components/TablesList'

export default async function MesasPage() {
  const tables = await getTables()

  return <TablesList initialTables={tables} />
}


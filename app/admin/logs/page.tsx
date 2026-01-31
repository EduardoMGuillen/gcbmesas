import { getLogs } from '@/lib/actions'
import { LogsList } from '@/components/LogsList'

export default async function LogsPage({
  searchParams,
}: {
  searchParams: { tableId?: string; userId?: string; action?: string }
}) {
  const logs = await getLogs({
    tableId: searchParams.tableId,
    userId: searchParams.userId,
    action: searchParams.action as any,
  })

  return <LogsList initialLogs={logs} />
}


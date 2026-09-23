import { getCashOpsData } from '@/lib/ops-actions'
import { CashSessionPanel } from '@/components/CashSessionPanel'

export const dynamic = 'force-dynamic'

export default async function CajeroCajaPage() {
  const data = await getCashOpsData()
  return (
    <CashSessionPanel
      registers={data.registers}
      myOpen={data.myOpen}
      openAll={data.openAll}
      recent={data.recent}
      sessionPreview={data.sessionPreview}
      isAdmin={false}
    />
  )
}

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getCashSessionByIdForExport, getCashSessionsForExport } from '@/lib/ops-actions'
import { arqueoFileName, buildArqueoExcelBuffer } from '@/lib/arqueo-excel'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('sessionId')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const registerId = searchParams.get('registerId') || undefined

    const rows = sessionId
      ? [await getCashSessionByIdForExport(sessionId)]
      : from && to
        ? await getCashSessionsForExport(from, to, registerId)
        : null

    if (!rows) {
      return NextResponse.json({ error: 'Elige fecha desde y hasta, o un arqueo' }, { status: 400 })
    }

    const opts = { from: from || undefined, to: to || undefined, single: Boolean(sessionId) }
    const buffer = await buildArqueoExcelBuffer(rows, opts)
    const fileName = arqueoFileName(rows, opts)

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })
  } catch (error) {
    console.error('[arqueos] Error:', error)
    const message = error instanceof Error ? error.message : 'No se pudo exportar'
    const status = message === 'Arqueo no encontrado' ? 404 : message === 'Solo administradores' ? 401 : 500
    return NextResponse.json({ error: message === 'Arqueo no encontrado' ? message : 'No se pudo exportar' }, { status })
  }
}

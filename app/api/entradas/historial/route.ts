import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getEventEntriesForExport } from '@/lib/actions'
import { buildEntryHistorialExcelBuffer, entryHistorialFileName } from '@/lib/entry-historial-excel'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['ADMIN', 'CLIENTE_TICKETERA'].includes(session.user.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const eventId = new URL(req.url).searchParams.get('eventId')
    if (!eventId) {
      return NextResponse.json({ error: 'Falta el evento' }, { status: 400 })
    }

    const { event, rows } = await getEventEntriesForExport(eventId)
    const buffer = await buildEntryHistorialExcelBuffer(event, rows)
    const fileName = entryHistorialFileName(event.name, event.date)

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })
  } catch (error) {
    console.error('[entradas/historial] Error:', error)
    const message = error instanceof Error ? error.message : 'No se pudo exportar'
    const status =
      message === 'Evento no encontrado'
        ? 404
        : message === 'No autorizado al módulo de entradas' || message === 'No tienes acceso a este evento'
          ? 401
          : 500
    return NextResponse.json(
      { error: status === 500 ? 'No se pudo exportar' : message },
      { status }
    )
  }
}

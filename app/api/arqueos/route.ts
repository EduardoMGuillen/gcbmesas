import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getCashSessionsForExport } from '@/lib/ops-actions'
import { PAYMENT_METHOD_LABELS } from '@/lib/ops-constants'
import { venueZoneLabel } from '@/lib/venue-zones'

function hnDateTime(value: Date | string | null | undefined) {
  if (!value) return ''
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('es-HN', {
    timeZone: 'America/Tegucigalpa',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d)
}

function money(value: unknown) {
  const n = Number(value)
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0
}

function person(user?: { name: string | null; username: string } | null) {
  return user?.name || user?.username || ''
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const registerId = searchParams.get('registerId') || undefined

    if (!from || !to) {
      return NextResponse.json({ error: 'Elige fecha desde y hasta' }, { status: 400 })
    }

    const rows = await getCashSessionsForExport(from, to, registerId)
    const XLSX = await import('xlsx')
    const workbook = XLSX.utils.book_new()

    const arqueos = [
      [
        'Caja',
        'Zona',
        'Estado',
        'Apertura',
        'Cierre',
        'Fondo',
        'Ventas efectivo',
        'POS Ficohsa',
        'POS BAC',
        'Transferencias',
        'Total declarado',
        'Efectivo contado',
        'Total sistema',
        'Sobrante / faltante',
        'Cuentas',
        'Entrega',
        'Recibe',
        'Abrió',
        'Cerró',
        'Observaciones',
      ],
      ...rows.map((s) => {
        const cash = money(s.salesCash)
        const ficohsa = money(s.salesPosFicohsa)
        const bac = money(s.salesPosBac)
        const transfer = money(s.salesTransfer)
        return [
          s.register.name,
          venueZoneLabel(s.register.venueZone) || '',
          s.status === 'OPEN' ? 'Abierta' : 'Cerrada',
          hnDateTime(s.openedAt),
          hnDateTime(s.closedAt),
          money(s.openingFloat),
          cash,
          ficohsa,
          bac,
          transfer,
          cash + ficohsa + bac + transfer,
          s.countedCash == null ? '' : money(s.countedCash),
          s.systemTotal == null ? '' : money(s.systemTotal),
          s.difference == null ? '' : money(s.difference),
          s.accounts.length,
          s.deliveredByName || '',
          s.receivedByName || '',
          person(s.openedBy),
          person(s.closedBy),
          s.notes || '',
        ]
      }),
    ]
    const wsArqueos = XLSX.utils.aoa_to_sheet(arqueos)
    wsArqueos['!cols'] = [
      18, 12, 10, 20, 20, 12, 16, 14, 12, 16, 16, 16, 14, 18, 10, 16, 16, 16, 16, 30,
    ].map((wch) => ({ wch }))
    XLSX.utils.book_append_sheet(workbook, wsArqueos, 'Arqueos')

    const byRegister = new Map<
      string,
      { sessions: number; cash: number; pos: number; transfer: number; system: number; difference: number }
    >()
    for (const s of rows) {
      const key = s.register.name
      const prev = byRegister.get(key) || {
        sessions: 0,
        cash: 0,
        pos: 0,
        transfer: 0,
        system: 0,
        difference: 0,
      }
      prev.sessions += 1
      prev.cash += money(s.salesCash)
      prev.pos += money(s.salesPosFicohsa) + money(s.salesPosBac)
      prev.transfer += money(s.salesTransfer)
      prev.system += money(s.systemTotal)
      prev.difference += money(s.difference)
      byRegister.set(key, prev)
    }
    const resumen = [
      ['Caja', 'Sesiones', 'Efectivo', 'POS', 'Transferencias', 'Total sistema', 'Sobrante / faltante'],
      ...Array.from(byRegister.entries()).map(([name, t]) => [
        name,
        t.sessions,
        t.cash,
        t.pos,
        t.transfer,
        t.system,
        t.difference,
      ]),
    ]
    const wsResumen = XLSX.utils.aoa_to_sheet(resumen)
    wsResumen['!cols'] = [18, 12, 14, 12, 16, 16, 20].map((wch) => ({ wch }))
    XLSX.utils.book_append_sheet(workbook, wsResumen, 'Resumen')

    const cuentas = [
      [
        'Caja',
        'Mesa',
        'Zona',
        'Cliente',
        'Cierre',
        'Método de pago',
        'Consumo',
      ],
      ...rows.flatMap((s) =>
        s.accounts.map((a) => [
          s.register.name,
          a.table.name,
          venueZoneLabel(a.table.zone) || a.table.zone || '',
          a.clientName || '',
          hnDateTime(a.closedAt),
          a.paymentMethod ? PAYMENT_METHOD_LABELS[a.paymentMethod] : 'Sin método',
          money(a.initialBalance) - money(a.currentBalance),
        ])
      ),
    ]
    const wsCuentas = XLSX.utils.aoa_to_sheet(cuentas)
    wsCuentas['!cols'] = [18, 16, 12, 20, 20, 16, 12].map((wch) => ({ wch }))
    XLSX.utils.book_append_sheet(workbook, wsCuentas, 'Cuentas')

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
    const fileName = `Arqueos_${from}_${to}.xlsx`

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })
  } catch (error) {
    console.error('[arqueos] Error:', error)
    return NextResponse.json({ error: 'No se pudo exportar' }, { status: 500 })
  }
}

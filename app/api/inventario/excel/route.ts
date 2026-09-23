import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getStockItems, importStockFromExcelBuffer } from '@/lib/ops-actions'
import { buildStockExcelBuffer, stockExcelFileName } from '@/lib/stock-excel'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const mode = req.nextUrl.searchParams.get('mode') === 'template' ? 'template' : 'export'
    const stock = await getStockItems()
    const buffer = await buildStockExcelBuffer(stock, mode)
    const fileName = stockExcelFileName(mode)

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })
  } catch (error) {
    console.error('[inventario-excel] GET', error)
    const message = error instanceof Error ? error.message : 'No se pudo exportar'
    const status = message === 'No autorizado' || message === 'Solo administradores' ? 401 : 500
    return NextResponse.json({ error: 'No se pudo exportar el inventario' }, { status })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const form = await req.formData()
    const file = form.get('file')
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'Elige un archivo Excel (.xlsx)' }, { status: 400 })
    }
    if (file.size === 0) {
      return NextResponse.json({ error: 'El archivo está vacío' }, { status: 400 })
    }
    if (file.size > 6 * 1024 * 1024) {
      return NextResponse.json({ error: 'El archivo es demasiado grande (máx. 6 MB)' }, { status: 400 })
    }
    const fileName = (file.name || '').toLowerCase()
    if (fileName && !fileName.endsWith('.xlsx')) {
      return NextResponse.json({ error: 'Usa un archivo .xlsx (la plantilla de Inventario)' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const result = await importStockFromExcelBuffer(buffer)
    return NextResponse.json(result)
  } catch (error) {
    console.error('[inventario-excel] POST', error)
    const message = error instanceof Error ? error.message : 'No se pudo importar'
    const status =
      message === 'No autorizado' || message === 'Solo administradores'
        ? 401
        : message.includes('plantilla') || message.includes('encabezados') || message.includes('productos')
          ? 400
          : 500
    return NextResponse.json({ error: message }, { status })
  }
}

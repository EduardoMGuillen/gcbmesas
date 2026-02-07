import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getReportData } from '@/lib/actions'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    if (!from || !to) {
      return NextResponse.json({ error: 'Parámetros from y to requeridos' }, { status: 400 })
    }

    const data = await getReportData(from, to)
    const XLSX = await import('xlsx')

    const workbook = XLSX.utils.book_new()

    // Hoja 1: Resumen
    const resumenData = [
      ['Métrica', 'Valor'],
      ['Período', `${from} a ${to}`],
      ['Total de Ventas', data.summary.totalSales],
      ['Total de Pedidos', data.summary.totalOrders],
      ['Pedidos Rechazados', data.summary.rejectedOrders],
      ['Cuentas Abiertas', data.summary.accountsOpened],
      ['Cuentas Cerradas', data.summary.accountsClosed],
      ['Promedio Consumo por Mesa', Math.round(data.summary.avgConsumption * 100) / 100],
    ]
    const wsResumen = XLSX.utils.aoa_to_sheet(resumenData)
    wsResumen['!cols'] = [{ wch: 25 }, { wch: 20 }]
    XLSX.utils.book_append_sheet(workbook, wsResumen, 'Resumen')

    // Hoja 2: Ventas por Día
    const ventasDiaData = [
      ['Fecha', 'Ventas ($)', 'Pedidos', 'Mesas'],
      ...data.dailyData.map((d) => [d.date, d.sales, d.orders, d.tables]),
    ]
    const wsVentasDia = XLSX.utils.aoa_to_sheet(ventasDiaData)
    wsVentasDia['!cols'] = [{ wch: 12 }, { wch: 15 }, { wch: 10 }, { wch: 10 }]
    XLSX.utils.book_append_sheet(workbook, wsVentasDia, 'Ventas por Dia')

    // Hoja 3: Meseros
    const meserosData = [
      ['Mesero', 'Mesas Atendidas', 'Ventas ($)', 'Pedidos'],
      ...data.meseroData.map((m) => [m.name, m.tables, m.sales, m.orders]),
    ]
    const wsMeseros = XLSX.utils.aoa_to_sheet(meserosData)
    wsMeseros['!cols'] = [{ wch: 20 }, { wch: 18 }, { wch: 15 }, { wch: 10 }]
    XLSX.utils.book_append_sheet(workbook, wsMeseros, 'Meseros')

    // Hoja 4: Productos
    const productosData = [
      ['Producto', 'Categoría', 'Cantidad', 'Monto ($)'],
      ...data.productData.map((p) => [p.name, p.category, p.quantity, p.amount]),
    ]
    const wsProductos = XLSX.utils.aoa_to_sheet(productosData)
    wsProductos['!cols'] = [{ wch: 25 }, { wch: 18 }, { wch: 10 }, { wch: 15 }]
    XLSX.utils.book_append_sheet(workbook, wsProductos, 'Productos')

    // Hoja 5: Categorías
    const categoriasData = [
      ['Categoría', 'Cantidad', 'Monto ($)'],
      ...data.categoryData.map((c) => [c.category, c.quantity, c.amount]),
    ]
    const wsCategorias = XLSX.utils.aoa_to_sheet(categoriasData)
    wsCategorias['!cols'] = [{ wch: 20 }, { wch: 10 }, { wch: 15 }]
    XLSX.utils.book_append_sheet(workbook, wsCategorias, 'Categorias')

    // Hoja 6: Horarios
    const horariosData = [
      ['Hora', 'Pedidos'],
      ...data.hourData.map((h) => [`${String(h.hour).padStart(2, '0')}:00`, h.orders]),
    ]
    const wsHorarios = XLSX.utils.aoa_to_sheet(horariosData)
    wsHorarios['!cols'] = [{ wch: 8 }, { wch: 10 }]
    XLSX.utils.book_append_sheet(workbook, wsHorarios, 'Horarios')

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
    const fileName = `Reporte_${from}_${to}.xlsx`

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })
  } catch (error) {
    console.error('[reportes] Error:', error)
    return NextResponse.json({ error: 'Error al generar reporte' }, { status: 500 })
  }
}

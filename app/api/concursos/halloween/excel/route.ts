import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const rows = await prisma.halloweenContestant.findMany({ orderBy: { createdAt: 'asc' } })
    const XLSX = await import('xlsx')

    const data = [
      ['#', 'Nombre', 'ID', 'Teléfono', 'Correo', 'Post de Instagram', 'Fecha de registro'],
      ...rows.map((r, i) => [
        i + 1,
        r.fullName,
        r.nationalId,
        r.phone,
        r.email,
        r.instagramUrl,
        r.createdAt.toLocaleString('es-HN', { timeZone: 'America/Tegucigalpa' }),
      ]),
    ]
    const ws = XLSX.utils.aoa_to_sheet(data)
    ws['!cols'] = [{ wch: 5 }, { wch: 30 }, { wch: 18 }, { wch: 14 }, { wch: 30 }, { wch: 50 }, { wch: 22 }]
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, ws, 'Participantes')

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="concurso-halloween-2026.xlsx"',
      },
    })
  } catch (error) {
    console.error('[concursos/halloween/excel]', error)
    return NextResponse.json({ error: 'Error al generar el archivo' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { exportAccountToExcel } from '@/lib/actions'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const accountId = request.nextUrl.searchParams.get('accountId')
    
    if (!accountId) {
      return NextResponse.json({ error: 'accountId es requerido' }, { status: 400 })
    }

    const { buffer, fileName } = await exportAccountToExcel(accountId)

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })
  } catch (error: any) {
    console.error('Error exporting account:', error)
    return NextResponse.json(
      { error: error.message || 'Error al exportar cuenta' },
      { status: 500 }
    )
  }
}


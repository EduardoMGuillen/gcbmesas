import { NextRequest, NextResponse } from 'next/server'
import { closeOldAccounts } from '@/lib/actions'

export async function POST(request: NextRequest) {
  try {
    // Opcional: agregar autenticación/secret para proteger este endpoint
    const authHeader = request.headers.get('authorization')
    const expectedSecret = process.env.CRON_SECRET || 'your-secret-key'

    // Si se configuró un secret, validarlo
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const results = await closeOldAccounts()

    return NextResponse.json({
      success: true,
      message: `Se cerraron ${results.closed} cuenta(s) automáticamente`,
      ...results,
    })
  } catch (error: any) {
    console.error('[close-old-accounts] Error:', error)
    return NextResponse.json(
      {
        error: 'Error al cerrar cuentas antiguas',
        details: error.message,
      },
      { status: 500 }
    )
  }
}

// Permitir GET también para facilitar pruebas
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const expectedSecret = process.env.CRON_SECRET || 'your-secret-key'

    if (process.env.CRON_SECRET && authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const results = await closeOldAccounts()

    return NextResponse.json({
      success: true,
      message: `Se cerraron ${results.closed} cuenta(s) automáticamente`,
      ...results,
    })
  } catch (error: any) {
    console.error('[close-old-accounts] Error:', error)
    return NextResponse.json(
      {
        error: 'Error al cerrar cuentas antiguas',
        details: error.message,
      },
      { status: 500 }
    )
  }
}

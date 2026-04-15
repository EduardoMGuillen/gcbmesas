import { NextRequest, NextResponse } from 'next/server'
import { closeOldAccounts } from '@/lib/actions'

function authorizeCron(request: NextRequest): NextResponse | null {
  const configuredSecret = process.env.CRON_SECRET
  if (!configuredSecret) {
    return NextResponse.json({ error: 'CRON_SECRET no configurado en el servidor' }, { status: 500 })
  }
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${configuredSecret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  return null
}

export async function POST(request: NextRequest) {
  try {
    const authError = authorizeCron(request)
    if (authError) return authError

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

export async function GET(request: NextRequest) {
  return NextResponse.json(
    { error: 'Método no permitido. Usa POST.' },
    { status: 405, headers: { Allow: 'POST' } }
  )
}

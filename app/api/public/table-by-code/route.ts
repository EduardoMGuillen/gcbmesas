import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTableByIdPublic, getTableByShortCodePublic } from '@/lib/actions'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const code = body?.code?.toString().trim()

    if (!code) {
      return NextResponse.json(
        { error: 'Ingresa el ID o código de la mesa' },
        { status: 400 }
      )
    }

    // Intentar primero por shortCode, luego por ID
    let table = await getTableByShortCodePublic(code)
    
    if (!table) {
      table = await getTableByIdPublic(code)
    }

    if (!table) {
      return NextResponse.json(
        { error: 'No encontramos una mesa con ese código' },
        { status: 404 }
      )
    }

    // Verificar que tenga cuenta abierta
    if (!table.accounts || table.accounts.length === 0) {
      return NextResponse.json(
        { error: 'Esta mesa no tiene una cuenta abierta' },
        { status: 404 }
      )
    }

    return NextResponse.json({ 
      id: table.id,
      shortCode: table.shortCode,
      name: table.name,
      zone: table.zone,
      account: table.accounts[0],
    })
  } catch (error: any) {
    console.error('[Public Table Lookup] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Error al buscar la mesa' },
      { status: 500 }
    )
  }
}

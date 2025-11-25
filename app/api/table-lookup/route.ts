import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await request.json()
  const code = body?.code?.toString().trim()

  if (!code) {
    return NextResponse.json(
      { error: 'Ingresa el ID o código de la mesa' },
      { status: 400 }
    )
  }

  const normalized = code.toUpperCase()

  const table = await prisma.table.findFirst({
    where: {
      OR: [{ shortCode: normalized }, { id: code }],
    },
    select: { id: true },
  })

  if (!table) {
    return NextResponse.json(
      { error: 'No encontramos una mesa con ese código' },
      { status: 404 }
    )
  }

  return NextResponse.json({ id: table.id })
}


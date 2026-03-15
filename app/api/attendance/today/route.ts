import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const ALLOWED_ROLES = ['ADMIN', 'MESERO', 'CAJERO', 'TAQUILLA']

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const userId = session.user.id
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)

    const [latest, todayMarks] = await Promise.all([
      prisma.attendanceMark.findFirst({
        where: { userId },
        orderBy: { markedAt: 'desc' },
        select: {
          id: true,
          type: true,
          markedAt: true,
          accuracyMeters: true,
          selfieUrl: true,
        },
      }),
      prisma.attendanceMark.findMany({
        where: {
          userId,
          markedAt: {
            gte: start,
            lt: end,
          },
        },
        orderBy: { markedAt: 'desc' },
        select: {
          id: true,
          type: true,
          markedAt: true,
          accuracyMeters: true,
          selfieUrl: true,
        },
      }),
    ])

    const status = latest?.type === 'IN' ? 'IN' : 'OUT'
    const responseMarks = todayMarks.map((m) => ({
      ...m,
      markedAt: m.markedAt.toISOString(),
    }))

    return NextResponse.json({
      ok: true,
      status,
      canMarkIn: status === 'OUT',
      canMarkOut: status === 'IN',
      latest: latest ? { ...latest, markedAt: latest.markedAt.toISOString() } : null,
      todayMarks: responseMarks,
    })
  } catch (error: any) {
    console.error('[attendance/today] Error:', error)
    return NextResponse.json(
      { error: error?.message || 'No se pudo obtener estado de marcaje' },
      { status: 500 }
    )
  }
}

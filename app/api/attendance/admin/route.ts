import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { AttendanceMarkType, UserRole } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.floor(parsed)
}

const DEFAULT_MAX_ACCURACY_METERS = 200
const SETTINGS_ID = 1

function parseDateStart(value: string | null) {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  d.setHours(0, 0, 0, 0)
  return d
}

function parseDateEnd(value: string | null) {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  d.setHours(23, 59, 59, 999)
  return d
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const from = parseDateStart(searchParams.get('from'))
    const to = parseDateEnd(searchParams.get('to'))
    const role = searchParams.get('role')
    const type = searchParams.get('type')
    const userId = searchParams.get('userId')
    const precisionStatus = searchParams.get('precisionStatus')
    const page = parsePositiveInt(searchParams.get('page'), 1)
    const pageSize = Math.min(parsePositiveInt(searchParams.get('pageSize'), 50), 200)
    const skip = (page - 1) * pageSize

    const where: any = {}
    if (from || to) {
      where.markedAt = {}
      if (from) where.markedAt.gte = from
      if (to) where.markedAt.lte = to
    }
    if (role && ['ADMIN', 'MESERO', 'CAJERO', 'TAQUILLA', 'COCINA', 'BAR'].includes(role)) {
      where.role = role as UserRole
    }
    if (type && ['IN', 'OUT'].includes(type)) {
      where.type = type as AttendanceMarkType
    }
    if (userId) {
      where.userId = userId
    }
    const settings = await prisma.attendanceSettings.findUnique({
      where: { id: SETTINGS_ID },
      select: { maxAccuracyMeters: true },
    })
    const maxAccuracyMeters = settings?.maxAccuracyMeters || DEFAULT_MAX_ACCURACY_METERS

    if (precisionStatus === 'good') {
      where.accuracyMeters = { lte: maxAccuracyMeters }
    } else if (precisionStatus === 'bad') {
      where.accuracyMeters = { gt: maxAccuracyMeters }
    }

    const [marks, total, users] = await Promise.all([
      prisma.attendanceMark.findMany({
        where,
        orderBy: { markedAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          user: {
            select: { id: true, username: true, name: true, role: true },
          },
        },
      }),
      prisma.attendanceMark.count({ where }),
      prisma.user.findMany({
        where: { role: { in: ['MESERO', 'CAJERO', 'TAQUILLA', 'ADMIN', 'COCINA', 'BAR'] } },
        select: { id: true, username: true, name: true, role: true },
        orderBy: [{ role: 'asc' }, { name: 'asc' }],
      }),
    ])

    return NextResponse.json({
      ok: true,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      users,
      marks: marks.map((m) => ({
        ...m,
        markedAt: m.markedAt.toISOString(),
        createdAt: m.createdAt.toISOString(),
      })),
    })
  } catch (error: any) {
    console.error('[attendance/admin] Error:', error)
    return NextResponse.json(
      { error: error?.message || 'No se pudo obtener el reporte de marcajes' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const DEFAULT_RADIUS_METERS = 100
const SETTINGS_ID = 1

function parseNumber(value: unknown) {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

async function ensureAdminSession() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return null
  }
  return session
}

export async function GET() {
  try {
    const session = await ensureAdminSession()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const settings = await prisma.attendanceSettings.findUnique({
      where: { id: SETTINGS_ID },
      select: {
        id: true,
        referenceLatitude: true,
        referenceLongitude: true,
        radiusMeters: true,
        isActive: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({
      ok: true,
      settings:
        settings || {
          id: SETTINGS_ID,
          referenceLatitude: null,
          referenceLongitude: null,
          radiusMeters: DEFAULT_RADIUS_METERS,
          isActive: true,
          updatedAt: null,
        },
    })
  } catch (error: any) {
    console.error('[attendance/admin-settings][GET] Error:', error)
    return NextResponse.json({ error: error?.message || 'No se pudo obtener configuración' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await ensureAdminSession()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await req.json()
    const latitude = parseNumber(body?.referenceLatitude)
    const longitude = parseNumber(body?.referenceLongitude)

    if (latitude == null || longitude == null) {
      return NextResponse.json({ error: 'Latitud y longitud son obligatorias' }, { status: 400 })
    }
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json({ error: 'Coordenadas fuera de rango' }, { status: 400 })
    }

    const settings = await prisma.attendanceSettings.upsert({
      where: { id: SETTINGS_ID },
      create: {
        id: SETTINGS_ID,
        referenceLatitude: latitude,
        referenceLongitude: longitude,
        radiusMeters: DEFAULT_RADIUS_METERS,
        isActive: true,
        updatedByUserId: session.user.id,
      },
      update: {
        referenceLatitude: latitude,
        referenceLongitude: longitude,
        radiusMeters: DEFAULT_RADIUS_METERS,
        isActive: true,
        updatedByUserId: session.user.id,
      },
      select: {
        id: true,
        referenceLatitude: true,
        referenceLongitude: true,
        radiusMeters: true,
        isActive: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ ok: true, settings })
  } catch (error: any) {
    console.error('[attendance/admin-settings][PUT] Error:', error)
    return NextResponse.json({ error: error?.message || 'No se pudo guardar configuración' }, { status: 500 })
  }
}

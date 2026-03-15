import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const DEFAULT_RADIUS_METERS = 100
const DEFAULT_MAX_ACCURACY_METERS = 200
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
        maxAccuracyMeters: true,
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
          maxAccuracyMeters: DEFAULT_MAX_ACCURACY_METERS,
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
    const radiusMeters = parseNumber(body?.radiusMeters)
    const maxAccuracyMeters = parseNumber(body?.maxAccuracyMeters)

    if (latitude == null || longitude == null) {
      return NextResponse.json({ error: 'Latitud y longitud son obligatorias' }, { status: 400 })
    }
    if (radiusMeters == null || radiusMeters < 10 || radiusMeters > 5000) {
      return NextResponse.json({ error: 'El radio debe estar entre 10m y 5000m' }, { status: 400 })
    }
    if (maxAccuracyMeters == null || maxAccuracyMeters < 10 || maxAccuracyMeters > 5000) {
      return NextResponse.json({ error: 'La precisión máxima debe estar entre 10m y 5000m' }, { status: 400 })
    }
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json({ error: 'Coordenadas fuera de rango' }, { status: 400 })
    }

    const previous = await prisma.attendanceSettings.findUnique({
      where: { id: SETTINGS_ID },
      select: {
        referenceLatitude: true,
        referenceLongitude: true,
        radiusMeters: true,
        maxAccuracyMeters: true,
      },
    })

    const settings = await prisma.attendanceSettings.upsert({
      where: { id: SETTINGS_ID },
      create: {
        id: SETTINGS_ID,
        referenceLatitude: latitude,
        referenceLongitude: longitude,
        radiusMeters: Math.round(radiusMeters),
        maxAccuracyMeters: Math.round(maxAccuracyMeters),
        isActive: true,
        updatedByUserId: session.user.id,
      },
      update: {
        referenceLatitude: latitude,
        referenceLongitude: longitude,
        radiusMeters: Math.round(radiusMeters),
        maxAccuracyMeters: Math.round(maxAccuracyMeters),
        isActive: true,
        updatedByUserId: session.user.id,
      },
      select: {
        id: true,
        referenceLatitude: true,
        referenceLongitude: true,
        radiusMeters: true,
        maxAccuracyMeters: true,
        isActive: true,
        updatedAt: true,
      },
    })

    try {
      await prisma.log.create({
        data: {
          userId: session.user.id,
          action: 'ATTENDANCE_MARK',
          details: {
            type: 'ATTENDANCE_SETTINGS_UPDATED',
            previous,
            next: settings,
          },
        },
      })
    } catch (logError) {
      console.error('[attendance/admin-settings][PUT] Log insert failed (non-blocking):', logError)
    }

    return NextResponse.json({ ok: true, settings })
  } catch (error: any) {
    console.error('[attendance/admin-settings][PUT] Error:', error)
    return NextResponse.json({ error: error?.message || 'No se pudo guardar configuración' }, { status: 500 })
  }
}

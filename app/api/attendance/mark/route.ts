import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { put } from '@vercel/blob'
import { AttendanceMarkType } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const ALLOWED_ROLES = ['ADMIN', 'MESERO', 'CAJERO', 'TAQUILLA']
const MAX_IMAGE_SIZE = 5 * 1024 * 1024
const MAX_ACCURACY_METERS_RAW = Number(process.env.ATTENDANCE_MAX_ACCURACY_METERS || '200')
const MAX_ACCURACY_METERS =
  Number.isFinite(MAX_ACCURACY_METERS_RAW) && MAX_ACCURACY_METERS_RAW > 0
    ? MAX_ACCURACY_METERS_RAW
    : 200
const SETTINGS_ID = 1
const DEFAULT_RADIUS_METERS = 100

function toFiniteNumber(value: FormDataEntryValue | null) {
  if (typeof value !== 'string') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function isSupportedMarkType(value: FormDataEntryValue | null): value is AttendanceMarkType {
  return value === 'IN' || value === 'OUT'
}

function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const R = 6371000
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const formData = await req.formData()
    const typeRaw = formData.get('type')
    const selfie = formData.get('selfie')
    const notesRaw = formData.get('notes')
    const latitude = toFiniteNumber(formData.get('latitude'))
    const longitude = toFiniteNumber(formData.get('longitude'))
    const accuracyMeters = toFiniteNumber(formData.get('accuracyMeters'))

    if (!isSupportedMarkType(typeRaw)) {
      return NextResponse.json({ error: 'Tipo de marcaje inválido' }, { status: 400 })
    }
    if (!(selfie instanceof File)) {
      return NextResponse.json({ error: 'La selfie es obligatoria' }, { status: 400 })
    }
    if (!selfie.type.startsWith('image/')) {
      return NextResponse.json({ error: 'La selfie debe ser una imagen' }, { status: 400 })
    }
    if (selfie.size <= 0 || selfie.size > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: 'La selfie debe pesar máximo 5MB' }, { status: 400 })
    }
    if (latitude == null || longitude == null || accuracyMeters == null) {
      return NextResponse.json({ error: 'La geolocalización es obligatoria' }, { status: 400 })
    }
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json({ error: 'Coordenadas inválidas' }, { status: 400 })
    }
    if (accuracyMeters <= 0 || accuracyMeters > MAX_ACCURACY_METERS) {
      return NextResponse.json(
        { error: `Precisión GPS insuficiente (${Math.round(accuracyMeters)}m)` },
        { status: 400 }
      )
    }

    const userId = session.user.id
    const role = session.user.role as 'ADMIN' | 'MESERO' | 'CAJERO' | 'TAQUILLA'
    const latestMark = await prisma.attendanceMark.findFirst({
      where: { userId },
      orderBy: { markedAt: 'desc' },
      select: { type: true },
    })

    if (typeRaw === 'IN' && latestMark?.type === 'IN') {
      return NextResponse.json({ error: 'Ya tienes una entrada activa. Debes marcar salida.' }, { status: 409 })
    }
    if (typeRaw === 'OUT' && latestMark?.type !== 'IN') {
      return NextResponse.json({ error: 'No puedes marcar salida sin una entrada previa.' }, { status: 409 })
    }

    const settings = await prisma.attendanceSettings.findUnique({
      where: { id: SETTINGS_ID },
      select: {
        referenceLatitude: true,
        referenceLongitude: true,
        radiusMeters: true,
        isActive: true,
      },
    })

    if (
      !settings ||
      !settings.isActive ||
      settings.referenceLatitude == null ||
      settings.referenceLongitude == null
    ) {
      return NextResponse.json(
        { error: 'El admin aún no ha configurado las coordenadas de referencia.' },
        { status: 400 }
      )
    }

    const allowedRadius = settings.radiusMeters || DEFAULT_RADIUS_METERS
    const distanceMeters = haversineDistanceMeters(
      latitude,
      longitude,
      settings.referenceLatitude,
      settings.referenceLongitude
    )

    if (distanceMeters > allowedRadius) {
      return NextResponse.json(
        {
          error: `Marcaje bloqueado: estás a ${Math.round(distanceMeters)}m del punto permitido (máximo ${allowedRadius}m).`,
        },
        { status: 400 }
      )
    }

    const safeName = selfie.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const filename = `attendance/${userId}/${Date.now()}-${safeName || 'selfie.jpg'}`
    const blob = await put(filename, selfie, { access: 'public' })

    const notes = typeof notesRaw === 'string' ? notesRaw.trim() : ''
    const mark = await prisma.attendanceMark.create({
      data: {
        userId,
        role,
        type: typeRaw,
        latitude,
        longitude,
        accuracyMeters,
        selfieUrl: blob.url,
        source: 'web',
        userAgent: req.headers.get('user-agent')?.slice(0, 500) || null,
        notes: notes || null,
      },
      select: {
        id: true,
        type: true,
        markedAt: true,
        latitude: true,
        longitude: true,
        accuracyMeters: true,
        selfieUrl: true,
      },
    })

    await prisma.log.create({
      data: {
        userId,
        action: 'ATTENDANCE_MARK',
        details: {
          attendanceMarkId: mark.id,
          type: mark.type,
          role,
          markedAt: mark.markedAt.toISOString(),
          latitude: mark.latitude,
          longitude: mark.longitude,
          accuracyMeters: mark.accuracyMeters,
          selfieUrl: mark.selfieUrl,
          distanceMeters: Math.round(distanceMeters),
          allowedRadiusMeters: allowedRadius,
        },
      },
    })

    return NextResponse.json({
      ok: true,
      mark: {
        ...mark,
        markedAt: mark.markedAt.toISOString(),
      },
    })
  } catch (error: any) {
    console.error('[attendance/mark] Error:', error)
    return NextResponse.json(
      { error: error?.message || 'No se pudo registrar el marcaje' },
      { status: 500 }
    )
  }
}

import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// Publicaciones o reels de Instagram: instagram.com/p/<code>, /reel/<code>, /<usuario>/p/<code>
const IG_POST_RE = /^https?:\/\/(www\.)?instagram\.com\/([A-Za-z0-9._]+\/)?(p|reel|reels|tv)\/[A-Za-z0-9_-]+\/?(\?.*)?$/i

function clean(value: unknown, max: number) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

export async function POST(request: Request) {
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 })
  }

  const fullName = clean(body?.fullName, 120)
  const nationalId = clean(body?.nationalId, 30).replace(/[\s-]/g, '')
  const phone = clean(body?.phone, 30)
  const email = clean(body?.email, 160).toLowerCase()
  const instagramUrl = clean(body?.instagramUrl, 300).split('?')[0].replace(/\/$/, '')

  if (fullName.length < 3) {
    return NextResponse.json({ error: 'Ingresa tu nombre completo' }, { status: 400 })
  }
  if (!/^[A-Za-z0-9]{5,20}$/.test(nationalId)) {
    return NextResponse.json({ error: 'Ingresa un número de identidad válido' }, { status: 400 })
  }
  if (phone.replace(/\D/g, '').length < 8) {
    return NextResponse.json({ error: 'Ingresa un número de teléfono válido' }, { status: 400 })
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Ingresa un correo válido' }, { status: 400 })
  }
  if (!IG_POST_RE.test(instagramUrl)) {
    return NextResponse.json(
      { error: 'Pega el enlace de tu publicación de Instagram (instagram.com/p/... o /reel/...)' },
      { status: 400 }
    )
  }

  try {
    const contestant = await prisma.halloweenContestant.create({
      data: { fullName, nationalId, phone, email, instagramUrl },
      select: { id: true },
    })
    return NextResponse.json({ ok: true, id: contestant.id })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = String((error.meta as any)?.target ?? '')
      const msg = target.includes('instagram')
        ? 'Esa publicación de Instagram ya fue registrada'
        : 'Ya existe un registro con ese número de identidad'
      return NextResponse.json({ error: msg }, { status: 409 })
    }
    console.error('[halloween-registro]', error)
    return NextResponse.json({ error: 'No pudimos guardar tu registro. Intenta de nuevo.' }, { status: 500 })
  }
}

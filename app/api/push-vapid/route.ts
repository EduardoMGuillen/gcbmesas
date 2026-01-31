import { NextResponse } from 'next/server'
import { isPushConfigured } from '@/lib/push'

export async function GET() {
  const publicKey = process.env.VAPID_PUBLIC_KEY
  if (!isPushConfigured() || !publicKey) {
    return NextResponse.json(
      { error: 'Push no configurado' },
      { status: 503 }
    )
  }
  return NextResponse.json({ publicKey })
}

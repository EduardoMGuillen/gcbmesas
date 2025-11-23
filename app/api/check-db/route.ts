import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Test database connection
    await prisma.$connect()
    
    // Check if admin user exists
    const adminUser = await prisma.user.findUnique({
      where: { username: 'admin' },
    })

    // Count users
    const userCount = await prisma.user.count()

    return NextResponse.json({
      success: true,
      database: 'connected',
      adminExists: !!adminUser,
      userCount,
      message: adminUser
        ? 'Base de datos conectada. Usuario admin existe.'
        : 'Base de datos conectada. Usuario admin NO existe. Ejecuta: npm run db:seed',
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        database: 'error',
        error: error.message,
        message: 'Error de conexión a la base de datos. Verifica DATABASE_URL.',
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}


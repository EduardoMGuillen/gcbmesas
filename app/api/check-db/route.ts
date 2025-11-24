import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  let connected = false
  try {
    // Test database connection
    try {
      await prisma.$connect()
      connected = true
    } catch (connectError: any) {
      return NextResponse.json(
        {
          success: false,
          database: 'error',
          error: connectError.message,
          message: 'Error de conexión a la base de datos. Verifica DATABASE_URL.',
        },
        { status: 500 }
      )
    }
    
    // Try to check admin user with retry logic for prepared statement errors
    let adminUser = null
    let userCount = 0
    
    try {
      adminUser = await prisma.user.findUnique({
        where: { username: 'admin' },
      })
    } catch (queryError: any) {
      // If prepared statement error, try to reconnect and retry
      if (queryError.message?.includes('prepared statement')) {
        console.warn('Prepared statement error detected, reconnecting...')
        try {
          await prisma.$disconnect()
          await prisma.$connect()
          // Retry the query
          adminUser = await prisma.user.findUnique({
            where: { username: 'admin' },
          })
        } catch (retryError: any) {
          console.error('Retry failed:', retryError)
          // Continue anyway - we'll show the error but connection is OK
        }
      } else {
        throw queryError
      }
    }
    
    try {
      userCount = await prisma.user.count()
    } catch (countError: any) {
      // If prepared statement error, try to reconnect and retry
      if (countError.message?.includes('prepared statement')) {
        console.warn('Prepared statement error in count, reconnecting...')
        try {
          await prisma.$disconnect()
          await prisma.$connect()
          userCount = await prisma.user.count()
        } catch (retryError: any) {
          console.error('Retry count failed:', retryError)
          // Continue with userCount = 0
        }
      } else {
        throw countError
      }
    }

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
    // If we got here and connected is true, it's a query error, not connection
    if (connected) {
      return NextResponse.json({
        success: false,
        database: 'connected',
        error: error.message,
        message: 'Base de datos conectada pero error en query. Puede ser error de prepared statements.',
        adminExists: false,
        userCount: 0,
      })
    }
    
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
    try {
      await prisma.$disconnect()
    } catch (e) {
      // Ignore disconnect errors
    }
  }
}


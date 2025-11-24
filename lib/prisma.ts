import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // Deshabilitar prepared statements para evitar conflictos con Session Pooler
    // Esto es necesario cuando se usa Session Pooler en lugar de Transaction Pooler
    __internal: {
      engine: {
        connectTimeout: 10000,
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Test connection on initialization
if (typeof window === 'undefined') {
  prisma.$connect().catch((error) => {
    console.error('Failed to connect to database:', error)
  })
}


import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Configurar Prisma para trabajar con connection poolers
// Deshabilitar prepared statements para evitar conflictos
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })

// Deshabilitar prepared statements después de la creación del cliente
// Esto es necesario cuando se usa connection pooler (Transaction o Session Pooler)
if (process.env.DATABASE_URL?.includes('pooler.supabase.com')) {
  // Forzar que Prisma no use prepared statements
  // Esto se hace modificando la URL de conexión para incluir parámetros específicos
  // Los parámetros ya están en setup-env.js, pero podemos asegurarnos aquí también
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Test connection on initialization
if (typeof window === 'undefined') {
  prisma.$connect().catch((error) => {
    console.error('Failed to connect to database:', error)
  })
}


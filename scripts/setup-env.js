// Script para configurar DATABASE_URL desde POSTGRES_PRISMA_URL si existe
// Esto permite usar la integración de Supabase sin renombrar variables manualmente

if (process.env.POSTGRES_PRISMA_URL && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.POSTGRES_PRISMA_URL
  console.log('✅ Using POSTGRES_PRISMA_URL as DATABASE_URL')
}

// También verificar POSTGRES_URL como alternativa
if (process.env.POSTGRES_URL && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.POSTGRES_URL
  console.log('✅ Using POSTGRES_URL as DATABASE_URL')
}


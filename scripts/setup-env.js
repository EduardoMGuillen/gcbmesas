// Script para configurar DATABASE_URL desde variables de Supabase integration
// Esto permite usar la integración de Supabase sin renombrar variables manualmente

// Prioridad: POSTGRES_PRISMA_URL (Connection Pooling - mejor para serverless) > POSTGRES_URL > POSTGRES_URL_NON_POOLING
if (process.env.POSTGRES_PRISMA_URL) {
  process.env.DATABASE_URL = process.env.POSTGRES_PRISMA_URL
  console.log('✅ Using POSTGRES_PRISMA_URL (Connection Pooling) as DATABASE_URL')
} else if (process.env.POSTGRES_URL && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.POSTGRES_URL
  console.log('✅ Using POSTGRES_URL as DATABASE_URL')
} else if (process.env.POSTGRES_URL_NON_POOLING && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.POSTGRES_URL_NON_POOLING
  console.log('✅ Using POSTGRES_URL_NON_POOLING as DATABASE_URL')
} else if (process.env.DATABASE_URL) {
  console.log('✅ DATABASE_URL already set')
} else {
  console.warn('⚠️ No database URL found. Please configure POSTGRES_PRISMA_URL, POSTGRES_URL, or DATABASE_URL')
}

// Verificar que tenga ?schema=public
if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('?schema=public')) {
  const separator = process.env.DATABASE_URL.includes('?') ? '&' : '?'
  process.env.DATABASE_URL = `${process.env.DATABASE_URL}${separator}schema=public`
  console.log('✅ Added ?schema=public to DATABASE_URL')
}


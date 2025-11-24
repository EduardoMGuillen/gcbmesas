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

// Validar que esté usando Session Pooler (puerto 6543) para Vercel
if (process.env.DATABASE_URL && process.env.VERCEL) {
  const dbUrl = process.env.DATABASE_URL
  // Verificar si está usando puerto 5432 (directo) en lugar de 6543 (pooler)
  if (dbUrl.includes(':5432/')) {
    console.error('❌ ERROR: DATABASE_URL está usando puerto 5432 (conexión directa)')
    console.error('   Vercel requiere Session Pooler (puerto 6543)')
    console.error('   Por favor, actualiza DATABASE_URL o POSTGRES_PRISMA_URL en Vercel')
    console.error('   Formato correcto: postgresql://...@pooler.supabase.com:6543/...')
    process.exit(1)
  }
  // Verificar que esté usando pooler.supabase.com
  if (!dbUrl.includes('pooler.supabase.com') && !dbUrl.includes('pooler.supabase.co')) {
    console.warn('⚠️ ADVERTENCIA: DATABASE_URL no parece usar Session Pooler')
    console.warn('   Para Vercel, se recomienda usar: ...@pooler.supabase.com:6543/...')
  }
}


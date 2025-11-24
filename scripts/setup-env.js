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

// Verificar que tenga ?schema=public y agregar parámetros de conexión
if (process.env.DATABASE_URL) {
  let dbUrl = process.env.DATABASE_URL
  
  // Agregar schema=public si no está
  if (!dbUrl.includes('schema=public')) {
    const separator = dbUrl.includes('?') ? '&' : '?'
    dbUrl = `${dbUrl}${separator}schema=public`
  }
  
  // Agregar parámetros de conexión para evitar timeouts
  const params = []
  if (!dbUrl.includes('connect_timeout')) {
    params.push('connect_timeout=10')
  }
  if (!dbUrl.includes('pool_timeout')) {
    params.push('pool_timeout=10')
  }
  
  // Para Transaction Pooler, NO necesitamos pgbouncer=true ni statement_cache_size=0
  // Transaction Pooler ya maneja esto correctamente
  // Solo agregar pgbouncer=true si se detecta Session Pooler (aunque no debería ser necesario)
  // Pero mejor no agregarlo para Transaction Pooler ya que puede causar problemas
  
  if (params.length > 0) {
    const separator = dbUrl.includes('?') ? '&' : '?'
    dbUrl = `${dbUrl}${separator}${params.join('&')}`
  }
  
  process.env.DATABASE_URL = dbUrl
  console.log('✅ DATABASE_URL configured with schema and connection parameters')
}

// Validar que esté usando Session Pooler en Vercel (solo advertencia, no corrección)
if (process.env.DATABASE_URL && process.env.VERCEL) {
  const dbUrl = process.env.DATABASE_URL
  
  // Si está usando conexión directa (db.xxxxx.supabase.co:5432), mostrar error
  if (dbUrl.includes('db.') && dbUrl.includes('.supabase.co:5432')) {
    console.error('❌ ERROR: DATABASE_URL está usando conexión directa (puerto 5432)')
    console.error('   Vercel NO puede usar conexión directa - requiere Session Pooler')
    console.error('   Por favor, actualiza DATABASE_URL o POSTGRES_PRISMA_URL en Vercel')
    console.error('   Formato correcto: postgresql://...@pooler.supabase.com:6543/...')
    process.exit(1)
  }
  
  // Verificar que esté usando pooler
  if (!dbUrl.includes('pooler.supabase.com') && !dbUrl.includes('pooler.supabase.co')) {
    console.warn('⚠️ ADVERTENCIA: DATABASE_URL no parece usar Session Pooler')
    console.warn('   Para Vercel, se recomienda usar: ...@pooler.supabase.com:6543/...')
  }
}


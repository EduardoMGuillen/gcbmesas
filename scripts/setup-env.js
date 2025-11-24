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

// Validar y corregir automáticamente el puerto para Session Pooler
if (process.env.DATABASE_URL && process.env.VERCEL) {
  let dbUrl = process.env.DATABASE_URL
  let wasFixed = false
  
  // Si está usando pooler pero con puerto 5432, corregir a 6543
  if (dbUrl.includes('pooler.supabase.com') || dbUrl.includes('pooler.supabase.co')) {
    if (dbUrl.includes(':5432/')) {
      console.warn('⚠️ ADVERTENCIA: Detectado puerto 5432 con pooler.supabase.com')
      console.warn('   Corrigiendo automáticamente a puerto 6543 (Session Pooler)')
      dbUrl = dbUrl.replace(':5432/', ':6543/')
      process.env.DATABASE_URL = dbUrl
      wasFixed = true
    }
  }
  
  // Si está usando conexión directa (db.xxxxx.supabase.co:5432), mostrar error
  if (dbUrl.includes('db.') && dbUrl.includes('.supabase.co:5432')) {
    console.error('❌ ERROR: DATABASE_URL está usando conexión directa (puerto 5432)')
    console.error('   Vercel NO puede usar conexión directa - requiere Session Pooler')
    console.error('   Por favor, actualiza DATABASE_URL o POSTGRES_PRISMA_URL en Vercel')
    console.error('   Formato correcto: postgresql://...@pooler.supabase.com:6543/...')
    console.error('')
    console.error('   Pasos:')
    console.error('   1. Ve a Supabase Dashboard → Settings → Database')
    console.error('   2. Selecciona "Connection Pooling" → "Session mode"')
    console.error('   3. Copia la Connection String (con puerto 6543)')
    console.error('   4. Actualiza en Vercel → Settings → Environment Variables')
    process.exit(1)
  }
  
  // Verificar que esté usando pooler después de la corrección
  if (!dbUrl.includes('pooler.supabase.com') && !dbUrl.includes('pooler.supabase.co')) {
    console.warn('⚠️ ADVERTENCIA: DATABASE_URL no parece usar Session Pooler')
    console.warn('   Para Vercel, se recomienda usar: ...@pooler.supabase.com:6543/...')
    console.warn('   La conexión puede fallar. Por favor, actualiza la URL en Vercel.')
  } else if (wasFixed) {
    console.log('✅ URL corregida automáticamente a puerto 6543')
  }
}


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
  if (!dbUrl.includes('connect_timeout')) {
    const separator = dbUrl.includes('?') ? '&' : '?'
    dbUrl = `${dbUrl}${separator}connect_timeout=10&pool_timeout=10`
  }
  
  process.env.DATABASE_URL = dbUrl
  console.log('✅ DATABASE_URL configured with schema and connection parameters')
}

// Función para corregir el puerto en URLs de Supabase
function fixSupabasePort(url) {
  if (!url) return url
  
  // Si está usando pooler pero con puerto 5432, corregir a 6543
  // Esto puede pasar si Supabase muestra la URL incorrecta o si se copió mal
  if ((url.includes('pooler.supabase.com') || url.includes('pooler.supabase.co')) && url.includes(':5432')) {
    console.warn('⚠️ Detectado puerto 5432 con pooler.supabase.com')
    console.warn('   El Session Pooler SIEMPRE usa puerto 6543, no 5432')
    console.warn('   Corrigiendo automáticamente a puerto 6543')
    // Reemplazar :5432/ o :5432? o :5432 al final
    url = url.replace(/:5432(\/|\?|$)/g, ':6543$1')
    return url
  }
  
  // Si tiene pooler pero no especifica puerto, agregar 6543
  if ((url.includes('pooler.supabase.com') || url.includes('pooler.supabase.co')) && !url.match(/:\d{4}/)) {
    console.warn('⚠️ URL de pooler sin puerto especificado - agregando puerto 6543')
    url = url.replace(/@([^:]+)(\/|\?|$)/, '@$1:6543$2')
    return url
  }
  
  return url
}

// Corregir puerto en todas las variables de entorno relacionadas
const dbVars = ['DATABASE_URL', 'POSTGRES_PRISMA_URL', 'POSTGRES_URL', 'POSTGRES_URL_NON_POOLING']
let anyFixed = false

for (const varName of dbVars) {
  if (process.env[varName]) {
    const original = process.env[varName]
    const fixed = fixSupabasePort(original)
    if (fixed !== original) {
      process.env[varName] = fixed
      console.log(`✅ Corregido puerto en ${varName}: 5432 → 6543`)
      anyFixed = true
    }
  }
}

if (anyFixed) {
  console.log('✅ URLs corregidas automáticamente para usar Session Pooler (puerto 6543)')
}

// Validar que no esté usando conexión directa en Vercel
if (process.env.DATABASE_URL && process.env.VERCEL) {
  const dbUrl = process.env.DATABASE_URL
  
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
  }
}


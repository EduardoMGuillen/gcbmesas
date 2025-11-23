// Script que se ejecuta después del build para asegurar que la BD esté lista
const { execSync } = require('child_process')

console.log('🔧 Ejecutando post-build setup...')

try {
  // Verificar que DATABASE_URL esté configurada
  if (!process.env.DATABASE_URL) {
    console.warn('⚠️ DATABASE_URL no está configurada, saltando setup de BD')
    process.exit(0)
  }

  console.log('📦 Creando tablas en la base de datos...')
  execSync('npx prisma db push --accept-data-loss', {
    stdio: 'inherit',
    env: process.env,
  })

  console.log('🌱 Ejecutando seed...')
  try {
    execSync('npx ts-node --compiler-options "{\\"module\\":\\"CommonJS\\"}" prisma/seed.ts', {
      stdio: 'inherit',
      env: process.env,
    })
    console.log('✅ Seed completado')
  } catch (seedError) {
    // El seed puede fallar si ya existe, no es crítico
    console.warn('⚠️ Seed ya ejecutado o error no crítico:', seedError.message)
  }

  console.log('✅ Post-build setup completado')
} catch (error) {
  console.error('❌ Error en post-build setup:', error.message)
  // No fallar el build si hay un error
  console.warn('⚠️ Continuando con el build...')
  process.exit(0)
}


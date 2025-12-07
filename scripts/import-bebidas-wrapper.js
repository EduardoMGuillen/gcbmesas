// Wrapper script para importar bebidas
// Esto evita problemas con el formato de comillas en PowerShell

// Cargar dotenv PRIMERO antes de cualquier otra cosa
const dotenv = require('dotenv')
const path = require('path')
const fs = require('fs')

// Intentar cargar .env desde la raíz del proyecto
const envPath = path.resolve(process.cwd(), '.env')
const result = dotenv.config({ path: envPath })

if (result.error) {
  console.warn('⚠️ No se pudo cargar .env:', result.error.message)
} else {
  console.log('✅ Variables de entorno cargadas desde:', envPath)
}

// Si aún no está configurada, intentar leer directamente del archivo
if (!process.env.DATABASE_URL) {
  try {
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8')
      console.log('📄 Contenido del archivo .env (primeros 100 chars):', envContent.substring(0, 100))
      const lines = envContent.split(/\r?\n/)
      console.log('📝 Número de líneas:', lines.length)
      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed && !trimmed.startsWith('#')) {
          const equalIndex = trimmed.indexOf('=')
          if (equalIndex > 0) {
            const key = trimmed.substring(0, equalIndex).trim()
            const value = trimmed.substring(equalIndex + 1).trim()
            process.env[key] = value
            console.log(`✅ Cargada variable: ${key} = ${value.substring(0, 30)}...`)
          }
        }
      }
      console.log('✅ Variables cargadas manualmente desde .env')
    } else {
      console.warn('⚠️ Archivo .env no existe en:', envPath)
    }
  } catch (err) {
    console.warn('⚠️ Error al leer .env manualmente:', err.message)
  }
}

// Verificar que DATABASE_URL esté configurada
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL no está configurada')
  console.error('   Por favor, crea un archivo .env con:')
  console.error('   DATABASE_URL=tu_connection_string')
  process.exit(1)
}

console.log('✅ DATABASE_URL configurada:', process.env.DATABASE_URL.substring(0, 50) + '...')

require('ts-node').register({
  compilerOptions: {
    module: 'commonjs'
  }
})

// Cargar variables de entorno primero
require('./setup-env.js')

// Ejecutar el script de importación
require('./import-bebidas.ts')


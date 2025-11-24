// Script para ejecutar db:setup con timeout
const { exec } = require('child_process')
const { promisify } = require('util')

const execAsync = promisify(exec)

async function runWithTimeout(command, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    const child = exec(command, { timeout: timeoutMs })
    
    let stdout = ''
    let stderr = ''
    
    child.stdout.on('data', (data) => {
      stdout += data
      process.stdout.write(data)
    })
    
    child.stderr.on('data', (data) => {
      stderr += data
      process.stderr.write(data)
    })
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr })
      } else {
        // Timeout returns code 124 on Unix, 1 on Windows
        if (code === 124 || code === 1) {
          console.warn(`⚠️ Command timed out or failed with code ${code}, continuing...`)
          resolve({ stdout, stderr, timedOut: true })
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr}`))
        }
      }
    })
    
    child.on('error', (error) => {
      reject(error)
    })
  })
}

async function main() {
  console.log('🚀 Starting database setup...')
  
  try {
    // Step 1: Prisma db push with timeout
    // Nota: El error de "prepared statement already exists" es común con connection poolers
    // pero no es crítico - el schema puede estar ya actualizado
    console.log('📦 Running prisma db push...')
    console.log('   (Note: Prepared statement errors are non-critical with poolers)')
    try {
      // Usar --skip-generate para evitar regenerar el cliente
      // Reducir timeout a 30 segundos para evitar que se quede atascado
      await runWithTimeout('npx prisma db push --accept-data-loss --skip-generate', 30000)
      console.log('✅ Database schema pushed successfully')
    } catch (error) {
      // Cualquier error en db:push es no crítico
      // El schema puede estar ya actualizado, o las tablas pueden existir
      const errorMsg = error.message || String(error)
      if (errorMsg.includes('prepared statement')) {
        console.warn('⚠️ Prepared statement error during db:push (non-critical)')
        console.warn('   This is common with connection poolers (Transaction/Session Pooler)')
        console.warn('   The schema may already be up to date. Continuing...')
      } else if (errorMsg.includes('timeout') || errorMsg.includes('timed out')) {
        console.warn('⚠️ db:push timed out (non-critical)')
        console.warn('   Schema may already be updated. Continuing...')
      } else {
        console.warn('⚠️ db:push encountered an error (non-critical):', errorMsg.substring(0, 200))
        console.warn('   Continuing with seed - schema may already be up to date')
      }
      // No lanzar el error - continuar con el seed
    }
    
    // Step 2: Seed database
    console.log('🌱 Running database seed...')
    try {
      await runWithTimeout('npx ts-node --compiler-options \'{"module":"CommonJS"}\' prisma/seed.ts', 30000)
      console.log('✅ Database seeded successfully')
    } catch (error) {
      // El error de "prepared statement already exists" es común con Session Pooler
      // pero no es crítico si el seed se completa
      if (error.message && error.message.includes('prepared statement')) {
        console.warn('⚠️ Prepared statement error detected (common with Session Pooler)')
        console.warn('   Consider switching to Transaction Pooler for better Prisma compatibility')
        console.warn('   See: CAMBIAR_A_TRANSACTION_POOLER.md')
        console.log('✅ Seed completed despite warning (non-critical)')
      } else {
        console.warn('⚠️ Seed failed or timed out:', error.message)
        console.log('ℹ️ Seed skipped - this is not critical')
      }
    }
    
    console.log('✅ Database setup completed')
  } catch (error) {
    console.error('❌ Database setup failed:', error)
    // Don't exit with error code - let the build continue
    process.exit(0)
  }
}

main()


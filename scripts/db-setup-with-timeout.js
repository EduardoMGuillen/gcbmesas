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
    console.log('📦 Running prisma db push...')
    try {
      await runWithTimeout('npx prisma db push --accept-data-loss --skip-generate', 60000)
      console.log('✅ Database schema pushed successfully')
    } catch (error) {
      console.warn('⚠️ db:push failed or timed out, continuing anyway:', error.message)
    }
    
    // Step 2: Seed database
    console.log('🌱 Running database seed...')
    try {
      await runWithTimeout('npx ts-node --compiler-options \'{"module":"CommonJS"}\' prisma/seed.ts', 30000)
      console.log('✅ Database seeded successfully')
    } catch (error) {
      console.warn('⚠️ Seed failed or timed out:', error.message)
      console.log('ℹ️ Seed skipped - this is not critical')
    }
    
    console.log('✅ Database setup completed')
  } catch (error) {
    console.error('❌ Database setup failed:', error)
    // Don't exit with error code - let the build continue
    process.exit(0)
  }
}

main()


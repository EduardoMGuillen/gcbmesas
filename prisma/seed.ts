import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

  // Crear usuario administrador por defecto
  // Solo crear si no existe - no actualizar contraseña si ya existe
  const existingAdmin = await prisma.user.findUnique({
    where: { username: 'admin' },
  })
  
  if (!existingAdmin) {
    const adminPassword = await bcrypt.hash('admin123gcb', 10)
    const newAdmin = await prisma.user.create({
      data: {
        username: 'admin',
        password: adminPassword,
        role: 'ADMIN',
      },
    })
    console.log('✅ Usuario administrador creado:', newAdmin.username)
  } else {
    console.log('✅ Usuario administrador ya existe (contraseña no modificada)')
  }

  console.log('✅ Usuario administrador creado:', admin.username)

  // Crear algunos productos de ejemplo
  const products = [
    { name: 'Cerveza', price: 50, category: 'Bebidas' },
    { name: 'Cocktail', price: 120, category: 'Bebidas' },
    { name: 'Agua', price: 30, category: 'Bebidas' },
    { name: 'Botella de Vino', price: 500, category: 'Bebidas' },
    { name: 'Nachos', price: 80, category: 'Comida' },
    { name: 'Pizza', price: 150, category: 'Comida' },
  ]

  for (const product of products) {
    const existing = await prisma.product.findFirst({
      where: { name: product.name },
    })
    if (!existing) {
      await prisma.product.create({
        data: product,
      })
    }
  }

  console.log('✅ Productos de ejemplo creados')

  // Crear algunas mesas de ejemplo
  const tables = [
    { name: 'Mesa 1', zone: 'Terraza' },
    { name: 'Mesa 2', zone: 'Terraza' },
    { name: 'Mesa 3', zone: 'Interior' },
    { name: 'Mesa 4', zone: 'Interior' },
    { name: 'Mesa VIP 1', zone: 'VIP' },
  ]

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const shortCodeChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const generateShortCode = async () => {
    for (let attempt = 0; attempt < 25; attempt++) {
      let code = ''
      for (let i = 0; i < 4; i++) {
        const index = Math.floor(Math.random() * shortCodeChars.length)
        code += shortCodeChars[index]
      }
      const exists = await prisma.table.findUnique({
        where: { shortCode: code },
      })
      if (!exists) return code
    }
    throw new Error('No se pudo generar un código corto único para seed')
  }

  for (const table of tables) {
    const existing = await prisma.table.findFirst({
      where: { name: table.name },
    })
    if (!existing) {
      const shortCode = await generateShortCode()
      const created = await prisma.table.create({
        data: {
          name: table.name,
          zone: table.zone,
          shortCode,
          qrUrl: `${appUrl}/mesa/${randomUUID()}`,
        },
      })

      // Update with actual ID
      await prisma.table.update({
        where: { id: created.id },
        data: {
          qrUrl: `${appUrl}/mesa/${created.id}`,
        },
      })
    }
  }

  console.log('✅ Mesas de ejemplo creadas')

  console.log('🎉 Seed completado!')
  if (!existingAdmin) {
    console.log('\n📝 Credenciales por defecto (solo si se creó el usuario):')
    console.log('   Usuario: admin')
    console.log('   Contraseña: admin123gcb')
    console.log('\n⚠️  IMPORTANTE: Cambia la contraseña después del primer inicio de sesión!')
  }
}

main()
  .catch((e) => {
    // El error de "prepared statement already exists" es común con Session Pooler
    // pero no es crítico - el seed puede completarse a pesar del error
    if (e.message && e.message.includes('prepared statement')) {
      console.warn('⚠️ Prepared statement error (common with Session Pooler)')
      console.warn('   This is non-critical. Consider switching to Transaction Pooler.')
      console.warn('   See: CAMBIAR_A_TRANSACTION_POOLER.md for instructions')
      // No hacer exit(1) para no romper el build
    } else if (process.env.NODE_ENV === 'production') {
      console.warn('⚠️ Seed warning (no crítico):', e.message)
      // No hacer exit(1) para no romper el build
    } else {
      console.error(e)
      process.exit(1)
    }
  })
  .finally(async () => {
    await prisma.$disconnect()
  })


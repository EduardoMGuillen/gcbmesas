import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

  // Crear usuario administrador por defecto
  const adminPassword = await bcrypt.hash('admin123', 10)
  
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: adminPassword,
      role: 'ADMIN',
    },
  })

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

  for (const table of tables) {
    const existing = await prisma.table.findFirst({
      where: { name: table.name },
    })
    if (!existing) {
      const created = await prisma.table.create({
        data: {
          name: table.name,
          zone: table.zone,
          qrUrl: `${appUrl}/mesa/${randomUUID()}`,
        },
      })

      // Update with actual ID
      await prisma.table.update({
        where: { id: created.id },
        data: { qrUrl: `${appUrl}/mesa/${created.id}` },
      })
    }
  }

  console.log('✅ Mesas de ejemplo creadas')

  console.log('🎉 Seed completado!')
  console.log('\n📝 Credenciales por defecto:')
  console.log('   Usuario: admin')
  console.log('   Contraseña: admin123')
  console.log('\n⚠️  IMPORTANTE: Cambia la contraseña después del primer inicio de sesión!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })


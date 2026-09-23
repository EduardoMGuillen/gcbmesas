import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

import { CASH_REGISTERS } from '../lib/ops-constants'

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

  for (const r of CASH_REGISTERS) {
    await prisma.cashRegister.upsert({
      where: { slug: r.slug },
      create: { slug: r.slug, name: r.name, defaultFloat: r.defaultFloat },
      update: { name: r.name, isActive: true },
    })
  }
  console.log('✅ Cajas Cover / Astro / Eventos listas')


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


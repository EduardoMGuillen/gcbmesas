import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 Corrigiendo contraseña del usuario admin...')

  // Buscar el usuario admin
  const admin = await prisma.user.findUnique({
    where: { username: 'admin' },
  })

  if (!admin) {
    console.error('❌ Usuario admin no encontrado')
    process.exit(1)
  }

  // Hashear la contraseña correctamente
  const hashedPassword = await bcrypt.hash('admin123', 10)

  // Actualizar la contraseña
  await prisma.user.update({
    where: { id: admin.id },
    data: { password: hashedPassword },
  })

  console.log('✅ Contraseña del usuario admin corregida (ahora está hasheada)')
  console.log('📝 Puedes iniciar sesión con:')
  console.log('   Usuario: admin')
  console.log('   Contraseña: admin123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })


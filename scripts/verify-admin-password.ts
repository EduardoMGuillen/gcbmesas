import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Verificando contraseña del usuario admin...')

  // Buscar el usuario admin
  const admin = await prisma.user.findUnique({
    where: { username: 'admin' },
  })

  if (!admin) {
    console.error('❌ Usuario admin no encontrado')
    console.log('💡 Ejecuta: npm run db:seed para crear el usuario admin')
    process.exit(1)
  }

  // Verificar si la contraseña está hasheada (bcrypt hashes start with $2a$, $2b$, or $2y$)
  const isHashed = admin.password.startsWith('$2a$') || 
                   admin.password.startsWith('$2b$') || 
                   admin.password.startsWith('$2y$')

  if (!isHashed) {
    console.log('⚠️  La contraseña NO está hasheada (está en texto plano)')
    console.log('🔧 Hasheando contraseña...')
    
    // Hashear la contraseña correctamente
    const hashedPassword = await bcrypt.hash(admin.password, 10)
    
    // Actualizar la contraseña
    await prisma.user.update({
      where: { id: admin.id },
      data: { password: hashedPassword },
    })
    
    console.log('✅ Contraseña hasheada correctamente')
  } else {
    console.log('✅ La contraseña ya está hasheada correctamente')
  }

  // Verificar que la contraseña 'admin123' funciona
  const testPassword = 'admin123'
  const isValid = await bcrypt.compare(testPassword, admin.password)
  
  if (isValid) {
    console.log('✅ La contraseña "admin123" es válida')
  } else {
    console.log('⚠️  La contraseña "admin123" NO es válida')
    console.log('💡 Si necesitas resetear la contraseña, ejecuta: npm run fix-admin-password')
  }

  console.log('\n📝 Credenciales:')
  console.log('   Usuario: admin')
  console.log('   Contraseña: admin123')
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })


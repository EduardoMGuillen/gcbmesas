import bcrypt from 'bcryptjs'

async function main() {
  const password = 'admin123'
  const hash = await bcrypt.hash(password, 10)
  
  console.log('\n🔐 Contraseña Hasheada:')
  console.log('─'.repeat(80))
  console.log(hash)
  console.log('─'.repeat(80))
  console.log('\n📝 Para usar en SQL:')
  console.log(`UPDATE "User" SET password = '${hash}' WHERE username = 'admin';`)
  console.log('\n✅ Listo!')
}

main().catch(console.error)


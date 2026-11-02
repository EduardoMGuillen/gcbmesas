#!/usr/bin/env node
/**
 * Aplica las migraciones pendientes en la base de datos (manual, nunca desde el build).
 *   1. Revisa que ninguna migración borre datos (migration-guard).
 *   2. Muestra el estado y aplica con `prisma migrate deploy`, que solo ejecuta
 *      migraciones nuevas ya versionadas en git: nunca compara ni "sincroniza" el esquema.
 */
const { execFileSync } = require('child_process')
const path = require('path')
const { checkMigrationsDir } = require('./migration-guard')

const root = path.join(__dirname, '..')
const problems = checkMigrationsDir(path.join(root, 'prisma', 'migrations'))
if (problems.length) {
  console.error('⛔ Hay migraciones que borran datos sin aprobar. Corre: node scripts/migration-guard.js')
  process.exit(1)
}

const run = (args) => execFileSync('npx', ['prisma', ...args], { cwd: root, stdio: 'inherit' })
try {
  run(['migrate', 'deploy'])
  console.log('\n✅ Base de datos al día.')
} catch {
  console.error('\n❌ prisma migrate deploy falló. No se aplicaron más cambios. Revisa el mensaje de arriba.')
  process.exit(1)
}

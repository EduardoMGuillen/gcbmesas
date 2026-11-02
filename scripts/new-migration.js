#!/usr/bin/env node
/**
 * Crea una migración comparando prisma/schema.prisma contra el esquema de un commit (por defecto HEAD).
 * No se conecta a la base de datos.
 *
 * Uso:
 *   1. Edita prisma/schema.prisma (sin hacer commit todavía)
 *   2. npm run db:new-migration -- agregar_campo_x
 *   3. Revisa prisma/migrations/<fecha>_agregar_campo_x/migration.sql
 *   4. npm run db:deploy   (aplica en la base)  →  commit + push
 *
 * Opcional: --from=<ref de git> para comparar contra otro commit.
 */
const { execFileSync } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { findDestructiveStatements, APPROVAL_MARKER } = require('./migration-guard')

const args = process.argv.slice(2)
const name = args.find((a) => !a.startsWith('--'))
const fromRef = (args.find((a) => a.startsWith('--from=')) || '--from=HEAD').slice('--from='.length)

if (!name || !/^[a-z0-9_]+$/.test(name)) {
  console.error('Uso: npm run db:new-migration -- <nombre_en_snake_case> [--from=HEAD]')
  process.exit(1)
}

const root = path.join(__dirname, '..')
const schemaPath = path.join(root, 'prisma', 'schema.prisma')
const prevPath = path.join(os.tmpdir(), `schema-${Date.now()}.prisma`)
fs.writeFileSync(prevPath, execFileSync('git', ['show', `${fromRef}:prisma/schema.prisma`], { cwd: root }))

let sql
try {
  sql = execFileSync(
    'npx',
    ['prisma', 'migrate', 'diff', '--from-schema-datamodel', prevPath, '--to-schema-datamodel', schemaPath, '--script'],
    { cwd: root, encoding: 'utf8' }
  )
} finally {
  fs.unlinkSync(prevPath)
}

if (!sql.trim() || /^--\s*This is an empty migration/i.test(sql.trim())) {
  console.log(`Sin cambios de esquema respecto a ${fromRef}. No se creó migración.`)
  process.exit(0)
}

const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)
const dir = path.join(root, 'prisma', 'migrations', `${stamp}_${name}`)
fs.mkdirSync(dir, { recursive: true })
fs.writeFileSync(path.join(dir, 'migration.sql'), sql)
console.log(`✅ Creada ${path.relative(root, dir)}/migration.sql\n`)
console.log(sql)

const danger = findDestructiveStatements(sql)
if (danger.length) {
  console.warn('⚠️  Esta migración BORRA DATOS:')
  for (const d of danger) console.warn(`   línea ${d.line} [${d.rule}] ${d.text}`)
  console.warn(`\n   El build fallará hasta que la revises, respaldes y agregues:\n   ${APPROVAL_MARKER}: <motivo>`)
}

#!/usr/bin/env node
/**
 * Guardián de migraciones: falla si alguna migración en prisma/migrations puede borrar datos.
 *
 * Se considera destructivo: DROP TABLE, DROP COLUMN, DROP TYPE/SCHEMA, TRUNCATE, DELETE FROM,
 * y cambiar el tipo de una columna (ALTER COLUMN ... TYPE).
 * No se consideran destructivos: DROP INDEX, DROP CONSTRAINT, DROP DEFAULT, DROP NOT NULL.
 *
 * Si un cambio destructivo es intencional (después de respaldar), agrega en la migración la línea:
 *   -- data-loss-approved: <motivo y fecha del respaldo>
 *
 * Uso: node scripts/migration-guard.js   (sale con código 1 si encuentra algo)
 */
const fs = require('fs')
const path = require('path')

const APPROVAL_MARKER = '-- data-loss-approved'

const RULES = [
  { name: 'DROP TABLE', re: /\bDROP\s+TABLE\b/i },
  { name: 'DROP COLUMN', re: /\bDROP\s+COLUMN\b/i },
  { name: 'DROP TYPE', re: /\bDROP\s+TYPE\b/i },
  { name: 'DROP SCHEMA', re: /\bDROP\s+SCHEMA\b/i },
  { name: 'TRUNCATE', re: /\bTRUNCATE\b/i },
  { name: 'DELETE FROM', re: /\bDELETE\s+FROM\b/i },
  { name: 'cambio de tipo de columna', re: /\bALTER\s+COLUMN\s+"?\w+"?\s+(SET\s+DATA\s+)?TYPE\b/i },
]

/** Devuelve las sentencias peligrosas de un archivo SQL (vacío si es seguro o está aprobado). */
function findDestructiveStatements(sql) {
  if (sql.includes(APPROVAL_MARKER)) return []
  const found = []
  sql.split('\n').forEach((raw, i) => {
    const line = raw.replace(/--.*$/, '').trim()
    if (!line) return
    for (const rule of RULES) {
      if (rule.re.test(line)) {
        found.push({ line: i + 1, rule: rule.name, text: raw.trim() })
        break
      }
    }
  })
  return found
}

function checkMigrationsDir(dir) {
  if (!fs.existsSync(dir)) return []
  const problems = []
  for (const name of fs.readdirSync(dir).sort()) {
    const file = path.join(dir, name, 'migration.sql')
    if (!fs.existsSync(file)) continue
    for (const f of findDestructiveStatements(fs.readFileSync(file, 'utf8'))) {
      problems.push({ migration: name, ...f })
    }
  }
  return problems
}

module.exports = { findDestructiveStatements, checkMigrationsDir, APPROVAL_MARKER }

if (require.main === module) {
  const dir = path.join(__dirname, '..', 'prisma', 'migrations')
  const problems = checkMigrationsDir(dir)
  if (problems.length) {
    console.error('\n⛔ Migraciones que pueden BORRAR DATOS:\n')
    for (const p of problems) console.error(`   ${p.migration}:${p.line}  [${p.rule}]  ${p.text}`)
    console.error(`\n   Si es intencional (y ya respaldaste), agrega en esa migración:\n   ${APPROVAL_MARKER}: <motivo>\n`)
    process.exit(1)
  }
  console.log('✅ Migraciones revisadas: ninguna borra datos.')
}

#!/usr/bin/env node
/**
 * Genera el SQL para aplicar migraciones desde el SQL Editor de Supabase.
 *
 * El usuario de la app (DATABASE_URL) no tiene permisos para cambiar el esquema, así que las
 * migraciones se aplican con el usuario dueño desde el SQL Editor. Este script produce un SQL:
 *   - idempotente: se puede correr varias veces; solo aplica lo que falta,
 *   - en una sola transacción: o se aplica todo o nada,
 *   - que registra cada migración en _prisma_migrations (mismo formato y checksum que Prisma),
 *     así `npm run db:status` sabe qué está aplicado.
 * `0_init` es la línea base del esquema que ya existía: solo se registra, nunca se ejecuta.
 *
 * Uso: npm run -s db:sql > /tmp/migracion.sql   (y pegar el contenido en el SQL Editor)
 */
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const { checkMigrationsDir } = require('./migration-guard')

const BASELINE = '0_init'
const root = path.join(__dirname, '..')
const dir = path.join(root, 'prisma', 'migrations')

/** Rol de la app (usuario del pooler "rol.proyecto" → "rol"), para darle lectura del registro. */
function appRoleFromEnv() {
  let url = process.env.DATABASE_URL
  if (!url) {
    for (const f of ['.env', '.env.local']) {
      const p = path.join(root, f)
      if (!fs.existsSync(p)) continue
      const m = fs.readFileSync(p, 'utf8').match(/^DATABASE_URL="?([^"\n]+)"?/m)
      if (m) url = m[1]
    }
  }
  const m = url && url.match(/^postgres(?:ql)?:\/\/([^:@]+)/)
  return m ? decodeURIComponent(m[1]).split('.')[0] : null
}

function buildSql() {
  const problems = checkMigrationsDir(dir)
  if (problems.length) {
    throw new Error('Hay migraciones que borran datos sin aprobar. Corre: node scripts/migration-guard.js')
  }
  const names = fs
    .readdirSync(dir)
    .filter((n) => fs.existsSync(path.join(dir, n, 'migration.sql')))
    .sort()

  const out = []
  out.push('-- Generado por `npm run db:sql`. Idempotente: se puede ejecutar varias veces.')
  out.push('BEGIN;')
  out.push('')
  out.push(`CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
  "id"                  VARCHAR(36) PRIMARY KEY NOT NULL,
  "checksum"            VARCHAR(64) NOT NULL,
  "finished_at"         TIMESTAMPTZ,
  "migration_name"      VARCHAR(255) NOT NULL,
  "logs"                TEXT,
  "rolled_back_at"      TIMESTAMPTZ,
  "started_at"          TIMESTAMPTZ NOT NULL DEFAULT now(),
  "applied_steps_count" INTEGER NOT NULL DEFAULT 0
);`)

  for (const name of names) {
    const sql = fs.readFileSync(path.join(dir, name, 'migration.sql'), 'utf8')
    const checksum = crypto.createHash('sha256').update(sql).digest('hex')
    const record = `INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "started_at", "applied_steps_count")
      VALUES (gen_random_uuid()::text, '${checksum}', now(), '${name}', now(), 1);`
    out.push('')
    if (name === BASELINE) {
      out.push(`-- ${name}: línea base (el esquema ya existe). Solo se registra; NO se ejecuta.`)
      out.push(`DO $rec$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM "_prisma_migrations" WHERE "migration_name" = '${name}') THEN
    ${record}
  END IF;
END $rec$;`)
      continue
    }
    if (sql.includes('$migracion$')) throw new Error(`${name} contiene el delimitador reservado $migracion$`)
    out.push(`-- ${name}`)
    out.push(`DO $rec$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM "_prisma_migrations" WHERE "migration_name" = '${name}') THEN
    EXECUTE $migracion$
${sql.trim()}
$migracion$;
    ${record}
    RAISE NOTICE 'Aplicada: ${name}';
  END IF;
END $rec$;`)
  }

  const role = appRoleFromEnv()
  if (role && /^[a-z_][a-z0-9_]*$/i.test(role)) {
    out.push('')
    out.push(`-- Lectura del registro para el usuario de la app (npm run db:status).`)
    out.push(`DO $rec$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${role}') THEN
    GRANT SELECT ON "_prisma_migrations" TO "${role}";
  END IF;
END $rec$;`)
  }

  out.push('')
  out.push('COMMIT;')
  out.push('')
  out.push('-- Verificación')
  out.push(`SELECT "migration_name", "finished_at" FROM "_prisma_migrations" ORDER BY "migration_name";`)
  return out.join('\n') + '\n'
}

module.exports = { buildSql }

if (require.main === module) {
  try {
    process.stdout.write(buildSql())
  } catch (e) {
    console.error(`⛔ ${e.message}`)
    process.exit(1)
  }
}

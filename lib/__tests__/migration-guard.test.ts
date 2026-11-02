import { describe, it, expect } from 'vitest'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { findDestructiveStatements, APPROVAL_MARKER } = require('../../scripts/migration-guard.js')

describe('findDestructiveStatements', () => {
  it('agregar columnas o tablas es seguro', () => {
    const sql = `ALTER TABLE "entries" ADD COLUMN "usedAt" TIMESTAMP(3);\nCREATE TABLE "x" ("id" TEXT);\nCREATE INDEX "i" ON "x"("id");`
    expect(findDestructiveStatements(sql)).toEqual([])
  })

  it('detecta DROP TABLE, DROP COLUMN, TRUNCATE, DELETE y cambio de tipo', () => {
    const sql = [
      'DROP TABLE "halloween_contestants";',
      'ALTER TABLE "orders" DROP COLUMN "rejected";',
      'TRUNCATE "logs";',
      'DELETE FROM "users";',
      'ALTER TABLE "events" ALTER COLUMN "coverPrice" SET DATA TYPE INTEGER;',
      'ALTER TABLE "events" ALTER COLUMN "name" TYPE VARCHAR(10);',
      'DROP TYPE "UserRole";',
    ].join('\n')
    expect(findDestructiveStatements(sql)).toHaveLength(7)
  })

  it('ignora comentarios', () => {
    expect(findDestructiveStatements('-- DROP TABLE "x";\nALTER TABLE "a" ADD COLUMN "b" TEXT;')).toEqual([])
  })

  it('no se confunde con DROP INDEX / DROP CONSTRAINT / DROP DEFAULT / DROP NOT NULL (no borran datos)', () => {
    const sql = [
      'DROP INDEX "entries_status_idx";',
      'ALTER TABLE "a" DROP CONSTRAINT "a_fkey";',
      'ALTER TABLE "a" ALTER COLUMN "b" DROP DEFAULT;',
      'ALTER TABLE "a" ALTER COLUMN "b" DROP NOT NULL;',
    ].join('\n')
    expect(findDestructiveStatements(sql)).toEqual([])
  })

  it('con la marca de aprobación no reporta nada', () => {
    expect(findDestructiveStatements(`${APPROVAL_MARKER}\nDROP TABLE "x";`)).toEqual([])
  })
})

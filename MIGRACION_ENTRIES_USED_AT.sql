-- ============================================
-- MIGRACIÓN: hora y usuario de ingreso en entradas
-- ============================================
-- El build ejecuta `prisma db push`, que crea estas columnas solo. Este archivo es el respaldo
-- manual (si el push falló) y además rellena el histórico desde la tabla logs.
-- Es idempotente: se puede correr varias veces.

-- PASO 1: columnas
ALTER TABLE "entries" ADD COLUMN IF NOT EXISTS "usedAt" TIMESTAMP(3);
ALTER TABLE "entries" ADD COLUMN IF NOT EXISTS "usedByUserId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'entries_usedByUserId_fkey'
  ) THEN
    ALTER TABLE "entries"
      ADD CONSTRAINT "entries_usedByUserId_fkey"
      FOREIGN KEY ("usedByUserId") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "entries_eventId_usedAt_idx" ON "entries"("eventId", "usedAt");

-- PASO 2: relleno histórico.
-- Para cada entrada USADA sin hora, toma el último log ENTRY_USED de esa entrada que no sea
-- una reversión. Las entradas sin log quedan con usedAt NULL (cuentan como ingresadas, pero
-- no aparecen en el gráfico por hora).
UPDATE "entries" e
SET "usedAt" = l."createdAt",
    "usedByUserId" = l."userId"
FROM (
  SELECT DISTINCT ON (details->>'entryId')
         details->>'entryId' AS entry_id,
         "createdAt",
         "userId"
  FROM "logs"
  WHERE action = 'ENTRY_USED'
    AND (details->>'action') IS DISTINCT FROM 'reverted_to_active'
  ORDER BY details->>'entryId', "createdAt" DESC
) l
WHERE e.id = l.entry_id
  AND e.status = 'USED'
  AND e."usedAt" IS NULL;

-- Verificación
SELECT status,
       COUNT(*) AS total,
       COUNT("usedAt") AS con_hora
FROM "entries"
GROUP BY status;

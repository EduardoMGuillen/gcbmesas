-- Concurso de disfraces Resident Evil Halloween 2026 (tabla del modelo HalloweenContestant).
-- Normalmente la crea `prisma db push` en el build; correr en Supabase SQL Editor si no existe.
CREATE TABLE IF NOT EXISTS "halloween_contestants" (
  "id"           TEXT         NOT NULL,
  "fullName"     TEXT         NOT NULL,
  "nationalId"   TEXT         NOT NULL,
  "phone"        TEXT         NOT NULL,
  "email"        TEXT         NOT NULL,
  "instagramUrl" TEXT         NOT NULL,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "halloween_contestants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "halloween_contestants_nationalId_key"
  ON "halloween_contestants"("nationalId");
CREATE UNIQUE INDEX IF NOT EXISTS "halloween_contestants_instagramUrl_key"
  ON "halloween_contestants"("instagramUrl");
CREATE INDEX IF NOT EXISTS "halloween_contestants_createdAt_idx"
  ON "halloween_contestants"("createdAt");

-- Bloquea la API pública de Supabase (anon) sobre datos personales; Prisma usa "postgres" y no se afecta.
ALTER TABLE "halloween_contestants" ENABLE ROW LEVEL SECURITY;

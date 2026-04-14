-- Ejecutar en Supabase SQL Editor (PostgreSQL). Columnas alineadas con Prisma model Event.
ALTER TABLE "events"
  ADD COLUMN IF NOT EXISTS "publishOnLcb" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "publishOnCbtickets" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "venueName" TEXT,
  ADD COLUMN IF NOT EXISTS "venueAddress" TEXT;

CREATE INDEX IF NOT EXISTS "events_publishOnLcb_idx" ON "events" ("publishOnLcb");
CREATE INDEX IF NOT EXISTS "events_publishOnCbtickets_idx" ON "events" ("publishOnCbtickets");

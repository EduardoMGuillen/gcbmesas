-- Fase 1: Agregar columna openedByUserId a accounts
-- Ejecutar en Supabase SQL Editor

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS "openedByUserId" TEXT NULL;

-- Agregar FK si no existe (evita error si ya está)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'accounts_openedByUserId_fkey'
  ) THEN
    ALTER TABLE accounts 
    ADD CONSTRAINT accounts_openedByUserId_fkey 
    FOREIGN KEY ("openedByUserId") REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Fase 2: Agregar columna clientName a accounts (TEXT para evitar timeout)
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS "clientName" TEXT NULL;

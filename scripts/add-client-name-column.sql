-- Solo agregar columna clientName a accounts (operación rápida)
-- Ejecutar en Supabase SQL Editor
-- Usamos TEXT en lugar de VARCHAR para evitar posibles timeouts

ALTER TABLE accounts ADD COLUMN IF NOT EXISTS "clientName" TEXT NULL;

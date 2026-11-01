-- Ejecutar en Supabase SQL Editor ANTES de desplegar. Evento destacado en portada (GCBTickets y La Gran Casa Blanca).
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "isFeatured" BOOLEAN NOT NULL DEFAULT false;

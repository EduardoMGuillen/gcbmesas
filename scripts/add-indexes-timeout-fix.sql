-- Índices para evitar upstream timeout en Supabase
-- Ejecutar en Supabase SQL Editor

-- Account: listar cuentas abiertas por fecha
CREATE INDEX IF NOT EXISTS "accounts_status_createdAt_idx" ON "accounts" ("status", "createdAt");

-- Account: buscar cuenta abierta por mesa
CREATE INDEX IF NOT EXISTS "accounts_tableId_status_idx" ON "accounts" ("tableId", "status");

-- Order: pedidos pendientes (served=false, rejected=false) ordenados por fecha
CREATE INDEX IF NOT EXISTS "orders_served_rejected_createdAt_idx" ON "orders" ("served", "rejected", "createdAt");

-- Order: pedidos por cuenta (filtrando rechazados)
CREATE INDEX IF NOT EXISTS "orders_accountId_rejected_idx" ON "orders" ("accountId", "rejected");

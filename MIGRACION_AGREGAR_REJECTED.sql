-- ============================================
-- MIGRACIÓN COMPLETA: Cambios en Base de Datos
-- ============================================
-- Ejecutar estos queries en tu base de datos PostgreSQL
-- Orden: Ejecutar en el orden mostrado

-- ============================================
-- PASO 1: Agregar campo rejected a la tabla orders
-- ============================================
ALTER TABLE "orders" 
ADD COLUMN IF NOT EXISTS "rejected" BOOLEAN NOT NULL DEFAULT false;

-- ============================================
-- PASO 2: Agregar ORDER_REJECTED al enum LogAction
-- ============================================
-- Nota: En PostgreSQL, para agregar un valor a un enum existente:
DO $$ 
BEGIN
    -- Verificar si el valor ya existe antes de agregarlo
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'ORDER_REJECTED' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'LogAction')
    ) THEN
        ALTER TYPE "LogAction" ADD VALUE IF NOT EXISTS 'ORDER_REJECTED';
    END IF;
END $$;

-- ============================================
-- PASO 3: (Opcional) Agregar índice para mejorar consultas
-- ============================================
CREATE INDEX IF NOT EXISTS "orders_rejected_idx" ON "orders"("rejected");

-- ============================================
-- VERIFICACIONES
-- ============================================

-- Verificar que el campo rejected existe
SELECT 
    column_name, 
    data_type, 
    column_default, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'orders' AND column_name = 'rejected';

-- Verificar que ORDER_REJECTED está en el enum
SELECT 
    enumlabel as value
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'LogAction')
ORDER BY enumsortorder;

-- Verificar estadísticas de orders
SELECT 
    COUNT(*) as total_orders,
    COUNT(*) FILTER (WHERE rejected = true) as rejected_orders,
    COUNT(*) FILTER (WHERE rejected = false) as non_rejected_orders
FROM "orders";


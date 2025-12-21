-- ============================================
-- MIGRACIÓN: Agregar PRODUCT_ACTIVATED y PRODUCT_DELETED al enum LogAction
-- ============================================
-- Ejecutar este query en tu base de datos PostgreSQL

-- ============================================
-- PASO 1: Agregar PRODUCT_ACTIVATED al enum LogAction
-- ============================================
DO $$ 
BEGIN
    -- Verificar si el valor ya existe antes de agregarlo
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'PRODUCT_ACTIVATED' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'LogAction')
    ) THEN
        ALTER TYPE "LogAction" ADD VALUE 'PRODUCT_ACTIVATED';
    END IF;
END $$;

-- ============================================
-- PASO 2: Agregar PRODUCT_DELETED al enum LogAction
-- ============================================
DO $$ 
BEGIN
    -- Verificar si el valor ya existe antes de agregarlo
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'PRODUCT_DELETED' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'LogAction')
    ) THEN
        ALTER TYPE "LogAction" ADD VALUE 'PRODUCT_DELETED';
    END IF;
END $$;

-- ============================================
-- VERIFICACIONES
-- ============================================

-- Verificar que PRODUCT_ACTIVATED está en el enum
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumlabel = 'PRODUCT_ACTIVATED' 
            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'LogAction')
        ) 
        THEN '✅ PRODUCT_ACTIVATED EXISTE en enum LogAction'
        ELSE '❌ PRODUCT_ACTIVATED NO EXISTE en enum LogAction'
    END as estado_product_activated;

-- Verificar que PRODUCT_DELETED está en el enum
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumlabel = 'PRODUCT_DELETED' 
            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'LogAction')
        ) 
        THEN '✅ PRODUCT_DELETED EXISTE en enum LogAction'
        ELSE '❌ PRODUCT_DELETED NO EXISTE en enum LogAction'
    END as estado_product_deleted;

-- Ver todos los valores del enum LogAction (ordenados)
SELECT 
    enumlabel as valor_enum
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'LogAction')
ORDER BY enumsortorder;

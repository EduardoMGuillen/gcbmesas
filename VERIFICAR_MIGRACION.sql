-- ============================================
-- SCRIPT DE VERIFICACIÓN: Ver qué falta en la BD
-- ============================================
-- Ejecuta este script para verificar qué cambios faltan

-- ============================================
-- VERIFICACIÓN 1: Campo rejected en orders
-- ============================================
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'orders' AND column_name = 'rejected'
        ) 
        THEN '✅ Campo rejected EXISTE en orders'
        ELSE '❌ Campo rejected NO EXISTE en orders'
    END as estado_rejected;

-- ============================================
-- VERIFICACIÓN 2: ORDER_REJECTED en enum LogAction
-- ============================================
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumlabel = 'ORDER_REJECTED' 
            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'LogAction')
        ) 
        THEN '✅ ORDER_REJECTED EXISTE en enum LogAction'
        ELSE '❌ ORDER_REJECTED NO EXISTE en enum LogAction'
    END as estado_enum;

-- ============================================
-- VERIFICACIÓN 3: Ver todos los valores del enum LogAction
-- ============================================
SELECT 
    enumlabel as valor_enum
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'LogAction')
ORDER BY enumsortorder;

-- ============================================
-- VERIFICACIÓN 4: Ver estructura completa de orders
-- ============================================
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'orders'
ORDER BY ordinal_position;


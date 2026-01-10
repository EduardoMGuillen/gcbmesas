-- Script para deshabilitar Row Level Security (RLS) en todas las tablas
-- Ejecuta este script en el SQL Editor de Supabase

-- Deshabilitar RLS en todas las tablas del proyecto
ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tables DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS products DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS logs DISABLE ROW LEVEL SECURITY;

-- Verificar el estado de RLS en todas las tablas
SELECT 
    schemaname,
    tablename,
    rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('users', 'tables', 'accounts', 'products', 'orders', 'logs')
ORDER BY tablename;

-- Si rowsecurity es 'true', RLS está habilitado
-- Si rowsecurity es 'false', RLS está deshabilitado

-- Query para agregar la columna emoji a la tabla products en Supabase
-- Ejecutar este query en el SQL Editor de Supabase

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS emoji VARCHAR(255) NULL;

-- Verificar que se agregó correctamente
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'products' AND column_name = 'emoji';

-- Script SQL para importar todas las comidas desde Supabase
-- Ejecuta este script en el SQL Editor de Supabase

-- ENTRADAS
INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'JALAPEÑOS POPPER', 180.00, 'ENTRADAS', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'JALAPEÑOS POPPER' AND category = 'ENTRADAS');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'PAPAS CON TOCINO Y QUESO', 180.00, 'ENTRADAS', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'PAPAS CON TOCINO Y QUESO' AND category = 'ENTRADAS');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'FUNDIDOS', 180.00, 'ENTRADAS', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'FUNDIDOS' AND category = 'ENTRADAS');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'CHICKEN FINGERS', 250.00, 'ENTRADAS', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'CHICKEN FINGERS' AND category = 'ENTRADAS');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'BONELESS', 250.00, 'ENTRADAS', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'BONELESS' AND category = 'ENTRADAS');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'NACHOS', 250.00, 'ENTRADAS', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'NACHOS' AND category = 'ENTRADAS');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'ALITAS', 230.00, 'ENTRADAS', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'ALITAS' AND category = 'ENTRADAS');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'TABLA DE QUESOS', 650.00, 'ENTRADAS', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'TABLA DE QUESOS' AND category = 'ENTRADAS');

-- PLATOS FUERTES
INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'LOMO DE RES', 250.00, 'PLATOS FUERTES', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'LOMO DE RES' AND category = 'PLATOS FUERTES');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'PECHUGA DESHUESADA', 250.00, 'PLATOS FUERTES', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'PECHUGA DESHUESADA' AND category = 'PLATOS FUERTES');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'COSTILLA DE CERDO BBQ', 245.00, 'PLATOS FUERTES', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'COSTILLA DE CERDO BBQ' AND category = 'PLATOS FUERTES');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'PARRILLADA', 540.00, 'PLATOS FUERTES', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'PARRILLADA' AND category = 'PLATOS FUERTES');

-- Mensaje de confirmación
SELECT '✅ Importación de comidas completada. Se insertaron los productos que no existían.' AS resultado;


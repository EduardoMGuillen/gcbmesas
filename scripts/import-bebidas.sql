-- Script SQL para importar todas las bebidas desde Supabase
-- Ejecuta este script en el SQL Editor de Supabase

-- Insertar productos solo si no existen (evita duplicados)
-- SHOTS
INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'DERRAME CEREBRAL', 120.00, 'SHOTS', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'DERRAME CEREBRAL' AND category = 'SHOTS');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'TUCANAZO', 120.00, 'SHOTS', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'TUCANAZO' AND category = 'SHOTS');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'AGUA DEL ULUA', 120.00, 'SHOTS', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'AGUA DEL ULUA' AND category = 'SHOTS');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'MADRAZO', 120.00, 'SHOTS', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'MADRAZO' AND category = 'SHOTS');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'TURBO', 120.00, 'SHOTS', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'TURBO' AND category = 'SHOTS');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'SUBMARINO', 120.00, 'SHOTS', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'SUBMARINO' AND category = 'SHOTS');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'BIN LADEN', 120.00, 'SHOTS', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'BIN LADEN' AND category = 'SHOTS');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'STOP LIGHT', 120.00, 'SHOTS', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'STOP LIGHT' AND category = 'SHOTS');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'MOTHERFUCKER', 120.00, 'SHOTS', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'MOTHERFUCKER' AND category = 'SHOTS');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'LA BARBIE', 120.00, 'SHOTS', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'LA BARBIE' AND category = 'SHOTS');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'VAMPIRO', 120.00, 'SHOTS', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'VAMPIRO' AND category = 'SHOTS');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'SEMEN DE PITUFO', 120.00, 'SHOTS', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'SEMEN DE PITUFO' AND category = 'SHOTS');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'SEMEN DE MONO', 120.00, 'SHOTS', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'SEMEN DE MONO' AND category = 'SHOTS');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'SEMEN DEL DIABLO', 120.00, 'SHOTS', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'SEMEN DEL DIABLO' AND category = 'SHOTS');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'ORGASMO', 120.00, 'SHOTS', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'ORGASMO' AND category = 'SHOTS');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'JAGER', 100.00, 'SHOTS', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'JAGER' AND category = 'SHOTS');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, '1800 CRISTALINO', 180.00, 'SHOTS', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = '1800 CRISTALINO' AND category = 'SHOTS');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'JOSE CUERVO', 100.00, 'SHOTS', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'JOSE CUERVO' AND category = 'SHOTS');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'GRAN MALO', 150.00, 'SHOTS', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'GRAN MALO' AND category = 'SHOTS');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'BLACK LABEL', 150.00, 'SHOTS', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'BLACK LABEL' AND category = 'SHOTS');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'TABLA DE SHOTS 8', 800.00, 'SHOTS', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'TABLA DE SHOTS 8' AND category = 'SHOTS');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'TABLA DE SHOTS 12', 1100.00, 'SHOTS', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'TABLA DE SHOTS 12' AND category = 'SHOTS');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'TABLA DE SHOTS 18', 1600.00, 'SHOTS', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'TABLA DE SHOTS 18' AND category = 'SHOTS');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'TABLA DE SHOTS 24', 2100.00, 'SHOTS', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'TABLA DE SHOTS 24' AND category = 'SHOTS');

-- COCTELES
INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'PIÑA COLADA', 150.00, 'COCTELES', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'PIÑA COLADA' AND category = 'COCTELES');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'MARGARITA', 150.00, 'COCTELES', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'MARGARITA' AND category = 'COCTELES');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'BAHAMA MAMA', 150.00, 'COCTELES', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'BAHAMA MAMA' AND category = 'COCTELES');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'SEX ON THE BEACH', 150.00, 'COCTELES', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'SEX ON THE BEACH' AND category = 'COCTELES');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'MOJITO CLASICO', 150.00, 'COCTELES', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'MOJITO CLASICO' AND category = 'COCTELES');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'TOM COLLINS', 150.00, 'COCTELES', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'TOM COLLINS' AND category = 'COCTELES');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'MICHELADA', 150.00, 'COCTELES', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'MICHELADA' AND category = 'COCTELES');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'GIN TONIC', 150.00, 'COCTELES', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'GIN TONIC' AND category = 'COCTELES');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'GIN TONIC DE FRESA', 150.00, 'COCTELES', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'GIN TONIC DE FRESA' AND category = 'COCTELES');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'BLUE HAWAI', 150.00, 'COCTELES', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'BLUE HAWAI' AND category = 'COCTELES');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'APEROL SPRITZ', 150.00, 'COCTELES', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'APEROL SPRITZ' AND category = 'COCTELES');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'VODKA COLLINS', 150.00, 'COCTELES', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'VODKA COLLINS' AND category = 'COCTELES');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'MOSCOW MULE', 150.00, 'COCTELES', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'MOSCOW MULE' AND category = 'COCTELES');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'LONG ISLAND TEA', 180.00, 'COCTELES', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'LONG ISLAND TEA' AND category = 'COCTELES');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'GIN FRUTOS ROJOS', 180.00, 'COCTELES', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'GIN FRUTOS ROJOS' AND category = 'COCTELES');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'STRAWBERRY COLADA', 180.00, 'COCTELES', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'STRAWBERRY COLADA' AND category = 'COCTELES');

-- BOTELLAS
INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'GREY GOSSE', 1900.00, 'BOTELLAS', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'GREY GOSSE' AND category = 'BOTELLAS');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'ABSOLUT', 1500.00, 'BOTELLAS', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'ABSOLUT' AND category = 'BOTELLAS');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'SMIRNOFF', 1350.00, 'BOTELLAS', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'SMIRNOFF' AND category = 'BOTELLAS');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'BLACK LABEL', 2100.00, 'BOTELLAS', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'BLACK LABEL' AND category = 'BOTELLAS');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'BLUE LABEL', 15800.00, 'BOTELLAS', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'BLUE LABEL' AND category = 'BOTELLAS');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'OLD PAR', 2600.00, 'BOTELLAS', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'OLD PAR' AND category = 'BOTELLAS');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'BUCHANANS 12 AÑOS', 2500.00, 'BOTELLAS', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'BUCHANANS 12 AÑOS' AND category = 'BOTELLAS');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'BUCHANANS 18 AÑOS', 4500.00, 'BOTELLAS', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'BUCHANANS 18 AÑOS' AND category = 'BOTELLAS');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'FLOR DE CAÑA 4 AÑOS', 980.00, 'BOTELLAS', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'FLOR DE CAÑA 4 AÑOS' AND category = 'BOTELLAS');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'FLOR DE CAÑA 7 AÑOS', 1200.00, 'BOTELLAS', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'FLOR DE CAÑA 7 AÑOS' AND category = 'BOTELLAS');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'FLOR DE CAÑA 12 AÑOS', 2000.00, 'BOTELLAS', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'FLOR DE CAÑA 12 AÑOS' AND category = 'BOTELLAS');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'FLOR DE CAÑA 18 AÑOS', 2800.00, 'BOTELLAS', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'FLOR DE CAÑA 18 AÑOS' AND category = 'BOTELLAS');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, '1800 CRISTALINO', 2600.00, 'BOTELLAS', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = '1800 CRISTALINO' AND category = 'BOTELLAS');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'JOSE CUERVO', 1200.00, 'BOTELLAS', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'JOSE CUERVO' AND category = 'BOTELLAS');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'BOTELLA KAMIKAZE', 600.00, 'BOTELLAS', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'BOTELLA KAMIKAZE' AND category = 'BOTELLAS');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'BOTELLA KAMIKUYAZO', 600.00, 'BOTELLAS', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'BOTELLA KAMIKUYAZO' AND category = 'BOTELLAS');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'BOMBAY', 2000.00, 'BOTELLAS', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'BOMBAY' AND category = 'BOTELLAS');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'GIN HENDRICKS', 3200.00, 'BOTELLAS', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'GIN HENDRICKS' AND category = 'BOTELLAS');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'JAGER', 1500.00, 'BOTELLAS', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'JAGER' AND category = 'BOTELLAS');

-- REFRESCOS
INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'GASEOSAS', 50.00, 'REFRESCOS', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'GASEOSAS' AND category = 'REFRESCOS');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'AGUA', 50.00, 'REFRESCOS', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'AGUA' AND category = 'REFRESCOS');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'AGUA TONICA', 50.00, 'REFRESCOS', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'AGUA TONICA' AND category = 'REFRESCOS');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'SODA LATA', 50.00, 'REFRESCOS', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'SODA LATA' AND category = 'REFRESCOS');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'ADRENALINA', 100.00, 'REFRESCOS', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'ADRENALINA' AND category = 'REFRESCOS');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'NATURALES', 100.00, 'REFRESCOS', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'NATURALES' AND category = 'REFRESCOS');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'JUGO DE PIÑA', 100.00, 'REFRESCOS', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'JUGO DE PIÑA' AND category = 'REFRESCOS');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'JUGO DE NARANJA', 100.00, 'REFRESCOS', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'JUGO DE NARANJA' AND category = 'REFRESCOS');

INSERT INTO products (id, name, price, category, "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'CRAMBERRY', 150.00, 'REFRESCOS', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'CRAMBERRY' AND category = 'REFRESCOS');

-- Mensaje de confirmación
SELECT '✅ Importación completada. Se insertaron los productos que no existían.' AS resultado;


-- Script SQL para eliminar todas las mesas existentes y crear 30 mesas nuevas para cada zona
-- Zonas: Astronomical, Studio54, Beer Garden
-- Total: 90 mesas (30 por zona)

-- IMPORTANTE: Este script eliminará TODAS las mesas existentes y sus cuentas/órdenes relacionadas
-- debido a CASCADE DELETE. Ejecuta con precaución.

-- Función auxiliar para generar códigos cortos únicos (reutilizar si ya existe)
CREATE OR REPLACE FUNCTION generate_short_code() RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code TEXT := '';
  i INTEGER;
  char_index INTEGER;
BEGIN
  FOR i IN 1..4 LOOP
    char_index := floor(random() * length(chars))::INTEGER + 1;
    code := code || substr(chars, char_index, 1);
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Función para generar un código corto único que no exista
CREATE OR REPLACE FUNCTION generate_unique_short_code() RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  exists_check BOOLEAN;
  attempts INTEGER := 0;
BEGIN
  LOOP
    new_code := generate_short_code();
    SELECT EXISTS(SELECT 1 FROM tables WHERE shortcode = new_code) INTO exists_check;
    IF NOT exists_check THEN
      RETURN new_code;
    END IF;
    attempts := attempts + 1;
    IF attempts > 100 THEN
      RAISE EXCEPTION 'No se pudo generar un código corto único después de 100 intentos';
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- PASO 1: Eliminar todas las mesas existentes (esto también eliminará cuentas y órdenes por CASCADE)
DELETE FROM tables;

-- PASO 2: Crear 30 mesas para Astronomical
DO $$
DECLARE
  table_id TEXT;
  table_name TEXT;
  short_code TEXT;
  qr_url TEXT;
  app_url TEXT := 'https://gcbmesas.vercel.app';
  i INTEGER;
BEGIN
  FOR i IN 1..30 LOOP
    table_id := gen_random_uuid()::TEXT;
    table_name := 'Mesa ' || i::TEXT;
    short_code := generate_unique_short_code();
    qr_url := app_url || '/mesa/' || table_id;
    
    INSERT INTO tables (id, name, zone, shortcode, "qrUrl", "createdAt", "updatedAt")
    VALUES (table_id, table_name, 'Astronomical', short_code, qr_url, NOW(), NOW());
  END LOOP;
END $$;

-- PASO 3: Crear 30 mesas para Studio54
DO $$
DECLARE
  table_id TEXT;
  table_name TEXT;
  short_code TEXT;
  qr_url TEXT;
  app_url TEXT := 'https://gcbmesas.vercel.app';
  i INTEGER;
BEGIN
  FOR i IN 1..30 LOOP
    table_id := gen_random_uuid()::TEXT;
    table_name := 'Mesa ' || i::TEXT;
    short_code := generate_unique_short_code();
    qr_url := app_url || '/mesa/' || table_id;
    
    INSERT INTO tables (id, name, zone, shortcode, "qrUrl", "createdAt", "updatedAt")
    VALUES (table_id, table_name, 'Studio54', short_code, qr_url, NOW(), NOW());
  END LOOP;
END $$;

-- PASO 4: Crear 30 mesas para Beer Garden
DO $$
DECLARE
  table_id TEXT;
  table_name TEXT;
  short_code TEXT;
  qr_url TEXT;
  app_url TEXT := 'https://gcbmesas.vercel.app';
  i INTEGER;
BEGIN
  FOR i IN 1..30 LOOP
    table_id := gen_random_uuid()::TEXT;
    table_name := 'Mesa ' || i::TEXT;
    short_code := generate_unique_short_code();
    qr_url := app_url || '/mesa/' || table_id;
    
    INSERT INTO tables (id, name, zone, shortcode, "qrUrl", "createdAt", "updatedAt")
    VALUES (table_id, table_name, 'Beer Garden', short_code, qr_url, NOW(), NOW());
  END LOOP;
END $$;

-- Verificación final
SELECT 
  '✅ Reemplazo completado' AS resultado,
  COUNT(*) FILTER (WHERE zone = 'Astronomical') AS mesas_astronomical,
  COUNT(*) FILTER (WHERE zone = 'Studio54') AS mesas_studio54,
  COUNT(*) FILTER (WHERE zone = 'Beer Garden') AS mesas_beer_garden,
  COUNT(*) AS total_mesas
FROM tables
WHERE zone IN ('Astronomical', 'Studio54', 'Beer Garden');

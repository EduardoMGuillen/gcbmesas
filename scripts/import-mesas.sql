-- Script SQL para crear 20 mesas para cada zona
-- Ejecuta este script en el SQL Editor de Supabase
-- Zonas: Astronomical, Studio54, Beer Garden

-- Función auxiliar para generar códigos cortos únicos
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

-- Crear mesas para Astronomical (Mesa 1 a Mesa 20)
DO $$
DECLARE
  table_id TEXT;
  table_name TEXT;
  short_code TEXT;
  qr_url TEXT;
  app_url TEXT := 'https://gcbmesas.vercel.app'; -- Ajusta esta URL según tu entorno
  i INTEGER;
  exists_check BOOLEAN;
BEGIN
  FOR i IN 1..20 LOOP
    table_name := 'Mesa ' || i::TEXT;
    
    -- Verificar si ya existe una mesa con este nombre en esta zona
    SELECT EXISTS(
      SELECT 1 FROM tables 
      WHERE name = table_name AND zone = 'Astronomical'
    ) INTO exists_check;
    
    -- Solo crear si no existe
    IF NOT exists_check THEN
      table_id := gen_random_uuid()::TEXT;
      short_code := generate_unique_short_code();
      qr_url := app_url || '/mesa/' || table_id;
      
      INSERT INTO tables (id, name, zone, shortcode, "qrUrl", "createdAt", "updatedAt")
      VALUES (table_id, table_name, 'Astronomical', short_code, qr_url, NOW(), NOW());
    END IF;
  END LOOP;
END $$;

-- Crear mesas para Studio54 (Mesa 1 a Mesa 20)
DO $$
DECLARE
  table_id TEXT;
  table_name TEXT;
  short_code TEXT;
  qr_url TEXT;
  app_url TEXT := 'https://gcbmesas.vercel.app'; -- Ajusta esta URL según tu entorno
  i INTEGER;
  exists_check BOOLEAN;
BEGIN
  FOR i IN 1..20 LOOP
    table_name := 'Mesa ' || i::TEXT;
    
    -- Verificar si ya existe una mesa con este nombre en esta zona
    SELECT EXISTS(
      SELECT 1 FROM tables 
      WHERE name = table_name AND zone = 'Studio54'
    ) INTO exists_check;
    
    -- Solo crear si no existe
    IF NOT exists_check THEN
      table_id := gen_random_uuid()::TEXT;
      short_code := generate_unique_short_code();
      qr_url := app_url || '/mesa/' || table_id;
      
      INSERT INTO tables (id, name, zone, shortcode, "qrUrl", "createdAt", "updatedAt")
      VALUES (table_id, table_name, 'Studio54', short_code, qr_url, NOW(), NOW());
    END IF;
  END LOOP;
END $$;

-- Crear mesas para Beer Garden (Mesa 1 a Mesa 20)
DO $$
DECLARE
  table_id TEXT;
  table_name TEXT;
  short_code TEXT;
  qr_url TEXT;
  app_url TEXT := 'https://gcbmesas.vercel.app'; -- Ajusta esta URL según tu entorno
  i INTEGER;
  exists_check BOOLEAN;
BEGIN
  FOR i IN 1..20 LOOP
    table_name := 'Mesa ' || i::TEXT;
    
    -- Verificar si ya existe una mesa con este nombre en esta zona
    SELECT EXISTS(
      SELECT 1 FROM tables 
      WHERE name = table_name AND zone = 'Beer Garden'
    ) INTO exists_check;
    
    -- Solo crear si no existe
    IF NOT exists_check THEN
      table_id := gen_random_uuid()::TEXT;
      short_code := generate_unique_short_code();
      qr_url := app_url || '/mesa/' || table_id;
      
      INSERT INTO tables (id, name, zone, shortcode, "qrUrl", "createdAt", "updatedAt")
      VALUES (table_id, table_name, 'Beer Garden', short_code, qr_url, NOW(), NOW());
    END IF;
  END LOOP;
END $$;

-- Nota: Las funciones auxiliares (generate_short_code y generate_unique_short_code) 
-- se mantienen en la base de datos. Si quieres eliminarlas después, puedes ejecutar:
-- DROP FUNCTION IF EXISTS generate_unique_short_code();
-- DROP FUNCTION IF EXISTS generate_short_code();

-- Mensaje de confirmación
SELECT 
  '✅ Importación completada' AS resultado,
  COUNT(*) FILTER (WHERE zone = 'Astronomical') AS mesas_astronomical,
  COUNT(*) FILTER (WHERE zone = 'Studio54') AS mesas_studio54,
  COUNT(*) FILTER (WHERE zone = 'Beer Garden') AS mesas_beer_garden,
  COUNT(*) AS total_mesas
FROM tables
WHERE zone IN ('Astronomical', 'Studio54', 'Beer Garden');


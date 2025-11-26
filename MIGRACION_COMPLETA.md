# Migración: Agregar Campo rejected a Orders

## 🔴 Problema

El campo `rejected` fue agregado al schema de Prisma pero la base de datos en producción aún no lo tiene, causando errores al acceder a la página de cuentas.

## ✅ Solución: Ejecutar Migración SQL

### Cambios Requeridos en la Base de Datos

Se necesitan **2 cambios**:

1. **Agregar campo `rejected` a la tabla `orders`**
2. **Agregar `ORDER_REJECTED` al enum `LogAction`**

### Opción 1: Usar Prisma (Recomendado)

```bash
# Esto ejecutará automáticamente ambas migraciones
npm run db:push
```

O si prefieres usar migraciones formales:

```bash
# Crear migración
npx prisma migrate dev --name add_rejected_to_orders

# O en producción
npx prisma migrate deploy
```

### Opción 2: Ejecutar SQL Directamente

Si `db:push` no funciona o quieres hacerlo manualmente, ejecuta estos queries en tu base de datos:

**Query 1: Agregar campo rejected**
```sql
ALTER TABLE "orders" 
ADD COLUMN IF NOT EXISTS "rejected" BOOLEAN NOT NULL DEFAULT false;
```

**Query 2: Agregar ORDER_REJECTED al enum**
```sql
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'ORDER_REJECTED' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'LogAction')
    ) THEN
        ALTER TYPE "LogAction" ADD VALUE IF NOT EXISTS 'ORDER_REJECTED';
    END IF;
END $$;
```

**O ejecuta el archivo completo:**
Ver `MIGRACION_AGREGAR_REJECTED.sql` para el script completo con verificaciones.

### Opción 3: Desde Supabase Dashboard

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **SQL Editor**
4. Ejecuta:

```sql
ALTER TABLE "orders" 
ADD COLUMN IF NOT EXISTS "rejected" BOOLEAN NOT NULL DEFAULT false;
```

5. Click en **Run**

### Opción 4: Desde psql (Línea de Comandos)

```bash
# Conectar a tu base de datos
psql "postgresql://postgres:TU_CONTRASEÑA@db.xxxxx.supabase.co:5432/postgres"

# Ejecutar el ALTER TABLE
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "rejected" BOOLEAN NOT NULL DEFAULT false;

# Salir
\q
```

## ✅ Verificar que Funcionó

Después de ejecutar la migración, verifica:

```sql
-- Verificar que el campo existe
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'orders' AND column_name = 'rejected';

-- Debería mostrar:
-- column_name | data_type | column_default
-- rejected    | boolean   | false
```

## 🔧 Si Ya Existe el Campo

Si el campo ya existe, el query con `IF NOT EXISTS` no hará nada (no causará error). Es seguro ejecutarlo múltiples veces.

## 📝 Notas

- El campo `rejected` tiene valor por defecto `false`
- Todos los pedidos existentes tendrán `rejected = false` automáticamente
- El campo es `NOT NULL`, así que siempre tendrá un valor

## 🚀 Después de la Migración

Una vez ejecutada la migración:

1. La página de cuentas debería funcionar correctamente
2. Podrás rechazar pedidos desde el panel de cajero
3. Los pedidos rechazados se mostrarán con el badge "Rechazado"


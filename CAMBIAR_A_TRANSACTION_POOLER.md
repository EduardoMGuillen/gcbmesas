# Cambiar a Transaction Pooler (Solución Definitiva)

## 🔴 Problema Actual

Estás viendo el error:
```
prepared statement "s1" already exists
```

Esto ocurre porque estás usando **Session Pooler** con Prisma, y Prisma no es completamente compatible con Session Pooler.

## ✅ Solución: Cambiar a Transaction Pooler

**Transaction Pooler** es la mejor opción para Prisma porque:
- ✅ No mantiene prepared statements entre transacciones
- ✅ 100% compatible con Prisma
- ✅ Mismo puerto 6543
- ✅ Funciona perfectamente con Vercel
- ✅ Evita completamente el error de prepared statements

## 📋 Pasos para Cambiar

### Paso 1: Ir a Supabase Dashboard

1. Ve a [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Inicia sesión
3. Selecciona tu proyecto

### Paso 2: Ir a Database Settings

1. Click en **Settings** (⚙️) en el menú lateral
2. Click en **Database**

### Paso 3: Cambiar a Transaction Pooler

1. Desplázate hasta la sección **Connection Pooling**
2. En el dropdown **"Connection string"**, cambia de:
   - ❌ **"Session mode"** 
   - ✅ A **"Transaction mode"**

### Paso 4: Copiar la Nueva URL

La URL cambiará automáticamente. Debería verse así:
```
postgresql://postgres.bixevluattcjedpvkruu:[YOUR-PASSWORD]@aws-0-us-west-2.pooler.supabase.com:6543/postgres
```

**Nota:** El puerto sigue siendo **6543**, solo cambia el modo de pooling.

### Paso 5: Reemplazar la Contraseña

Reemplaza `[YOUR-PASSWORD]` con tu contraseña real:
```
postgresql://postgres.bixevluattcjedpvkruu:casablanca2025astro@aws-0-us-west-2.pooler.supabase.com:6543/postgres
```

### Paso 6: Agregar ?schema=public

Agrega `?schema=public` al final:
```
postgresql://postgres.bixevluattcjedpvkruu:casablanca2025astro@aws-0-us-west-2.pooler.supabase.com:6543/postgres?schema=public
```

### Paso 7: Actualizar en Vercel

1. Ve a [Vercel Dashboard](https://vercel.com/dashboard)
2. Tu proyecto → **Settings** → **Environment Variables**
3. Busca `POSTGRES_PRISMA_URL` o `DATABASE_URL`
4. **Edita** la variable
5. **Pega la nueva URL** (con Transaction Pooler)
6. Marca **Production** (y Preview si quieres)
7. **Guarda**

### Paso 8: Redeploy

1. Ve a **Deployments**
2. Click en los tres puntos (⋯) → **Redeploy**
3. Espera a que termine

## ✅ Después del Cambio

- ✅ El error de "prepared statement already exists" desaparecerá
- ✅ `prisma db push` funcionará correctamente
- ✅ El seed funcionará sin errores
- ✅ La aplicación funcionará normalmente

## 🔍 Diferencia Visual

**Session Pooler (actual - causa problemas):**
```
Connection string: [Session mode ▼]
```

**Transaction Pooler (recomendado):**
```
Connection string: [Transaction mode ▼]
```

## 📝 Nota

El script ahora también agrega `statement_cache_size=0` para ayudar con Session Pooler, pero **Transaction Pooler es la solución definitiva** y evita el problema por completo.


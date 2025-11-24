# Verificar URL en Vercel - Solución Definitiva

## 🔴 Problema

El error de "prepared statement already exists" persiste incluso con Transaction Pooler.

## ✅ Solución: Verificar y Actualizar la URL en Vercel

### Paso 1: Obtener la URL Correcta de Supabase

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Tu proyecto → **Settings** → **Database**
3. Busca **Connection Pooling**
4. Asegúrate de que esté en **Transaction mode** (no Session mode)
5. Copia la Connection String

### Paso 2: Construir la URL Completa

La URL base debería ser:
```
postgresql://postgres.bixevluattcjedpvkruu:casablanca2025astro@aws-0-us-west-2.pooler.supabase.com:6543/postgres
```

**Agrega estos parámetros al final:**
```
?schema=public&connect_timeout=10&pool_timeout=10&pgbouncer=true&prepared_statement_cache_size=0&statement_cache_size=0
```

**URL completa:**
```
postgresql://postgres.bixevluattcjedpvkruu:casablanca2025astro@aws-0-us-west-2.pooler.supabase.com:6543/postgres?schema=public&connect_timeout=10&pool_timeout=10&pgbouncer=true&prepared_statement_cache_size=0&statement_cache_size=0
```

### Paso 3: Actualizar en Vercel

1. Ve a [Vercel Dashboard](https://vercel.com/dashboard)
2. Tu proyecto → **Settings** → **Environment Variables**
3. Busca `POSTGRES_PRISMA_URL` o `DATABASE_URL`
4. **Edita** la variable
5. **Borra todo el contenido actual**
6. **Pega la URL completa** con todos los parámetros
7. **IMPORTANTE:** Marca **Production** (y Preview si quieres)
8. **Guarda**

### Paso 4: Verificar que se Guardó Correctamente

1. Después de guardar, **edita de nuevo** la variable
2. Verifica que la URL tenga **todos** estos parámetros:
   - `?schema=public`
   - `&connect_timeout=10`
   - `&pool_timeout=10`
   - `&pgbouncer=true`
   - `&prepared_statement_cache_size=0`
   - `&statement_cache_size=0`

### Paso 5: Redeploy Completo

1. Ve a **Deployments**
2. Click en los tres puntos (⋯) del último deployment
3. Click en **Redeploy**
4. **Espera a que termine completamente**

## 🔍 Verificar Después del Redeploy

1. Visita: `https://tu-app.vercel.app/diagnostico`
2. Debería mostrar:
   - ✅ Conexión: Conectada
   - ✅ Usuario Admin: Existe (después del seed automático)
   - ✅ Total Usuarios: 1 o más

## ⚠️ Si Aún No Funciona

### Verificar los Logs del Build

1. Ve a Vercel → **Deployments**
2. Click en el último deployment
3. Ve a la pestaña **Build Logs**
4. Busca la línea que dice:
   ```
   ✅ DATABASE_URL configured with schema and connection parameters
   ```
5. Si no aparece, el script no se está ejecutando correctamente

### Verificar que el Script se Ejecute

En los logs del build, deberías ver:
```
✅ Using POSTGRES_PRISMA_URL (Connection Pooling) as DATABASE_URL
✅ DATABASE_URL configured with schema and connection parameters
```

Si no ves estos mensajes, el script `setup-env.js` no se está ejecutando.

## 📝 Nota Importante

El script `setup-env.js` agrega automáticamente los parámetros, pero es mejor tenerlos en la URL desde Vercel para evitar problemas. Si los agregas manualmente en Vercel, el script los detectará y no los duplicará.


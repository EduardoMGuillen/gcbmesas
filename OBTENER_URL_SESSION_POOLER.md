# Cómo Obtener la URL Correcta del Session Pooler

## ⚠️ Problema

Si ves `aws-0-us-west-2.pooler.supabase.com:5432`, esa **NO es la URL del Session Pooler**. El Session Pooler usa el puerto **6543**, no 5432.

## ✅ Pasos Correctos para Obtener la URL del Session Pooler

### Paso 1: Ir a Supabase Dashboard

1. Ve a [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Inicia sesión
3. Selecciona tu proyecto

### Paso 2: Ir a Database Settings

1. En el menú lateral, click en **Settings** (⚙️)
2. Click en **Database**

### Paso 3: Encontrar Connection Pooling

1. Desplázate hacia abajo hasta encontrar la sección **Connection Pooling**
2. Deberías ver algo como:

```
Connection Pooling
─────────────────
Use connection pooling to connect to your database from serverless environments.

Connection string:
[Dropdown: Session mode ▼]
```

### Paso 4: Seleccionar Session Mode

1. **IMPORTANTE:** Asegúrate de que el dropdown diga **"Session mode"** (no "Direct connection")
2. Si dice "Direct connection", cámbialo a **"Session mode"**

### Paso 5: Copiar la Connection String

La URL debería verse así:
```
postgresql://postgres.bixevluattcjedpvkruu:[YOUR-PASSWORD]@aws-0-us-west-2.pooler.supabase.com:6543/postgres
```

**Características importantes:**
- ✅ Puerto: **6543** (no 5432)
- ✅ Host: `pooler.supabase.com` (no `db.xxxxx.supabase.co`)
- ✅ Usuario: `postgres.bixevluattcjedpvkruu` (con project ref)

### Paso 6: Reemplazar [YOUR-PASSWORD]

1. Reemplaza `[YOUR-PASSWORD]` con tu contraseña real
2. Ejemplo: `***REMOVED***`

### Paso 7: Agregar ?schema=public

Agrega `?schema=public` al final:
```
postgresql://postgres.bixevluattcjedpvkruu:***REMOVED***@aws-0-us-west-2.pooler.supabase.com:6543/postgres?schema=public
```

## 🔍 Diferencia entre las URLs

### ❌ Direct Connection (Puerto 5432) - NO funciona en Vercel
```
postgresql://postgres:password@db.bixevluattcjedpvkruu.supabase.co:5432/postgres
```
- Host: `db.xxxxx.supabase.co`
- Puerto: `5432`
- Usuario: `postgres` (simple)

### ✅ Session Pooler (Puerto 6543) - FUNCIONA en Vercel
```
postgresql://postgres.bixevluattcjedpvkruu:password@aws-0-us-west-2.pooler.supabase.com:6543/postgres
```
- Host: `pooler.supabase.com`
- Puerto: **6543** ⬅️ IMPORTANTE
- Usuario: `postgres.xxxxx` (con project ref)

## 🐛 Si No Ves la Opción "Session mode"

Si no ves la opción "Session mode" en el dropdown:

1. Verifica que tu proyecto esté en un plan que incluya Connection Pooling
2. Connection Pooling está disponible en todos los planes (incluido el plan gratuito)
3. Si aún no lo ves, intenta:
   - Refrescar la página
   - Cerrar y abrir el dashboard de nuevo
   - Verificar que estés en la sección correcta (Settings → Database)

## 📋 URL Final para Vercel

Si tu región es **us-west-2** y tu contraseña es *****REMOVED*****:

```
postgresql://postgres.bixevluattcjedpvkruu:***REMOVED***@aws-0-us-west-2.pooler.supabase.com:6543/postgres?schema=public
```

## ✅ Verificar que la URL es Correcta

Antes de copiar, verifica:
- [ ] Puerto es **6543** (no 5432)
- [ ] Host contiene **pooler.supabase.com**
- [ ] Usuario contiene el project ref: **postgres.bixevluattcjedpvkruu**
- [ ] Tiene `?schema=public` al final

## 🔧 Configurar en Vercel

1. Ve a [Vercel Dashboard](https://vercel.com/dashboard)
2. Tu proyecto → **Settings** → **Environment Variables**
3. Busca `POSTGRES_PRISMA_URL` o `DATABASE_URL`
4. Edita y pega la URL completa (con puerto 6543)
5. Marca **Production** (y Preview si quieres)
6. **Guarda**
7. **Redeploy**

## 🎯 Resumen

- **Session Pooler** = Puerto **6543** ✅
- **Direct Connection** = Puerto **5432** ❌ (no funciona en Vercel)
- Si ves puerto 5432, estás viendo la conexión directa, no el Session Pooler
- Cambia el dropdown a **"Session mode"** para obtener la URL correcta


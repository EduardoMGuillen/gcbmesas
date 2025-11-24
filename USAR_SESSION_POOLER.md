# Usar Session Pooler en Supabase (Necesario para Vercel)

## ⚠️ Problema

Vercel es IPv4-only y la conexión directa (puerto 5432) **NO funciona** en Vercel.

## ✅ Solución: Usar Session Pooler

### Paso 1: Cambiar a Session Pooler en Supabase

1. En la pantalla de "Connection String" que estás viendo
2. Cambia el dropdown **"Method"** de **"Direct connection"** a **"Session Pooler"** o **"Transaction Pooler"**
3. La URL cambiará automáticamente

### Paso 2: Copiar la Nueva URL

La nueva URL será algo como:
```
postgresql://postgres.bixevluattcjedpvkruu:Guillen01..@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

**Nota importante:**
- El puerto será `6543` (no `5432`)
- El host será `pooler.supabase.com` (no `db.xxxxx.supabase.co`)
- El usuario será `postgres.xxxxx` (no solo `postgres`)

### Paso 3: Agregar ?schema=public

Agrega `?schema=public` al final:
```
postgresql://postgres.bixevluattcjedpvkruu:Guillen01..@aws-0-us-east-1.pooler.supabase.com:6543/postgres?schema=public
```

### Paso 4: Configurar en Vercel

1. Ve a Vercel → Settings → Environment Variables
2. Edita `POSTGRES_PRISMA_URL`
3. Pega la URL de Session Pooler (con puerto 6543)
4. Guarda
5. **Redeploy**

## 🔍 Diferencia entre las URLs

**Direct Connection (NO funciona en Vercel):**
```
postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres
```

**Session Pooler (FUNCIONA en Vercel):**
```
postgresql://postgres.xxxxx:password@aws-0-region.pooler.supabase.com:6543/postgres
```

## ✅ Después de Configurar

1. El build automático creará las tablas
2. El seed automático creará el usuario admin
3. Podrás iniciar sesión con admin/admin123


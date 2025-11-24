# Usar Connection Pooling en Supabase (Necesario para Vercel)

## ⚠️ Problema

Vercel es IPv4-only y la conexión directa (puerto 5432) **NO funciona** en Vercel.

## ✅ Solución: Usar Connection Pooling

Puedes usar **Session Pooler** o **Transaction Pooler** - ambos funcionan con Vercel y usan el puerto **6543**.

### Diferencia entre Session y Transaction Pooler

- **Session Pooler**: Mejor para aplicaciones que mantienen sesiones largas (Next.js con Prisma funciona bien)
- **Transaction Pooler**: Mejor para operaciones transaccionales cortas
- **Ambos funcionan** con Vercel y usan el puerto 6543

### Paso 1: Cambiar a Connection Pooling en Supabase

1. En la pantalla de "Connection String" que estás viendo
2. Cambia el dropdown **"Method"** de **"Direct connection"** a:
   - **"Session Pooler"** (recomendado para Prisma/Next.js)
   - O **"Transaction Pooler"** (también funciona)
3. La URL cambiará automáticamente

### Paso 2: Copiar la Nueva URL

La nueva URL será algo como:
```
postgresql://postgres.bixevluattcjedpvkruu:TU_CONTRASEÑA@aws-0-us-west-2.pooler.supabase.com:6543/postgres
```

**Nota importante:**
- El puerto será `6543` (no `5432`) - esto es CRÍTICO
- El host será `pooler.supabase.com` (no `db.xxxxx.supabase.co`)
- El usuario será `postgres.xxxxx` (no solo `postgres`)
- Funciona tanto con **Session Pooler** como con **Transaction Pooler**

### Paso 3: Agregar ?schema=public

Agrega `?schema=public` al final:
```
postgresql://postgres.bixevluattcjedpvkruu:TU_CONTRASEÑA@aws-0-us-west-2.pooler.supabase.com:6543/postgres?schema=public
```

**Ejemplo completo** (si tu contraseña es `***REMOVED***`):
```
postgresql://postgres.bixevluattcjedpvkruu:***REMOVED***@aws-0-us-west-2.pooler.supabase.com:6543/postgres?schema=public
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

**Connection Pooling - Session o Transaction (FUNCIONA en Vercel):**
```
postgresql://postgres.xxxxx:password@aws-0-region.pooler.supabase.com:6543/postgres
```

**Ambos (Session y Transaction Pooler) usan el mismo formato y puerto 6543**

## ✅ Después de Configurar

1. El build automático creará las tablas
2. El seed automático creará el usuario admin
3. Podrás iniciar sesión con admin/admin123


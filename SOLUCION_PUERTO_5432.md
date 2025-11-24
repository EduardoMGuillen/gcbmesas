# Solución: Error P1001 - Puerto 5432 (Conexión Directa)

## 🔴 Error

```
Error: P1001: Can't reach database server at `aws-0-us-west-2.pooler.supabase.com:5432`
```

## ⚠️ Problema

Estás usando el **puerto 5432** (conexión directa) en lugar del **puerto 6543** (Session Pooler). Vercel **NO puede** conectarse usando el puerto 5432 porque es IPv4-only.

## ✅ Solución: Cambiar a Session Pooler (Puerto 6543)

### Paso 1: Obtener la URL Correcta de Supabase

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **Settings** → **Database**
4. Busca la sección **Connection Pooling**
5. Selecciona **Session mode** (o Transaction mode)
6. Copia la **Connection String**

### Paso 2: Verificar el Formato

La URL debe tener este formato:
```
postgresql://postgres.bixevluattcjedpvkruu:TU_CONTRASEÑA@aws-0-us-west-2.pooler.supabase.com:6543/postgres
```

**Importante:**
- ✅ Puerto debe ser **6543** (no 5432)
- ✅ Host debe ser **pooler.supabase.com** (no db.xxxxx.supabase.co)
- ✅ Usuario debe ser **postgres.bixevluattcjedpvkruu** (con el project ref)

### Paso 3: Agregar ?schema=public

Agrega `?schema=public` al final:
```
postgresql://postgres.bixevluattcjedpvkruu:TU_CONTRASEÑA@aws-0-us-west-2.pooler.supabase.com:6543/postgres?schema=public
```

### Paso 4: Configurar en Vercel

1. Ve a [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **Settings** → **Environment Variables**
4. Busca `POSTGRES_PRISMA_URL` o `DATABASE_URL`
5. **Edita** la variable
6. **Pega la URL completa** con puerto 6543
7. **IMPORTANTE:** Marca la casilla **Production** (y Preview si quieres)
8. **Guarda**

### Paso 5: Verificar la URL

Asegúrate de que la URL en Vercel:
- ✅ Termine en `:6543/postgres?schema=public`
- ✅ NO termine en `:5432/postgres`
- ✅ Contenga `pooler.supabase.com` o `pooler.supabase.co`

### Paso 6: Redeploy

1. Ve a **Deployments**
2. Click en los tres puntos (⋯) del último deployment
3. Click en **Redeploy**
4. Espera a que termine

## 🔍 Ejemplo de URL Correcta

Si tu región es **us-west-2** y tu contraseña es **casablanca2025astro**:

```
postgresql://postgres.bixevluattcjedpvkruu:casablanca2025astro@aws-0-us-west-2.pooler.supabase.com:6543/postgres?schema=public
```

## 🔍 Ejemplo de URL Incorrecta (NO usar)

```
postgresql://postgres.bixevluattcjedpvkruu:casablanca2025astro@aws-0-us-west-2.pooler.supabase.com:5432/postgres?schema=public
```
❌ Puerto 5432 no funciona en Vercel

## ✅ Verificar Después del Cambio

1. Espera a que termine el redeploy
2. Visita: `https://tu-url.vercel.app/diagnostico`
3. Debería mostrar: "Base de datos conectada"

## 🐛 Si Aún No Funciona

### Verificar la Región

El error muestra `us-west-2`, pero anteriormente usábamos `us-east-1`. Verifica en Supabase Dashboard cuál es tu región real:

1. Ve a Supabase Dashboard
2. Settings → Database
3. Revisa la región en "Connection Info"
4. Usa la URL que corresponda a tu región

### Verificar la Contraseña

Asegúrate de que la contraseña en la URL sea correcta. Si tienes caracteres especiales, pueden necesitar codificación URL.

### Verificar Network Restrictions

1. Ve a Supabase Dashboard
2. Settings → Database → Network Restrictions
3. Asegúrate de que **"Allow connections from anywhere"** esté habilitado
4. O agrega los IPs de Vercel si usas restricciones

## 📝 Notas Importantes

- **Puerto 5432** = Conexión directa (NO funciona en Vercel)
- **Puerto 6543** = Session Pooler (FUNCIONA en Vercel)
- Vercel es IPv4-only, por eso necesita Session Pooler
- El Session Pooler es más eficiente para aplicaciones serverless


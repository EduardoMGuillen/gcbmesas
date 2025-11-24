# Solución Error P1001: Can't reach database server

## 🔴 Error
```
P1001: Can't reach database server at `db.bixevluattcjedpvkruu.supabase.co:5432`
```

## ✅ Soluciones (en orden de probabilidad)

### Solución 1: Verificar Network Restrictions en Supabase (MÁS COMÚN)

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **Settings** → **Database**
4. Busca la sección **Network Restrictions**
5. **DEBE decir:** "Your database can be accessed by all IP addresses"
6. Si dice otra cosa o hay restricciones:
   - Click en **"Restrict all access"** si está activado
   - O click en **"Add restriction"** y agrega `0.0.0.0/0` para permitir todas las IPs
   - Guarda los cambios

### Solución 2: Usar Connection Pooling (RECOMENDADO)

Supabase recomienda usar Connection Pooling para aplicaciones serverless como Vercel:

1. En Supabase: **Settings** → **Database**
2. Busca **Connection Pooling**
3. Copia la **Connection String** (Session mode o Transaction mode)
4. Reemplaza `[YOUR-PASSWORD]` con tu contraseña
5. **IMPORTANTE:** El puerto será diferente (usualmente `6543` en lugar de `5432`)
6. Agrega `?schema=public` al final

**Formato:**
```
postgresql://postgres.xxxxx:TU_CONTRASEÑA@aws-0-us-east-1.pooler.supabase.com:6543/postgres?schema=public
```

**Tu URL con Connection Pooling sería algo como:**
```
postgresql://postgres.bixevluattcjedpvkruu:Guillen01..@aws-0-us-east-1.pooler.supabase.com:6543/postgres?schema=public
```

### Solución 3: Verificar que el Proyecto esté Activo

1. En Supabase Dashboard, verifica que tu proyecto esté **activo** (no pausado)
2. Si está pausado, reactívalo

### Solución 4: Verificar la URL Directa

Si quieres usar la conexión directa (puerto 5432):

1. Verifica que la URL sea exactamente:
   ```
   postgresql://postgres:Guillen01..@db.bixevluattcjedpvkruu.supabase.co:5432/postgres?schema=public
   ```
2. Si los puntos causan problemas, codifícalos:
   ```
   postgresql://postgres:Guillen01%2E%2E@db.bixevluattcjedpvkruu.supabase.co:5432/postgres?schema=public
   ```

### Solución 5: Verificar Variables de Entorno en Vercel

1. Ve a Vercel → **Settings** → **Environment Variables**
2. Verifica que `DATABASE_URL` esté configurada
3. Verifica que esté marcada para **Production**
4. Copia y pega la URL exacta (sin espacios extra)
5. Guarda y **Redeploy**

## 🎯 Recomendación: Usar Connection Pooling

Para Vercel (serverless), Connection Pooling es la mejor opción porque:
- ✅ Mejor rendimiento
- ✅ Menos problemas de conexión
- ✅ Diseñado para aplicaciones serverless
- ✅ Más estable

## 📝 Pasos para Configurar Connection Pooling

1. **Supabase Dashboard:**
   - Settings → Database → Connection Pooling
   - Copia la Connection String (Session mode)

2. **Construir la URL:**
   ```
   postgresql://postgres.bixevluattcjedpvkruu:Guillen01..@aws-0-us-east-1.pooler.supabase.com:6543/postgres?schema=public
   ```
   (El formato exacto depende de tu región en Supabase)

3. **Actualizar en Vercel:**
   - Settings → Environment Variables
   - Edita `DATABASE_URL`
   - Pega la nueva URL con pooling
   - Guarda y Redeploy

## 🔍 Verificar la Conexión

Después de cambiar la configuración:

1. **Redeploy en Vercel**
2. Visita: `https://tu-url.vercel.app/diagnostico`
3. Debería mostrar: "Base de datos conectada"

## 🐛 Si Aún No Funciona

1. **Prueba localmente:**
   ```bash
   # Crea .env con la DATABASE_URL
   echo 'DATABASE_URL="postgresql://postgres:Guillen01..@db.bixevluattcjedpvkruu.supabase.co:5432/postgres?schema=public"' > .env
   npm run db:push
   ```
   Si funciona localmente, el problema es Network Restrictions o necesita Connection Pooling.

2. **Revisa los logs de Supabase:**
   - Ve a Supabase Dashboard
   - Revisa si hay intentos de conexión bloqueados

3. **Contacta soporte de Supabase:**
   - Si nada funciona, puede ser un problema del lado de Supabase


# Solución: Error de Conexión a Supabase

## 🔴 Error Actual
```
Can't reach database server at 'db.bixevluattcjedpvkruu.supabase.co:5432'
```

## ✅ Solución Paso a Paso

### Paso 1: Verificar Network Restrictions en Supabase

1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Click en **Settings** → **Database**
3. Busca la sección **Network Restrictions**
4. **IMPORTANTE:** Debe decir "Your database can be accessed by all IP addresses"
5. Si hay restricciones, quítalas temporalmente o agrega `0.0.0.0/0` para permitir todas las IPs

### Paso 2: Verificar DATABASE_URL en Vercel

1. Ve a [Vercel Dashboard](https://vercel.com/dashboard)
2. Tu proyecto → **Settings** → **Environment Variables**
3. Busca `DATABASE_URL`
4. Verifica que tenga este formato (reemplaza `TU_CONTRASEÑA`):

```
postgresql://postgres:TU_CONTRASEÑA@db.bixevluattcjedpvkruu.supabase.co:5432/postgres?schema=public
```

**Errores comunes:**
- ❌ Falta la contraseña (tiene `[YOUR-PASSWORD]`)
- ❌ Falta `?schema=public` al final
- ❌ Tiene espacios extra
- ❌ La contraseña tiene caracteres especiales que no están codificados

### Paso 3: Obtener/Resetear la Contraseña de Supabase

1. En Supabase: **Settings** → **Database**
2. Busca **Database password**
3. Si no la recuerdas:
   - Click en **Reset database password**
   - Copia la nueva contraseña
   - **IMPORTANTE:** Si la contraseña tiene caracteres especiales, puede necesitar codificación URL

### Paso 4: Codificar la Contraseña (si tiene caracteres especiales)

Si tu contraseña tiene caracteres especiales como `@`, `#`, `$`, `%`, etc., necesitas codificarlos:

**Ejemplo:**
- Contraseña: `Mi@Pass#123`
- Codificada: `Mi%40Pass%23123`
  - `@` = `%40`
  - `#` = `%23`

**O mejor aún:** Usa una contraseña simple sin caracteres especiales al resetear.

### Paso 5: Construir la URL Correcta

**Formato:**
```
postgresql://postgres:CONTRASEÑA_CODIFICADA@db.bixevluattcjedpvkruu.supabase.co:5432/postgres?schema=public
```

**Ejemplo con contraseña "***REMOVED***":**
```
postgresql://postgres:***REMOVED***@db.bixevluattcjedpvkruu.supabase.co:5432/postgres?schema=public
```

### Paso 6: Actualizar en Vercel

1. Ve a **Settings** → **Environment Variables**
2. Edita `DATABASE_URL`
3. Pega la URL completa y correcta
4. Guarda
5. **Redeploy** el proyecto

### Paso 7: Verificar la Conexión

1. Visita: `https://tu-url.vercel.app/diagnostico`
2. Debería mostrar: "Base de datos conectada"

## 🔍 Verificar la URL Correcta

Puedes probar la conexión localmente primero:

```bash
# En tu máquina local, crea .env con la DATABASE_URL
echo 'DATABASE_URL="postgresql://postgres:TU_CONTRASEÑA@db.bixevluattcjedpvkruu.supabase.co:5432/postgres?schema=public"' > .env

# Prueba la conexión
npm run db:push
```

Si funciona localmente pero no en Vercel, el problema es la configuración en Vercel.

## 🐛 Problemas Comunes

### Error: "Can't reach database server"
- ✅ Verifica Network Restrictions en Supabase (debe estar abierto)
- ✅ Verifica que la URL sea correcta
- ✅ Verifica que la contraseña esté correcta y codificada si es necesario

### Error: "Authentication failed"
- ✅ Verifica que la contraseña en la URL sea correcta
- ✅ Si resetaste la contraseña, actualiza la URL en Vercel

### Error: "Database does not exist"
- ✅ Verifica que el nombre de la base de datos sea `postgres` (default de Supabase)
- ✅ Verifica que `?schema=public` esté al final

## 📝 Checklist

- [ ] Network Restrictions en Supabase permiten todas las IPs
- [ ] Contraseña de Supabase obtenida/reseteada
- [ ] Contraseña codificada si tiene caracteres especiales
- [ ] DATABASE_URL construida correctamente
- [ ] DATABASE_URL actualizada en Vercel
- [ ] Redeploy realizado
- [ ] Verificado en `/diagnostico`

## 🆘 Si Aún No Funciona

1. **Prueba localmente primero:**
   ```bash
   # Crea .env con la DATABASE_URL
   npm run db:push
   ```
   Si funciona localmente, el problema es Vercel.

2. **Revisa los logs de Vercel:**
   - Deployments → Click en deployment → View Function Logs
   - Busca errores relacionados con "database" o "connection"

3. **Verifica que Supabase esté activo:**
   - Ve a Supabase Dashboard
   - Verifica que el proyecto esté activo (no pausado)

4. **Considera usar Connection Pooling:**
   - En Supabase: Settings → Database → Connection Pooling
   - Usa la URL de Connection Pooling en lugar de la directa


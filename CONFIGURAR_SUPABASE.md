# Configuración de Supabase para Vercel

## 🔧 Configuración de Red (Network Restrictions)

### Paso 1: Permitir Acceso desde Vercel

En la pantalla de Settings que estás viendo:

1. **Network Restrictions:**
   - Por ahora, deja "Your database can be accessed by all IP addresses"
   - O agrega los rangos de IP de Vercel si quieres restringir

**Nota:** Vercel usa IPs dinámicas, así que es mejor dejar el acceso abierto para desarrollo, o usar las opciones de Supabase para permitir conexiones desde cualquier IP.

### Paso 2: Obtener la Connection String

1. Ve a **Settings** → **Database** (en el menú lateral izquierdo)
2. Busca la sección **Connection string**
3. Selecciona **URI** (no "Session mode" ni "Transaction mode")
4. Copia la URL que se ve así:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```

### Paso 3: Reemplazar la Contraseña

1. La URL tiene `[YOUR-PASSWORD]` - necesitas reemplazarla
2. Ve a **Settings** → **Database** → **Database password**
3. Si no la recuerdas, puedes resetearla
4. Reemplaza `[YOUR-PASSWORD]` en la URL con tu contraseña real
5. Agrega `?schema=public` al final

**URL final debería verse así:**
```
postgresql://postgres:TU_CONTRASEÑA_AQUI@db.xxxxx.supabase.co:5432/postgres?schema=public
```

### Paso 4: Configurar en Vercel

1. Ve a tu proyecto en Vercel
2. **Settings** → **Environment Variables**
3. Agrega o edita `DATABASE_URL`
4. Pega la URL completa (con la contraseña reemplazada)
5. Asegúrate de marcar **Production**
6. Guarda

### Paso 5: Verificar SSL (Opcional pero Recomendado)

En la pantalla de Settings que estás viendo:

1. **Enforce SSL on incoming connections:**
   - Puedes dejarlo en OFF para desarrollo
   - O activarlo y descargar el certificado SSL

**Si activas SSL:**
- Descarga el certificado
- Necesitarás agregar parámetros SSL a tu `DATABASE_URL`:
  ```
  postgresql://postgres:password@host:5432/postgres?schema=public&sslmode=require
  ```

### Paso 6: Crear Tablas y Usuario

En tu máquina local:

```bash
# 1. Crea .env con la DATABASE_URL de Supabase
echo 'DATABASE_URL="postgresql://postgres:TU_CONTRASEÑA@db.xxxxx.supabase.co:5432/postgres?schema=public"' > .env

# 2. Instala dependencias
npm install

# 3. Crea las tablas
npm run db:push

# 4. Crea el usuario admin
npm run db:seed
```

### Paso 7: Redeploy en Vercel

1. Ve a **Deployments** en Vercel
2. Click en los tres puntos (⋯)
3. Click en **Redeploy**

## ✅ Verificar que Funciona

1. Visita: `https://tu-url.vercel.app/diagnostico`
2. Debería mostrar: "Base de datos conectada"
3. Intenta login con:
   - Usuario: `admin`
   - Contraseña: `admin123`

## 🔒 Seguridad

### Para Producción:

1. **Network Restrictions:**
   - Considera agregar restricciones de IP si conoces las IPs de Vercel
   - O usa Supabase Auth para restringir acceso

2. **SSL:**
   - Activa "Enforce SSL" en producción
   - Usa `sslmode=require` en la URL

3. **Password:**
   - Usa una contraseña fuerte
   - No compartas la `DATABASE_URL` públicamente

## 🐛 Problemas Comunes

### Error: "Connection refused"
- Verifica que las Network Restrictions permitan acceso
- Verifica que la URL sea correcta
- Verifica que la contraseña esté correcta en la URL

### Error: "SSL required"
- Agrega `&sslmode=require` a la URL
- O desactiva "Enforce SSL" temporalmente

### Error: "Database does not exist"
- Verifica que el nombre de la base de datos sea `postgres` (default de Supabase)
- Verifica que `?schema=public` esté al final de la URL

## 📝 Checklist

- [ ] Network Restrictions configuradas (o acceso abierto)
- [ ] Connection String copiada de Supabase
- [ ] Contraseña reemplazada en la URL
- [ ] `?schema=public` agregado al final
- [ ] `DATABASE_URL` configurada en Vercel
- [ ] Tablas creadas (`npm run db:push`)
- [ ] Usuario admin creado (`npm run db:seed`)
- [ ] Redeploy realizado
- [ ] Verificado en `/diagnostico`


# Configuración Rápida - Vercel + Supabase

## 📋 Tu Información de Supabase

- **Project URL:** https://bixevluattcjedpvkruu.supabase.co
- **Project Ref:** bixevluattcjedpvkruu
- **API Key:** (ya configurada, no necesaria para DATABASE_URL)

## 🔧 Paso 1: Obtener la Contraseña de la Base de Datos

1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Click en **Settings** (icono de engranaje) en el menú lateral
3. Click en **Database**
4. Busca la sección **Database password**
5. Si no la recuerdas:
   - Click en **Reset database password**
   - Copia la nueva contraseña (guárdala en un lugar seguro)

## 🔧 Paso 2: Construir la DATABASE_URL

Usa este formato (reemplaza `TU_CONTRASEÑA` con tu contraseña real):

```
postgresql://postgres:TU_CONTRASEÑA@db.bixevluattcjedpvkruu.supabase.co:5432/postgres?schema=public
```

**Ejemplo si tu contraseña es "MiPassword123":**
```
postgresql://postgres:MiPassword123@db.bixevluattcjedpvkruu.supabase.co:5432/postgres?schema=public
```

## 🔧 Paso 3: Configurar en Vercel

1. Ve a [Vercel Dashboard](https://vercel.com/dashboard)
2. Selecciona tu proyecto `gcbmesas`
3. Ve a **Settings** → **Environment Variables**
4. Busca o crea la variable `DATABASE_URL`
5. Pega la URL completa (con tu contraseña)
6. **IMPORTANTE:** Marca la casilla **Production**
7. Click en **Save**

## 🔧 Paso 4: Crear Tablas y Usuario (Localmente)

En tu máquina local, en la carpeta del proyecto:

```bash
# 1. Crea archivo .env (si no existe)
# Pega la misma DATABASE_URL que pusiste en Vercel
echo 'DATABASE_URL="postgresql://postgres:TU_CONTRASEÑA@db.bixevluattcjedpvkruu.supabase.co:5432/postgres?schema=public"' > .env

# 2. Instala dependencias (si no lo has hecho)
npm install

# 3. Crea las tablas en la base de datos
npm run db:push

# 4. Crea el usuario admin y datos iniciales
npm run db:seed
```

**Después del seed, verás:**
```
✅ Usuario administrador creado: admin
✅ Productos de ejemplo creados
✅ Mesas de ejemplo creadas
🎉 Seed completado!

📝 Credenciales por defecto:
   Usuario: admin
   Contraseña: admin123
```

## 🔧 Paso 5: Redeploy en Vercel

1. Ve a **Deployments** en Vercel
2. Click en los tres puntos (⋯) del último deployment
3. Click en **Redeploy**
4. Espera a que termine

## ✅ Verificar que Funciona

1. Visita: `https://tu-url-vercel.vercel.app/diagnostico`
2. Debería mostrar:
   - ✅ Conexión: Conectada
   - ✅ Usuario Admin: Existe
   - ✅ Total Usuarios: 1

3. Intenta iniciar sesión:
   - Ve a: `https://tu-url-vercel.vercel.app/login`
   - Usuario: `admin`
   - Contraseña: `admin123`

## 🐛 Si Aún No Funciona

### Verifica en Vercel:
1. **Settings** → **Environment Variables**
2. Confirma que `DATABASE_URL` esté configurada
3. Confirma que esté marcada para **Production**
4. Verifica que la URL no tenga espacios extra

### Verifica en Supabase:
1. **Settings** → **Database** → **Network Restrictions**
2. Debe decir: "Your database can be accessed by all IP addresses"
3. Si hay restricciones, quítalas temporalmente

### Revisa los Logs:
1. En Vercel: **Deployments** → Click en deployment → **View Function Logs**
2. Busca errores relacionados con "database" o "connection"

## 📝 Checklist Final

- [ ] Contraseña de Supabase obtenida/reseteada
- [ ] DATABASE_URL construida correctamente
- [ ] DATABASE_URL configurada en Vercel (marcada para Production)
- [ ] Tablas creadas (`npm run db:push`)
- [ ] Usuario admin creado (`npm run db:seed`)
- [ ] Redeploy realizado en Vercel
- [ ] Verificado en `/diagnostico`
- [ ] Login exitoso con admin/admin123


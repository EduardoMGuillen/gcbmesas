# Solución: Error de Conexión a la Base de Datos

## 🔴 Error Actual
```
Error de conexión a la base de datos. Verifica la configuración.
```

## ✅ Solución Paso a Paso

### Paso 1: Verificar DATABASE_URL en Vercel

1. Ve a tu proyecto en [Vercel Dashboard](https://vercel.com/dashboard)
2. Click en tu proyecto `gcbmesas`
3. Ve a **Settings** → **Environment Variables**
4. Busca la variable `DATABASE_URL`

**Verifica que:**
- ✅ La variable existe
- ✅ Está marcada para **Production**
- ✅ El formato es correcto: `postgresql://usuario:contraseña@host:puerto/database?schema=public`

### Paso 2: Si NO tienes DATABASE_URL configurada

#### Opción A: Usar Vercel Postgres (Más Fácil)

1. En tu proyecto de Vercel, ve a la pestaña **Storage**
2. Click en **Create Database**
3. Selecciona **Postgres**
4. Elige el plan (Hobby es gratis)
5. Vercel creará automáticamente la variable `POSTGRES_PRISMA_URL`
6. **IMPORTANTE:** Renombra esta variable a `DATABASE_URL` en Environment Variables

#### Opción B: Usar Supabase (Gratis)

1. Ve a [supabase.com](https://supabase.com) y crea una cuenta
2. Crea un nuevo proyecto
3. Ve a **Settings** → **Database**
4. Busca **Connection string** → **URI**
5. Copia la URL (algo como: `postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres`)
6. Reemplaza `[YOUR-PASSWORD]` con tu contraseña de base de datos
7. Agrega `?schema=public` al final
8. Pégala como `DATABASE_URL` en Vercel

#### Opción C: Usar Railway (Gratis)

1. Ve a [railway.app](https://railway.app) y crea una cuenta
2. Click en **New Project** → **Provision PostgreSQL**
3. Click en la base de datos creada
4. Ve a la pestaña **Variables**
5. Copia el valor de `DATABASE_URL`
6. Pégala en Vercel como `DATABASE_URL`

### Paso 3: Crear las Tablas en la Base de Datos

Una vez que tengas `DATABASE_URL` configurada, necesitas crear las tablas:

**En tu máquina local:**

```bash
# 1. Asegúrate de tener el código actualizado
git pull origin master

# 2. Crea archivo .env con la misma DATABASE_URL de Vercel
# Copia la DATABASE_URL de Vercel y pégala en .env
echo 'DATABASE_URL="tu-url-de-vercel-aqui"' > .env

# 3. Instala dependencias (si no lo has hecho)
npm install

# 4. Crea las tablas
npm run db:push

# 5. Crea el usuario admin y datos iniciales
npm run db:seed
```

### Paso 4: Verificar la Conexión

1. Visita: `https://tu-url.vercel.app/diagnostico`
2. Debería mostrar:
   - ✅ Conexión: Conectada
   - ✅ Usuario Admin: Existe

### Paso 5: Redeploy en Vercel

Después de configurar `DATABASE_URL`:

1. Ve a **Deployments** en Vercel
2. Click en los tres puntos (⋯) del último deployment
3. Click en **Redeploy**

## 🔍 Verificar que Funciona

1. Espera a que termine el deploy
2. Visita tu URL de Vercel
3. Intenta iniciar sesión con:
   - Usuario: `admin`
   - Contraseña: `admin123`

## ❌ Si Aún No Funciona

### Verifica los Logs en Vercel:

1. Ve a **Deployments** → Click en el deployment
2. Click en **View Function Logs**
3. Busca errores relacionados con:
   - "Can't reach database server"
   - "Connection refused"
   - "Authentication failed"

### Problemas Comunes:

**Error: "Can't reach database server"**
- Verifica que la base de datos esté activa (Supabase/Railway)
- Verifica que la URL sea correcta
- Verifica que no haya firewall bloqueando la conexión

**Error: "Authentication failed"**
- Verifica que el usuario y contraseña en la URL sean correctos
- En Supabase, la contraseña es la que configuraste al crear el proyecto

**Error: "Database does not exist"**
- Verifica que el nombre de la base de datos en la URL sea correcto
- En Supabase, generalmente es `postgres`

## 📝 Checklist Final

- [ ] `DATABASE_URL` configurada en Vercel
- [ ] `DATABASE_URL` marcada para Production
- [ ] Base de datos creada y activa
- [ ] Tablas creadas (`npm run db:push`)
- [ ] Usuario admin creado (`npm run db:seed`)
- [ ] Redeploy realizado
- [ ] Verificado en `/diagnostico`

## 🆘 ¿Necesitas Ayuda?

Si después de seguir estos pasos aún no funciona:

1. Comparte los logs de Vercel (Function Logs)
2. Verifica que puedas conectarte a la base de datos desde tu máquina local
3. Prueba la conexión usando Prisma Studio: `npm run db:studio`


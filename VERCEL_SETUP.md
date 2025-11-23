# Configuración de Vercel - TableControl

## 🚨 Problema Común: Error de Aplicación

Si ves el error "Application error: a server-side exception has occurred", generalmente es porque faltan las **variables de entorno** en Vercel.

## 📋 Pasos para Configurar Variables de Entorno en Vercel

### 1. Accede a la Configuración del Proyecto

1. Ve a tu proyecto en [Vercel Dashboard](https://vercel.com/dashboard)
2. Click en tu proyecto `gcbmesas`
3. Ve a **Settings** → **Environment Variables**

### 2. Agrega las Variables Requeridas

Agrega estas 4 variables de entorno:

#### `DATABASE_URL`
```
postgresql://usuario:contraseña@host:puerto/database?schema=public
```

**Opciones de Base de Datos:**
- **Vercel Postgres** (recomendado): Ve a Storage → Create Database → Postgres
- **Supabase**: Crea proyecto gratis en [supabase.com](https://supabase.com)
- **Railway**: Crea proyecto en [railway.app](https://railway.app)
- **Neon**: Crea proyecto en [neon.tech](https://neon.tech)

#### `NEXTAUTH_SECRET`
Genera una clave secreta aleatoria:
```bash
openssl rand -base64 32
```

O usa este generador online: https://generate-secret.vercel.app/32

#### `NEXTAUTH_URL`
```
https://gcbmesas-mvgwefjry-eduardo-maldonado-guillens-projects.vercel.app
```
O tu dominio personalizado si lo tienes configurado.

#### `NEXT_PUBLIC_APP_URL`
```
https://gcbmesas-mvgwefjry-eduardo-maldonado-guillens-projects.vercel.app
```
Mismo valor que `NEXTAUTH_URL`.

### 3. Configurar para Todos los Entornos

Asegúrate de que las variables estén configuradas para:
- ✅ **Production**
- ✅ **Preview** (opcional)
- ✅ **Development** (opcional)

### 4. Redeploy

Después de agregar las variables:
1. Ve a **Deployments**
2. Click en los tres puntos (⋯) del último deployment
3. Click en **Redeploy**

## 🗄️ Configurar Base de Datos

### Opción 1: Vercel Postgres (Más Fácil)

1. En tu proyecto de Vercel, ve a **Storage**
2. Click en **Create Database** → **Postgres**
3. Selecciona el plan (Hobby es gratis)
4. Vercel automáticamente creará la variable `POSTGRES_PRISMA_URL`
5. **Renombra** esta variable a `DATABASE_URL` en Environment Variables

### Opción 2: Supabase (Gratis)

1. Crea cuenta en [supabase.com](https://supabase.com)
2. Crea un nuevo proyecto
3. Ve a **Settings** → **Database**
4. Copia la **Connection String** (URI)
5. Reemplaza `[YOUR-PASSWORD]` con tu contraseña de base de datos
6. Pégala como `DATABASE_URL` en Vercel

### Opción 3: Railway

1. Crea cuenta en [railway.app](https://railway.app)
2. Click en **New Project** → **Provision PostgreSQL**
3. Click en la base de datos → **Variables**
4. Copia `DATABASE_URL`
5. Pégala en Vercel

## 🔧 Después de Configurar la Base de Datos

Una vez que tengas `DATABASE_URL` configurada, necesitas crear las tablas:

### Opción A: Usar Prisma Migrate (Recomendado)

1. Clona el repositorio localmente
2. Configura `.env` con la misma `DATABASE_URL` de producción
3. Ejecuta:
   ```bash
   npm install
   npm run db:push
   npm run db:seed
   ```

### Opción B: Usar Prisma Studio en Vercel (Temporal)

Puedes crear un script temporal que ejecute las migraciones. Pero es mejor hacerlo localmente.

## ✅ Verificar que Funciona

1. Después del redeploy, visita tu URL
2. Deberías ver la página de login
3. Si aún ves error, revisa los **Logs** en Vercel:
   - Ve a **Deployments** → Click en el deployment → **View Function Logs**

## 🐛 Solución de Problemas

### Error: "Missing required environment variables"
- Verifica que todas las 4 variables estén configuradas
- Asegúrate de hacer **Redeploy** después de agregarlas

### Error: "Can't reach database server"
- Verifica que la `DATABASE_URL` sea correcta
- Si usas Supabase/Railway, verifica que la base de datos esté activa
- Verifica que la base de datos permita conexiones externas

### Error: "Table does not exist"
- Ejecuta `npm run db:push` localmente con la misma `DATABASE_URL`
- O crea las tablas manualmente usando Prisma Studio

### Error: "NEXTAUTH_SECRET is not set"
- Asegúrate de que `NEXTAUTH_SECRET` esté configurada
- Debe ser una cadena de al menos 32 caracteres

## 📝 Checklist de Configuración

- [ ] `DATABASE_URL` configurada
- [ ] `NEXTAUTH_SECRET` configurada (32+ caracteres)
- [ ] `NEXTAUTH_URL` configurada (URL de Vercel)
- [ ] `NEXT_PUBLIC_APP_URL` configurada (misma que NEXTAUTH_URL)
- [ ] Base de datos creada y accesible
- [ ] Tablas creadas en la base de datos (`npm run db:push`)
- [ ] Datos iniciales cargados (`npm run db:seed`)
- [ ] Redeploy realizado después de configurar variables

## 🎯 Próximos Pasos

Una vez que todo funcione:
1. Configura un dominio personalizado (opcional)
2. Cambia la contraseña del usuario `admin`
3. Crea usuarios meseros desde el panel de administración
4. Crea mesas y productos


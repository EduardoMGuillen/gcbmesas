# Guía de Instalación y Configuración - TableControl

## 📋 Requisitos Previos

- Node.js 18+ instalado
- PostgreSQL 12+ instalado y corriendo
- npm o yarn instalado

## 🚀 Pasos de Instalación

### 1. Instalar Dependencias

```bash
npm install
```

### 2. Configurar Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto con el siguiente contenido:

```env
# Database
DATABASE_URL="postgresql://usuario:contraseña@localhost:5432/tablecontrol?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="genera-una-clave-secreta-aleatoria-aqui"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

**Importante:**
- Reemplaza `usuario`, `contraseña` y `tablecontrol` con tus credenciales de PostgreSQL
- Genera una clave secreta para `NEXTAUTH_SECRET`. Puedes usar:
  ```bash
  openssl rand -base64 32
  ```
- En producción, cambia las URLs por las de tu dominio

### 3. Crear la Base de Datos

Crea la base de datos en PostgreSQL:

```bash
# Conecta a PostgreSQL
psql -U postgres

# Crea la base de datos
CREATE DATABASE tablecontrol;

# Sal de psql
\q
```

### 4. Configurar Prisma

```bash
# Genera el cliente de Prisma
npm run db:generate

# Crea las tablas en la base de datos
npm run db:push
```

### 5. Poblar la Base de Datos con Datos Iniciales

```bash
npm run db:seed
```

Esto creará:
- Un usuario administrador (usuario: `admin`, contraseña: `admin123`)
- Productos de ejemplo
- Mesas de ejemplo

**⚠️ IMPORTANTE:** Cambia la contraseña del administrador después del primer inicio de sesión.

### 6. Iniciar el Servidor de Desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 🔐 Credenciales por Defecto

Después de ejecutar el seed:

- **Usuario:** `admin`
- **Contraseña:** `admin123`
- **Rol:** ADMIN

## 🛠️ Comandos Útiles

```bash
# Desarrollo
npm run dev              # Inicia servidor de desarrollo

# Base de Datos
npm run db:push          # Sincroniza schema con BD
npm run db:migrate       # Crea migración
npm run db:studio        # Abre Prisma Studio (interfaz visual)
npm run db:generate      # Genera cliente Prisma
npm run db:seed          # Pobla BD con datos iniciales

# Producción
npm run build            # Construye la aplicación
npm run start            # Inicia servidor de producción
```

## 📱 Uso Inicial

### Como Administrador

1. Inicia sesión con las credenciales por defecto
2. Ve al panel de administración
3. Crea mesas adicionales si es necesario
4. Genera códigos QR para las mesas
5. Crea productos en el inventario
6. Crea usuarios meseros

### Como Mesero

1. Inicia sesión con un usuario mesero
2. Escanea el QR de una mesa o ingresa el ID manualmente
3. Crea una cuenta con saldo inicial
4. Agrega pedidos seleccionando productos
5. El sistema descuenta automáticamente del saldo

## 🐛 Solución de Problemas

### Error: "Cannot find module '@prisma/client'"

```bash
npm run db:generate
```

### Error de conexión a PostgreSQL

1. Verifica que PostgreSQL esté corriendo:
   ```bash
   # Windows
   net start postgresql-x64-14
   
   # Linux/Mac
   sudo systemctl status postgresql
   ```

2. Verifica la URL de conexión en `.env`
3. Verifica que la base de datos exista

### Error: "NEXTAUTH_SECRET is not set"

Asegúrate de tener `NEXTAUTH_SECRET` configurado en tu archivo `.env`

### Error al generar QR

Verifica que `NEXT_PUBLIC_APP_URL` esté configurado correctamente en `.env`

### Error de migración

Si hay problemas con las migraciones:

```bash
# Resetea la base de datos (¡CUIDADO! Esto borra todos los datos)
npm run db:push -- --force-reset

# O crea una nueva migración
npm run db:migrate
```

## 🚢 Deploy a Producción

### Vercel (Recomendado)

1. Conecta tu repositorio a Vercel
2. Configura las variables de entorno en el dashboard de Vercel
3. Asegúrate de que tu base de datos PostgreSQL esté accesible desde internet
4. Vercel ejecutará automáticamente `npm run build`

### Variables de Entorno en Producción

Configura estas variables en tu plataforma de hosting:

- `DATABASE_URL` - URL completa de conexión a PostgreSQL
- `NEXTAUTH_SECRET` - Clave secreta (genera una nueva para producción)
- `NEXTAUTH_URL` - URL completa de tu aplicación (ej: https://tudominio.com)
- `NEXT_PUBLIC_APP_URL` - URL pública de tu aplicación

### Base de Datos en Producción

Para producción, considera usar:
- **Vercel Postgres** (si usas Vercel)
- **Supabase** (gratis para empezar)
- **Railway** (fácil de configurar)
- **AWS RDS** (para escalabilidad)

## 📝 Notas Adicionales

- El sistema registra automáticamente todos los logs
- Los saldos se validan antes de cada pedido
- Se previenen condiciones de carrera usando transacciones
- Las contraseñas se encriptan con bcrypt
- Los roles se validan en cada operación

## 🆘 Soporte

Si encuentras problemas, verifica:
1. Que todas las dependencias estén instaladas
2. Que las variables de entorno estén configuradas
3. Que PostgreSQL esté corriendo
4. Los logs del servidor para más detalles


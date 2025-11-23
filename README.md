# TableControl - Sistema de Gestión de Mesas

Plataforma web completa para gestionar cuentas de consumo en mesas de una discoteca.

## 🚀 Características

### Para Meseros
- ✅ Inicio de sesión seguro
- ✅ Escaneo de QR de mesas
- ✅ Visualización de saldo disponible
- ✅ Agregar consumos (productos del inventario)
- ✅ Descuento automático del saldo
- ✅ Registro automático de logs

### Para Administradores
- ✅ Crear y gestionar mesas
- ✅ Generar códigos QR únicos para cada mesa
- ✅ Crear cuentas (asignar saldo inicial)
- ✅ Cerrar cuentas
- ✅ Ver logs y reportes completos
- ✅ Gestionar usuarios y roles
- ✅ Gestionar inventario de productos
- ✅ Dashboard con estadísticas en tiempo real

## 🛠️ Stack Tecnológico

- **Next.js 14** (App Router)
- **React 18**
- **TypeScript**
- **TailwindCSS**
- **Prisma ORM**
- **PostgreSQL**
- **NextAuth.js** (Autenticación)
- **QRCode** (Generación de códigos QR)

## 📦 Instalación

1. Clona el repositorio:
```bash
git clone <repository-url>
cd GCBMesas
```

2. Instala las dependencias:
```bash
npm install
```

3. Configura las variables de entorno:
```bash
cp .env.example .env
```

Edita el archivo `.env` y configura:
- `DATABASE_URL`: URL de conexión a PostgreSQL
- `NEXTAUTH_SECRET`: Clave secreta para NextAuth (genera una aleatoria)
- `NEXTAUTH_URL`: URL de tu aplicación
- `NEXT_PUBLIC_APP_URL`: URL pública de tu aplicación

4. Configura la base de datos:
```bash
# Genera el cliente de Prisma
npm run db:generate

# Crea las tablas en la base de datos
npm run db:push

# O crea una migración
npm run db:migrate
```

5. Crea un usuario administrador inicial:
```bash
# Ejecuta Prisma Studio para crear el primer usuario
npm run db:studio
```

O crea un script de seed para crear el usuario inicial.

6. Inicia el servidor de desarrollo:
```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 🗄️ Estructura de la Base de Datos

### Tablas Principales

- **User**: Usuarios del sistema (ADMIN, MESERO, CAJERO)
- **Table**: Mesas del establecimiento
- **Account**: Cuentas abiertas en las mesas
- **Product**: Productos del inventario
- **Order**: Pedidos realizados
- **Log**: Registro de todas las actividades

## 🔐 Roles y Permisos

- **ADMIN**: Acceso completo al sistema
- **MESERO**: Puede escanear QR, agregar pedidos, ver cuentas
- **CAJERO**: (Puede extenderse según necesidades)

## 📱 Flujo de Uso

### Mesero
1. Inicia sesión
2. Escanea el QR de una mesa o ingresa el ID manualmente
3. Ve el saldo disponible y pedidos existentes
4. Agrega nuevos pedidos seleccionando productos
5. El sistema descuenta automáticamente del saldo
6. Cierra la cuenta cuando corresponda

### Administrador
1. Inicia sesión
2. Accede al panel de administración
3. Crea mesas y genera códigos QR
4. Crea cuentas con saldo inicial
5. Gestiona inventario de productos
6. Gestiona usuarios
7. Revisa logs y estadísticas

## 🔒 Seguridad

- ✅ Contraseñas encriptadas con bcrypt
- ✅ Validación de roles en cada endpoint
- ✅ Logs obligatorios de todas las acciones
- ✅ Manejo seguro de sesiones
- ✅ Prevención de condiciones de carrera al descontar saldo
- ✅ Validación de saldo antes de cada pedido

## 📊 Funcionalidades Especiales

- **Logs Automáticos**: Todas las acciones se registran automáticamente
- **Dashboard en Tiempo Real**: Estadísticas de consumo, mesas abiertas, meseros activos
- **Productos Más Vendidos**: Ranking de productos del día
- **Exportación de Logs**: Descarga de logs en formato CSV
- **Cierre de Cuenta Detallado**: Muestra saldo inicial, total consumido, saldo final, timestamp y mesero responsable

## 🚢 Deploy

### Vercel (Recomendado)

1. Conecta tu repositorio a Vercel
2. Configura las variables de entorno
3. Asegúrate de que la base de datos PostgreSQL esté accesible
4. Vercel ejecutará automáticamente `npm run build`

### Variables de Entorno en Producción

Asegúrate de configurar:
- `DATABASE_URL`
- `NEXTAUTH_SECRET` (genera uno seguro)
- `NEXTAUTH_URL` (URL de producción)
- `NEXT_PUBLIC_APP_URL` (URL pública de producción)

## 📝 Scripts Disponibles

- `npm run dev`: Inicia el servidor de desarrollo
- `npm run build`: Construye la aplicación para producción
- `npm run start`: Inicia el servidor de producción
- `npm run db:push`: Sincroniza el schema con la base de datos
- `npm run db:migrate`: Crea una nueva migración
- `npm run db:studio`: Abre Prisma Studio (interfaz visual)
- `npm run db:generate`: Genera el cliente de Prisma

## 🐛 Solución de Problemas

### Error de conexión a la base de datos
- Verifica que PostgreSQL esté corriendo
- Verifica la URL de conexión en `.env`
- Asegúrate de que la base de datos exista

### Error de autenticación
- Verifica que `NEXTAUTH_SECRET` esté configurado
- Verifica que `NEXTAUTH_URL` coincida con tu dominio

### Error al generar QR
- Verifica que `NEXT_PUBLIC_APP_URL` esté configurado correctamente

## 📄 Licencia

Este proyecto es privado y de uso interno.

## 👥 Soporte

Para soporte, contacta al equipo de desarrollo.


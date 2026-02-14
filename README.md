# TableControl

**Sistema integral de gestión operativa para negocios de hospitalidad y entretenimiento.**

TableControl es una plataforma web progresiva (PWA) diseñada para centralizar la operación de establecimientos como discotecas, bares, restaurantes, lounges, clubes nocturnos y venues de eventos. Cubre desde el control de mesas y consumo hasta la venta de entradas con pagos en línea, todo accesible desde cualquier dispositivo.

---

## Industrias objetivo

- Discotecas y clubes nocturnos
- Bares y lounges
- Restaurantes y cafeterías
- Venues de eventos y conciertos
- Centros de convenciones
- Cualquier negocio con servicio en mesa y/o venta de entradas

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 14 (App Router) |
| Lenguaje | TypeScript |
| Base de datos | PostgreSQL + Prisma ORM |
| Autenticación | NextAuth.js (JWT + Credentials) |
| Estilos | Tailwind CSS |
| UI Components | Radix UI |
| Pagos | PayPal REST API v2 |
| Email | Nodemailer (SMTP) |
| Almacenamiento | Vercel Blob |
| Push Notifications | Web Push (VAPID) + Firebase Cloud Messaging |
| QR Codes | qrcode (generación) + html5-qrcode (escaneo) |
| Reportes | xlsx (Excel) + jsPDF |
| Mobile | Capacitor (Android APK) |
| Deploy | Vercel |

---

## Roles de usuario

El sistema maneja tres roles con permisos diferenciados:

### Admin
Acceso completo a todas las funciones: gestión de mesas, inventario, usuarios, eventos, entradas, reportes, logs y configuración general.

### Mesero
Acceso al panel de mesero, mesas activas, creación de pedidos, apertura de cuentas, escaneo de QR de mesas y consulta de cuentas.

### Cajero
Acceso al panel de cajero, gestión de cuentas (servir/rechazar pedidos, cerrar cuentas), y al módulo de entradas con funciones de escaneo/validación e historial.

---

## Módulos y funcionalidades

### 1. Gestión de mesas

- **Crear, editar y eliminar mesas** con nombre y zona asignada (ej: Terraza, VIP, Salón Principal).
- **Código corto único** de 4 caracteres generado automáticamente para cada mesa (ej: `A7KP`).
- **Código QR por mesa** que al escanearse redirige al sistema de pedidos del cliente.
- **Exportar QR en PDF** para imprimir y colocar en las mesas físicas.
- **Filtrado por zona** para organizar mesas por área del establecimiento.

### 2. Sistema de cuentas

- **Abrir cuenta** en una mesa con saldo inicial y nombre del cliente (opcional).
- **Saldo en tiempo real**: el saldo se decrementa automáticamente con cada pedido aceptado.
- **Agregar saldo** a cuentas existentes.
- **Cerrar cuenta** manualmente o de forma automática tras 12 horas de inactividad.
- **Cierre automático**: las cuentas que superan 12 horas se cierran automáticamente, aceptando pedidos pendientes y registrando el evento en logs.
- **Historial** de quién abrió cada cuenta y cuándo se cerró.

### 3. Sistema de pedidos

- **Crear pedidos** desde el panel del mesero o desde el dispositivo del cliente (escaneando el QR de la mesa).
- **Flujo de pedido**: Pendiente → Servido / Rechazado.
- **Validación de saldo**: no se permite crear un pedido si el saldo de la cuenta es insuficiente.
- **Transacciones atómicas**: las operaciones de saldo usan transacciones de base de datos para evitar condiciones de carrera.
- **Rechazo con reembolso**: si un pedido se rechaza (ej: producto agotado), el saldo se devuelve automáticamente a la cuenta.
- **Cancelación por el cliente**: los clientes pueden cancelar sus propios pedidos antes de que sean servidos.
- **Notificaciones push**: cuando un cliente hace un pedido, el mesero que abrió la cuenta recibe una notificación push.

### 4. Inventario y productos

- **CRUD completo** de productos con nombre, precio, categoría y emoji opcional.
- **Categorías** para organizar productos (ej: Cervezas, Licores, Cócteles, Comida).
- **Activar/desactivar productos** sin eliminarlos (soft delete).
- **Filtrado y búsqueda** por nombre y categoría.

### 5. Vista del cliente (pública, sin autenticación)

- **Escaneo de QR de mesa**: el cliente escanea el código QR en su mesa y accede a la interfaz de pedidos.
- **Catálogo de productos** organizado por categoría con precios.
- **Realizar pedidos** directamente desde su teléfono.
- **Ver saldo restante** de su cuenta en tiempo real.
- **Cancelar pedidos pendientes** antes de que sean servidos.
- **Búsqueda de mesa por código corto** si no se puede escanear el QR.

### 6. Eventos

- **Crear y administrar eventos** con nombre, fecha, descripción y precio de cover.
- **Subir flyer/imagen** del evento (almacenamiento en Vercel Blob, máximo 5MB).
- **Precio PayPal (USD)** opcional para habilitar venta de entradas en línea.
- **Activar/desactivar eventos** para controlar su visibilidad pública.
- **Página pública de eventos** (`/eventos`) con diseño visual atractivo mostrando todos los eventos activos.

### 7. Venta de entradas

#### Venta presencial (Admin)
- **Formulario de venta** con selección de evento, datos del cliente (nombre, email, teléfono) y cantidad.
- **Venta individual o masiva**: vender 1 o múltiples entradas con nombres distintos por entrada.
- **QR único por entrada** generado automáticamente.
- **Envío automático por email** con plantilla HTML que incluye QR, logo, detalles del evento y comprobante.
- **Envío por WhatsApp** con mensaje pre-formateado y enlaces de validación.
- **Impresión de comprobante** formato recibo térmico (302px) con QR, detalles y totales.

#### Venta en línea (PayPal)
- **Página de compra pública** (`/eventos/[id]`) con formulario de datos y botón de PayPal.
- **Integración PayPal REST API v2**: creación de orden → aprobación del usuario → captura del pago.
- **Creación automática de entradas** al completarse el pago.
- **Email automático** con QR codes enviado inmediatamente tras la compra.
- **Vista de confirmación** con opción de descargar/imprimir entrada y compartir por WhatsApp.
- **Soporte multi-entrada**: comprar varias entradas con nombres distintos en una sola transacción.

#### Validación de entradas
- **Escaneo de QR** con cámara (soporte multi-cámara, cambio entre frontal/trasera).
- **Búsqueda manual** por código o URL de entrada.
- **Estados de entrada**: Activa (verde), Usada (azul), Cancelada (rojo).
- **Marcar como usada** al validar en la puerta.
- **Revertir a activa** si se marcó por error.
- **Cancelar entradas** con confirmación.
- **Página pública de validación** (`/entradas/validar/[token]`) que muestra el estado de la entrada, datos del evento y del cliente.
- **Expiración automática**: las entradas muestran "Evento Finalizado" un día después de la fecha del evento.

#### Historial de entradas
- **Lista completa** de todas las entradas vendidas.
- **Filtros** por estado (activa, usada, cancelada), por evento y por nombre/email.
- **Acciones rápidas**: reenviar email, enviar WhatsApp, imprimir, marcar usada, revertir, cancelar.
- **Detalles** de cada entrada: cliente, evento, precio, fecha de compra, quién vendió, estado de envío.

### 8. Reportes y analíticas

- **Rango de fechas** configurable para todos los reportes.
- **Métricas resumen**: ventas totales, total de pedidos, pedidos rechazados, cuentas abiertas/cerradas, consumo promedio por mesa.
- **Desglose diario** de ventas.
- **Rendimiento por mesero**: mesas atendidas, ventas generadas, pedidos realizados.
- **Top productos**: ranking por cantidad vendida y monto generado.
- **Ventas por categoría**.
- **Análisis por hora pico**: identifica las horas de mayor actividad.
- **Exportar a Excel** (.xlsx) con múltiples hojas: Resumen, Ventas Diarias, Meseros, Productos, Categorías, Horas.

### 9. Logs y auditoría

- **Registro automático** de más de 20 tipos de acciones: login, logout, apertura/cierre de cuentas, creación de pedidos, cambios en inventario, gestión de usuarios, eventos, entradas, etc.
- **Detalles en JSON**: cada log almacena contexto adicional (montos, IDs, cambios realizados).
- **Filtros** por usuario, mesa, tipo de acción y rango de fechas.
- **Trazabilidad completa**: quién hizo qué, cuándo y en qué mesa.

### 10. Gestión de usuarios

- **CRUD de usuarios** con nombre, username, contraseña y rol.
- **Contraseñas hasheadas** con bcryptjs.
- **Asignación de roles**: Admin, Mesero, Cajero.
- **Solo Admin** puede crear, editar o eliminar usuarios.

### 11. Notificaciones push

- **Web Push (VAPID)** para navegadores de escritorio e iOS.
- **Firebase Cloud Messaging (FCM)** para dispositivos Android.
- **Suscripción por usuario**: cada usuario puede activar/desactivar notificaciones.
- **Notificaciones de pedidos**: el mesero recibe una push cuando un cliente realiza un pedido en una mesa que él abrió.
- **Detección de plataforma**: el sistema detecta si es web o Android y usa el canal correspondiente.

### 12. PWA y mobile

- **Progressive Web App**: instalable desde el navegador en iOS, Android y escritorio.
- **Service Worker** para funcionamiento offline básico y manejo de push.
- **Manifest.json** configurado con iconos, colores y nombre de la app.
- **Safe area handling** para dispositivos con notch/isla dinámica (iOS).
- **Capacitor** para generar APK de Android nativo con soporte de push notifications.
- **Optimizaciones móviles**: prevención de zoom en inputs, touch manipulation, scrolling nativo.

### 13. Sistema de email

- **Configuración SMTP** flexible (Gmail, Outlook, servidor propio).
- **Plantillas HTML** con diseño oscuro y profesional.
- **Adjuntos**: QR codes como imágenes embebidas (CID) y logo del negocio.
- **Soporte multi-entrada**: un email con múltiples QR codes para compras de varias entradas.
- **Tracking**: se registra si el email fue enviado exitosamente.

---

## Variables de entorno

```env
# Base de datos
DATABASE_URL=postgresql://...

# NextAuth
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://tu-dominio.com

# PayPal
NEXT_PUBLIC_PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_API_BASE=https://api-m.paypal.com  # o https://api-m.sandbox.paypal.com para testing

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=...

# Vercel Blob (uploads)
BLOB_READ_WRITE_TOKEN=...

# Push Notifications (Web Push)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...

# Firebase (Android push)
NEXT_PUBLIC_FIREBASE_CONFIG={"apiKey":"...","authDomain":"...","projectId":"...","messagingSenderId":"...","appId":"..."}
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}
```

---

## Instalación y desarrollo

```bash
# Clonar el repositorio
git clone <repo-url>
cd tablecontrol

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus valores

# Generar cliente Prisma y sincronizar base de datos
npx prisma generate
npx prisma db push

# Seed de datos iniciales (usuario admin por defecto)
npm run db:seed

# Iniciar servidor de desarrollo
npm run dev
```

## Scripts disponibles

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Servidor de desarrollo (localhost) |
| `npm run dev:network` | Servidor accesible en red local |
| `npm run build` | Build de producción |
| `npm run start` | Iniciar en producción |
| `npm run db:push` | Sincronizar schema con base de datos |
| `npm run db:studio` | Abrir Prisma Studio (GUI de BD) |
| `npm run db:seed` | Seed de datos iniciales |
| `npm run db:migrate` | Ejecutar migraciones |
| `npm run cap:android` | Sincronizar y abrir proyecto Android |
| `npm run build:apk` | Generar APK de Android |

---

## Estructura del proyecto

```
app/
├── admin/           # Panel de administración (mesas, inventario, usuarios, reportes, logs, entradas)
├── cajero/          # Panel del cajero
├── mesero/          # Panel del mesero (dashboard, mesas activas, pedidos, escaneo QR)
├── clientes/        # Vista pública del cliente (pedidos desde mesa)
├── eventos/         # Páginas públicas de eventos y compra de entradas
├── entradas/        # Validación pública de entradas por token
├── login/           # Autenticación
├── api/             # API routes (PayPal, email, uploads, reportes, push, auth)
│   ├── paypal/      # Crear y capturar órdenes PayPal
│   ├── send-entry-email/  # Envío de entradas por email
│   ├── upload/      # Subida de imágenes
│   ├── reportes/    # Exportar reportes Excel
│   └── auth/        # NextAuth endpoints
components/          # Componentes reutilizables (AdminShell, Navbar, Footer, etc.)
lib/                 # Lógica de negocio (actions.ts), autenticación, utilidades
prisma/              # Schema de base de datos y seeds
public/              # Assets estáticos, manifest, service worker
```

---

## Licencia

Proyecto privado. Todos los derechos reservados.

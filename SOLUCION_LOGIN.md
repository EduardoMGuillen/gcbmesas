# Solución: Problema de Login - No Redirige al Panel

## 🔍 Problema

Después de introducir usuario y contraseña, el login no redirige al panel de administración o mesero.

## ✅ Soluciones Implementadas

### 1. Mejoras en el Flujo de Login

- **Simplificado el redirect**: Ahora usa `window.location.href = '/'` para un reload completo de la página, asegurando que la sesión esté disponible server-side.
- **Mejorado el callback de sesión**: Los callbacks de JWT y session ahora incluyen `username` y manejan correctamente la actualización de sesión.
- **Configuración de cookies mejorada**: Las cookies de sesión ahora están configuradas correctamente para producción y desarrollo.

### 2. Script de Verificación de Contraseña

Se agregó un script para verificar si la contraseña del admin está hasheada correctamente:

```bash
npm run db:verify-password
```

Este script:
- Verifica si la contraseña está hasheada (no en texto plano)
- Si no está hasheada, la hashea automáticamente
- Verifica que la contraseña "admin123" funcione correctamente

### 3. Script para Corregir Contraseña

Si necesitas resetear la contraseña del admin:

```bash
npm run db:fix-password
```

Esto actualizará la contraseña del usuario `admin` a `admin123` (hasheada).

## 🔧 Pasos para Resolver el Problema

### Paso 1: Verificar la Contraseña

Ejecuta el script de verificación:

```bash
npm run db:verify-password
```

Si la contraseña no está hasheada, el script la corregirá automáticamente.

### Paso 2: Verificar Variables de Entorno

Asegúrate de que estas variables estén configuradas en Vercel:

- `DATABASE_URL` - URL de conexión a PostgreSQL
- `NEXTAUTH_SECRET` - Clave secreta para NextAuth
- `NEXTAUTH_URL` - URL completa de tu aplicación (ej: `https://tu-app.vercel.app`)
- `NEXT_PUBLIC_APP_URL` - URL pública de tu aplicación

**Importante**: `NEXTAUTH_URL` debe ser la URL completa de tu aplicación en Vercel, no `http://localhost:3000`.

### Paso 3: Verificar la Conexión a la Base de Datos

Visita la página de diagnóstico:

```
https://tu-app.vercel.app/diagnostico
```

Debería mostrar:
- ✅ Conexión: Conectada
- ✅ Usuario Admin: Existe
- ✅ Total Usuarios: 1 o más

### Paso 4: Probar el Login

1. Visita: `https://tu-app.vercel.app/login`
2. Ingresa:
   - Usuario: `admin`
   - Contraseña: `admin123`
3. Deberías ser redirigido automáticamente al panel de administración.

## 🐛 Si Aún No Funciona

### Verificar Logs del Servidor

En Vercel, ve a **Deployments** → **Functions** → Revisa los logs del servidor para ver errores específicos.

### Verificar en la Consola del Navegador

Abre las herramientas de desarrollo (F12) y revisa:
- **Console**: Busca errores de JavaScript
- **Network**: Verifica que las peticiones a `/api/auth/callback/credentials` sean exitosas (status 200)

### Verificar Cookies

En las herramientas de desarrollo:
1. Ve a **Application** → **Cookies**
2. Busca la cookie `next-auth.session-token`
3. Debería estar presente después del login

### Resetear la Contraseña Manualmente

Si el problema persiste, puedes resetear la contraseña directamente en la base de datos:

1. Conéctate a tu base de datos PostgreSQL
2. Ejecuta:

```sql
-- Primero, hashea la contraseña 'admin123' usando bcrypt
-- Puedes usar este script de Node.js:
```

O ejecuta el script de Node.js:

```bash
npm run db:fix-password
```

## 📝 Credenciales por Defecto

Después de ejecutar el seed:

- **Usuario**: `admin`
- **Contraseña**: `admin123`
- **Rol**: `ADMIN`

## 🔒 Seguridad

**IMPORTANTE**: Después del primer login exitoso, cambia la contraseña del administrador desde el panel de administración.

## 📞 Soporte Adicional

Si el problema persiste después de seguir estos pasos:

1. Verifica los logs de Vercel
2. Revisa la configuración de variables de entorno
3. Asegúrate de que la base de datos esté accesible desde Vercel
4. Verifica que `NEXTAUTH_URL` coincida exactamente con la URL de tu aplicación


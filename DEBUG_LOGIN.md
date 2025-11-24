# Debug: Login No Redirige al Panel

## 🔍 Problema

El login se ejecuta correctamente pero no redirige al panel de administración o mesero.

## 🛠️ Soluciones Implementadas

### 1. Verificación de Sesión Antes de Redirect

Ahora el login:
- Espera 300ms para que la cookie de sesión se establezca
- Verifica que la sesión esté disponible llamando a `/api/debug-session`
- Solo redirige si la sesión está confirmada
- Usa `window.location.replace('/')` para evitar problemas con el historial

### 2. Logging Mejorado

Se agregó logging detallado en:
- `app/login/page.tsx` - Logs del proceso de login
- `app/page.tsx` - Logs de verificación de sesión
- `lib/auth.ts` - Logs de callbacks de JWT y session

### 3. Endpoint de Debug

Nuevo endpoint para verificar la sesión:
```
GET /api/debug-session
```

Respuesta:
```json
{
  "hasSession": true,
  "session": {
    "user": {
      "id": "...",
      "username": "admin",
      "role": "ADMIN"
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 🔧 Pasos para Diagnosticar

### Paso 1: Verificar en la Consola del Navegador

1. Abre las herramientas de desarrollo (F12)
2. Ve a la pestaña **Console**
3. Intenta hacer login
4. Busca estos mensajes:
   - `Attempting login for user: admin`
   - `Login result: { ok: true, error: null }`
   - `Login successful, waiting for session cookie...`
   - `Session check result: { hasSession: true, ... }`
   - `Session confirmed, redirecting...`

### Paso 2: Verificar Cookies

1. En las herramientas de desarrollo, ve a **Application** → **Cookies**
2. Busca la cookie `next-auth.session-token`
3. Debería estar presente después del login
4. Verifica que:
   - **Domain**: sea tu dominio de Vercel
   - **Path**: sea `/`
   - **HttpOnly**: esté marcado
   - **Secure**: esté marcado (en producción)

### Paso 3: Verificar la Sesión con el Endpoint de Debug

Después de hacer login, visita:
```
https://tu-app.vercel.app/api/debug-session
```

Debería mostrar:
```json
{
  "hasSession": true,
  "session": {
    "user": {
      "id": "...",
      "username": "admin",
      "role": "ADMIN"
    }
  }
}
```

Si `hasSession` es `false`, el problema es que la sesión no se está estableciendo.

### Paso 4: Verificar Variables de Entorno en Vercel

Asegúrate de que estas variables estén configuradas correctamente:

1. **NEXTAUTH_URL**
   - Debe ser la URL completa de tu aplicación
   - Ejemplo: `https://gcbmesas.vercel.app`
   - **NO** debe ser `http://localhost:3000`

2. **NEXTAUTH_SECRET**
   - Debe ser una cadena aleatoria
   - Puedes generarla con: `openssl rand -base64 32`

3. **DATABASE_URL**
   - Debe ser la URL de conexión a PostgreSQL
   - Debe incluir `?schema=public` al final

### Paso 5: Verificar Logs del Servidor en Vercel

1. Ve a tu proyecto en Vercel
2. Click en **Deployments**
3. Click en el último deployment
4. Ve a la pestaña **Functions**
5. Busca logs que contengan:
   - `Auth: Successful login for user: admin`
   - `JWT callback - User signed in:`
   - `Session callback - Session created:`
   - `Home page - Session check:`

## 🐛 Problemas Comunes y Soluciones

### Problema 1: La sesión no se establece

**Síntomas:**
- `hasSession: false` en `/api/debug-session`
- No hay cookie `next-auth.session-token`

**Soluciones:**
1. Verifica que `NEXTAUTH_URL` esté configurado correctamente
2. Verifica que `NEXTAUTH_SECRET` esté configurado
3. Verifica que la base de datos esté accesible
4. Revisa los logs del servidor para errores

### Problema 2: La sesión se establece pero no redirige

**Síntomas:**
- `hasSession: true` en `/api/debug-session`
- Hay cookie `next-auth.session-token`
- Pero no redirige después del login

**Soluciones:**
1. Verifica la consola del navegador para errores de JavaScript
2. Verifica que `window.location.replace('/')` se esté ejecutando
3. Intenta hacer un hard refresh (Ctrl+Shift+R o Cmd+Shift+R)
4. Limpia las cookies y vuelve a intentar

### Problema 3: Redirige pero vuelve al login

**Síntomas:**
- Redirige a `/` pero luego redirige de vuelta a `/login`

**Soluciones:**
1. Verifica que la sesión tenga el `role` correcto
2. Verifica los logs en `app/page.tsx` para ver qué está pasando
3. Verifica que el usuario tenga un rol válido (`ADMIN` o `MESERO`)

### Problema 4: Error "CredentialsSignin"

**Síntomas:**
- Error: "Usuario o contraseña incorrectos"

**Soluciones:**
1. Verifica que la contraseña esté hasheada:
   ```bash
   npm run db:verify-password
   ```
2. Si no está hasheada, corrígela:
   ```bash
   npm run db:fix-password
   ```
3. Verifica que el usuario exista en la base de datos

## 📝 Comandos Útiles

```bash
# Verificar contraseña del admin
npm run db:verify-password

# Corregir contraseña del admin
npm run db:fix-password

# Generar nuevo hash de contraseña
node scripts/get-hash.js
```

## 🔗 URLs de Debug

- **Verificar sesión**: `https://tu-app.vercel.app/api/debug-session`
- **Diagnóstico de BD**: `https://tu-app.vercel.app/diagnostico`
- **Login**: `https://tu-app.vercel.app/login`

## 📞 Si Nada Funciona

1. Revisa todos los logs (navegador y servidor)
2. Verifica todas las variables de entorno
3. Prueba en modo incógnito para descartar problemas de caché
4. Verifica que la base de datos esté accesible desde Vercel
5. Asegúrate de que `NEXTAUTH_URL` coincida exactamente con tu dominio


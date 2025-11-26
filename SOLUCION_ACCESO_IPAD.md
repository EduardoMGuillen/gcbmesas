# Solución: Acceso desde iPad en Red Local

## 🔴 Problema

No puedes acceder a las pantallas (cajero, admin, mesero) desde tu iPad cuando el servidor está corriendo en tu computadora.

## ⚠️ Nota Importante

**Si quieres acceder desde cualquier iPad en cualquier lugar (no solo red local),** lee:
- `ACCESO_DESDE_CUALQUIER_IPAD.md` - Para acceso desde Internet (Vercel o túneles)
- `GUIA_RAPIDA_IPAD.md` - Guía rápida de opciones

Esta guía es solo para **acceso en red local** (misma Wi-Fi).

## ✅ Solución: Configurar Acceso desde la Red Local

### Paso 1: Obtener tu IP Local

**Opción Rápida (Recomendada):**
```bash
npm run get-ip
```

Esto te mostrará tu IP local y la URL para acceder desde el iPad.

**Opción Manual (Windows):**
1. Abre PowerShell o CMD
2. Ejecuta: `ipconfig`
3. Busca la sección "Adaptador de Ethernet" o "Adaptador de LAN inalámbrica"
4. Busca "Dirección IPv4" - será algo como `192.168.1.100` o `10.0.0.5`
5. **Copia esta IP** - la necesitarás para acceder desde el iPad

**En Mac/Linux:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

### Paso 2: Iniciar el Servidor con Acceso de Red

En lugar de usar `npm run dev`, usa:

```bash
npm run dev:network
```

Esto iniciará el servidor escuchando en todas las interfaces de red, permitiendo acceso desde otros dispositivos.

### Paso 3: Verificar el Firewall de Windows

**IMPORTANTE:** Windows Firewall puede bloquear las conexiones. Necesitas permitir el puerto 3000:

1. Abre **Windows Defender Firewall** (busca "firewall" en el menú inicio)
2. Click en **Configuración avanzada**
3. Click en **Reglas de entrada** (Inbound Rules)
4. Click en **Nueva regla...**
5. Selecciona **Puerto** → **Siguiente**
6. Selecciona **TCP** y escribe `3000` en "Puertos locales específicos"
7. Selecciona **Permitir la conexión** → **Siguiente**
8. Marca todas las casillas (Dominio, Privada, Pública) → **Siguiente**
9. Dale un nombre como "Next.js Dev Server" → **Finalizar**

**Alternativa rápida (PowerShell como Administrador):**
```powershell
New-NetFirewallRule -DisplayName "Next.js Dev Server" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

### Paso 4: Acceder desde el iPad

1. Asegúrate de que tu iPad esté en la **misma red Wi-Fi** que tu computadora
2. En Safari del iPad, abre:
   ```
   http://TU_IP_LOCAL:3000
   ```
   Por ejemplo: `http://192.168.1.100:3000`

3. Deberías ver la página de login
4. Inicia sesión normalmente

### Paso 5: Configurar Variables de Entorno (Opcional pero Recomendado)

Si tienes problemas con las cookies o la autenticación, puedes crear un archivo `.env.local` con:

```env
NEXTAUTH_URL=http://TU_IP_LOCAL:3000
NEXT_PUBLIC_APP_URL=http://TU_IP_LOCAL:3000
```

**Ejemplo:**
```env
NEXTAUTH_URL=http://192.168.1.100:3000
NEXT_PUBLIC_APP_URL=http://192.168.1.100:3000
```

**Nota:** Reemplaza `TU_IP_LOCAL` con la IP que obtuviste en el Paso 1.

## 🐛 Solución de Problemas

### Problema 1: "No se puede conectar al servidor"

**Soluciones:**
1. Verifica que el servidor esté corriendo con `npm run dev:network`
2. Verifica que tu iPad esté en la misma red Wi-Fi
3. Verifica que el firewall de Windows permita el puerto 3000
4. Verifica que la IP sea correcta (puede cambiar si te desconectas y reconectas)

### Problema 2: "La página carga pero el login no funciona"

**Soluciones:**
1. Crea el archivo `.env.local` con las variables `NEXTAUTH_URL` y `NEXT_PUBLIC_APP_URL` usando tu IP local
2. Reinicia el servidor después de crear/modificar `.env.local`
3. Limpia el caché del navegador en el iPad

### Problema 3: "La IP cambia cada vez"

**Solución:** Configura una IP estática en tu router o usa el nombre de host de tu computadora si tu router soporta mDNS (Bonjour).

### Problema 4: "Funciona en la PC pero no en el iPad"

**Soluciones:**
1. Verifica que estés usando `npm run dev:network` y no `npm run dev`
2. Verifica el firewall de Windows
3. Verifica que ambos dispositivos estén en la misma red
4. Prueba acceder desde otro dispositivo (teléfono) para verificar que el problema sea específico del iPad

## 📱 Verificar que Funciona

1. En tu computadora, el servidor debería mostrar:
   ```
   ▲ Next.js 14.0.4
   - Local:        http://localhost:3000
   - Network:      http://192.168.1.100:3000
   ```

2. En tu iPad, abre Safari y ve a `http://TU_IP:3000`
3. Deberías ver la página de login
4. Inicia sesión y deberías poder acceder a todas las pantallas

## ⚠️ Notas Importantes

- **Solo funciona en desarrollo:** Esta configuración es solo para desarrollo local. En producción (Vercel), usa la URL de Vercel.
- **Seguridad:** No expongas el puerto 3000 a Internet. Solo úsalo en tu red local.
- **IP dinámica:** Si tu IP cambia, necesitarás actualizar la URL en el iPad y en `.env.local` si lo usas.

## 🔄 Comandos Rápidos

```bash
# Obtener tu IP local (más fácil)
npm run get-ip

# Iniciar servidor con acceso de red
npm run dev:network

# Ver tu IP local manualmente (Windows)
ipconfig

# Ver tu IP local manualmente (Mac/Linux)
ifconfig | grep "inet " | grep -v 127.0.0.1
```


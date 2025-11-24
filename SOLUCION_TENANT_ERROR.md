# Solución: Error "Tenant or user not found"

## 🔴 Error
```
FATAL: Tenant or user not found
```

## 🔍 Causa

Este error indica que:
- ✅ La conexión SÍ llega al servidor (no es problema de red)
- ❌ El usuario/tenant en la URL no es correcto

En Session Pooler de Supabase, el formato del usuario puede variar.

## ✅ Soluciones

### Solución 1: Verificar el Formato Correcto del Usuario

En Session Pooler, el usuario puede ser:
- `postgres.bixevluattcjedpvkruu` (con project ref)
- O solo `postgres` (depende de la configuración)

**Prueba esta URL (usuario simple):**
```
postgresql://postgres:Guillen01..@aws-0-us-east-1.pooler.supabase.com:6543/postgres?schema=public
```

**O esta (con project ref):**
```
postgresql://postgres.bixevluattcjedpvkruu:Guillen01..@aws-0-us-east-1.pooler.supabase.com:6543/postgres?schema=public
```

### Solución 2: Obtener la URL Exacta de Supabase

1. Ve a Supabase Dashboard
2. Settings → Database → Connection Pooling
3. Selecciona **Session mode**
4. Copia la URL EXACTA que muestra
5. Reemplaza `[YOUR-PASSWORD]` con `Guillen01..`
6. Agrega `?schema=public` al final
7. Pégala en Vercel

### Solución 3: Usar Transaction Pooler

Si Session Pooler no funciona, prueba Transaction Pooler:
1. En Connection Pooling, selecciona **Transaction mode**
2. Copia la URL
3. Configúrala en Vercel

### Solución 4: Verificar la Contraseña

Asegúrate de que la contraseña sea exactamente `Guillen01..` (con los dos puntos).

Si resetaste la contraseña, usa la nueva.

## 🔧 Configurar en Vercel

1. Ve a Vercel → Settings → Environment Variables
2. Edita `POSTGRES_PRISMA_URL`
3. Pega la URL correcta
4. Guarda
5. **Redeploy**

## ✅ Verificar

Después del redeploy:
1. Visita `/diagnostico`
2. Debería mostrar: "Base de datos conectada"


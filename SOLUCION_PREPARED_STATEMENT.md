# Solución: Error "prepared statement already exists"

## 🔴 Error

```
ConnectorError(ConnectorError { user_facing_error: None, kind: QueryError(PostgresError { 
  code: "42P05", 
  message: "prepared statement \"s0\" already exists", 
  severity: "ERROR"
})
```

## ⚠️ Problema

Este error ocurre cuando se usa **Session Pooler** con Prisma. El Session Pooler mantiene conexiones persistentes y Prisma intenta crear prepared statements con nombres que ya existen, causando conflictos.

## ✅ Solución 1: Usar Transaction Pooler (RECOMENDADO)

**Transaction Pooler** es mejor para Prisma porque:
- ✅ No mantiene prepared statements entre transacciones
- ✅ Mejor compatibilidad con Prisma
- ✅ Mismo puerto 6543
- ✅ Funciona perfectamente con Vercel

### Pasos:

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Tu proyecto → **Settings** → **Database**
3. Busca **Connection Pooling**
4. Cambia el dropdown de **"Session mode"** a **"Transaction mode"**
5. Copia la nueva Connection String
6. Actualiza en Vercel → Settings → Environment Variables
7. Redeploy

## ✅ Solución 2: Agregar parámetro pgbouncer=true

Si prefieres seguir usando Session Pooler, el script ahora agrega automáticamente `pgbouncer=true` a la URL, lo que ayuda a evitar este problema.

Tu URL debería verse así:
```
postgresql://postgres.bixevluattcjedpvkruu:casablanca2025astro@aws-0-us-west-2.pooler.supabase.com:6543/postgres?schema=public&pgbouncer=true&connect_timeout=10&pool_timeout=10
```

## 🎯 Recomendación

**Usa Transaction Pooler** para Prisma. Es la mejor opción porque:
- Evita completamente el problema de prepared statements
- Está diseñado para aplicaciones que usan ORMs como Prisma
- Mejor rendimiento con Prisma

## 📝 Nota

El script `setup-env.js` ahora agrega automáticamente `pgbouncer=true` si no está presente, lo que ayuda a mitigar el problema, pero **Transaction Pooler es la mejor solución**.


# Configurar POSTGRES_PRISMA_URL Manualmente

## 🔧 Tu Información de Supabase

- **Project Ref:** bixevluattcjedpvkruu
- **Contraseña:** Guillen01..

## 📋 Opción 1: Usar Connection Pooling (RECOMENDADO)

### Obtener la URL de Connection Pooling:

1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Tu proyecto → **Settings** → **Database**
3. Busca **Connection Pooling**
4. Selecciona **Session mode** o **Transaction mode**
5. Copia la Connection String
6. Reemplaza `[YOUR-PASSWORD]` con `Guillen01..`
7. Agrega `?schema=public` al final

**Formato típico:**
```
postgresql://postgres.bixevluattcjedpvkruu:Guillen01..@aws-0-us-east-1.pooler.supabase.com:6543/postgres?schema=public
```

**Nota:** El formato exacto depende de tu región. Puede ser:
- `aws-0-us-east-1.pooler.supabase.com`
- `aws-0-eu-west-1.pooler.supabase.com`
- O similar según tu región

## 📋 Opción 2: Usar Conexión Directa

Si Connection Pooling no está disponible, usa la conexión directa:

```
postgresql://postgres:Guillen01..@db.bixevluattcjedpvkruu.supabase.co:5432/postgres?schema=public
```

## 🔧 Configurar en Vercel

1. Ve a [Vercel Dashboard](https://vercel.com/dashboard)
2. Tu proyecto → **Settings** → **Environment Variables**
3. Busca `POSTGRES_PRISMA_URL`
4. Si está vacía, edítala
5. Pega la URL completa (de Opción 1 o 2)
6. **IMPORTANTE:** Marca la casilla **Production**
7. Guarda

## ✅ También Crear DATABASE_URL (Por Si Acaso)

Para asegurar compatibilidad, también crea `DATABASE_URL` con el mismo valor:

1. En Environment Variables, crea nueva variable
2. Nombre: `DATABASE_URL`
3. Valor: Mismo que `POSTGRES_PRISMA_URL`
4. Marca **Production**
5. Guarda

## 🔄 Redeploy

Después de configurar:

1. Ve a **Deployments**
2. Click en los tres puntos (⋯) → **Redeploy**
3. Espera a que termine

## ✅ Verificar

1. Visita: `https://tu-url.vercel.app/diagnostico`
2. Debería mostrar: "Base de datos conectada"


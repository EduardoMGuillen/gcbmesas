# Verificar Integración Supabase + Vercel

## ✅ Pasos para Verificar

### 1. Verificar Variables de Entorno en Vercel

1. Ve a [Vercel Dashboard](https://vercel.com/dashboard)
2. Tu proyecto `gcbmesas` → **Settings** → **Environment Variables**
3. Busca estas variables (deberían haberse creado automáticamente):
   - `DATABASE_URL` o `POSTGRES_PRISMA_URL` o `POSTGRES_URL`
   - `POSTGRES_HOST`
   - `POSTGRES_DATABASE`
   - `POSTGRES_USER`
   - `POSTGRES_PASSWORD`

**IMPORTANTE:** 
- Si ves `POSTGRES_PRISMA_URL` o `POSTGRES_URL`, esa es la que debes usar
- Si solo ves variables individuales, necesitas construir la `DATABASE_URL` manualmente

### 2. Verificar que DATABASE_URL esté Configurada

Si Vercel creó `POSTGRES_PRISMA_URL` o `POSTGRES_URL`:
- ✅ Esa es la URL correcta (probablemente usa Connection Pooling)
- ✅ No necesitas hacer nada más

Si NO existe `DATABASE_URL` pero sí las variables individuales:
- Crea `DATABASE_URL` manualmente con este formato:
  ```
  postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:5432/${POSTGRES_DATABASE}?schema=public
  ```

### 3. Verificar el Formato de la URL

La URL de Supabase integrado generalmente usa Connection Pooling y se ve así:
```
postgresql://postgres.xxxxx:password@aws-0-region.pooler.supabase.com:6543/postgres?schema=public
```

O puede ser la URL directa:
```
postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres?schema=public
```

### 4. Redeploy Automático

Cuando conectas la integración, Vercel normalmente hace un redeploy automático. Si no:
1. Ve a **Deployments**
2. Verifica que haya un nuevo deployment
3. Si no, haz **Redeploy** manualmente

### 5. Verificar que Funciona

1. Espera a que termine el deploy
2. Visita: `https://tu-url.vercel.app/diagnostico`
3. Debería mostrar:
   - ✅ Conexión: Conectada
   - ✅ Usuario Admin: Existe (después del seed automático)

## 🔧 Si Necesitas Ajustar

### Si la variable se llama diferente:

Si Vercel creó `POSTGRES_PRISMA_URL` en lugar de `DATABASE_URL`:

1. Opción A: Renombrar la variable
   - Edita `POSTGRES_PRISMA_URL`
   - Cambia el nombre a `DATABASE_URL`
   - Guarda

2. Opción B: Agregar alias
   - Crea nueva variable `DATABASE_URL`
   - Usa el mismo valor que `POSTGRES_PRISMA_URL`
   - Guarda

### Si falta ?schema=public:

Si la URL no tiene `?schema=public` al final:
1. Edita la variable `DATABASE_URL`
2. Agrega `?schema=public` al final
3. Guarda y redeploy

## ✅ Checklist

- [ ] Integración Supabase conectada en Vercel
- [ ] Variables de entorno creadas automáticamente
- [ ] `DATABASE_URL` existe (o `POSTGRES_PRISMA_URL`)
- [ ] URL tiene `?schema=public` al final
- [ ] Redeploy realizado (automático o manual)
- [ ] Verificado en `/diagnostico`

## 🎯 Próximos Pasos

Una vez que todo esté configurado:
1. El build automático creará las tablas
2. El seed automático creará el usuario admin
3. Podrás iniciar sesión con:
   - Usuario: `admin`
   - Contraseña: `admin123`


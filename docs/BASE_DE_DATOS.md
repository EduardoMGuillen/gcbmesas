# Base de datos: cómo cambiar el esquema sin perder datos

## Reglas

1. **El deploy (Vercel) nunca toca la base de datos.** `npm run build` solo compila. No hay `db push` ni seed automático.
2. **Cada cambio de esquema es una migración versionada** en `prisma/migrations/`, revisable en git.
3. **El build falla si una migración puede borrar datos** (`DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, `DELETE`, cambio de tipo de columna). Lo revisa `scripts/migration-guard.js`.
4. **Las migraciones se aplican a mano** con `npm run db:deploy`, que solo ejecuta migraciones nuevas: nunca "sincroniza" ni borra lo que no esté en un archivo.

## Flujo para un cambio

```bash
# 1. Edita prisma/schema.prisma (sin commit todavía)
# 2. Genera la migración (no se conecta a la base)
npm run db:new-migration -- agregar_telefono_evento
# 3. Lee prisma/migrations/<fecha>_agregar_telefono_evento/migration.sql
# 4. Aplícala en la base ANTES de subir el código que la usa
npm run db:deploy
# 5. Commit (schema + migración + código) y push
```

Preferir siempre cambios aditivos: columnas nuevas opcionales (`String?`) o con `@default`.

## Si de verdad hay que borrar algo

1. Respalda (Supabase → Database → Backups, o exporta la tabla a CSV).
2. Genera la migración; el script te avisa que borra datos.
3. Agrega al inicio de `migration.sql`:
   `-- data-loss-approved: respaldo del 2026-11-02, se elimina tabla X`
4. `npm run db:deploy`, commit y push.

## Puesta en marcha (una sola vez)

La base de producción ya existía antes de las migraciones. `prisma/migrations/0_init` describe ese
esquema completo; hay que marcarla como **ya aplicada** (no ejecuta nada sobre las tablas):

```bash
# a) Comprobar que la base coincide con el esquema (solo lectura). Debe decir que no hay diferencias:
npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script

# b) Marcar 0_init como aplicada (crea la tabla _prisma_migrations, no toca tus datos):
npx prisma migrate resolve --applied 0_init

# c) Verificar:
npm run db:status
```

Si el paso (a) muestra diferencias, **no sigas**: compártelas para revisarlas primero.

## Seed

`npm run db:seed` crea el usuario `admin` (contraseña por defecto) solo si no existe y las cajas
registradoras. Es para una base nueva; ya no corre en cada deploy.

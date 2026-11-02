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
# 4. Genera el SQL para Supabase y pégalo en SQL Editor → Run
npm run -s db:sql > /tmp/migracion.sql
# 5. Verifica (debe decir "Database schema is up to date!")
npm run db:status
# 6. Commit (schema + migración + código) y push
```

El usuario de la app (`gcb_local`) **no tiene permisos para cambiar el esquema** (a propósito), por eso
las migraciones se aplican desde el SQL Editor con el usuario dueño. El SQL de `db:sql` es
idempotente (se puede correr varias veces), va en una sola transacción y registra cada migración
en `_prisma_migrations` para que `db:status` sepa qué está aplicado.

`npm run db:deploy` hace lo mismo con `prisma migrate deploy`, pero solo funciona con una conexión
que tenga permisos de dueño.

Preferir siempre cambios aditivos: columnas nuevas opcionales (`String?`) o con `@default`.

## Si de verdad hay que borrar algo

1. Respalda (Supabase → Database → Backups, o exporta la tabla a CSV).
2. Genera la migración; el script te avisa que borra datos.
3. Agrega al inicio de `migration.sql`:
   `-- data-loss-approved: respaldo del 2026-11-02, se elimina tabla X`
4. `npm run db:deploy`, commit y push.

## Puesta en marcha (una sola vez)

La base de producción ya existía antes de las migraciones. `prisma/migrations/0_init` describe ese
esquema; el SQL de `db:sql` la **registra como aplicada sin ejecutarla**, crea `_prisma_migrations`
y aplica las migraciones posteriores que falten.

Tablas `site_state`, `supremo_site_state` y `user_id_map`: son de **otro proyecto** que comparte la
base. No están en `schema.prisma` y ninguna migración las toca. No las agregues ni las borres.

## Seed

`npm run db:seed` crea el usuario `admin` (contraseña por defecto) solo si no existe y las cajas
registradoras. Es para una base nueva; ya no corre en cada deploy.

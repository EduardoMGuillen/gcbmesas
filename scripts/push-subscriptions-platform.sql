-- Migración: soporte FCM (Android) en push_subscriptions
-- Ejecutar si ya tienes datos en push_subscriptions y usas db:migrate.
-- Si usas db:push, Prisma aplica los cambios automáticamente.

ALTER TABLE push_subscriptions
  ADD COLUMN IF NOT EXISTS platform TEXT NOT NULL DEFAULT 'web';

ALTER TABLE push_subscriptions
  ALTER COLUMN p256dh DROP NOT NULL,
  ALTER COLUMN auth DROP NOT NULL;

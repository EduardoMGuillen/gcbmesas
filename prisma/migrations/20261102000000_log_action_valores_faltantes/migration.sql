-- Valores de LogAction que existen en el esquema pero nunca llegaron a la base
-- (el antiguo `db push` del build fallaba en silencio). Solo agrega valores; no toca datos.
ALTER TYPE "LogAction" ADD VALUE IF NOT EXISTS 'TABLE_DELETED';
ALTER TYPE "LogAction" ADD VALUE IF NOT EXISTS 'USER_DELETED';
ALTER TYPE "LogAction" ADD VALUE IF NOT EXISTS 'ATTENDANCE_MARK';

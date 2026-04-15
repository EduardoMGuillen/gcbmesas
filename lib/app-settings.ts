import { prisma } from './prisma'

/** Valor reservado en UserPrepCategory para productos sin categoría */
export const UNCATEGORIZED_PREP_CATEGORY = '__NONE__'

export async function ensureAppSettingsRow() {
  await prisma.appSettings.upsert({
    where: { id: 1 },
    create: { id: 1, clientSelfOrderingEnabled: true },
    update: {},
  })
}

/** Lectura tolerante a despliegues sin migración aún: default habilitado */
export async function getClientSelfOrderingEnabled(): Promise<boolean> {
  try {
    const row = await prisma.appSettings.findUnique({ where: { id: 1 } })
    if (!row) {
      await ensureAppSettingsRow()
      const again = await prisma.appSettings.findUnique({ where: { id: 1 } })
      return again?.clientSelfOrderingEnabled ?? true
    }
    return row.clientSelfOrderingEnabled
  } catch {
    return true
  }
}

export async function getAppSettingsForAdmin() {
  await ensureAppSettingsRow()
  return prisma.appSettings.findUniqueOrThrow({ where: { id: 1 } })
}

/** Lectura para impresión / páginas internas; null si la tabla aún no existe */
export async function getAppSettingsSafe() {
  try {
    await ensureAppSettingsRow()
    return await prisma.appSettings.findUnique({ where: { id: 1 } })
  } catch {
    return null
  }
}

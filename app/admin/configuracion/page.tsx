import { getAppSettingsSafe, ensureAppSettingsRow } from '@/lib/app-settings'
import { ConfiguracionClient } from './ConfiguracionClient'

export const dynamic = 'force-dynamic'

export default async function ConfiguracionPage() {
  let row = await getAppSettingsSafe()
  if (!row) {
    try {
      await ensureAppSettingsRow()
      row = await getAppSettingsSafe()
    } catch {
      /* tabla aún no existe */
    }
  }

  if (!row) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Configuración</h1>
        <p className="text-amber-200/90 bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3 max-w-2xl">
          Aún no existe la tabla de configuración en la base de datos. Aplica la migración Prisma en el servidor
          (por ejemplo <code className="text-primary-300">npx prisma migrate deploy</code>) y recarga esta página.
        </p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-2">Configuración</h1>
      <p className="text-dark-400 mb-8">Opciones generales del sistema.</p>
      <ConfiguracionClient initial={row as any} />
    </div>
  )
}

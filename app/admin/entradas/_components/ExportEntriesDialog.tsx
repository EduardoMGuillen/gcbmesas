'use client'

import { useEffect, useState } from 'react'
import { getEventExportAdminCreators } from '@/lib/actions'
import { StaffButton } from '@/components/staff/ui'

type AdminCreator = Awaited<ReturnType<typeof getEventExportAdminCreators>>[number]

async function downloadExcel(eventId: string, excludeIds: string[]) {
  const qs = new URLSearchParams({ eventId })
  if (excludeIds.length) qs.set('exclude', excludeIds.join(','))
  const res = await fetch(`/api/entradas/historial?${qs.toString()}`)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.error || 'No se pudo descargar')
  }
  const blob = await res.blob()
  const match = res.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = match?.[1] || 'Entradas.xlsx'
  a.click()
  URL.revokeObjectURL(url)
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
        checked ? 'bg-primary-600' : 'bg-staff-border'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

/** Diálogo previo a exportar el Excel de un evento: permite excluir las entradas generadas por admins. */
export function ExportEntriesDialog({
  event,
  onClose,
}: {
  event: { id: string; name: string }
  onClose: () => void
}) {
  const [admins, setAdmins] = useState<AdminCreator[] | null>(null)
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    let cancelled = false
    getEventExportAdminCreators(event.id)
      .then((rows) => !cancelled && setAdmins(rows))
      .catch((e) => !cancelled && (setError(e instanceof Error ? e.message : 'No se pudo cargar'), setAdmins([])))
    return () => {
      cancelled = true
    }
  }, [event.id])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const list = admins ?? []
  const allExcluded = list.length > 0 && list.every((a) => excluded.has(a.id))
  const excludedEntries = list.filter((a) => excluded.has(a.id)).reduce((n, a) => n + a.entries, 0)

  const toggleOne = (id: string, value: boolean) =>
    setExcluded((prev) => {
      const next = new Set(prev)
      if (value) next.add(id)
      else next.delete(id)
      return next
    })

  const toggleAll = (value: boolean) => setExcluded(value ? new Set(list.map((a) => a.id)) : new Set())

  const handleDownload = async () => {
    setDownloading(true)
    setError('')
    try {
      await downloadExcel(event.id, Array.from(excluded))
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo descargar')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-dialog-title"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-staff-surface border border-staff-border rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-3">
          <p className="text-xs font-medium uppercase tracking-wide text-staff-muted">Exportar Excel</p>
          <h2 id="export-dialog-title" className="text-lg font-bold text-staff-fg truncate" title={event.name}>
            {event.name}
          </h2>
        </div>

        <div className="px-5 pb-2 overflow-y-auto">
          <div className="flex items-center justify-between gap-3 rounded-xl bg-staff-raised border border-staff-border px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-staff-fg">Excluir entradas de admins</p>
              <p className="text-xs text-staff-muted">Las ventas en línea y de taquilla se mantienen.</p>
            </div>
            <Switch
              checked={allExcluded}
              onChange={toggleAll}
              label="Excluir entradas de todos los admins"
            />
          </div>

          <div className="mt-3 space-y-1">
            {admins === null ? (
              <p className="py-6 text-center text-sm text-staff-muted">Cargando admins…</p>
            ) : list.length === 0 ? (
              <p className="py-6 text-center text-sm text-staff-muted">
                Ningún admin generó entradas en este evento.
              </p>
            ) : (
              list.map((a) => (
                <label
                  key={a.id}
                  className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 hover:bg-staff-hover cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-500/15 text-primary-500 text-sm font-bold">
                      {a.name.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-staff-fg truncate">{a.name}</p>
                      <p className="text-xs text-staff-muted">
                        {a.entries} entrada{a.entries !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={excluded.has(a.id)}
                    onChange={(v) => toggleOne(a.id, v)}
                    label={`Excluir entradas de ${a.name}`}
                  />
                </label>
              ))
            )}
          </div>

          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
        </div>

        <div className="px-5 py-4 border-t border-staff-border flex items-center justify-between gap-3">
          <p className="text-xs text-staff-muted">
            {excludedEntries > 0 ? `Se omitirán ${excludedEntries} entrada${excludedEntries !== 1 ? 's' : ''}` : 'Se exportan todas'}
          </p>
          <div className="flex gap-2">
            <StaffButton variant="ghost" onClick={onClose} disabled={downloading}>
              Cancelar
            </StaffButton>
            <StaffButton onClick={() => void handleDownload()} disabled={downloading || admins === null}>
              {downloading ? 'Generando…' : 'Descargar'}
            </StaffButton>
          </div>
        </div>
      </div>
    </div>
  )
}

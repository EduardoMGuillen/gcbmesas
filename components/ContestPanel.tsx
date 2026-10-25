'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteHalloweenContestant } from '@/lib/contest-actions'
import { contestRegistrationCode } from '@/lib/contest-code'
import { formatDate } from '@/lib/utils'
import { EmptyState, PageHeader, Panel, StaffButton, StatCard } from '@/components/staff/ui'

type Contestant = {
  id: string
  fullName: string
  nationalId: string
  phone: string
  email: string
  instagramUrl: string
  createdAt: Date | string
}

/** https://www.instagram.com/[usuario/]p|reel|tv/<code> → URL de embed público del post */
function instagramEmbedUrl(url: string) {
  const m = url.match(/instagram\.com\/(?:[A-Za-z0-9._]+\/)?(p|reels?|tv)\/([A-Za-z0-9_-]+)/i)
  if (!m) return null
  const kind = m[1].toLowerCase() === 'reels' ? 'reel' : m[1].toLowerCase()
  return `https://www.instagram.com/${kind}/${m[2]}/embed/`
}

function whatsappUrl(phone: string) {
  const digits = phone.replace(/\D/g, '')
  return `https://wa.me/${digits.length === 8 ? `504${digits}` : digits}`
}

export function ContestPanel({ contestants }: { contestants: Contestant[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [query, setQuery] = useState('')
  const [showPhotos, setShowPhotos] = useState(true)
  const [error, setError] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return contestants
    return contestants.filter(c =>
      [c.fullName, c.nationalId, c.phone, c.email, c.instagramUrl, contestRegistrationCode(c.id)].some(v => v.toLowerCase().includes(q))
    )
  }, [contestants, query])

  const today = new Date().toDateString()
  const registeredToday = contestants.filter(c => new Date(c.createdAt).toDateString() === today).length

  const remove = (c: Contestant) => {
    if (!confirm(`¿Eliminar la inscripción de ${c.fullName}? Esta acción no se puede deshacer.`)) return
    setError('')
    start(async () => {
      try {
        await deleteHalloweenContestant(c.id)
        router.refresh()
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'No se pudo eliminar')
      }
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Concurso de Disfraces · Halloween 2026"
        description="Participantes inscritos desde la página principal con #CBHalloween2026."
        actions={
          <a href="/api/concursos/halloween/excel">
            <StaffButton variant="secondary" type="button">Descargar Excel</StaffButton>
          </a>
        }
      />

      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Participantes" value={contestants.length} accent />
        <StatCard label="Inscritos hoy" value={registeredToday} />
      </div>

      <Panel>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar por nombre, ID, teléfono, correo o número CB-…"
            className="flex-1 min-w-0 px-4 py-2 rounded-xl bg-staff-raised border border-staff-border text-staff-fg placeholder:text-staff-muted text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <label className="flex items-center gap-2 text-sm text-staff-muted select-none cursor-pointer">
            <input type="checkbox" checked={showPhotos} onChange={e => setShowPhotos(e.target.checked)} className="accent-primary-500" />
            Mostrar fotos
          </label>
        </div>
        {error && <p className="text-sm text-red-500 mt-3">{error}</p>}
      </Panel>

      {filtered.length === 0 ? (
        <Panel>
          <EmptyState
            title={contestants.length === 0 ? 'Aún no hay participantes' : 'Sin resultados'}
            description={contestants.length === 0 ? 'Las inscripciones de la página principal aparecerán aquí.' : 'Prueba con otro nombre, ID o teléfono.'}
          />
        </Panel>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map(c => {
            const embed = instagramEmbedUrl(c.instagramUrl)
            return (
              <Panel key={c.id} padding={false} className="overflow-hidden flex flex-col">
                {showPhotos && embed && (
                  <div className="bg-white border-b border-staff-border">
                    <iframe
                      src={embed}
                      title={`Post de Instagram de ${c.fullName}`}
                      loading="lazy"
                      className="w-full h-[460px] block"
                      scrolling="no"
                    />
                  </div>
                )}
                <div className="p-4 space-y-3 flex-1 flex flex-col">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-staff-fg leading-tight">{c.fullName}</p>
                      <span className="shrink-0 font-mono text-xs px-2 py-0.5 rounded-md border border-staff-border text-staff-muted">{contestRegistrationCode(c.id)}</span>
                    </div>
                    <p className="text-xs text-staff-muted mt-0.5">{formatDate(c.createdAt)}</p>
                  </div>
                  <dl className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 text-sm">
                    <dt className="text-staff-muted">ID</dt>
                    <dd className="text-staff-fg font-mono break-all">{c.nationalId}</dd>
                    <dt className="text-staff-muted">Teléfono</dt>
                    <dd>
                      <a href={whatsappUrl(c.phone)} target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:underline">
                        {c.phone}
                      </a>
                    </dd>
                    <dt className="text-staff-muted">Correo</dt>
                    <dd className="break-all">
                      <a href={`mailto:${c.email}`} className="text-primary-500 hover:underline">{c.email}</a>
                    </dd>
                  </dl>
                  <div className="flex gap-2 pt-1 mt-auto">
                    <a
                      href={c.instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 inline-flex items-center justify-center px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-pink-500 to-orange-400 hover:opacity-90"
                    >
                      Ver en Instagram
                    </a>
                    <StaffButton variant="ghost" type="button" disabled={pending} onClick={() => remove(c)} title="Eliminar inscripción">
                      Eliminar
                    </StaffButton>
                  </div>
                </div>
              </Panel>
            )
          })}
        </div>
      )}

      <p className="text-xs text-staff-muted">
        Las fotos se cargan directamente desde Instagram. Si un post es privado o fue borrado, no se mostrará la vista previa.
      </p>
    </div>
  )
}

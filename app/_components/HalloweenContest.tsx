'use client'

import { useState } from 'react'

const HASHTAG = '#CBHalloween2026'

type FormState = {
  fullName: string
  nationalId: string
  phone: string
  email: string
  instagramUrl: string
}

const EMPTY: FormState = { fullName: '', nationalId: '', phone: '', email: '', instagramUrl: '' }

const FIELDS: { name: keyof FormState; label: string; type: string; placeholder: string; autoComplete: string; inputMode?: 'tel' | 'email' | 'url' | 'numeric' }[] = [
  { name: 'fullName',     label: 'Nombre completo',          type: 'text',  placeholder: 'Jill Valentine',                     autoComplete: 'name' },
  { name: 'nationalId',   label: 'Número de identidad (ID)', type: 'text',  placeholder: '0501-1995-01234',                    autoComplete: 'off', inputMode: 'numeric' },
  { name: 'phone',        label: 'Teléfono',                 type: 'tel',   placeholder: '9999-9999',                          autoComplete: 'tel', inputMode: 'tel' },
  { name: 'email',        label: 'Correo electrónico',       type: 'email', placeholder: 'tu@correo.com',                      autoComplete: 'email', inputMode: 'email' },
  { name: 'instagramUrl', label: 'URL de tu post en Instagram', type: 'url', placeholder: 'https://www.instagram.com/p/…', autoComplete: 'off', inputMode: 'url' },
]

export default function HalloweenContest() {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [status, setStatus] = useState<'idle' | 'sending' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [posterOpen, setPosterOpen] = useState(false)

  const copyHashtag = async () => {
    try {
      await navigator.clipboard.writeText(HASHTAG)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {}
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setStatus('sending')
    try {
      const res = await fetch('/api/public/halloween-registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || 'No pudimos guardar tu registro. Intenta de nuevo.')
        setStatus('idle')
        return
      }
      setStatus('done')
      setForm(EMPTY)
    } catch {
      setError('Sin conexión. Revisa tu internet e intenta de nuevo.')
      setStatus('idle')
    }
  }

  return (
    <section id="halloween" className="hw-section">
      <style>{`
        .hw-section {
          position: relative;
          padding: 5rem 1.25rem 5.5rem;
          background:
            radial-gradient(ellipse 80% 60% at 50% 0%, rgba(160,10,10,0.35), transparent 70%),
            linear-gradient(180deg, rgba(10,0,5,0) 0%, rgba(14,2,4,0.92) 12%, rgba(14,2,4,0.92) 88%, rgba(10,0,5,0) 100%);
          overflow: hidden;
        }
        .hw-inner { max-width: 1150px; margin: 0 auto; position: relative; z-index: 1; }
        .hw-kicker {
          font-family: 'Oswald', sans-serif; letter-spacing: 0.35em; text-transform: uppercase;
          color: #e8c58a; font-size: 0.85rem; text-align: center; margin-bottom: 0.75rem;
        }
        @media (max-width: 520px) { .hw-kicker { letter-spacing: 0.18em; font-size: 0.75rem; } }
        .hw-title {
          font-family: 'Creepster', 'Oswald', cursive; font-weight: 400;
          font-size: clamp(2.6rem, 8vw, 5rem); line-height: 1; text-align: center;
          color: #d3121a; letter-spacing: 0.04em;
          text-shadow: 0 0 18px rgba(211,18,26,0.55), 0 4px 0 #3a0003;
          margin: 0 0 0.75rem;
        }
        .hw-sub {
          text-align: center; color: rgba(255,255,255,0.75); font-size: clamp(1rem, 2.4vw, 1.15rem);
          max-width: 640px; margin: 0 auto 2.75rem; line-height: 1.6;
        }
        .hw-sub strong { color: #fff; }
        .hw-grid { display: grid; grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr); gap: 2.5rem; align-items: start; }
        @media (max-width: 860px) { .hw-grid { grid-template-columns: 1fr; } }

        .hw-poster {
          display: block; width: 100%; padding: 0; border: 1px solid rgba(211,18,26,0.45);
          border-radius: 18px; overflow: hidden; cursor: zoom-in; background: #000;
          box-shadow: 0 0 0 1px rgba(0,0,0,0.6), 0 25px 60px rgba(160,10,10,0.35);
          transition: transform 0.3s, box-shadow 0.3s;
        }
        .hw-poster:hover { transform: translateY(-4px) rotate(-0.4deg); box-shadow: 0 30px 70px rgba(211,18,26,0.45); }
        .hw-poster img { display: block; width: 100%; height: auto; }
        .hw-poster-hint { text-align: center; color: rgba(255,255,255,0.4); font-size: 0.8rem; margin-top: 0.6rem; }

        .hw-steps { list-style: none; padding: 0; margin: 0 0 1.75rem; display: grid; gap: 0.85rem; }
        .hw-step { display: flex; gap: 0.9rem; align-items: flex-start; color: rgba(255,255,255,0.8); line-height: 1.5; }
        .hw-step-n {
          flex: none; width: 30px; height: 30px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Oswald', sans-serif; font-weight: 700; color: #fff;
          background: radial-gradient(circle at 35% 30%, #ff3b3b, #8a0006);
          box-shadow: 0 0 12px rgba(211,18,26,0.6);
        }
        .hw-hashtag {
          display: inline-flex; align-items: center; gap: 0.4rem; margin: 0 0.15rem;
          padding: 0.1rem 0.6rem; border-radius: 999px; border: 1px dashed #e8c58a;
          background: rgba(232,197,138,0.08); color: #e8c58a; font-weight: 700;
          font-family: inherit; font-size: 0.95rem; cursor: pointer;
        }
        .hw-hashtag:hover { background: rgba(232,197,138,0.18); }

        .hw-card {
          background: linear-gradient(180deg, rgba(30,4,6,0.92), rgba(12,2,3,0.95));
          border: 1px solid rgba(211,18,26,0.35); border-radius: 20px;
          padding: clamp(1.4rem, 4vw, 2.2rem); position: relative;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 20px 50px rgba(0,0,0,0.5);
        }
        .hw-card::before {
          content: ''; position: absolute; left: 24px; right: 24px; top: -1px; height: 3px; border-radius: 3px;
          background: linear-gradient(90deg, transparent, #d3121a, transparent);
        }
        .hw-card h3 { font-family: 'Oswald', sans-serif; font-size: 1.5rem; letter-spacing: 0.06em; text-transform: uppercase; margin: 0 0 1.25rem; color: #fff; }
        .hw-form { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem 1rem; }
        .hw-field { display: flex; flex-direction: column; gap: 0.4rem; }
        .hw-field.full { grid-column: 1 / -1; }
        @media (max-width: 520px) { .hw-form { grid-template-columns: 1fr; } }
        .hw-field label { font-size: 0.82rem; font-weight: 600; color: rgba(255,255,255,0.7); letter-spacing: 0.02em; }
        .hw-field input {
          width: 100%; padding: 0.8rem 0.95rem; border-radius: 12px;
          background: rgba(0,0,0,0.45); border: 1px solid rgba(255,255,255,0.12);
          color: #fff; font-family: 'Exo 2', sans-serif; font-size: 1rem; outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .hw-field input::placeholder { color: rgba(255,255,255,0.28); }
        .hw-field input:focus { border-color: #d3121a; box-shadow: 0 0 0 3px rgba(211,18,26,0.25); }
        .hw-submit {
          grid-column: 1 / -1; margin-top: 0.4rem; padding: 0.95rem 1.5rem; border: none; border-radius: 999px;
          font-family: 'Oswald', sans-serif; font-size: 1.1rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
          color: #fff; cursor: pointer;
          background: linear-gradient(180deg, #e3161f, #8a0006);
          box-shadow: 0 10px 30px rgba(211,18,26,0.4);
          transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s;
        }
        .hw-submit:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 14px 36px rgba(211,18,26,0.55); }
        .hw-submit:disabled { opacity: 0.6; cursor: progress; }
        .hw-error {
          grid-column: 1 / -1; padding: 0.75rem 1rem; border-radius: 12px;
          background: rgba(211,18,26,0.12); border: 1px solid rgba(211,18,26,0.5); color: #ffb3b3; font-size: 0.92rem;
        }
        .hw-legal { grid-column: 1 / -1; font-size: 0.78rem; color: rgba(255,255,255,0.4); line-height: 1.5; margin: 0; }
        .hw-done { text-align: center; padding: 1.5rem 0.5rem; }
        .hw-done-icon { font-size: 3rem; margin-bottom: 0.5rem; }
        .hw-done h3 { margin-bottom: 0.75rem; }
        .hw-done p { color: rgba(255,255,255,0.75); line-height: 1.6; margin: 0 0 1.25rem; }
        .hw-link-btn { background: none; border: 1px solid rgba(255,255,255,0.25); color: #fff; border-radius: 999px; padding: 0.6rem 1.4rem; cursor: pointer; font-family: inherit; }
        .hw-info { display: flex; flex-wrap: wrap; gap: 0.6rem; margin-top: 1.5rem; }
        .hw-chip {
          padding: 0.45rem 0.9rem; border-radius: 999px; font-size: 0.85rem;
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.8);
        }
        .hw-lightbox {
          position: fixed; inset: 0; z-index: 2000; background: rgba(0,0,0,0.88);
          display: flex; align-items: center; justify-content: center; padding: 1rem; cursor: zoom-out;
        }
        .hw-lightbox img { max-width: 100%; max-height: 92vh; border-radius: 12px; box-shadow: 0 0 60px rgba(211,18,26,0.4); }
      `}</style>

      <div className="hw-inner">
        <p className="hw-kicker">Astronomical · 31 de octubre · 8 PM</p>
        <h2 className="hw-title">Concurso de Disfraces</h2>
        <p className="hw-sub">
          <strong>Resident Evil Halloween Party.</strong> Gana un <strong>iPhone 18 Pro Max</strong>, efectivo
          o un viaje a Roatán para dos. Regístrate aquí antes de la fiesta.
        </p>

        <div className="hw-grid">
          <div>
            <button type="button" className="hw-poster" onClick={() => setPosterOpen(true)} aria-label="Ver premios en grande">
              <img src="/halloween/premios-resident-evil-2026.jpg" alt="Premios del concurso de disfraces Resident Evil Halloween Party 2026" loading="lazy" width={828} height={1280} />
            </button>
            <p className="hw-poster-hint">Toca la imagen para verla en grande</p>
          </div>

          <div>
            <ol className="hw-steps">
              <li className="hw-step">
                <span className="hw-step-n">1</span>
                <span>
                  Publica una foto de tu disfraz en Instagram con el hashtag
                  <button type="button" className="hw-hashtag" onClick={copyHashtag} title="Copiar hashtag">
                    {HASHTAG} <span aria-hidden>{copied ? '✓' : '⧉'}</span>
                  </button>
                  y etiqueta a <strong>@casablanca_sps</strong>.
                </span>
              </li>
              <li className="hw-step">
                <span className="hw-step-n">2</span>
                <span>Completa este formulario con tus datos y el enlace de tu publicación.</span>
              </li>
              <li className="hw-step">
                <span className="hw-step-n">3</span>
                <span>Preséntate disfrazado el <strong>31 de octubre</strong>. Inscripciones en sitio de <strong>7:00 a 11:00 PM</strong>.</span>
              </li>
            </ol>

            <div className="hw-card">
              {status === 'done' ? (
                <div className="hw-done" role="status">
                  <div className="hw-done-icon" aria-hidden>🧟</div>
                  <h3>¡Estás registrado!</h3>
                  <p>Te esperamos el 31 de octubre en La Gran Casa Blanca. Lleva tu identidad para confirmar tu inscripción.</p>
                  <button type="button" className="hw-link-btn" onClick={() => setStatus('idle')}>Registrar a otra persona</button>
                </div>
              ) : (
                <>
                  <h3>Registro de participantes</h3>
                  <form className="hw-form" onSubmit={onSubmit} noValidate={false}>
                    {FIELDS.map(f => (
                      <div key={f.name} className={`hw-field ${f.name === 'instagramUrl' || f.name === 'fullName' || f.name === 'email' ? 'full' : ''}`}>
                        <label htmlFor={`hw-${f.name}`}>{f.label}</label>
                        <input
                          id={`hw-${f.name}`}
                          name={f.name}
                          type={f.type}
                          inputMode={f.inputMode}
                          placeholder={f.placeholder}
                          autoComplete={f.autoComplete}
                          required
                          value={form[f.name]}
                          onChange={e => setForm(prev => ({ ...prev, [f.name]: e.target.value }))}
                        />
                      </div>
                    ))}
                    {error && <div className="hw-error" role="alert">{error}</div>}
                    <button type="submit" className="hw-submit" disabled={status === 'sending'}>
                      {status === 'sending' ? 'Enviando…' : 'Inscribirme al concurso'}
                    </button>
                    <p className="hw-legal">
                      Un registro por persona. Tus datos solo se usarán para contactarte sobre el concurso.
                    </p>
                  </form>
                </>
              )}
            </div>

            <div className="hw-info">
              <span className="hw-chip">🎧 DJs David Luna &amp; Blake</span>
              <span className="hw-chip">🎟️ Preventa L.600 hasta el 29 oct</span>
              <span className="hw-chip">📍 Frente a la Fuente Luminosa, SPS</span>
            </div>
          </div>
        </div>
      </div>

      {posterOpen && (
        <div className="hw-lightbox" onClick={() => setPosterOpen(false)} role="dialog" aria-label="Premios del concurso">
          <img src="/halloween/premios-resident-evil-2026.jpg" alt="Premios del concurso de disfraces" />
        </div>
      )}
    </section>
  )
}

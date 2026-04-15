'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setClientSelfOrderingEnabled, updateInvoiceSettings } from '@/lib/actions'

type Row = {
  clientSelfOrderingEnabled: boolean
  invoiceLegalName: string | null
  invoiceTradeName: string | null
  invoiceRtn: string | null
  invoiceAddress: string | null
  invoicePhone: string | null
  invoiceEmail: string | null
  invoiceCaiBlock: string | null
  invoiceFooterNote: string | null
  invoiceIsvPercent: unknown | null
}

function numFromDecimal(v: unknown | null): string {
  if (v == null) return '15'
  if (typeof v === 'object' && v !== null && 'toNumber' in v) {
    return String((v as { toNumber(): number }).toNumber())
  }
  return String(Number(v) || 15)
}

export function ConfiguracionClient({ initial }: { initial: Row }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [clientOrders, setClientOrders] = useState(initial.clientSelfOrderingEnabled)
  const [legal, setLegal] = useState(initial.invoiceLegalName || '')
  const [trade, setTrade] = useState(initial.invoiceTradeName || '')
  const [rtn, setRtn] = useState(initial.invoiceRtn || '')
  const [addr, setAddr] = useState(initial.invoiceAddress || '')
  const [phone, setPhone] = useState(initial.invoicePhone || '')
  const [email, setEmail] = useState(initial.invoiceEmail || '')
  const [cai, setCai] = useState(initial.invoiceCaiBlock || '')
  const [foot, setFoot] = useState(initial.invoiceFooterNote || '')
  const [isv, setIsv] = useState(numFromDecimal(initial.invoiceIsvPercent))
  const [msg, setMsg] = useState('')

  const saveClientSwitch = (v: boolean) => {
    setClientOrders(v)
    start(async () => {
      try {
        setMsg('')
        await setClientSelfOrderingEnabled(v)
        router.refresh()
      } catch (e: any) {
        setMsg(e?.message || 'Error')
        setClientOrders(!v)
      }
    })
  }

  const saveInvoice = (e: React.FormEvent) => {
    e.preventDefault()
    start(async () => {
      try {
        setMsg('')
        const pct = parseFloat(isv)
        await updateInvoiceSettings({
          invoiceLegalName: legal.trim() || null,
          invoiceTradeName: trade.trim() || null,
          invoiceRtn: rtn.trim() || null,
          invoiceAddress: addr.trim() || null,
          invoicePhone: phone.trim() || null,
          invoiceEmail: email.trim() || null,
          invoiceCaiBlock: cai.trim() || null,
          invoiceFooterNote: foot.trim() || null,
          invoiceIsvPercent: Number.isFinite(pct) ? pct : 15,
        })
        setMsg('Guardado.')
        router.refresh()
      } catch (e: any) {
        setMsg(e?.message || 'Error al guardar')
      }
    })
  }

  return (
    <div className="space-y-10 max-w-3xl">
      {msg && (
        <div className="text-sm text-primary-300 bg-primary-900/20 border border-primary-700/40 rounded-lg px-4 py-2">
          {msg}
        </div>
      )}

      <section className="bg-dark-100 border border-dark-200 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-2">Pedidos desde /clientes</h2>
        <p className="text-sm text-white/70 mb-4">
          Si está desactivado, los clientes no podrán agregar pedidos desde el código QR (el personal sigue usando mesero).
        </p>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="w-5 h-5 rounded border-dark-200"
            checked={clientOrders}
            disabled={pending}
            onChange={(e) => saveClientSwitch(e.target.checked)}
          />
          <span className="text-white">Permitir que clientes ingresen pedidos desde /clientes</span>
        </label>
      </section>

      <section className="bg-dark-100 border border-dark-200 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-2">Datos en factura (cajero)</h2>
        <p className="text-sm text-white/70 mb-4">
          Aparecen en el formato de factura/precuenta impreso desde el panel de cajero. No sustituye numeración SAR.
        </p>
        <form onSubmit={saveInvoice} className="space-y-4">
          <div>
            <label className="block text-sm text-dark-300 mb-1">Nombre comercial</label>
            <input
              className="w-full rounded-lg bg-dark-50 border border-dark-200 px-3 py-2 text-white"
              value={trade}
              onChange={(e) => setTrade(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm text-dark-300 mb-1">Razón social (opcional)</label>
            <input
              className="w-full rounded-lg bg-dark-50 border border-dark-200 px-3 py-2 text-white"
              value={legal}
              onChange={(e) => setLegal(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm text-dark-300 mb-1">RTN</label>
            <input
              className="w-full rounded-lg bg-dark-50 border border-dark-200 px-3 py-2 text-white"
              value={rtn}
              onChange={(e) => setRtn(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm text-dark-300 mb-1">Dirección</label>
            <textarea
              className="w-full rounded-lg bg-dark-50 border border-dark-200 px-3 py-2 text-white min-h-[72px]"
              value={addr}
              onChange={(e) => setAddr(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-dark-300 mb-1">Teléfono</label>
              <input
                className="w-full rounded-lg bg-dark-50 border border-dark-200 px-3 py-2 text-white"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm text-dark-300 mb-1">Correo</label>
              <input
                className="w-full rounded-lg bg-dark-50 border border-dark-200 px-3 py-2 text-white"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-dark-300 mb-1">ISV % (gravado)</label>
            <input
              type="number"
              step="0.01"
              className="w-full max-w-xs rounded-lg bg-dark-50 border border-dark-200 px-3 py-2 text-white"
              value={isv}
              onChange={(e) => setIsv(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm text-dark-300 mb-1">Bloque CAI / rango / vigencia</label>
            <textarea
              className="w-full rounded-lg bg-dark-50 border border-dark-200 px-3 py-2 text-white min-h-[96px] font-mono text-sm"
              value={cai}
              onChange={(e) => setCai(e.target.value)}
              placeholder="Pega aquí el texto de resolución SAR si aplica"
            />
          </div>
          <div>
            <label className="block text-sm text-dark-300 mb-1">Nota al pie</label>
            <textarea
              className="w-full rounded-lg bg-dark-50 border border-dark-200 px-3 py-2 text-white min-h-[64px]"
              value={foot}
              onChange={(e) => setFoot(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="px-4 py-2 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-500 disabled:opacity-50"
          >
            {pending ? 'Guardando…' : 'Guardar datos de factura'}
          </button>
        </form>
      </section>
    </div>
  )
}

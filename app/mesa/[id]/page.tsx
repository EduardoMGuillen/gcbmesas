import { redirect } from 'next/navigation'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Esta ruta siempre redirige a /clientes
// No debe importar nada de NextAuth para evitar errores de inicialización
export default async function MesaPage({
  params,
}: {
  params: { id: string }
}) {
  // Esta ruta siempre redirige a /clientes
  // El middleware debería manejar esto, pero por si acaso también lo hacemos aquí
  const tableId = params?.id || ''
  
  // Usar redirect de Next.js que es más robusto
  if (tableId) {
    redirect(`/clientes?tableId=${tableId}`)
  } else {
    redirect('/clientes')
}
}

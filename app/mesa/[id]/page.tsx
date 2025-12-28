import { redirect } from 'next/navigation'

export default async function MesaPage({
  params,
}: {
  params: { id: string }
}) {
  try {
    // Esta ruta siempre redirige a /clientes
    // El middleware debería manejar esto, pero por si acaso también lo hacemos aquí
    const tableId = params?.id || ''
    redirect(`/clientes?tableId=${tableId}`)
  } catch (error) {
    // Si hay algún error, redirigir a /clientes sin tableId
    redirect('/clientes')
  }
}


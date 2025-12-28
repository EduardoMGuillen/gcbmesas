import { redirect } from 'next/navigation'

export default async function MesaPage({
  params,
}: {
  params: { id: string }
}) {
  // Esta ruta siempre redirige a /clientes
  // El middleware debería manejar esto, pero por si acaso también lo hacemos aquí
  redirect(`/clientes?tableId=${params.id}`)
}


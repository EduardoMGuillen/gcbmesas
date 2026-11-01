/**
 * Departamentos de Honduras con su cabecera y el código postal de la cabecera.
 * Se usan para precargar ciudad y código postal en la facturación; el cliente puede editarlos.
 */
export const HN_DEPARTMENTS: { name: string; city: string; postalCode: string }[] = [
  { name: 'Atlántida', city: 'La Ceiba', postalCode: '31101' },
  { name: 'Choluteca', city: 'Choluteca', postalCode: '51101' },
  { name: 'Colón', city: 'Trujillo', postalCode: '32101' },
  { name: 'Comayagua', city: 'Comayagua', postalCode: '12101' },
  { name: 'Copán', city: 'Santa Rosa de Copán', postalCode: '41101' },
  { name: 'Cortés', city: 'San Pedro Sula', postalCode: '21101' },
  { name: 'El Paraíso', city: 'Yuscarán', postalCode: '13101' },
  { name: 'Francisco Morazán', city: 'Tegucigalpa', postalCode: '11101' },
  { name: 'Gracias a Dios', city: 'Puerto Lempira', postalCode: '33101' },
  { name: 'Intibucá', city: 'La Esperanza', postalCode: '14101' },
  { name: 'Islas de la Bahía', city: 'Roatán', postalCode: '34101' },
  { name: 'La Paz', city: 'La Paz', postalCode: '15101' },
  { name: 'Lempira', city: 'Gracias', postalCode: '42101' },
  { name: 'Ocotepeque', city: 'Ocotepeque', postalCode: '43101' },
  { name: 'Olancho', city: 'Juticalpa', postalCode: '16101' },
  { name: 'Santa Bárbara', city: 'Santa Bárbara', postalCode: '22101' },
  { name: 'Valle', city: 'Nacaome', postalCode: '52101' },
  { name: 'Yoro', city: 'Yoro', postalCode: '23101' },
]

export function departmentDefaults(name: string): { city: string; postalCode: string } | null {
  const d = HN_DEPARTMENTS.find((x) => x.name === name)
  return d ? { city: d.city, postalCode: d.postalCode } : null
}

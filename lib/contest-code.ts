/** Código corto para identificar una inscripción del concurso en la puerta. */
export function contestRegistrationCode(id: string) {
  return `CB-${id.slice(-6).toUpperCase()}`
}

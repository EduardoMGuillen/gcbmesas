import QRCode from 'qrcode'

export async function generateQRCode(data: string): Promise<string> {
  try {
    const qrCodeDataURL = await QRCode.toDataURL(data, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    })
    return qrCodeDataURL
  } catch (error) {
    console.error('Error generating QR code:', error)
    throw error
  }
}

/** Valor centinela para "Cuenta Abierta" (sin límite de consumo) */
export const OPEN_ACCOUNT_SENTINEL = 300000

export function isOpenAccount(initialBalance: number | string | { toString(): string }): boolean {
  const num = typeof initialBalance === 'object' ? parseFloat(initialBalance.toString()) : Number(initialBalance)
  return num === OPEN_ACCOUNT_SENTINEL
}

export function formatAccountBalance(
  initialBalance: number | string | { toString(): string },
  currentBalance: number | string | { toString(): string }
): string {
  if (isOpenAccount(initialBalance)) return 'Cuenta Abierta'
  const num = typeof currentBalance === 'object' ? parseFloat(currentBalance.toString()) : Number(currentBalance)
  return formatCurrency(num)
}

export function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('es-HN', {
    style: 'currency',
    currency: 'HNL',
  }).format(num)
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}


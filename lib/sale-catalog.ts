export function catalogKey(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/lite/g, 'light')
    .replace(/[^a-z0-9]+/g, '')
}

export function stockMatchesProduct(stockName: string, productName: string) {
  const a = catalogKey(stockName)
  const b = catalogKey(productName)
  return a.length >= 3 && a === b
}

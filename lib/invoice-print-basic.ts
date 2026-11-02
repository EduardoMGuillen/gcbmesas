/** Imprime HTML en un iframe oculto (mismo enfoque que entradas; evita problemas en iOS/PWA). */
export function printInvoiceHtml(html: string): void {
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.top = '-10000px'
  iframe.style.left = '-10000px'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = 'none'
  document.body.appendChild(iframe)

  const doc = iframe.contentDocument || iframe.contentWindow?.document
  if (!doc) {
    document.body.removeChild(iframe)
    return
  }

  const cleanHtml = html.replace(/<script>[\s\S]*?<\/script>/gi, '')
  doc.open()
  doc.write(cleanHtml)
  doc.close()

  const images = Array.from(doc.querySelectorAll('img'))
  const loadPromises = images.map(
    (img) =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            img.onload = () => resolve()
            img.onerror = () => resolve()
          })
  )

  void Promise.all(loadPromises).then(() => {
    setTimeout(() => {
      iframe.contentWindow?.print()
      setTimeout(() => {
        try {
          document.body.removeChild(iframe)
        } catch {
          /* ignore */
        }
      }, 1000)
    }, 300)
  })
}

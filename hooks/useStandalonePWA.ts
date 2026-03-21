'use client'

import { useEffect, useState } from 'react'
import { isStandalonePWA } from '@/lib/pwa-detect'

/** `true` si la app corre como PWA instalada (cliente solo; primer render `false`). */
export function useStandalonePWA(): boolean {
  const [standalone, setStandalone] = useState(false)
  useEffect(() => {
    setStandalone(isStandalonePWA())
  }, [])
  return standalone
}

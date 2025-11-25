'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

export function CleanUrlParams() {
  const searchParams = useSearchParams()
  
  useEffect(() => {
    // If we have the 'from' parameter, remove it from URL
    if (searchParams.get('from') === 'callback') {
      const url = new URL(window.location.href)
      url.searchParams.delete('from')
      window.history.replaceState({}, '', url.pathname + (url.search || ''))
    }
  }, [searchParams])
  
  return null
}


'use client'

import { useRouter } from 'next/navigation'
import { useState, useCallback } from 'react'

export function RefreshButton() {
  const router = useRouter()
  const [spinning, setSpinning] = useState(false)

  const handleRefresh = useCallback(() => {
    setSpinning(true)
    router.refresh()
    // La animación dura 600ms para dar feedback visual
    setTimeout(() => setSpinning(false), 600)
  }, [router])

  return (
    <button
      type="button"
      onClick={handleRefresh}
      className="p-2 text-white/60 hover:text-white hover:bg-dark-200 rounded-lg transition-colors touch-manipulation"
      title="Refrescar página"
      aria-label="Refrescar página"
    >
      <svg
        className={`w-5 h-5 transition-transform ${spinning ? 'animate-spin' : ''}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
    </button>
  )
}

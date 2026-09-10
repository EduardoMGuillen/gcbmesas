'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'

export type StaffTheme = 'dark' | 'light'

const STORAGE_KEY = 'gcb-staff-theme'

type StaffThemeContextValue = {
  theme: StaffTheme
  toggle: () => void
}

const StaffThemeContext = createContext<StaffThemeContextValue>({
  theme: 'dark',
  toggle: () => {},
})

export function StaffThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<StaffTheme>('dark')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') setTheme(saved)
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    const color = theme === 'dark' ? '#09090b' : '#f4f4f5'
    let meta = document.querySelector('meta[name="theme-color"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'theme-color')
      document.head.appendChild(meta)
    }
    meta.setAttribute('content', color)
  }, [theme, ready])

  const toggle = useCallback(() => {
    setTheme((current) => {
      const next: StaffTheme = current === 'dark' ? 'light' : 'dark'
      localStorage.setItem(STORAGE_KEY, next)
      return next
    })
  }, [])

  return (
    <StaffThemeContext.Provider value={{ theme, toggle }}>
      <div className="staff-app min-h-screen" data-theme={theme}>
        {children}
      </div>
    </StaffThemeContext.Provider>
  )
}

export function useStaffTheme() {
  return useContext(StaffThemeContext)
}

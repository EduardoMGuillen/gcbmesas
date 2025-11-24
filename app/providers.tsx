'use client'

import { SessionProvider } from 'next-auth/react'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider
      // iOS/Safari compatibility: ensure session is refetched on focus
      refetchInterval={0}
      refetchOnWindowFocus={true}
    >
      {children}
    </SessionProvider>
  )
}


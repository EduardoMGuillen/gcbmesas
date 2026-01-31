'use client'

import { SessionProvider } from 'next-auth/react'
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider
      refetchInterval={0}
      refetchOnWindowFocus={true}
    >
      <ServiceWorkerRegister />
      {children}
    </SessionProvider>
  )
}


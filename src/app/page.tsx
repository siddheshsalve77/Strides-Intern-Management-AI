'use client'

import { useApp } from '@/lib/store'
import { useAuthSession } from '@/lib/use-auth-session'
import { LoginScreen } from '@/components/portal/login-screen'
import { PortalShell } from '@/components/portal/portal-shell'
import { Loader2 } from 'lucide-react'

export default function Home() {
  const { currentEmployee } = useApp()
  const { authReady } = useAuthSession()

  if (!authReady) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary text-primary-foreground grid place-items-center font-bold text-xl shadow-lg shadow-primary/30">
            S
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading workspace…
          </div>
        </div>
      </div>
    )
  }

  if (!currentEmployee) return <LoginScreen />
  return <PortalShell />
}

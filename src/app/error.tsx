'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw, Trash2 } from 'lucide-react'

// Route-level error boundary (nested inside the root layout, so providers +
// globals.css are available — Tailwind + shadcn UI work here). Catches
// client-side exceptions that escape a page's render. Replaces the bare
// Next.js "client-side exception" page with a recoverable UI offering
// Try again / Reload / Clear cache & reload.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[route-error] client-side exception:', error)
  }, [error])

  // Clear all client-side caches/storage that could be holding stale state
  // from a previous build (stale chunks, corrupted IndexedDB, leftover SW),
  // then hard-reload. This is the one-click self-recovery for users whose
  // browser is stuck on a cached older build.
  async function clearCacheAndReload() {
    try {
      if ('caches' in window) {
        const keys = await caches.keys()
        await Promise.all(keys.map((k) => caches.delete(k)))
      }
      try { localStorage.clear() } catch {}
      try { sessionStorage.clear() } catch {}
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations()
        await Promise.all(regs.map((r) => r.unregister()))
      }
    } catch (e) {
      console.warn('[route-error] cache clear partial failure:', e)
    }
    window.location.reload()
  }

  return (
    <div className="min-h-screen grid place-items-center bg-background p-6">
      <div className="max-w-md w-full text-center space-y-5">
        <div className="h-12 w-12 rounded-xl bg-primary text-primary-foreground grid place-items-center font-bold text-xl shadow-lg shadow-primary/30 mx-auto">
          S
        </div>
        <div className="space-y-1.5">
          <h1 className="text-xl font-semibold tracking-tight">STRIDES ONE hit a snag</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            A client-side error occurred while loading the workspace. This is almost
            always caused by cached files from an earlier version of the app.
            Try <strong>Reload</strong>; if it persists, use{' '}
            <strong>Clear cache &amp; reload</strong>.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Button onClick={() => reset()}>
            <RefreshCw className="h-4 w-4" /> Try again
          </Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Reload page
          </Button>
          <Button variant="ghost" onClick={clearCacheAndReload}>
            <Trash2 className="h-4 w-4" /> Clear cache &amp; reload
          </Button>
        </div>
        {error?.message ? (
          <p className="text-[11px] text-muted-foreground/70 font-mono break-all">
            {error.message}
            {error.digest ? ` · ${error.digest}` : ''}
          </p>
        ) : null}
      </div>
    </div>
  )
}

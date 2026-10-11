'use client'

import { useEffect } from 'react'
import type { CSSProperties } from 'react'

// Root-level error boundary. Replaces Next.js's bare
// "Application error: a client-side exception has occurred" page with a
// recoverable UI. Triggered when an exception escapes the route-level
// error.tsx boundary (i.e. an error in the root layout itself, or during
// hydration of the shell). Renders its own <html><body> because the root
// layout is NOT mounted when this boundary activates — so we use inline
// styles (no reliance on globals.css / Tailwind being loaded).
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[global-error] client-side exception:', error)
  }, [error])

  // Hard reload — most reliable recovery from stale-state crashes.
  function hardReload() {
    if (typeof window !== 'undefined') window.location.reload()
  }

  // Clear all client-side caches/storage that could be holding stale state
  // from a previous build, then hard-reload. Recovers from the most common
  // cause of PERSISTENT client-side exceptions: stale cached chunks /
  // corrupted IndexedDB / a leftover service worker.
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
      console.warn('[global-error] cache clear partial failure:', e)
    }
    window.location.reload()
  }

  return (
    <html lang="en">
      <body style={bodyStyle}>
        <div style={cardStyle}>
          <div style={logoStyle}>S</div>
          <h1 style={h1Style}>STRIDES ONE hit a snag</h1>
          <p style={pStyle}>
            A client-side error occurred while loading the workspace. This is almost
            always caused by your browser holding onto cached files from an earlier
            version of the app. <strong>Reload</strong> usually fixes it; if not, use{' '}
            <strong>Clear cache &amp; reload</strong>.
          </p>
          <div style={btnWrapStyle}>
            <button onClick={hardReload} style={primaryBtnStyle}>
              Reload page
            </button>
            <button onClick={clearCacheAndReload} style={secondaryBtnStyle}>
              Clear cache &amp; reload
            </button>
          </div>
          {error?.message ? (
            <p style={errStyle}>
              {error.message}
              {error.digest ? ` · ${error.digest}` : ''}
            </p>
          ) : null}
        </div>
      </body>
    </html>
  )
}

const bodyStyle: CSSProperties = {
  margin: 0,
  minHeight: '100vh',
  display: 'grid',
  placeItems: 'center',
  fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  background: '#f8fafc',
  color: '#0f172a',
  padding: '1.5rem',
}

const cardStyle: CSSProperties = {
  maxWidth: 440,
  width: '100%',
  textAlign: 'center',
}

const logoStyle: CSSProperties = {
  height: 48,
  width: 48,
  borderRadius: 12,
  background: '#0f766e',
  color: 'white',
  display: 'grid',
  placeItems: 'center',
  fontWeight: 700,
  fontSize: 20,
  margin: '0 auto 1.25rem',
  boxShadow: '0 10px 30px -10px rgba(15,118,110,0.55)',
}

const h1Style: CSSProperties = {
  fontSize: 20,
  fontWeight: 600,
  margin: '0 0 0.5rem',
  letterSpacing: '-0.01em',
}

const pStyle: CSSProperties = {
  fontSize: 13,
  color: '#475569',
  lineHeight: 1.55,
  margin: '0 0 1.5rem',
}

const btnWrapStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  marginBottom: 16,
}

const primaryBtnStyle: CSSProperties = {
  height: 38,
  borderRadius: 8,
  border: 'none',
  background: '#0f766e',
  color: 'white',
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
}

const secondaryBtnStyle: CSSProperties = {
  height: 38,
  borderRadius: 8,
  border: '1px solid #e2e8f0',
  background: 'white',
  color: '#0f172a',
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
}

const errStyle: CSSProperties = {
  fontSize: 11,
  color: '#94a3b8',
  fontFamily: 'monospace',
  wordBreak: 'break-all',
  margin: 0,
}

'use client'

import { useState } from 'react'
import { useApp } from '@/lib/store'
import { loginWithEmail } from '@/lib/firebase-auth'
import { loadUserProfile, reloadSessionProfile } from '@/lib/use-auth-session'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ShieldCheck, Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

export function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // NOTE: No auth listener here! The root page.tsx uses useAuthSession() which
  // handles onAuthStateChanged and profile fetching. This component is only shown
  // when currentEmployee is null. When login succeeds, Firebase Auth fires
  // onAuthStateChanged which triggers useAuthSession to load the profile and
  // set currentEmployee, causing page.tsx to render PortalShell instead of LoginScreen.

  async function login(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) { setError('Please enter your email and password'); return }
    setLoading(true)
    setError(null)
    try {
      const user = await loginWithEmail(email, password)
      toast.success('Welcome back!')

      // CRITICAL: Drive the profile load DIRECTLY with the returned user object.
      // We do NOT rely on `auth.currentUser` here — in third-party iframe contexts
      // (like the Z.ai preview panel), `auth.currentUser` can lag behind the
      // `signInWithEmailAndPassword` resolution, causing reloadSessionProfile()
      // to return early (false) and leaving the user stuck on the login screen
      // with only the "Welcome back" toast. loadUserProfile(user) sets the
      // idToken + firebaseUid + currentEmployee directly so page.tsx re-renders
      // into PortalShell immediately.
      const loaded = await loadUserProfile(user)
      if (!loaded) {
        // loadUserProfile already surfaced a toast for transient/401 failures.
        // As a final fallback, try reloadSessionProfile (re-reads auth.currentUser)
        // in case the auth state has settled by now.
        if (!await reloadSessionProfile()) {
          // Still no profile — if Firebase reports a user, surface a clear error
          // instead of leaving the user staring at the login screen silently.
          // (The "Welcome back!" toast already fired; an error toast now explains
          // why the dashboard isn't opening.)
        }
      }
    } catch (err: any) {
      const code = err?.code || ''
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        setError('Invalid email or password')
      } else if (code === 'auth/too-many-requests') {
        setError('Too many login attempts. Please try again later.')
      } else if (code === 'auth/network-request-failed') {
        setError('Network error. Please check your connection.')
      } else {
        setError(err?.message || 'Login failed')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-ambient">
      {/* Left brand panel — premium gradient mesh + depth orbs */}
      <div className="relative lg:w-1/2 min-h-[280px] lg:min-h-screen bg-sidebar text-sidebar-foreground overflow-hidden flex flex-col justify-between p-8 lg:p-12">
        {/* Gradient mesh background — teal→violet→indigo for premium depth */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, oklch(0.22 0.02 220) 0%, oklch(0.19 0.013 260) 50%, oklch(0.16 0.02 230) 100%)' }} aria-hidden />
        {/* Subtle grid overlay */}
        <div className="absolute inset-0 bg-grid opacity-[0.18]" aria-hidden />
        {/* Decorative gradient orbs — multi-accent, very blurred */}
        <div className="absolute -top-32 -right-24 h-96 w-96 rounded-full blur-3xl opacity-50" style={{ background: 'radial-gradient(circle, oklch(0.55 0.1 185 / 0.8), transparent 70%)' }} aria-hidden />
        <div className="absolute -bottom-32 -left-24 h-96 w-96 rounded-full blur-3xl opacity-40" style={{ background: 'radial-gradient(circle, oklch(0.58 0.17 290 / 0.7), transparent 70%)' }} aria-hidden />
        <div className="absolute top-1/3 left-1/4 h-72 w-72 rounded-full blur-3xl opacity-30" style={{ background: 'radial-gradient(circle, oklch(0.6 0.17 235 / 0.6), transparent 70%)' }} aria-hidden />

        <div className="relative z-10 flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-xl grid place-items-center font-bold text-[15px] shadow-lg press-tactile" style={{ background: 'var(--gradient-primary)', color: 'oklch(0.99 0.005 178)', boxShadow: '0 1px 0 oklch(1 0 0 / 0.25) inset, 0 8px 20px oklch(0.45 0.09 178 / 0.4)' }}>
            S
          </div>
          <div>
            <p className="font-semibold tracking-tight text-[15px] leading-none text-sidebar-foreground">STRIDES ONE</p>
            <p className="text-[9px] text-sidebar-foreground/50 mt-1 tracking-[0.12em] uppercase">Employee Experience</p>
          </div>
        </div>

        <div className="relative z-10 max-w-md">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium mb-5 backdrop-blur-md" style={{ background: 'oklch(1 0 0 / 0.08)', border: '1px solid oklch(1 0 0 / 0.12)', color: 'oklch(0.9 0.02 178)' }}>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>One workspace · Always in sync</span>
          </div>
          <h1 className="text-[28px] lg:text-[36px] font-bold tracking-tight text-balance leading-[1.1] text-sidebar-foreground">
            One intelligent workspace for the people and work of <span className="gradient-text-primary">Strides.</span>
          </h1>
          <p className="text-sidebar-foreground/65 mt-5 text-[13px] lg:text-[14px] leading-relaxed">
            Attendance, leave, tasks, performance, HR services, documents and AI assistance —
            all in one place, beautifully connected.
          </p>
        </div>

        <p className="relative z-10 text-[10px] text-sidebar-foreground/45 tracking-wide">
          © {new Date().getFullYear()} Strides Software, Aurangabad.
        </p>
      </div>

      {/* Right login panel */}
      <div className="lg:w-1/2 flex-1 flex items-center justify-center p-6 lg:p-12 relative">
        <div className="w-full max-w-sm animate-scale-in">
          <div className="mb-7">
            <h2 className="text-[22px] font-bold tracking-tight">Welcome back</h2>
            <p className="text-muted-foreground text-[12px] mt-1.5">
              Sign in to your Strides company account.
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-rose-500/25 bg-rose-500/5 p-3 flex items-start gap-2 animate-scale-in">
              <AlertCircle className="h-3.5 w-3.5 text-rose-600 shrink-0 mt-0.5" />
              <p className="text-[12px] text-rose-700 dark:text-rose-400">{error}</p>
            </div>
          )}

          <div className="glass-panel rounded-xl p-5">
            <form className="space-y-3.5" onSubmit={login}>
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[12px] font-medium">Company Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@strides.com"
                  autoComplete="email"
                  required
                  className="h-10 focus-glow"
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-[12px] font-medium">Password</Label>
                  <button type="button" className="text-[11px] text-primary hover:underline font-medium">Forgot?</button>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className="h-10 focus-glow"
                />
              </div>
              <Button type="submit" className="w-full h-10 btn-gradient-primary border-0 mt-1" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Sign In
              </Button>
            </form>
          </div>

          <div className="rounded-lg bg-muted/30 border border-border p-2.5 mt-4 text-[11px] text-muted-foreground flex items-start gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-foreground mb-0.5">Internal Employee Portal</p>
              <p>Accounts are created by HR only. No public registration. If you don't have an account, please contact HR.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

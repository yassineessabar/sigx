'use client'

import { useState, useEffect, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, CheckCircle } from 'lucide-react'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}

export default function LoginPageWrapper() {
  return (
    <Suspense fallback={<div className="dark flex min-h-screen items-center justify-center bg-background" style={{ colorScheme: 'dark' }} />}>
      <LoginPage />
    </Suspense>
  )
}

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [verified, setVerified] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get('message') === 'verified') {
      setVerified(true)
    }
  }, [searchParams])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
    } else {
      router.push('/ai-builder')
    }
  }

  const handleGoogleLogin = async () => {
    setError('')
    setGoogleLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      setError(error.message)
      setGoogleLoading(false)
    }
  }

  return (
    <div className="dark flex min-h-screen items-center justify-center bg-background px-4" style={{ colorScheme: 'dark' }}>
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <div className="h-[22px] w-[22px] rounded-[6px] bg-white flex items-center justify-center">
              <span className="text-[8px] font-black text-black tracking-[-0.06em]">SX</span>
            </div>
            <span className="text-[14px] font-semibold tracking-[-0.03em] text-foreground/90">SIGX</span>
          </Link>
          <p className="mt-3 text-[14px] text-foreground/50 font-medium">
            Sign in to your account
          </p>
        </div>

        <div className="space-y-4">
          {verified && (
            <div className="rounded-[10px] bg-emerald-500/[0.06] border border-emerald-500/[0.12] px-4 py-3 text-[12px] text-emerald-400/80 font-medium flex items-center gap-2">
              <CheckCircle size={14} />
              Email verified! You can now sign in.
            </div>
          )}

          {error && (
            <div className="rounded-[10px] bg-red-500/[0.06] border border-red-500/[0.08] px-4 py-3 text-[12px] text-red-400/70 font-medium">
              {error}
            </div>
          )}

          {/* Google OAuth */}
          <button
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="flex w-full items-center justify-center gap-3 rounded-[10px] border border-foreground/[0.08] bg-foreground/[0.03] px-4 py-2.5 text-[13px] font-medium text-foreground/80 transition-all duration-200 hover:bg-foreground/[0.06] hover:border-foreground/[0.12] disabled:opacity-50"
          >
            {googleLoading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-foreground/30 border-t-transparent" />
            ) : (
              <>
                <GoogleIcon />
                Continue with Google
              </>
            )}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-foreground/[0.06]" />
            <span className="text-[11px] text-foreground/30 font-medium uppercase tracking-wider">or</span>
            <div className="h-px flex-1 bg-foreground/[0.06]" />
          </div>

          {/* Email/Password form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-[12px] font-semibold text-foreground/60 uppercase tracking-[0.1em]">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="flex h-10 w-full rounded-[10px] border border-foreground/[0.06] bg-card px-4 py-2 text-[14px] text-foreground/90 placeholder:text-foreground/30 focus:outline-none focus:border-foreground/[0.12] transition-all duration-300"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-[12px] font-semibold text-foreground/60 uppercase tracking-[0.1em]">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="flex h-10 w-full rounded-[10px] border border-foreground/[0.06] bg-card px-4 pr-10 py-2 text-[14px] text-foreground/90 placeholder:text-foreground/30 focus:outline-none focus:border-foreground/[0.12] transition-all duration-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground/70 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-[10px] bg-white px-4 py-2.5 text-[13px] font-semibold text-black transition-all duration-300 hover:bg-white/85 disabled:opacity-50"
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
              ) : (
                'Sign In'
              )}
            </button>

            <div className="text-center">
              <Link href="/forgot-password" className="text-[12px] text-foreground/50 transition-colors duration-300 hover:text-foreground/70 font-medium">
                Forgot your password?
              </Link>
            </div>
          </form>
        </div>

        <p className="text-center text-[13px] text-foreground/50 font-medium">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-foreground/80 hover:text-foreground transition-colors duration-300">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  )
}

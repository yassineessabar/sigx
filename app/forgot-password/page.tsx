'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (resetError) {
      setError(resetError.message)
    } else {
      setSent(true)
    }
    setLoading(false)
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
            Reset your password
          </p>
        </div>

        {sent ? (
          <div className="space-y-4 text-center">
            <div className="rounded-[10px] bg-emerald-500/[0.06] border border-emerald-500/[0.08] px-4 py-3 text-[12px] text-emerald-400/70 font-medium">
              Check your email for a password reset link.
            </div>
            <Link href="/login" className="text-[13px] text-foreground/60 hover:text-foreground/80 transition-colors duration-300 font-medium">
              Back to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            {error && (
              <div className="rounded-[10px] bg-red-500/[0.06] border border-red-500/[0.08] px-4 py-3 text-[12px] text-red-400/70 font-medium">
                {error}
              </div>
            )}

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

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-[10px] bg-white px-4 py-2.5 text-[13px] font-semibold text-black transition-all duration-300 hover:bg-white/85 disabled:opacity-50"
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
              ) : (
                'Send Reset Link'
              )}
            </button>
          </form>
        )}

        <p className="text-center text-[13px] text-foreground/50 font-medium">
          Remember your password?{' '}
          <Link href="/login" className="text-foreground/80 hover:text-foreground transition-colors duration-300">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}

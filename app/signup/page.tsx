'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Gift } from 'lucide-react'

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

function getPasswordStrength(password: string): number {
  let score = 0
  if (password.length >= 6) score++
  if (password.length >= 10) score++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
  if (/[0-9]/.test(password) && /[^a-zA-Z0-9]/.test(password)) score++
  return score
}

const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong']
const strengthColors = ['', 'bg-red-400/60', 'bg-yellow-400/60', 'bg-blue-400/60', 'bg-emerald-400/60']

// ─── 6-Digit OTP Input ───
function OTPInput({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])

  const handleChange = (index: number, char: string) => {
    if (!/^\d*$/.test(char)) return
    const newVal = value.split('')
    newVal[index] = char
    const joined = newVal.join('').slice(0, 6)
    onChange(joined)
    if (char && index < 5) {
      inputsRef.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    onChange(pasted)
    const focusIdx = Math.min(pasted.length, 5)
    inputsRef.current[focusIdx]?.focus()
  }

  return (
    <div className="flex justify-center gap-2.5">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <input
          key={i}
          ref={(el) => { inputsRef.current[i] = el }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          disabled={disabled}
          value={value[i] || ''}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className="h-12 w-11 rounded-[10px] border border-foreground/[0.08] bg-card text-center text-[20px] font-bold text-foreground focus:outline-none focus:border-foreground/[0.2] focus:ring-2 focus:ring-foreground/[0.06] transition-all disabled:opacity-50"
        />
      ))}
    </div>
  )
}

// ─── Main Component ───
export default function SignupPageWrapper() {
  return (
    <Suspense fallback={<div className="dark flex min-h-screen items-center justify-center bg-background" style={{ colorScheme: 'dark' }} />}>
      <SignupPage />
    </Suspense>
  )
}

function SignupPage() {
  const searchParams = useSearchParams()
  const referralCode = searchParams.get('ref') || ''
  const [step, setStep] = useState<'form' | 'verify'>('form')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  // OTP state
  const [otpCode, setOtpCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [resending, setResending] = useState(false)
  const [countdown, setCountdown] = useState(0)

  const router = useRouter()
  const strength = getPasswordStrength(password)

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  // ─── Step 1: Create Account ───
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName, referralCode: referralCode || undefined }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Signup failed')
        setLoading(false)
        return
      }

      if (data.requiresVerification) {
        setStep('verify')
        setCountdown(60)
      } else {
        // No verification needed — sign in directly
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) {
          setError(signInError.message)
        } else {
          router.push('/ai-builder')
        }
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ─── Step 2: Verify OTP Code ───
  const handleVerify = async () => {
    if (otpCode.length !== 6) return
    setError('')
    setVerifying(true)

    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: otpCode }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Verification failed')
        setOtpCode('')
        setVerifying(false)
        return
      }

      // Session returned — set it in the client
      if (data.session) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        })
        router.push('/ai-builder')
      } else {
        // Fallback: sign in with password
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) {
          setError('Verified! But could not sign in automatically. Please sign in manually.')
          setTimeout(() => router.push('/login?message=verified'), 2000)
        } else {
          router.push('/ai-builder')
        }
      }
    } catch {
      setError('Verification failed. Please try again.')
      setVerifying(false)
    }
  }

  // Auto-submit when 6 digits entered
  useEffect(() => {
    if (otpCode.length === 6 && step === 'verify' && !verifying) {
      handleVerify()
    }
  }, [otpCode])

  // ─── Resend Code ───
  const handleResend = async () => {
    if (countdown > 0) return
    setResending(true)
    setError('')

    try {
      const res = await fetch('/api/auth/resend-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (res.ok) {
        setCountdown(60)
        setOtpCode('')
      } else {
        const data = await res.json()
        setError(data.error || 'Could not resend code')
      }
    } catch {
      setError('Could not resend code')
    } finally {
      setResending(false)
    }
  }

  const handleGoogleSignup = async () => {
    setError('')
    setGoogleLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      setError(error.message)
      setGoogleLoading(false)
    }
  }

  // ═══════════ STEP 2: OTP VERIFICATION ═══════════
  if (step === 'verify') {
    return (
      <div className="dark flex min-h-screen items-center justify-center bg-background px-4" style={{ colorScheme: 'dark' }}>
        <div className="w-full max-w-sm space-y-8 text-center">
          {/* Logo */}
          <div>
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="h-[22px] w-[22px] rounded-[6px] bg-white flex items-center justify-center">
                <span className="text-[8px] font-black text-black tracking-[-0.06em]">SX</span>
              </div>
              <span className="text-[14px] font-semibold tracking-[-0.03em] text-foreground/90">SIGX</span>
            </Link>
          </div>

          {/* Icon */}
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-2xl bg-foreground/[0.04] border border-foreground/[0.06] flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-foreground/50">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M22 7l-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h1 className="text-[22px] font-bold text-foreground tracking-[-0.02em]">
              Enter verification code
            </h1>
            <p className="text-[14px] text-foreground/50 leading-relaxed">
              We sent a 6-digit code to
            </p>
            <p className="text-[14px] font-semibold text-foreground/80">{email}</p>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-[10px] bg-red-500/[0.06] border border-red-500/[0.08] px-4 py-3 text-[12px] text-red-400/70 font-medium">
              {error}
            </div>
          )}

          {/* OTP Input */}
          <div className="space-y-5">
            <OTPInput value={otpCode} onChange={setOtpCode} disabled={verifying} />

            <button
              onClick={handleVerify}
              disabled={otpCode.length !== 6 || verifying}
              className="flex w-full items-center justify-center rounded-[10px] bg-white px-4 py-2.5 text-[13px] font-semibold text-black transition-all duration-300 hover:bg-white/85 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {verifying ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
              ) : (
                'Verify & Continue'
              )}
            </button>
          </div>

          {/* Resend */}
          <div className="space-y-3">
            <div className="h-px bg-foreground/[0.06]" />
            <div className="flex flex-col items-center gap-2.5 pt-1">
              {countdown > 0 ? (
                <p className="text-[13px] text-foreground/30">
                  Resend code in <span className="font-semibold text-foreground/50 tabular-nums">{countdown}s</span>
                </p>
              ) : (
                <button
                  onClick={handleResend}
                  disabled={resending}
                  className="text-[13px] font-medium text-foreground/50 hover:text-foreground/80 transition-colors disabled:opacity-50"
                >
                  {resending ? 'Sending...' : "Didn't get the code? Resend"}
                </button>
              )}

              <button
                onClick={() => { setStep('form'); setError(''); setOtpCode('') }}
                className="text-[13px] font-medium text-foreground/30 hover:text-foreground/50 transition-colors"
              >
                Use a different email
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ═══════════ STEP 1: SIGNUP FORM ═══════════
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
            Create your account
          </p>
        </div>

        {/* Referral bonus banner */}
        {referralCode && (
          <div className="rounded-[10px] bg-emerald-500/[0.06] border border-emerald-500/[0.12] px-4 py-3 flex items-center gap-3">
            <Gift size={16} className="text-emerald-400 shrink-0" />
            <p className="text-[12px] text-emerald-400/80 font-medium">
              You&apos;ve been referred! Sign up to get <span className="font-bold text-emerald-400">500 free credits</span>.
            </p>
          </div>
        )}

        <div className="space-y-4">
          {error && (
            <div className="rounded-[10px] bg-red-500/[0.06] border border-red-500/[0.08] px-4 py-3 text-[12px] text-red-400/70 font-medium">
              {error}
            </div>
          )}

          {/* Google OAuth */}
          <button
            onClick={handleGoogleSignup}
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

          {/* Form */}
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-[12px] font-semibold text-foreground/60 uppercase tracking-[0.1em]">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                required
                className="flex h-10 w-full rounded-[10px] border border-foreground/[0.06] bg-card px-4 py-2 text-[14px] text-foreground/90 placeholder:text-foreground/30 focus:outline-none focus:border-foreground/[0.12] transition-all duration-300"
              />
            </div>

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
                  minLength={6}
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
              {password.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                          strength >= level ? strengthColors[strength] : 'bg-foreground/[0.06]'
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`text-[11px] font-medium ${
                    strength <= 1 ? 'text-red-400/60' :
                    strength === 2 ? 'text-yellow-400/60' :
                    strength === 3 ? 'text-blue-400/60' : 'text-emerald-400/60'
                  }`}>
                    {strengthLabels[strength]}
                  </p>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-[10px] bg-white px-4 py-2.5 text-[13px] font-semibold text-black transition-all duration-300 hover:bg-white/85 disabled:opacity-50"
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
              ) : (
                'Create Account'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-[13px] text-foreground/50 font-medium">
          Already have an account?{' '}
          <Link href="/login" className="text-foreground/80 hover:text-foreground transition-colors duration-300">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}

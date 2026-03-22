'use client'

import { useEffect, useState, Suspense, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle, Sparkles, ArrowRight, Loader2, AlertCircle } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'

function SuccessContent() {
  const router = useRouter()
  const { session } = useAuth()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [creditsAdded, setCreditsAdded] = useState(0)
  const [newBalance, setNewBalance] = useState(0)
  const [planName, setPlanName] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [countdown, setCountdown] = useState(5)
  const verifiedRef = useRef(false)

  // Verify the session and add credits
  useEffect(() => {
    if (!sessionId || !session?.access_token || verifiedRef.current) return
    verifiedRef.current = true

    const verify = async () => {
      try {
        const res = await fetch('/api/billing/verify-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ session_id: sessionId }),
        })
        const data = await res.json()

        if (res.ok && data.success) {
          setCreditsAdded(data.credits_added || 0)
          setNewBalance(data.new_balance || 0)
          setPlanName(data.plan || null)
          setStatus('success')
        } else {
          setErrorMsg(data.error || 'Verification failed')
          setStatus('error')
        }
      } catch {
        setErrorMsg('Could not verify payment. Your credits may take a moment to appear.')
        setStatus('error')
      }
    }
    verify()
  }, [sessionId, session?.access_token])

  // Countdown redirect after success
  useEffect(() => {
    if (status !== 'success') return
    if (countdown <= 0) { router.push('/ai-builder'); return }
    const t = setTimeout(() => setCountdown(countdown - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown, status, router])

  if (status === 'verifying') {
    return (
      <div className="dark flex min-h-[80vh] items-center justify-center px-4" style={{ colorScheme: 'dark' }}>
        <div className="max-w-md text-center space-y-6">
          <div className="flex justify-center">
            <Loader2 size={40} className="text-foreground/30 animate-spin" />
          </div>
          <div className="space-y-2">
            <h1 className="text-[24px] font-bold text-foreground">Verifying payment...</h1>
            <p className="text-[14px] text-foreground/40">Adding credits to your account</p>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="dark flex min-h-[80vh] items-center justify-center px-4" style={{ colorScheme: 'dark' }}>
        <div className="max-w-md text-center space-y-6">
          <div className="flex justify-center">
            <div className="h-20 w-20 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <AlertCircle size={40} className="text-amber-400" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-[24px] font-bold text-foreground">Payment received</h1>
            <p className="text-[14px] text-foreground/40">
              {errorMsg || 'Credits may take a moment to appear in your balance.'}
            </p>
          </div>
          <Link href="/ai-builder" className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-[14px] font-semibold text-black hover:bg-white/90 transition-colors">
            Go to AI Builder <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="dark flex min-h-[80vh] items-center justify-center px-4" style={{ colorScheme: 'dark' }}>
      <div className="max-w-md text-center space-y-6">
        <div className="flex justify-center">
          <div className="h-20 w-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <CheckCircle size={40} className="text-emerald-400" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-[28px] font-bold text-foreground">Payment Successful!</h1>
          <p className="text-[15px] text-foreground/50">
            {planName
              ? `You're now on the ${planName} plan.`
              : 'Credits have been added to your account.'
            }
          </p>
        </div>
        <div className="rounded-xl bg-foreground/[0.03] border border-foreground/[0.06] p-4 space-y-3">
          <div className="flex items-center justify-center gap-2 text-[16px] text-emerald-400 font-bold">
            <Sparkles size={18} />
            +{creditsAdded.toLocaleString()} credits added
          </div>
          <div className="text-[13px] text-foreground/40 font-medium">
            New balance: <span className="text-foreground/70 font-bold">{newBalance.toLocaleString()} credits</span>
          </div>
        </div>
        <div className="space-y-3">
          <Link href="/ai-builder" className="flex items-center justify-center gap-2 w-full rounded-xl bg-white py-3 text-[14px] font-semibold text-black hover:bg-white/90 transition-colors">
            Start Building <ArrowRight size={14} />
          </Link>
          <p className="text-[12px] text-foreground/25">Redirecting in {countdown}s...</p>
        </div>
      </div>
    </div>
  )
}

export default function BillingSuccessPage() {
  return <Suspense fallback={<div className="flex min-h-[80vh] items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground/20 border-t-transparent" /></div>}><SuccessContent /></Suspense>
}

'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle, Sparkles, ArrowRight } from 'lucide-react'
import Link from 'next/link'

function SuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    if (countdown <= 0) { router.push('/ai-builder'); return }
    const t = setTimeout(() => setCountdown(countdown - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown, router])

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
          <p className="text-[15px] text-foreground/50">Your plan has been upgraded and credits have been added to your account.</p>
        </div>
        <div className="rounded-xl bg-foreground/[0.03] border border-foreground/[0.06] p-4 space-y-2">
          <div className="flex items-center justify-center gap-2 text-[14px] text-emerald-400 font-semibold">
            <Sparkles size={16} />
            Credits added to your balance
          </div>
          <p className="text-[12px] text-foreground/30">Session: {sessionId?.slice(0, 20)}...</p>
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

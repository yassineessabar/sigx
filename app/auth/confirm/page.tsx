'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function ConfirmContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState('')

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code')
      const tokenHash = searchParams.get('token_hash')
      const type = searchParams.get('type')

      // Handle OAuth code exchange (PKCE — needs browser context)
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          console.error('OAuth callback error:', error.message)
          setError(error.message)
          setTimeout(() => router.replace('/login'), 2000)
          return
        }
        router.replace('/ai-builder')
        return
      }

      // Handle email verification token
      if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as 'signup' | 'email',
        })
        if (error) {
          console.error('Verify error:', error.message)
          router.replace('/login?message=verified')
          return
        }
        router.replace('/ai-builder')
        return
      }

      // No code or token — redirect to login
      router.replace('/login')
    }

    handleCallback()
  }, [searchParams, router])

  return (
    <div className="dark flex min-h-screen items-center justify-center bg-background" style={{ colorScheme: 'dark' }}>
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="h-[22px] w-[22px] rounded-[6px] bg-white flex items-center justify-center">
            <span className="text-[8px] font-black text-black tracking-[-0.06em]">SX</span>
          </div>
          <span className="text-[14px] font-semibold tracking-[-0.03em] text-foreground/90">SIGX</span>
        </div>
        {error ? (
          <p className="text-[13px] text-red-400/70">{error}</p>
        ) : (
          <>
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-foreground/20 border-t-transparent" />
            <p className="text-[13px] text-foreground/40">Signing you in...</p>
          </>
        )}
      </div>
    </div>
  )
}

export default function AuthConfirmPage() {
  return (
    <Suspense
      fallback={
        <div className="dark flex min-h-screen items-center justify-center bg-background" style={{ colorScheme: 'dark' }}>
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-foreground/20 border-t-transparent" />
        </div>
      }
    >
      <ConfirmContent />
    </Suspense>
  )
}

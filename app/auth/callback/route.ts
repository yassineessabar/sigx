import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const token_hash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type')

  const redirectTo = new URL('/ai-builder', url.origin)
  const errorRedirect = new URL('/login', url.origin)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Handle code exchange (OAuth or magic link)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      console.error('Auth callback error (code):', error.message)
      return NextResponse.redirect(errorRedirect)
    }
    return NextResponse.redirect(redirectTo)
  }

  // Handle token_hash verification (email confirmation)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'signup' | 'email',
    })
    if (error) {
      console.error('Auth callback error (verify):', error.message)
      // Redirect to login with a message
      const loginWithMsg = new URL('/login', url.origin)
      loginWithMsg.searchParams.set('message', 'verified')
      return NextResponse.redirect(loginWithMsg)
    }
    return NextResponse.redirect(redirectTo)
  }

  // Fallback — redirect to login
  return NextResponse.redirect(errorRedirect)
}

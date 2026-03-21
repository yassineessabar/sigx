import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const url = new URL(request.url)

  // Pass all query params to a client-side page that can handle PKCE exchange
  const callbackUrl = new URL('/auth/confirm', url.origin)

  // Forward all params (code, token_hash, type, etc.)
  url.searchParams.forEach((value, key) => {
    callbackUrl.searchParams.set(key, value)
  })

  return NextResponse.redirect(callbackUrl)
}

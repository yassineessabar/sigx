import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const { error } = await supabaseAdmin.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
      },
    })

    if (error) {
      return NextResponse.json({ error: 'Could not send code. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'New code sent.' })
  } catch (error) {
    console.error('Resend code error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

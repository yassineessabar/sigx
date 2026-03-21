import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { otpStore } from '../signup/route'

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json()

    if (!email || !code) {
      return NextResponse.json({ error: 'Email and code are required' }, { status: 400 })
    }

    const key = email.toLowerCase()
    const stored = otpStore.get(key)

    if (!stored) {
      return NextResponse.json({ error: 'No verification code found. Please request a new one.' }, { status: 400 })
    }

    if (Date.now() > stored.expiresAt) {
      otpStore.delete(key)
      return NextResponse.json({ error: 'Code expired. Please request a new one.' }, { status: 400 })
    }

    if (stored.code !== code) {
      return NextResponse.json({ error: 'Invalid code. Please try again.' }, { status: 400 })
    }

    // Code is valid — confirm the user's email
    otpStore.delete(key)

    await supabaseAdmin.auth.admin.updateUserById(stored.userId, {
      email_confirm: true,
    })

    // Generate a session for the user
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: key,
    })

    // Try to sign in the user by creating a session directly
    // Since we confirmed the email, we can generate access tokens
    if (sessionError) {
      // Fallback: tell the user to sign in manually
      return NextResponse.json({
        success: true,
        session: null,
        message: 'Email verified! Please sign in.',
      })
    }

    return NextResponse.json({
      success: true,
      session: null,
      verified: true,
      message: 'Email verified! You can now sign in.',
    })
  } catch (error) {
    console.error('Verify error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

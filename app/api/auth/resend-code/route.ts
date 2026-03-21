import { NextRequest, NextResponse } from 'next/server'
import { sendOtpEmail } from '@/lib/email'
import { otpStore } from '../signup/route'

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const key = email.toLowerCase()
    const existing = otpStore.get(key)

    if (!existing) {
      return NextResponse.json({ error: 'No pending verification for this email.' }, { status: 400 })
    }

    // Generate new code
    const code = generateOtp()
    otpStore.set(key, {
      code,
      expiresAt: Date.now() + 10 * 60 * 1000,
      userId: existing.userId,
    })

    try {
      await sendOtpEmail(email, code)
      return NextResponse.json({ success: true, message: 'New code sent.' })
    } catch (emailErr) {
      console.error('Resend email failed:', emailErr)
      return NextResponse.json({ error: 'Could not send code. Please try again.' }, { status: 500 })
    }
  } catch (error) {
    console.error('Resend code error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

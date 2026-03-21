import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendOtpEmail } from '@/lib/email'

const REFERRAL_CREDITS_REFERRER = 500
const REFERRAL_CREDITS_REFERRED = 500

// Generate a 6-digit OTP
function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// In-memory OTP store (use Redis in production)
const otpStore = new Map<string, { code: string; expiresAt: number; userId: string }>()

export { otpStore }

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName, referralCode } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    // Create user WITHOUT auto-confirming email
    const { data, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
      user_metadata: { full_name: fullName || '', referral_code: referralCode || null },
    })

    if (createError) {
      if (createError.message.includes('already been registered')) {
        return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
      }
      return NextResponse.json({ error: createError.message }, { status: 400 })
    }

    const newUserId = data?.user?.id

    // Handle referral
    if (referralCode && newUserId) {
      try {
        const { data: profiles } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .ilike('id', `${referralCode.toLowerCase()}%`)
          .limit(1)
        const referrer = profiles?.[0]

        if (referrer && referrer.id !== newUserId) {
          await supabaseAdmin.from('referrals').insert({
            referrer_id: referrer.id,
            referred_email: email,
            referred_user_id: newUserId,
            status: 'signed_up',
            referrer_credits_awarded: 0,
            referred_credits_awarded: 0,
          })

          const { data: refProfile } = await supabaseAdmin.from('profiles').select('credits_balance').eq('id', referrer.id).single()
          await supabaseAdmin.from('profiles').update({ credits_balance: (refProfile?.credits_balance ?? 0) + REFERRAL_CREDITS_REFERRER }).eq('id', referrer.id)

          const { data: newProfile } = await supabaseAdmin.from('profiles').select('credits_balance').eq('id', newUserId).single()
          await supabaseAdmin.from('profiles').update({ credits_balance: (newProfile?.credits_balance ?? 0) + REFERRAL_CREDITS_REFERRED }).eq('id', newUserId)

          await supabaseAdmin
            .from('referrals')
            .update({
              status: 'completed',
              referrer_credits_awarded: REFERRAL_CREDITS_REFERRER,
              referred_credits_awarded: REFERRAL_CREDITS_REFERRED,
              completed_at: new Date().toISOString(),
            })
            .eq('referred_user_id', newUserId)
        }
      } catch (refErr) {
        console.error('Referral processing error:', refErr)
      }
    }

    // Generate and send OTP via our own SMTP
    if (newUserId) {
      const code = generateOtp()
      otpStore.set(email.toLowerCase(), {
        code,
        expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
        userId: newUserId,
      })

      try {
        await sendOtpEmail(email, code)
        return NextResponse.json({
          success: true,
          requiresVerification: true,
          message: 'Verification code sent to your email.',
        })
      } catch (emailErr) {
        console.error('Email send failed:', emailErr)
        // Auto-confirm if email fails so user isn't stuck
        await supabaseAdmin.auth.admin.updateUserById(newUserId, { email_confirm: true })
        return NextResponse.json({
          success: true,
          requiresVerification: false,
          message: 'Account created successfully.',
        })
      }
    }

    return NextResponse.json({
      success: true,
      requiresVerification: false,
      message: 'Account created.',
    })
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

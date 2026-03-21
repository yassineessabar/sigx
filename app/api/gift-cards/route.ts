import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromToken } from '@/lib/api-auth'
import { stripe } from '@/lib/stripe'

function generateCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `SIGX-${seg()}-${seg()}`
}

export async function GET(request: NextRequest) {
  const user = await getUserFromToken(request.headers.get('authorization'))
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Expire any past-due gift cards
  await supabaseAdmin
    .from('gift_cards')
    .update({ status: 'expired' })
    .eq('sender_id', user.id)
    .in('status', ['pending', 'sent'])
    .lt('expires_at', new Date().toISOString())
    .not('expires_at', 'is', null)

  const { data, error } = await supabaseAdmin
    .from('gift_cards')
    .select('*')
    .eq('sender_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ gift_cards: data || [] })
}

export async function POST(request: NextRequest) {
  const user = await getUserFromToken(request.headers.get('authorization'))
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { recipient_email, recipient_name, amount, credits, design, message } = body

  if (!recipient_email || !amount || !credits) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (amount <= 0 || credits <= 0) {
    return NextResponse.json({ error: 'Amount and credits must be positive' }, { status: 400 })
  }

  const code = generateCode()
  const expiresAt = new Date()
  expiresAt.setMonth(expiresAt.getMonth() + 12)

  // Get user email for Stripe
  const { data: profile } = await supabaseAdmin.from('profiles').select('email').eq('id', user.id).single()

  // If Stripe is configured, create a Checkout Session for payment
  if (stripe) {
    try {
      const origin = request.headers.get('origin') || 'http://localhost:3000'

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        customer_email: profile?.email || undefined,
        line_items: [{
          price_data: {
            currency: 'usd',
            unit_amount: Math.round(amount * 100),
            product_data: {
              name: `SIGX Gift Card — ${credits} Credits`,
              description: `Gift card for ${recipient_name || recipient_email}. Code: ${code}`,
            },
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${origin}/gift?success=true&code=${code}`,
        cancel_url: `${origin}/gift?cancelled=true`,
        metadata: {
          type: 'gift_card',
          gift_card_code: code,
          sender_id: user.id,
          recipient_email,
          recipient_name: recipient_name || '',
          credits: String(credits),
          design: design || 'sunrise',
          message: message || '',
        },
      })

      // Save gift card as pending (will be activated by webhook)
      await supabaseAdmin.from('gift_cards').insert({
        sender_id: user.id,
        recipient_email,
        recipient_name: recipient_name || null,
        amount,
        credits,
        design: design || 'sunrise',
        message: message || null,
        code,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
        stripe_coupon_id: session.id,
      })

      return NextResponse.json({ checkout_url: session.url, code })
    } catch (err: any) {
      console.error('Stripe gift card checkout error:', err.message)
      // Fall through to non-Stripe flow
    }
  }

  // No Stripe — create gift card directly (free/internal)
  const { data, error } = await supabaseAdmin
    .from('gift_cards')
    .insert({
      sender_id: user.id,
      recipient_email,
      recipient_name: recipient_name || null,
      amount,
      credits,
      design: design || 'sunrise',
      message: message || null,
      code,
      status: 'sent',
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ gift_card: data })
}

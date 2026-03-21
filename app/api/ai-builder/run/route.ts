import { NextRequest, NextResponse } from 'next/server'
import { getUserFromToken } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * POST /api/ai-builder/run
 * Forwards prompt + iterations + symbol + period to the Hybrid Manager.
 * Returns { job_id, status, ea_name }.
 * Requires auth. Deducts 1 credit.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request.headers.get('authorization'))
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check credits
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('credits_balance')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.credits_balance ?? 0) <= 0) {
      return NextResponse.json(
        { error: 'NO_CREDITS', message: 'You have no credits remaining. Please upgrade your plan.' },
        { status: 402 }
      )
    }

    // Deduct 1 credit
    const newBalance = Math.max((profile.credits_balance ?? 0) - 1, 0)
    await supabaseAdmin
      .from('profiles')
      .update({ credits_balance: newBalance })
      .eq('id', user.id)

    const body = await request.json()
    const { prompt, iterations = 3, symbol = 'EURUSD', period = 'H1', ea_name } = body

    if (!prompt) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 })
    }

    const managerUrl = process.env.MT5_MANAGER_URL
    const workerKey = process.env.MT5_WORKER_KEY

    if (!managerUrl) {
      return NextResponse.json({ error: 'MT5_MANAGER_URL not configured' }, { status: 500 })
    }

    const res = await fetch(`${managerUrl}/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(workerKey ? { 'x-api-key': workerKey } : {}),
      },
      body: JSON.stringify({
        prompt,
        iterations,
        symbol,
        period,
        ...(ea_name ? { ea_name } : {}),
      }),
    })

    if (!res.ok) {
      const errBody = await res.text()
      console.error('Hybrid Manager /run error:', res.status, errBody)
      return NextResponse.json(
        { error: 'Failed to start job', detail: errBody },
        { status: res.status }
      )
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Run route error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromToken } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { CREDIT_COSTS, deductCredits, canAfford } from '@/lib/credit-costs'

/**
 * POST /api/ai-builder/run
 * Forwards prompt + iterations + symbol + period to the Hybrid Manager.
 * Returns { job_id, status, ea_name }.
 * Requires auth. Deducts credits based on iteration count.
 *
 * Cost: PIPELINE_ITERATION × iterations (e.g., 3 iterations = 45 credits)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request.headers.get('authorization'))
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const iterations = body.iterations || 3
    const totalCost = CREDIT_COSTS.PIPELINE_ITERATION * iterations

    // Check and deduct credits
    const deduction = await deductCredits(supabaseAdmin, user.id, totalCost, `Pipeline (${iterations} iterations)`)
    if (!deduction.success) {
      const { balance } = await canAfford(supabaseAdmin, user.id, 0)
      return NextResponse.json(
        {
          error: 'NO_CREDITS',
          message: `This pipeline costs ${totalCost} credits (${CREDIT_COSTS.PIPELINE_ITERATION}/iteration × ${iterations}). You have ${balance} credits.`,
          credits_required: totalCost,
          credits_balance: balance,
        },
        { status: 402 }
      )
    }
    const { prompt, symbol = 'EURUSD', period = 'H1', ea_name } = body

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

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromToken } from '@/lib/api-auth'

const CRITERIA = {
  min_sharpe: 0.5,
  max_drawdown: 15,
  min_trades: 50,
  min_profit_factor: 1.0,
}

/**
 * POST /api/ai-builder/challenge-submit
 * Submit a strategy to the $10K challenge.
 * Body: { strategy_id, chat_id?, metrics }
 */
export async function POST(request: NextRequest) {
  const user = await getUserFromToken(request.headers.get('authorization'))
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { strategy_id, chat_id, metrics } = body

  if (!strategy_id || !metrics) {
    return NextResponse.json({ error: 'strategy_id and metrics are required' }, { status: 400 })
  }

  // Server-side validation of criteria
  const sharpe = metrics.sharpe || 0
  const drawdown = metrics.max_drawdown || 0
  const trades = metrics.total_trades || 0
  const pf = metrics.profit_factor || 0

  const failures: string[] = []
  if (sharpe < CRITERIA.min_sharpe) failures.push(`Sharpe ${sharpe.toFixed(2)} < ${CRITERIA.min_sharpe}`)
  if (drawdown <= 0 || drawdown > CRITERIA.max_drawdown) failures.push(`Drawdown ${drawdown.toFixed(1)}% > ${CRITERIA.max_drawdown}%`)
  if (trades < CRITERIA.min_trades) failures.push(`Trades ${trades} < ${CRITERIA.min_trades}`)
  if (pf < CRITERIA.min_profit_factor) failures.push(`PF ${pf.toFixed(2)} < ${CRITERIA.min_profit_factor}`)

  if (failures.length > 0) {
    return NextResponse.json({
      error: `Strategy does not meet challenge criteria: ${failures.join(', ')}`,
    }, { status: 400 })
  }

  // Upsert submission (one per user — latest submission wins)
  const { error: upsertError } = await supabaseAdmin
    .from('challenge_submissions')
    .upsert(
      {
        user_id: user.id,
        strategy_id,
        chat_id: chat_id || null,
        metrics,
        sharpe,
        max_drawdown: drawdown,
        total_trades: trades,
        profit_factor: pf,
        submitted_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

  if (upsertError) {
    console.error('Challenge submission error:', upsertError)
    return NextResponse.json({ error: 'Failed to submit. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: 'Strategy submitted to the $10K Challenge!',
  })
}

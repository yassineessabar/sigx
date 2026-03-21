import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromToken } from '@/lib/api-auth'

// Eligibility criteria
const MIN_SHARPE = 1.0
const MAX_DRAWDOWN = -15 // must be better (less negative) than this
const MIN_RETURN = 10 // minimum 10% return

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request.headers.get('authorization'))
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { strategy_id, price_cents, seller_description } = body

    if (!strategy_id) return NextResponse.json({ error: 'strategy_id is required' }, { status: 400 })
    if (price_cents !== undefined && price_cents < 0) return NextResponse.json({ error: 'Price cannot be negative' }, { status: 400 })

    // Fetch strategy (must be owned by user)
    const { data: strategy, error: fetchErr } = await supabaseAdmin
      .from('strategies')
      .select('*')
      .eq('id', strategy_id)
      .eq('user_id', user.id)
      .single()

    if (fetchErr || !strategy) {
      return NextResponse.json({ error: 'Strategy not found or not owned by you' }, { status: 404 })
    }

    // Check if already published
    if (strategy.is_public && strategy.marketplace_approved) {
      return NextResponse.json({ error: 'Strategy is already published on the marketplace' }, { status: 409 })
    }

    // Must have MQL code
    if (!strategy.mql5_code || strategy.mql5_code.trim().length < 10) {
      return NextResponse.json({
        error: 'Strategy must have MQL4/MQL5 code to be published',
        criteria: { mql_code: false },
      }, { status: 400 })
    }

    // Must be backtested
    if (!['backtested', 'deployed'].includes(strategy.status)) {
      return NextResponse.json({
        error: 'Strategy must be backtested before publishing',
        criteria: { backtested: false },
      }, { status: 400 })
    }

    // Eligibility checks
    const checks = {
      sharpe: { value: strategy.sharpe_ratio, min: MIN_SHARPE, pass: (strategy.sharpe_ratio || 0) >= MIN_SHARPE },
      drawdown: { value: strategy.max_drawdown, max: MAX_DRAWDOWN, pass: (strategy.max_drawdown || 0) >= MAX_DRAWDOWN },
      returns: { value: strategy.total_return, min: MIN_RETURN, pass: (strategy.total_return || 0) >= MIN_RETURN },
    }

    const allPass = checks.sharpe.pass && checks.drawdown.pass && checks.returns.pass

    if (!allPass) {
      return NextResponse.json({
        error: 'Strategy does not meet marketplace eligibility criteria',
        criteria: {
          sharpe: { required: `≥ ${MIN_SHARPE}`, actual: strategy.sharpe_ratio || 0, pass: checks.sharpe.pass },
          max_drawdown: { required: `≥ ${MAX_DRAWDOWN}%`, actual: strategy.max_drawdown || 0, pass: checks.drawdown.pass },
          total_return: { required: `≥ ${MIN_RETURN}%`, actual: strategy.total_return || 0, pass: checks.returns.pass },
        },
      }, { status: 400 })
    }

    // All criteria met — publish
    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('strategies')
      .update({
        is_public: true,
        marketplace_approved: true,
        price_cents: price_cents || 0,
        seller_description: seller_description || strategy.description,
        updated_at: new Date().toISOString(),
      })
      .eq('id', strategy_id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

    return NextResponse.json({
      strategy: updated,
      message: price_cents > 0
        ? `Strategy published at $${(price_cents / 100).toFixed(2)}! You earn 80% of each sale.`
        : 'Strategy published for free on the marketplace!',
    })
  } catch (error) {
    console.error('Publish error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET - check eligibility without publishing
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request.headers.get('authorization'))
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const strategyId = searchParams.get('strategy_id')
    if (!strategyId) return NextResponse.json({ error: 'strategy_id required' }, { status: 400 })

    const { data: strategy } = await supabaseAdmin
      .from('strategies')
      .select('sharpe_ratio, max_drawdown, total_return, status, mql5_code, is_public, marketplace_approved')
      .eq('id', strategyId)
      .eq('user_id', user.id)
      .single()

    if (!strategy) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const eligible = {
      sharpe: { required: MIN_SHARPE, actual: strategy.sharpe_ratio || 0, pass: (strategy.sharpe_ratio || 0) >= MIN_SHARPE },
      max_drawdown: { required: MAX_DRAWDOWN, actual: strategy.max_drawdown || 0, pass: (strategy.max_drawdown || 0) >= MAX_DRAWDOWN },
      total_return: { required: MIN_RETURN, actual: strategy.total_return || 0, pass: (strategy.total_return || 0) >= MIN_RETURN },
      has_code: { pass: !!(strategy.mql5_code && strategy.mql5_code.trim().length >= 10) },
      backtested: { pass: ['backtested', 'deployed'].includes(strategy.status) },
    }

    const allPass = Object.values(eligible).every(c => c.pass)

    return NextResponse.json({
      eligible: allPass,
      alreadyPublished: strategy.is_public && strategy.marketplace_approved,
      criteria: eligible,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

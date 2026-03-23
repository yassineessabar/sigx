import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getUserFromToken } from '@/lib/api-auth'
import { saveLearning, compositeScore } from '@/lib/strategy-learnings'

/**
 * POST /api/chat/[chatId]/backtest-result
 * Saves backtest results as a system message so version history persists across page reloads.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const user = await getUserFromToken(request.headers.get('authorization'))
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { chatId } = await params
    const { metrics, mql5_code, strategy_snapshot, slot_id, vps_host, duration_s } = await request.json()

    if (!metrics) {
      return NextResponse.json({ error: 'metrics required' }, { status: 400 })
    }

    // Verify chat belongs to user
    const { data: chat } = await supabaseAdmin
      .from('chats')
      .select('id')
      .eq('id', chatId)
      .eq('user_id', user.id)
      .single()

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
    }

    // Save as an assistant message with backtest metadata
    const { error } = await supabaseAdmin.from('chat_messages').insert({
      chat_id: chatId,
      user_id: user.id,
      role: 'assistant',
      content: `Backtest completed — ${metrics.total_trades ?? 0} trades, PF ${Number(metrics.profit_factor ?? 0).toFixed(2)}, Sharpe ${Number(metrics.sharpe ?? 0).toFixed(2)}`,
      metadata: {
        type: 'backtest_result',
        backtest_snapshot: metrics,
        mql5_code: mql5_code || null,
        strategy_snapshot: strategy_snapshot || null,
        slot_id: slot_id ?? null,
        vps_host: vps_host ?? null,
        duration_s: duration_s ?? null,
      },
    })

    if (error) {
      console.error('Save backtest result error:', error)
      return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
    }

    // Update the linked strategy record with latest backtest metrics
    const { data: chatWithStrategy } = await supabaseAdmin
      .from('chats')
      .select('strategy_id')
      .eq('id', chatId)
      .single()

    if (chatWithStrategy?.strategy_id) {
      const strategyUpdate: Record<string, unknown> = {
        sharpe_ratio: metrics.sharpe ?? null,
        max_drawdown: metrics.max_drawdown ?? null,
        win_rate: metrics.win_rate ?? null,
        total_return: metrics.total_return ?? null,
        equity_curve: metrics.equity_curve ?? null,
        status: 'backtested',
        updated_at: new Date().toISOString(),
      }
      if (mql5_code) strategyUpdate.mql5_code = mql5_code
      if (strategy_snapshot?.name) strategyUpdate.name = strategy_snapshot.name
      if (strategy_snapshot?.market) strategyUpdate.market = strategy_snapshot.market

      await supabaseAdmin
        .from('strategies')
        .update(strategyUpdate)
        .eq('id', chatWithStrategy.strategy_id)
        .eq('user_id', user.id)

      // Save learning entry so future optimization runs learn from this backtest
      const metricsNorm = {
        profit_factor: Number(metrics.profit_factor || 0),
        total_trades: Number(metrics.total_trades || 0),
        sharpe: Number(metrics.sharpe || 0),
        win_rate: Number(metrics.win_rate || 0),
        max_drawdown: Math.abs(Number(metrics.max_drawdown || 0)),
        net_profit: Number(metrics.net_profit || 0),
      }
      const score = compositeScore(metricsNorm)

      saveLearning(supabaseAdmin, chatWithStrategy.strategy_id, {
        timestamp: new Date().toISOString(),
        changeSummary: 'manual backtest run',
        metrics: metricsNorm,
        score,
        improved: false, // will be recalculated when loading knowledge
        source: 'manual_backtest',
      }).catch(err => console.error('Save learning error:', err))
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Backtest result route error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

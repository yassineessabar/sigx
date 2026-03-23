import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Persistent strategy learning system.
 *
 * Every backtest run stores what was tried, what changed, and the resulting
 * metrics. This accumulated knowledge is loaded before each AI improvement
 * call so Claude gets smarter with every single run.
 *
 * Storage: strategy.parameters.learnings[] in the strategies table (JSONB).
 * Also queries all backtest_result chat messages across all chats for a strategy.
 */

export interface LearningEntry {
  timestamp: string
  iteration?: number
  changeSummary: string
  metrics: {
    profit_factor: number
    total_trades: number
    sharpe: number
    win_rate: number
    max_drawdown: number
    net_profit: number
  }
  score: number
  improved: boolean
  source: 'optimize' | 'manual_backtest' | 'chat_improve'
}

export interface StrategyKnowledge {
  /** Total number of backtests ever run */
  totalRuns: number
  /** Best metrics ever achieved */
  bestEver: {
    profit_factor: number
    total_trades: number
    sharpe: number
    win_rate: number
    net_profit: number
    max_drawdown: number
    score: number
  } | null
  /** Changes that led to improvements */
  whatWorked: string[]
  /** Changes that made things worse */
  whatFailed: string[]
  /** Full history of recent runs (last 20) */
  recentHistory: LearningEntry[]
  /** Trend: are we getting better or worse? */
  trend: 'improving' | 'stagnating' | 'declining' | 'insufficient_data'
}

/**
 * Load all accumulated knowledge for a strategy.
 * Combines learnings from strategy.parameters AND chat message history.
 */
export async function loadStrategyKnowledge(
  supabase: SupabaseClient,
  strategyId: string
): Promise<StrategyKnowledge> {
  const knowledge: StrategyKnowledge = {
    totalRuns: 0,
    bestEver: null,
    whatWorked: [],
    whatFailed: [],
    recentHistory: [],
    trend: 'insufficient_data',
  }

  try {
    // 1. Load learnings stored on the strategy record
    const { data: strategy } = await supabase
      .from('strategies')
      .select('parameters')
      .eq('id', strategyId)
      .single()

    const storedLearnings: LearningEntry[] =
      (strategy?.parameters as Record<string, unknown>)?.learnings as LearningEntry[] || []

    // 2. Load all backtest_result messages across all chats for this strategy
    const { data: chats } = await supabase
      .from('chats')
      .select('id')
      .eq('strategy_id', strategyId)

    const chatIds = (chats || []).map(c => c.id)
    let messageLearnings: LearningEntry[] = []

    if (chatIds.length > 0) {
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('metadata, created_at')
        .in('chat_id', chatIds)
        .order('created_at', { ascending: true })
        .limit(100)

      for (const msg of messages || []) {
        const meta = msg.metadata as Record<string, unknown> | null
        if (meta?.type !== 'backtest_result') continue
        const bt = meta.backtest_snapshot as Record<string, number> | undefined
        if (!bt) continue

        messageLearnings.push({
          timestamp: msg.created_at,
          changeSummary: 'manual backtest run',
          metrics: {
            profit_factor: bt.profit_factor || 0,
            total_trades: bt.total_trades || 0,
            sharpe: bt.sharpe || 0,
            win_rate: bt.win_rate || 0,
            max_drawdown: Math.abs(bt.max_drawdown || 0),
            net_profit: bt.net_profit || 0,
          },
          score: compositeScore(bt),
          improved: false,
          source: 'manual_backtest',
        })
      }
    }

    // 3. Merge and deduplicate (stored learnings take priority)
    const allLearnings = [...messageLearnings, ...storedLearnings]
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    // Mark improvements by comparing each run to the previous best
    let runningBestScore = -Infinity
    for (const entry of allLearnings) {
      if (entry.score > runningBestScore) {
        entry.improved = true
        runningBestScore = entry.score
      }
    }

    knowledge.totalRuns = allLearnings.length
    knowledge.recentHistory = allLearnings.slice(-20)

    // 4. Find best-ever metrics
    let bestScore = -Infinity
    for (const entry of allLearnings) {
      if (entry.score > bestScore) {
        bestScore = entry.score
        knowledge.bestEver = { ...entry.metrics, score: entry.score }
      }
    }

    // 5. Extract what worked vs what failed
    for (const entry of allLearnings) {
      if (entry.changeSummary === 'manual backtest run') continue
      if (entry.improved && entry.changeSummary) {
        knowledge.whatWorked.push(entry.changeSummary)
      } else if (!entry.improved && entry.changeSummary) {
        knowledge.whatFailed.push(entry.changeSummary)
      }
    }
    // Keep only unique, last 10
    knowledge.whatWorked = [...new Set(knowledge.whatWorked)].slice(-10)
    knowledge.whatFailed = [...new Set(knowledge.whatFailed)].slice(-10)

    // 6. Calculate trend from last 5 runs
    if (allLearnings.length >= 3) {
      const last5 = allLearnings.slice(-5)
      const scores = last5.map(e => e.score)
      const firstHalf = scores.slice(0, Math.floor(scores.length / 2))
      const secondHalf = scores.slice(Math.floor(scores.length / 2))
      const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
      const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length

      if (avgSecond > avgFirst * 1.05) {
        knowledge.trend = 'improving'
      } else if (avgSecond < avgFirst * 0.95) {
        knowledge.trend = 'declining'
      } else {
        knowledge.trend = 'stagnating'
      }
    }
  } catch (err) {
    console.error('Load strategy knowledge error:', err)
  }

  return knowledge
}

/**
 * Save a learning entry to the strategy record.
 */
export async function saveLearning(
  supabase: SupabaseClient,
  strategyId: string,
  entry: LearningEntry
): Promise<void> {
  try {
    // Load current learnings
    const { data: strategy } = await supabase
      .from('strategies')
      .select('parameters')
      .eq('id', strategyId)
      .single()

    const params = (strategy?.parameters as Record<string, unknown>) || {}
    const learnings: LearningEntry[] = (params.learnings as LearningEntry[]) || []

    // Append and cap at 50 entries
    learnings.push(entry)
    if (learnings.length > 50) {
      learnings.splice(0, learnings.length - 50)
    }

    await supabase
      .from('strategies')
      .update({
        parameters: { ...params, learnings },
        updated_at: new Date().toISOString(),
      })
      .eq('id', strategyId)
  } catch (err) {
    console.error('Save learning error:', err)
  }
}

/**
 * Save multiple learning entries at once (after an optimization run).
 */
export async function saveLearnings(
  supabase: SupabaseClient,
  strategyId: string,
  entries: LearningEntry[]
): Promise<void> {
  try {
    const { data: strategy } = await supabase
      .from('strategies')
      .select('parameters')
      .eq('id', strategyId)
      .single()

    const params = (strategy?.parameters as Record<string, unknown>) || {}
    const learnings: LearningEntry[] = (params.learnings as LearningEntry[]) || []

    learnings.push(...entries)
    if (learnings.length > 50) {
      learnings.splice(0, learnings.length - 50)
    }

    await supabase
      .from('strategies')
      .update({
        parameters: { ...params, learnings },
        updated_at: new Date().toISOString(),
      })
      .eq('id', strategyId)
  } catch (err) {
    console.error('Save learnings error:', err)
  }
}

/**
 * Build a knowledge prompt that tells Claude everything learned so far.
 */
export function buildKnowledgePrompt(knowledge: StrategyKnowledge): string {
  if (knowledge.totalRuns === 0) {
    return ''
  }

  const parts: string[] = []

  parts.push(`\n══════════════════════════════════════════`)
  parts.push(`PERSISTENT STRATEGY KNOWLEDGE (${knowledge.totalRuns} total runs)`)
  parts.push(`══════════════════════════════════════════`)

  // Trend
  if (knowledge.trend === 'improving') {
    parts.push(`TREND: ↑ IMPROVING — recent changes are working. Continue in this direction.`)
  } else if (knowledge.trend === 'declining') {
    parts.push(`TREND: ↓ DECLINING — recent changes are making things WORSE. Try a DIFFERENT approach.`)
  } else if (knowledge.trend === 'stagnating') {
    parts.push(`TREND: → STAGNATING — results are flat. Need a DIFFERENT type of change (don't repeat what's been tried).`)
  }

  // Best ever
  if (knowledge.bestEver) {
    const b = knowledge.bestEver
    parts.push(`\nBEST RESULTS EVER ACHIEVED (your target to beat):`)
    parts.push(`  PF=${b.profit_factor.toFixed(2)}, Trades=${b.total_trades}, Sharpe=${b.sharpe.toFixed(2)}, WinRate=${b.win_rate.toFixed(1)}%, DD=${b.max_drawdown.toFixed(1)}%, Net=$${b.net_profit.toFixed(0)}, Score=${b.score.toFixed(3)}`)
  }

  // What worked
  if (knowledge.whatWorked.length > 0) {
    parts.push(`\nCHANGES THAT IMPROVED THE STRATEGY (build on these):`)
    for (const w of knowledge.whatWorked) {
      parts.push(`  ✓ ${w}`)
    }
  }

  // What failed
  if (knowledge.whatFailed.length > 0) {
    parts.push(`\nCHANGES THAT MADE IT WORSE (do NOT repeat):`)
    for (const f of knowledge.whatFailed) {
      parts.push(`  ✗ ${f}`)
    }
  }

  // Recent history (last 10)
  if (knowledge.recentHistory.length > 0) {
    const recent = knowledge.recentHistory.slice(-10)
    parts.push(`\nRECENT RUN HISTORY (last ${recent.length} of ${knowledge.totalRuns} total):`)
    for (const h of recent) {
      const m = h.metrics
      const mark = h.improved ? '✓' : '✗'
      const date = new Date(h.timestamp).toLocaleDateString()
      parts.push(`  ${mark} [${date}] Score=${h.score.toFixed(3)}: PF=${m.profit_factor.toFixed(2)}, ${m.total_trades} trades, Sharpe=${m.sharpe.toFixed(2)}, WR=${m.win_rate.toFixed(1)}% | ${h.changeSummary}`)
    }
  }

  parts.push(`══════════════════════════════════════════\n`)

  return parts.join('\n')
}

/**
 * Composite score that balances multiple metrics.
 * Higher = better. Penalises zero/low trades heavily.
 *
 * THIS IS THE SINGLE SOURCE OF TRUTH — import this everywhere,
 * do not duplicate the formula.
 */
export function compositeScore(m: Record<string, number>): number {
  const trades = m.total_trades || 0
  const pf = m.profit_factor || 0
  const sharpe = m.sharpe || 0
  const dd = Math.abs(m.max_drawdown || 0)
  const winRate = m.win_rate || 0
  const net = m.net_profit || 0

  if (trades === 0) return -1000

  const tradePenalty = trades < 30 ? (trades / 30) * 0.5 : 1.0
  const pfScore = Math.min(pf, 3.0) / 3.0
  const sharpeScore = Math.min(Math.max(sharpe, -2), 3) / 3
  const wrScore = winRate / 100
  const tradeScore = Math.min(trades / 200, 1.0)
  const ddScore = dd <= 0.01 ? 1.0 : Math.max(0, 1 - dd / 30)

  const raw = pfScore * 0.30 + sharpeScore * 0.25 + wrScore * 0.15 + tradeScore * 0.15 + ddScore * 0.15
  const netBonus = net > 0 ? 0.05 : net < 0 ? -0.05 : 0

  return (raw + netBonus) * tradePenalty
}

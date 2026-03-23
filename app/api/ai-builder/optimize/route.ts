import { NextRequest } from 'next/server'
import { getUserFromToken } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { CREDIT_COSTS, deductCredits } from '@/lib/credit-costs'
import {
  compileAndBacktestEA,
  type CompileAndBacktestResult,
} from '@/lib/mt5-worker'
import Anthropic from '@anthropic-ai/sdk'
import {
  loadStrategyKnowledge,
  saveLearnings,
  buildKnowledgePrompt,
  compositeScore,
  type LearningEntry,
  type StrategyKnowledge,
} from '@/lib/strategy-learnings'

const MAX_FIX_RETRIES = 3

function getAnthropic(): Anthropic | null {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key || key === 'your-anthropic-key-here' || !key.startsWith('sk-ant-')) return null
  return new Anthropic({ apiKey: key })
}

/**
 * POST /api/ai-builder/optimize  (SSE stream)
 * Runs an optimization loop: for each iteration, calls Claude to improve
 * the code based on previous results, compiles, backtests, compares.
 *
 * Body: {
 *   ea_name: string,
 *   mq5_code: string,
 *   symbol?: string,
 *   period?: string,
 *   iterations?: number,
 *   previous_results?: object
 * }
 *
 * Streams:
 *   { type: 'iteration', iteration: N, metrics, improved: bool }
 *   { type: 'done', best_code, best_metrics }
 *   { type: 'error', message }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request.headers.get('authorization'))
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
      })
    }

    const body = await request.json()
    const {
      ea_name,
      mq5_code,
      symbol = 'XAUUSD',
      period = 'H1',
      iterations = 3,
      previous_results,
      chatId,
    } = body

    if (!ea_name || !mq5_code) {
      return new Response(
        JSON.stringify({ error: 'ea_name and mq5_code are required' }),
        { status: 400 }
      )
    }

    // Pre-check: can user afford the full optimization?
    const totalCost = CREDIT_COSTS.OPTIMIZE_ITERATION * iterations
    const deduction = await deductCredits(supabaseAdmin, user.id, totalCost, `Optimize (${iterations} iterations)`)
    if (!deduction.success) {
      return new Response(
        JSON.stringify({ error: deduction.error, code: 'NO_CREDITS', credits_required: totalCost }),
        { status: 402 }
      )
    }

    // Load persistent strategy knowledge (what worked/failed in ALL past runs)
    let strategyId: string | null = null
    let persistentKnowledge: StrategyKnowledge | null = null

    if (chatId) {
      const { data: chat } = await supabaseAdmin
        .from('chats')
        .select('strategy_id')
        .eq('id', chatId)
        .single()
      strategyId = chat?.strategy_id || null
    }

    if (strategyId) {
      persistentKnowledge = await loadStrategyKnowledge(supabaseAdmin, strategyId)
    }

    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: Record<string, unknown>) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
          )
        }

        let bestCode = mq5_code
        let bestMetrics = previous_results?.metrics || null
        let bestScore = bestMetrics ? compositeScore(bestMetrics) : -Infinity
        const iterationHistory: Array<Record<string, unknown>> = []
        const newLearnings: LearningEntry[] = []

        if (persistentKnowledge && persistentKnowledge.totalRuns > 0) {
          send({
            type: 'knowledge_loaded',
            totalPastRuns: persistentKnowledge.totalRuns,
            trend: persistentKnowledge.trend,
            message: `Loaded ${persistentKnowledge.totalRuns} past runs · Trend: ${persistentKnowledge.trend}`,
          })
        }

        try {
          for (let i = 1; i <= iterations; i++) {
            send({
              type: 'iteration_start',
              iteration: i,
              total: iterations,
              message: `Iteration ${i}/${iterations}: AI analyzing metrics and generating improvement...`,
            })

            // Ask Claude to improve the code (with persistent knowledge from ALL past runs)
            const improvedCode = await improveMql5Code(
              bestCode,
              bestMetrics,
              symbol,
              i,
              iterationHistory,
              persistentKnowledge
            )

            if (!improvedCode) {
              send({
                type: 'iteration',
                iteration: i,
                metrics: bestMetrics,
                improved: false,
                message: 'Claude could not suggest improvements',
              })
              continue
            }

            // Extract the CHANGES comment from the improved code
            const changesMatch = improvedCode.match(/\/\/\s*CHANGES?:\s*(.+)$/m)
            const changeSummary = changesMatch ? changesMatch[1].trim() : 'unspecified changes'

            // Use unique EA name per iteration to avoid VPS caching stale results
            const iterEaName = `${ea_name}_v${i}`

            // Compile + Backtest atomically on same slot (with auto-fix retries)
            send({ type: 'status', iteration: i, message: `Compiling & backtesting iteration ${i} on ${symbol} ${period}...` })
            let currentCode = improvedCode
            let result: CompileAndBacktestResult | null = null

            for (let r = 0; r <= MAX_FIX_RETRIES; r++) {
              result = await compileAndBacktestEA(iterEaName, currentCode, symbol, period)
              if (result.success) break

              // If compile error, try auto-fix
              if (result.compileError && r < MAX_FIX_RETRIES && getAnthropic()) {
                send({ type: 'status', iteration: i, message: `Compile error · Auto-fixing (attempt ${r + 1}/${MAX_FIX_RETRIES})...` })
                const errors = typeof result.compileError === 'string'
                  ? [result.compileError]
                  : Array.isArray(result.compileError) ? result.compileError : [String(result.compileError)]
                const fixed = await autoFixCode(currentCode, errors)
                if (fixed) {
                  currentCode = fixed
                  continue
                }
              }
              break
            }

            if (!result || !result.success || !result.metrics) {
              const failReason = result?.compileError ? 'COMPILE FAILED' : 'BACKTEST FAILED'
              iterationHistory.push({
                iteration: i,
                metrics: null,
                improved: false,
                changeSummary: `${changeSummary} (${failReason})`,
              })
              send({
                type: 'iteration',
                iteration: i,
                metrics: bestMetrics,
                improved: false,
                message: result?.error || `${failReason} for this iteration`,
              })
              continue
            }

            // Compare using composite score (multi-metric, not just Sharpe)
            const newScore = compositeScore(result.metrics)
            const improved = newScore > bestScore

            if (improved) {
              bestCode = currentCode
              bestMetrics = result.metrics
              bestScore = newScore
            }

            iterationHistory.push({
              iteration: i,
              metrics: result.metrics,
              improved,
              changeSummary,
              score: newScore,
            })

            // Accumulate learning for persistent storage
            newLearnings.push({
              timestamp: new Date().toISOString(),
              iteration: i,
              changeSummary,
              metrics: {
                profit_factor: result.metrics.profit_factor || 0,
                total_trades: result.metrics.total_trades || 0,
                sharpe: result.metrics.sharpe || 0,
                win_rate: result.metrics.win_rate || 0,
                max_drawdown: Math.abs(result.metrics.max_drawdown || 0),
                net_profit: result.metrics.net_profit || 0,
              },
              score: newScore,
              improved,
              source: 'optimize',
            })

            send({
              type: 'iteration',
              iteration: i,
              metrics: result.metrics,
              improved,
              score: newScore,
              bestScore,
              changeSummary,
              message: improved
                ? `Improved! Score ${newScore.toFixed(3)} → PF ${result.metrics.profit_factor?.toFixed(2)}, ${result.metrics.total_trades} trades. Changes: ${changeSummary}`
                : `No improvement (score ${newScore.toFixed(3)} ≤ best ${bestScore.toFixed(3)}). Changes: ${changeSummary}`,
            })
          }

          // Persist learnings so next run is smarter
          if (strategyId && newLearnings.length > 0) {
            await saveLearnings(supabaseAdmin, strategyId, newLearnings)
          }

          send({
            type: 'done',
            best_code: bestCode,
            best_metrics: bestMetrics,
            best_score: bestScore,
            iterations_run: iterations,
            history: iterationHistory,
          })
        } catch (err) {
          console.error('Optimize stream error:', err)
          send({
            type: 'error',
            message:
              err instanceof Error ? err.message : 'Optimization failed',
          })
        }

        controller.close()
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Optimize route error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
    })
  }
}


function diagnoseIssues(metrics: Record<string, number>): string {
  const trades  = metrics.total_trades || 0
  const pf      = metrics.profit_factor || 0
  const sharpe  = metrics.sharpe || 0
  const winRate = metrics.win_rate || 0
  const net     = metrics.net_profit || 0
  const dd      = Math.abs(metrics.max_drawdown || 0)

  const issues: string[] = []

  // ── Critical issues first ──
  if (trades === 0) {
    return `CRITICAL: ZERO TRADES. The EA never opened a position.
ACTION REQUIRED (do ALL of these):
1. REMOVE all secondary filters/confirmations — keep ONLY the primary indicator signal
2. WIDEN SL by 2x (XAUUSD needs SL >= 300 points, EURUSD >= 150 points)
3. WIDEN TP by 1.5x
4. Check that trade.Buy()/trade.Sell() is actually reachable — add Print() before the call
5. If using time filters, REMOVE them entirely or widen to 0:00-23:59
6. Simplify entry: e.g. if RSI < 30 → Buy. That's it. No extra conditions.`
  }

  if (trades < 10) {
    issues.push(`VERY FEW TRADES (${trades}): Remove at least ONE filter/condition. Shorten indicator periods by 30-50%. Widen SL/TP by 30%.`)
  } else if (trades < 30) {
    issues.push(`LOW TRADE COUNT (${trades}): Loosen ONE entry condition (lower RSI threshold by 5-10, shorten MA period by 20%). Need ≥30 trades for statistical significance.`)
  }

  // ── Profitability issues ──
  if (pf < 0.8 && trades > 0) {
    issues.push(`LOSING BADLY (PF=${pf.toFixed(2)}): The TP/SL ratio is wrong. Increase TP by 30-50% OR decrease SL by 20%. Do NOT add filters — fix the reward/risk first.`)
  } else if (pf < 1.0 && trades > 0) {
    issues.push(`SLIGHTLY LOSING (PF=${pf.toFixed(2)}): Increase TP by 15-25% or tighten SL by 10-15%. One small adjustment, not both.`)
  } else if (pf >= 1.0 && pf < 1.3) {
    issues.push(`MARGINAL PROFIT (PF=${pf.toFixed(2)}): Strategy is close. Try: increase TP by 10-15%, OR add ONE simple trend filter (e.g. price > 200-EMA = only buy).`)
  }

  // ── Risk issues ──
  if (dd > 15) {
    issues.push(`HIGH DRAWDOWN (${dd.toFixed(1)}%): Reduce position size by 30% or tighten SL by 15-20%. Do NOT widen TP to compensate.`)
  }

  if (winRate < 35 && trades >= 20) {
    issues.push(`LOW WIN RATE (${winRate.toFixed(1)}%): Add ONE confirmation (e.g. require RSI divergence, or require 2 consecutive candles in direction). Do NOT add complex multi-indicator logic.`)
  } else if (winRate > 70 && pf < 1.5) {
    issues.push(`HIGH WIN RATE (${winRate.toFixed(1)}%) but LOW PF (${pf.toFixed(2)}): Losses are too large when they happen. Tighten SL by 20-25%.`)
  }

  if (sharpe < 0 && trades >= 20) {
    issues.push(`NEGATIVE SHARPE (${sharpe.toFixed(2)}): Returns are worse than holding cash. Focus on improving PF first — Sharpe will follow.`)
  }

  // ── Good performance ──
  if (pf >= 1.5 && sharpe >= 0.8 && trades >= 30) {
    return `Strategy is PERFORMING WELL (PF=${pf.toFixed(2)}, Sharpe=${sharpe.toFixed(2)}, ${trades} trades).
FINE-TUNE ONLY — do NOT change the core logic:
- Adjust indicator periods by ±10-15% (e.g. RSI 14→12 or 16)
- Adjust SL/TP by ±10% max
- If DD > 10%, slightly reduce lot size
DO NOT add new indicators or change entry logic.`
  }

  if (issues.length === 0) {
    issues.push('Make ONE targeted improvement: adjust the weakest metric. If PF is the issue, adjust TP/SL. If trades are low, loosen conditions.')
  }

  return issues.join('\n')
}

function formatHistory(history: Array<Record<string, unknown>>): string {
  if (!history.length) return ''
  const lines = history.map((h) => {
    const m = h.metrics as Record<string, number> | undefined
    if (!m) return `  Iter ${h.iteration}: FAILED (compile/backtest error)`
    const score = compositeScore(m).toFixed(3)
    const improved = h.improved ? '✓ IMPROVED' : '✗ no improvement'
    const changeSummary = h.changeSummary ? ` | Changes: ${h.changeSummary}` : ''
    return `  Iter ${h.iteration} [${improved}] Score=${score}: PF=${m.profit_factor ?? 'N/A'}, Trades=${m.total_trades ?? 'N/A'}, Sharpe=${(m.sharpe ?? 0).toFixed(2)}, WinRate=${(m.win_rate ?? 0).toFixed(1)}%, DD=${(m.max_drawdown ?? 0).toFixed(1)}%, Net=$${(m.net_profit ?? 0).toFixed(0)}${changeSummary}`
  })

  // Find the best iteration
  let bestIdx = -1
  let bestScore = -Infinity
  history.forEach((h, i) => {
    const m = h.metrics as Record<string, number> | undefined
    if (m) {
      const s = compositeScore(m)
      if (s > bestScore) { bestScore = s; bestIdx = i }
    }
  })

  return `
ITERATION HISTORY (${history.length} iterations so far):
${lines.join('\n')}
${bestIdx >= 0 ? `\nBEST SO FAR: Iteration ${history[bestIdx].iteration} (score=${bestScore.toFixed(3)})` : ''}

IMPORTANT: Study what changed in each iteration and whether it helped or hurt.
- If a change HELPED → build on it, refine further in the same direction
- If a change HURT → REVERT that type of change, try something different
- NEVER repeat a change that already failed in a previous iteration
- Your goal is to BEAT the best iteration's metrics, not just match them`
}

async function improveMql5Code(
  mq5Code: string,
  previousMetrics: Record<string, number> | null,
  symbol: string,
  iteration: number,
  iterationHistory: Array<Record<string, unknown>> = [],
  persistentKnowledge: StrategyKnowledge | null = null
): Promise<string | null> {
  const client = getAnthropic()
  if (!client) return null

  try {
    const currentScore = previousMetrics ? compositeScore(previousMetrics).toFixed(3) : 'N/A'

    const metricsText = previousMetrics
      ? `CURRENT BACKTEST RESULTS on ${symbol} (Composite Score: ${currentScore}):
  - Profit Factor: ${previousMetrics.profit_factor ?? 'N/A'}
  - Total Trades: ${previousMetrics.total_trades ?? 'N/A'}
  - Sharpe Ratio: ${(previousMetrics.sharpe ?? 0).toFixed(2)}
  - Win Rate: ${(previousMetrics.win_rate ?? 0).toFixed(1)}%
  - Max Drawdown: ${(previousMetrics.max_drawdown ?? 0).toFixed(1)}%
  - Net Profit: $${(previousMetrics.net_profit ?? 0).toFixed(2)}
  - Recovery Factor: ${(previousMetrics.recovery_factor ?? 0).toFixed(2)}

TARGETS TO BEAT:
  - Profit Factor: > ${((previousMetrics.profit_factor || 0) * 1.1).toFixed(2)} (currently ${previousMetrics.profit_factor ?? 0})
  - Total Trades: > ${Math.max(30, previousMetrics.total_trades || 0)} (need statistical significance)
  - Net Profit: > $${((previousMetrics.net_profit || 0) * 1.1).toFixed(2)}
  - Max Drawdown: < ${((previousMetrics.max_drawdown || 0) * 0.9).toFixed(1)}%

DIAGNOSIS:
${diagnoseIssues(previousMetrics)}`
      : `This is the FIRST optimization pass for ${symbol}. Focus on ensuring the EA actually trades.`

    const historyText = formatHistory(iterationHistory)

    // Build persistent knowledge context from ALL past runs
    const knowledgeText = persistentKnowledge
      ? buildKnowledgePrompt(persistentKnowledge)
      : ''

    // Build a summary of what NOT to try based on failed iterations (current session)
    const failedApproaches: string[] = []
    for (const h of iterationHistory) {
      if (!h.improved && h.changeSummary) {
        failedApproaches.push(`- "${h.changeSummary}" → did NOT improve`)
      }
    }
    const avoidText = failedApproaches.length > 0
      ? `\nAPPROACHES TRIED THIS SESSION THAT FAILED (do NOT repeat):\n${failedApproaches.join('\n')}\n`
      : ''

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system:
        `You are an expert MQL5 strategy optimizer. Your job is to make the strategy MEASURABLY BETTER each iteration.

You have access to PERSISTENT KNOWLEDGE from all previous optimization runs on this strategy. USE IT.
- If something worked before → build on it
- If something failed before → do NOT try it again
- If the trend is declining → try a COMPLETELY different approach than recent runs
- If the trend is stagnating → make a BIGGER change (20-30% parameter shift instead of 10%)
- Your goal: beat the BEST SCORE EVER achieved, not just the current run

RULES:
1. PRESERVE the core strategy structure — same indicators, same general approach
2. Make EXACTLY ONE targeted change per iteration that addresses the WEAKEST metric
3. Every change must have a clear hypothesis: "I am changing X because it should improve Y"
4. NEVER do a full rewrite — surgeons use scalpels, not sledgehammers
5. NEVER add new indicators unless the diagnosis explicitly says to add ONE filter
6. NEVER remove working trade logic (trade.Buy/trade.Sell must remain)
7. If previous iteration had 0 trades: your ONLY job is to get trades happening. Remove filters, widen SL/TP, simplify entry.
8. Learn from ALL past runs — if widening TP improved PF before, try widening it further. If adding a filter reduced trades, don't add another one.

WHAT TO CHANGE (pick ONE per iteration):
- SL/TP values: adjust by 10-30% (most impactful for PF and DD)
- Indicator period: adjust by 10-30% (most impactful for trade count)
- Entry threshold: adjust by 10-20% (e.g. RSI 30→25 for more trades)
- Add/remove ONE filter: only if diagnosis says so
- Position sizing: reduce lots if DD is too high

WHAT NEVER TO CHANGE:
- The indicator type (don't swap RSI for MACD)
- The trade direction logic (don't flip buy/sell conditions)
- The core OnTick structure
- Working CopyBuffer/ArraySetAsSeries patterns

After the code, add a SINGLE comment line at the very end:
// CHANGES: <brief description of what you changed and why>

Return ONLY the complete MQL5 code (with the CHANGES comment). No explanations, no markdown fences.`,
      messages: [
        {
          role: 'user',
          content: `Iteration ${iteration} of optimization. MAKE THE STRATEGY BETTER.
${knowledgeText}
${metricsText}
${historyText}${avoidText}
CURRENT CODE TO IMPROVE:
${mq5Code}

Remember: Make exactly ONE targeted change. Learn from ALL past runs. Add a // CHANGES: comment at the end describing what you changed.`,
        },
      ],
    })

    const text =
      response.content[0].type === 'text' ? response.content[0].text : ''
    return text.trim() || null
  } catch (err) {
    console.error('Improve code error:', err)
    return null
  }
}

async function autoFixCode(
  mq5Code: string,
  errors: string[]
): Promise<string | null> {
  const fixClient = getAnthropic()
  if (!fixClient) return null

  try {
    const response = await fixClient.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system:
        'You are an MQL5 compiler error fixer. Given MQL5 code and compilation errors, return ONLY the fixed MQL5 code with no explanation, no markdown fences, no commentary. Just the raw MQL5 code.',
      messages: [
        {
          role: 'user',
          content: `Fix these MQL5 compilation errors:\n\nErrors:\n${errors.join('\n')}\n\nCode:\n${mq5Code}`,
        },
      ],
    })

    const text =
      response.content[0].type === 'text' ? response.content[0].text : ''
    return text.trim() || null
  } catch (err) {
    console.error('Auto-fix error:', err)
    return null
  }
}

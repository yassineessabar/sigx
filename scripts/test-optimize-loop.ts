#!/usr/bin/env npx tsx
/**
 * Test script: Runs the full optimization loop directly against the VPS.
 * Validates that:
 * 1. VPS compile-and-backtest works atomically
 * 2. AI improvements actually change the code
 * 3. Composite scores trend upward over iterations
 * 4. Learnings accumulate and are used
 *
 * Usage: npx tsx scripts/test-optimize-loop.ts
 */

import { config } from 'dotenv'
config({ path: '.env.local' })
import Anthropic from '@anthropic-ai/sdk'

const VPS_URL = process.env.MT5_MANAGER_URL!
const VPS_KEY = process.env.MT5_WORKER_KEY!
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY!

const SYMBOL = 'XAUUSD'
const PERIOD = 'H1'
const EA_BASE = 'OptTest'
const TOTAL_ROUNDS = 3       // full optimization rounds
const ITERS_PER_ROUND = 2    // iterations per round

// ── Composite score (same formula as strategy-learnings.ts) ─────────
function compositeScore(m: Record<string, number>): number {
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

// ── VPS helpers ─────────────────────────────────────────────────────
async function vpsStatus() {
  const res = await fetch(`${VPS_URL}/status`, {
    headers: { 'x-api-key': VPS_KEY },
  })
  return res.json()
}

async function findFreeSlot(): Promise<string> {
  const res = await fetch(`${VPS_URL}/slots`, {
    headers: { 'x-api-key': VPS_KEY },
  })
  const slots = await res.json()
  for (const [id, info] of Object.entries(slots)) {
    if (!(info as any).busy) return id
  }
  throw new Error('No free slots')
}

async function compileAndBacktest(
  eaName: string,
  code: string,
  symbol: string,
  period: string
): Promise<{ success: boolean; metrics?: Record<string, number>; error?: string }> {
  const slotId = await findFreeSlot()
  console.log(`    [VPS] Using slot ${slotId}`)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 240_000)

  try {
    const res = await fetch(`${VPS_URL}/compile-and-backtest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': VPS_KEY,
      },
      body: JSON.stringify({
        ea_name: eaName,
        mq5_code: code,
        symbol,
        period,
        slot_id: slotId,
      }),
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { success: false, error: `VPS ${res.status}: ${text.slice(0, 200)}` }
    }

    const data = await res.json()
    if (!data.success) {
      return { success: false, error: data.error || data.errors || 'Failed' }
    }

    const raw = data.metrics || {}

    // Also parse metrics from the HTML report (more reliable for some fields)
    let fromReport: Record<string, number> = {}
    if (data.report_b64) {
      try {
        const buf = Buffer.from(data.report_b64, 'base64')
        const html = (buf[0] === 0xff && buf[1] === 0xfe) ? buf.toString('utf16le') : buf.toString('utf-8')
        const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
        const sharpe = text.match(/Sharpe Ratio:\s*(-?[\d.]+)/)
        if (sharpe) fromReport.sharpe = parseFloat(sharpe[1])
        const ddMax = text.match(/(?:Balance|Equity) Drawdown Maximal:\s*[\d\s,.]+\(([\d.]+)%\)/)
        if (ddMax) fromReport.max_drawdown = parseFloat(ddMax[1])
        const winRate = text.match(/Profit Trades \(% of total\):\s*\d+\s*\(([\d.]+)%\)/)
        if (winRate) fromReport.win_rate = parseFloat(winRate[1])
        const netP = text.match(/Total Net Profit:\s*(-?[\d\s,.]+)/)
        if (netP) fromReport.net_profit = parseFloat(netP[1].replace(/[\s,]/g, ''))
        const pf = text.match(/Profit Factor:\s*([\d.]+)/)
        if (pf) fromReport.profit_factor = parseFloat(pf[1])
        const trades = text.match(/Total Trades:\s*(\d+)/)
        if (trades) fromReport.total_trades = parseInt(trades[1])
        const rf = text.match(/Recovery Factor:\s*(-?[\d.]+)/)
        if (rf) fromReport.recovery_factor = parseFloat(rf[1])
      } catch {}
    }

    const pf = fromReport.profit_factor ?? raw.profit_factor ?? 0
    const dd = fromReport.max_drawdown ?? Math.abs(raw.max_drawdown ?? raw.max_dd ?? 0)

    return {
      success: true,
      metrics: {
        profit_factor: pf,
        total_trades: fromReport.total_trades ?? raw.total_trades ?? 0,
        sharpe: fromReport.sharpe ?? raw.sharpe ?? raw.sharpe_ratio ?? 0,
        win_rate: fromReport.win_rate ?? raw.win_rate ?? raw.win_pct ?? 0,
        max_drawdown: isNaN(dd) ? 0 : dd,
        net_profit: fromReport.net_profit ?? raw.net_profit ?? 0,
        recovery_factor: fromReport.recovery_factor ?? raw.recovery_factor ?? 0,
      },
    }
  } catch (err: any) {
    clearTimeout(timeout)
    if (err.name === 'AbortError') return { success: false, error: 'Timed out (4 min)' }
    return { success: false, error: err.message }
  }
}

// ── AI improvement ──────────────────────────────────────────────────
function diagnoseIssues(m: Record<string, number>): string {
  const trades = m.total_trades || 0
  const pf = m.profit_factor || 0
  if (trades === 0) return 'ZERO TRADES. Remove filters, widen SL/TP 2x, simplify entry.'
  if (trades < 20) return `LOW TRADES (${trades}). Loosen conditions, shorter indicator periods.`
  if (pf < 1.0) return `LOSING (PF=${pf.toFixed(2)}). Increase TP 20-30% or tighten SL.`
  if (pf < 1.3) return `MARGINAL (PF=${pf.toFixed(2)}). Add ONE trend filter or adjust TP +10%.`
  return `PROFITABLE (PF=${pf.toFixed(2)}). Fine-tune only ±10-15%.`
}

async function improveCode(
  client: Anthropic,
  code: string,
  metrics: Record<string, number> | null,
  iteration: number,
  history: Array<{ iter: number; score: number; improved: boolean; change: string }>
): Promise<{ code: string; change: string } | null> {
  const metricsText = metrics
    ? `Current: PF=${metrics.profit_factor}, Trades=${metrics.total_trades}, Sharpe=${(metrics.sharpe || 0).toFixed(2)}, WR=${(metrics.win_rate || 0).toFixed(1)}%, DD=${(metrics.max_drawdown || 0).toFixed(1)}%, Net=$${(metrics.net_profit || 0).toFixed(0)}
Score: ${compositeScore(metrics).toFixed(3)}
Diagnosis: ${diagnoseIssues(metrics)}`
    : 'First run — ensure the EA trades.'

  const historyText = history.length > 0
    ? '\nHistory:\n' + history.map(h =>
        `  Iter ${h.iter} [${h.improved ? '✓' : '✗'}] Score=${h.score.toFixed(3)} | ${h.change}`
      ).join('\n')
    : ''

  const failedText = history.filter(h => !h.improved).map(h => `- "${h.change}"`).join('\n')
  const avoidText = failedText ? `\nDo NOT repeat:\n${failedText}` : ''

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system: `You are an MQL5 strategy optimizer. Make EXACTLY ONE targeted change per iteration.
PRESERVE core structure. NEVER rewrite from scratch. NEVER swap indicators.
If 0 trades: SIMPLIFY entry, remove filters, widen SL/TP.
Add // CHANGES: <what you changed> at the end.
Return ONLY the complete MQL5 code. No markdown, no explanations.`,
      messages: [{
        role: 'user',
        content: `Iteration ${iteration}. Improve this EA.\n\n${metricsText}${historyText}${avoidText}\n\nCode:\n${code}\n\nMake ONE change. Add // CHANGES: comment.`,
      }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
    if (!text) return null

    const changesMatch = text.match(/\/\/\s*CHANGES?:\s*(.+)$/m)
    return { code: text, change: changesMatch ? changesMatch[1].trim() : 'unspecified' }
  } catch (err: any) {
    console.error(`    [AI] Error: ${err.message}`)
    return null
  }
}

async function autoFixCode(client: Anthropic, code: string, error: string): Promise<string | null> {
  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system: 'Fix these MQL5 compilation errors. Return ONLY the fixed code. No markdown.',
      messages: [{ role: 'user', content: `Errors:\n${error}\n\nCode:\n${code}` }],
    })
    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
    return text || null
  } catch { return null }
}

// ── Generate initial EA ─────────────────────────────────────────────
async function generateInitialEA(client: Anthropic): Promise<string> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    system: `You are an MQL5 EA developer. Generate a COMPLETE, WORKING EA.
Use #include <Trade\\Trade.mqh>, CTrade, trade.Buy()/trade.Sell().
Use simple RSI strategy for XAUUSD H1. Keep it simple — fewer filters = more trades.
SL >= 300 points, TP >= 200 points for XAUUSD.
Return ONLY the raw MQL5 code. No markdown, no explanations.`,
    messages: [{ role: 'user', content: 'Generate a simple RSI mean-reversion EA for XAUUSD H1.' }],
  })
  return response.content[0].type === 'text' ? response.content[0].text.trim() : ''
}

// ── Main loop ───────────────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════════════════')
  console.log(' OPTIMIZATION LOOP TEST')
  console.log('═══════════════════════════════════════════════════')

  // Check VPS
  const status = await vpsStatus()
  console.log(`VPS: ${status.hostname} | Slots: ${status.available_slots}/${status.total_slots} available`)
  if (!status.ready || status.available_slots === 0) {
    console.error('VPS not ready or no slots available')
    process.exit(1)
  }

  const client = new Anthropic({ apiKey: ANTHROPIC_KEY })

  // Generate initial EA
  console.log('\n[STEP 1] Generating initial EA...')
  let bestCode = await generateInitialEA(client)
  console.log(`  Generated ${bestCode.length} chars of MQL5 code`)

  let bestMetrics: Record<string, number> | null = null
  let bestScore = -Infinity
  const allHistory: Array<{ iter: number; score: number; improved: boolean; change: string }> = []
  let globalIter = 0

  // Run initial backtest
  console.log('\n[STEP 2] Running initial backtest on VPS...')
  let eaName = `${EA_BASE}_v0`
  let result = await compileAndBacktest(eaName, bestCode, SYMBOL, PERIOD)

  // Auto-fix if compile fails
  if (!result.success && result.error) {
    console.log(`  Compile failed. Auto-fixing...`)
    for (let fix = 0; fix < 3; fix++) {
      const fixed = await autoFixCode(client, bestCode, result.error!)
      if (!fixed) break
      bestCode = fixed
      result = await compileAndBacktest(eaName, bestCode, SYMBOL, PERIOD)
      if (result.success) break
      console.log(`  Fix attempt ${fix + 1} failed, retrying...`)
    }
  }

  if (result.success && result.metrics) {
    bestMetrics = result.metrics
    bestScore = compositeScore(bestMetrics)
    console.log(`  ✓ Initial: PF=${bestMetrics.profit_factor.toFixed(2)}, Trades=${bestMetrics.total_trades}, Sharpe=${bestMetrics.sharpe.toFixed(2)}, Score=${bestScore.toFixed(3)}`)
  } else {
    console.log(`  ✗ Initial backtest failed: ${result.error}`)
    console.log('  Continuing with optimization to fix...')
  }

  // Run optimization rounds
  for (let round = 1; round <= TOTAL_ROUNDS; round++) {
    console.log(`\n${'─'.repeat(50)}`)
    console.log(`ROUND ${round}/${TOTAL_ROUNDS}`)
    console.log('─'.repeat(50))

    for (let iter = 1; iter <= ITERS_PER_ROUND; iter++) {
      globalIter++
      console.log(`\n  [Iter ${globalIter}] AI generating improvement...`)

      const improvement = await improveCode(client, bestCode, bestMetrics, globalIter, allHistory)
      if (!improvement) {
        console.log(`    ✗ AI could not generate improvement`)
        allHistory.push({ iter: globalIter, score: bestScore, improved: false, change: 'AI failed' })
        continue
      }
      console.log(`    Change: ${improvement.change}`)
      const codeChanged = improvement.code !== bestCode
      console.log(`    Code diff: ${codeChanged ? `${Math.abs(improvement.code.length - bestCode.length)} chars delta, code IS different` : '⚠️  CODE IDENTICAL — no real change made'}`)

      // Compile + backtest
      console.log(`    Compiling + backtesting on VPS...`)
      // Use unique EA name per iteration to avoid VPS caching
      const iterEaName = `${EA_BASE}_v${globalIter}`
      let iterResult = await compileAndBacktest(iterEaName, improvement.code, SYMBOL, PERIOD)

      // Auto-fix compile errors
      if (!iterResult.success && iterResult.error) {
        console.log(`    Compile error. Auto-fixing...`)
        let fixedCode = improvement.code
        for (let fix = 0; fix < 2; fix++) {
          const fixed = await autoFixCode(client, fixedCode, iterResult.error!)
          if (!fixed) break
          fixedCode = fixed
          iterResult = await compileAndBacktest(iterEaName, fixedCode, SYMBOL, PERIOD)
          if (iterResult.success) {
            improvement.code = fixedCode
            break
          }
        }
      }

      if (!iterResult.success || !iterResult.metrics) {
        console.log(`    ✗ Failed: ${iterResult.error}`)
        allHistory.push({ iter: globalIter, score: -1000, improved: false, change: `${improvement.change} (FAILED)` })
        continue
      }

      const newScore = compositeScore(iterResult.metrics)
      const improved = newScore > bestScore

      if (improved) {
        bestCode = improvement.code
        bestMetrics = iterResult.metrics
        bestScore = newScore
      }

      allHistory.push({ iter: globalIter, score: newScore, improved, change: improvement.change })

      const m = iterResult.metrics
      console.log(`    ${improved ? '✓ IMPROVED' : '✗ No improvement'} | Score: ${newScore.toFixed(3)} (best: ${bestScore.toFixed(3)})`)
      console.log(`    PF=${m.profit_factor.toFixed(2)}, Trades=${m.total_trades}, Sharpe=${m.sharpe.toFixed(2)}, WR=${m.win_rate.toFixed(1)}%, DD=${m.max_drawdown.toFixed(1)}%, Net=$${m.net_profit.toFixed(0)}`)
    }
  }

  // ── Final report ──────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════')
  console.log(' OPTIMIZATION RESULTS')
  console.log('═══════════════════════════════════════════════════')

  console.log('\nIteration History:')
  for (const h of allHistory) {
    console.log(`  ${h.improved ? '✓' : '✗'} Iter ${h.iter} | Score=${h.score.toFixed(3)} | ${h.change}`)
  }

  const improvements = allHistory.filter(h => h.improved).length
  const failures = allHistory.filter(h => !h.improved).length

  console.log(`\nTotal iterations: ${allHistory.length}`)
  console.log(`Improvements: ${improvements} | No improvement: ${failures}`)

  if (bestMetrics) {
    console.log(`\nBest EA metrics:`)
    console.log(`  Profit Factor: ${bestMetrics.profit_factor.toFixed(2)}`)
    console.log(`  Total Trades:  ${bestMetrics.total_trades}`)
    console.log(`  Sharpe Ratio:  ${bestMetrics.sharpe.toFixed(2)}`)
    console.log(`  Win Rate:      ${bestMetrics.win_rate.toFixed(1)}%`)
    console.log(`  Max Drawdown:  ${bestMetrics.max_drawdown.toFixed(1)}%`)
    console.log(`  Net Profit:    $${bestMetrics.net_profit.toFixed(2)}`)
    console.log(`  Score:         ${bestScore.toFixed(3)}`)
  }

  // Check trend
  const scores = allHistory.filter(h => h.score > -999).map(h => h.score)
  if (scores.length >= 3) {
    const firstHalf = scores.slice(0, Math.floor(scores.length / 2))
    const secondHalf = scores.slice(Math.floor(scores.length / 2))
    const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
    const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length
    const trend = avgSecond > avgFirst * 1.05 ? '↑ IMPROVING' : avgSecond < avgFirst * 0.95 ? '↓ DECLINING' : '→ STABLE'
    console.log(`\nTrend: ${trend} (avg first half: ${avgFirst.toFixed(3)}, avg second half: ${avgSecond.toFixed(3)})`)
  }

  // Deployability check
  if (bestMetrics && bestMetrics.profit_factor >= 1.2 && bestMetrics.total_trades >= 20 && bestMetrics.sharpe >= 0.3) {
    console.log('\n✅ DEPLOYABLE — Strategy meets minimum thresholds (PF≥1.2, Trades≥20, Sharpe≥0.3)')
  } else if (bestMetrics && bestMetrics.total_trades > 0) {
    const missing: string[] = []
    if (bestMetrics.profit_factor < 1.2) missing.push(`PF=${bestMetrics.profit_factor.toFixed(2)} (need ≥1.2)`)
    if (bestMetrics.total_trades < 20) missing.push(`Trades=${bestMetrics.total_trades} (need ≥20)`)
    if (bestMetrics.sharpe < 0.3) missing.push(`Sharpe=${bestMetrics.sharpe.toFixed(2)} (need ≥0.3)`)
    console.log(`\n⚠️  NOT YET DEPLOYABLE — Missing: ${missing.join(', ')}`)
    console.log('    Run more optimization rounds to improve.')
  } else {
    console.log('\n❌ NOT DEPLOYABLE — Strategy has 0 trades. Needs fundamental fixes.')
  }

  console.log('\n═══════════════════════════════════════════════════')
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})

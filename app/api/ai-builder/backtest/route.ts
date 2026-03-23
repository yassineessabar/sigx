import { NextRequest, NextResponse } from 'next/server'
import { getUserFromToken } from '@/lib/api-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { CREDIT_COSTS, deductCredits } from '@/lib/credit-costs'
import Anthropic from '@anthropic-ai/sdk'

const MAX_FIX_RETRIES = 2

function getWorkerUrl(): string {
  return process.env.MT5_MANAGER_URL || process.env.MT5_WORKER_URL || ''
}

function getWorkerKey(): string {
  return process.env.MT5_WORKER_KEY || ''
}

function workerHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'x-api-key': getWorkerKey(),
  }
}

function getAnthropic(): Anthropic | null {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key || key === 'your-anthropic-key-here' || !key.startsWith('sk-ant-')) return null
  return new Anthropic({ apiKey: key })
}

async function findFreeSlot(workerUrl: string): Promise<string | null> {
  try {
    const res = await fetch(`${workerUrl}/slots`, { headers: workerHeaders() })
    if (!res.ok) return '0'
    const slots = await res.json()
    for (const [id, info] of Object.entries(slots)) {
      if (!(info as Record<string, unknown>).busy) return id
    }
    return null // all busy
  } catch {
    return '0'
  }
}

async function getQueueInfo(workerUrl: string): Promise<{ total: number; busy: number; available: number; hostname: string }> {
  try {
    const res = await fetch(`${workerUrl}/status`, { headers: workerHeaders() })
    if (!res.ok) return { total: 1, busy: 1, available: 0, hostname: '' }
    const data = await res.json()
    return {
      total: data.total_slots || 1,
      busy: data.busy_slots || 0,
      available: data.available_slots || 0,
      hostname: data.hostname || '',
    }
  } catch {
    return { total: 1, busy: 1, available: 0, hostname: '' }
  }
}

const MAX_QUEUE_WAIT_MS = 180_000 // 3 minutes max wait in queue
const QUEUE_POLL_INTERVAL = 5_000 // check every 5 seconds

async function waitForSlot(workerUrl: string, signal?: AbortSignal): Promise<string | null> {
  const deadline = Date.now() + MAX_QUEUE_WAIT_MS
  while (Date.now() < deadline) {
    if (signal?.aborted) return null
    const slot = await findFreeSlot(workerUrl)
    if (slot) return slot
    await new Promise(resolve => setTimeout(resolve, QUEUE_POLL_INTERVAL))
  }
  return null
}

/**
 * POST /api/ai-builder/backtest
 * Compiles on VPS then runs backtest. Auto-fixes compile errors.
 *
 * Strategy: Try /compile-and-backtest first (newer manager).
 * If 404, fall back to separate /compile + /backtest calls.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request.headers.get('authorization'))
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { ea_name, mq5_code, symbol, period, start, end } = await request.json()
    console.log(`[BACKTEST] Called: ea=${ea_name} symbol=${symbol} period=${period} code_len=${mq5_code?.length} worker=${process.env.MT5_MANAGER_URL}`)

    if (!ea_name || !mq5_code) {
      return NextResponse.json(
        { success: false, error: 'ea_name and mq5_code are required' },
        { status: 400 }
      )
    }

    // Deduct backtest credits
    const deduction = await deductCredits(supabaseAdmin, user.id, CREDIT_COSTS.BACKTEST, 'Backtest')
    if (!deduction.success) {
      return NextResponse.json(
        { success: false, error: deduction.error, code: 'NO_CREDITS', credits_required: CREDIT_COSTS.BACKTEST, credits_balance: deduction.new_balance },
        { status: 402 }
      )
    }

    const sym = symbol || 'XAUUSD'
    const per = period || 'H1'
    const workerUrl = getWorkerUrl()

    if (!workerUrl) {
      return NextResponse.json({
        success: false,
        error: 'MT5 Worker not configured. Set MT5_MANAGER_URL in environment.',
      })
    }

    // Always stream NDJSON with step-by-step progress updates
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(JSON.stringify(data) + '\n'))
        }

        let slotId = await findFreeSlot(workerUrl)
        let vpsHostname = ''

        // ── Step 1: Wait for slot if all busy ──
        if (!slotId) {
          const deadline = Date.now() + MAX_QUEUE_WAIT_MS
          while (Date.now() < deadline) {
            const info = await getQueueInfo(workerUrl)
            if (info.hostname) vpsHostname = info.hostname
            // Position = how many busy slots ahead of us (we're waiting behind all of them)
            let position = info.busy >= info.total ? info.busy : 1
            if (position < 1) position = 1
            send({ type: 'queue', position, busy: info.busy, total: info.total, vps_host: vpsHostname })

            const slot = await findFreeSlot(workerUrl)
            if (slot) { slotId = slot; break }
            await new Promise(resolve => setTimeout(resolve, QUEUE_POLL_INTERVAL))
          }

          if (!slotId) {
            send({ type: 'result', data: { success: false, error: 'Queue timeout — all MT5 slots are busy. Please try again shortly.' } })
            controller.close()
            return
          }
        } else {
          // Get hostname even when no queue
          const info = await getQueueInfo(workerUrl)
          vpsHostname = info.hostname || ''
        }

        send({ type: 'status', message: `Slot acquired · ${vpsHostname || 'VPS'} · slot ${slotId}` })

        // ── Step 2: Compile ──
        send({ type: 'status', message: `Compiling ${ea_name}.mq5 on ${vpsHostname || 'VPS'}...` })

        let currentCode = mq5_code
        let lastResult = await tryCompileAndBacktest(workerUrl, ea_name, currentCode, sym, per, start, end)

        if (lastResult.supported) {
          // ── Step 3: Auto-fix compile errors if needed ──
          if (!lastResult.success && lastResult.compileError && getAnthropic()) {
            for (let i = 0; i < MAX_FIX_RETRIES; i++) {
              send({ type: 'status', message: `Compile error detected · Auto-fixing with AI (attempt ${i + 1}/${MAX_FIX_RETRIES})...` })
              const errorLines = extractCompileErrors(lastResult.compileError)
              const fixed = await autoFixCode(currentCode, errorLines)
              if (!fixed) break
              currentCode = fixed
              send({ type: 'status', message: `Re-compiling fixed code (attempt ${i + 2})...` })
              lastResult = await tryCompileAndBacktest(workerUrl, ea_name, currentCode, sym, per, start, end)
              if (lastResult.success || !lastResult.compileError) break
            }
          }

          if (lastResult.success) {
            // The compile+backtest call already completed — backtest ran on VPS
            send({ type: 'status', message: `Compiled successfully · Backtest running on ${sym} ${per}...` })
            // Small delay so user sees the backtest step
            await new Promise(resolve => setTimeout(resolve, 500))
            send({ type: 'status', message: `Backtest complete · Parsing results...` })
            send({ type: 'result', data: lastResult.data })
          } else {
            const cleanError = lastResult.compileError
              ? 'Compilation failed: ' + extractCompileErrors(lastResult.compileError).join('; ')
              : (lastResult.data?.error || 'Compile + backtest failed')
            send({ type: 'result', data: { success: false, error: cleanError.slice(0, 200) } })
          }
        } else {
          // Fallback to separate /compile + /backtest calls with granular updates
          send({ type: 'status', message: `Compiling ${ea_name}.mq5...` })

          const fbRes = await runSeparateCalls(workerUrl, ea_name, currentCode, sym, per, slotId!, start, end, (step: string) => {
            send({ type: 'status', message: step })
          })
          send({ type: 'result', data: fbRes })
        }

        controller.close()
      },
    })

    return new Response(stream, {
      headers: { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-cache' },
    })
  } catch (error) {
    console.error('Backtest route error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Try the combined /compile-and-backtest endpoint.
 * Returns { supported: false } if endpoint doesn't exist (404).
 */
async function tryCompileAndBacktest(
  workerUrl: string, eaName: string, code: string, symbol: string, period: string,
  start?: string, end?: string
) {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 240_000)

    const res = await fetch(`${workerUrl}/compile-and-backtest`, {
      method: 'POST',
      headers: workerHeaders(),
      body: JSON.stringify({
        ea_name: eaName, mq5_code: code, symbol, period,
        ...(start ? { start } : {}), ...(end ? { end } : {}),
        // Pass MT5 account credentials so VPS configures the correct broker
        ...(process.env.MT5_ACCOUNT_LOGIN ? {
          account_login: parseInt(process.env.MT5_ACCOUNT_LOGIN),
          account_password: process.env.MT5_ACCOUNT_PASSWORD,
          account_server: process.env.MT5_ACCOUNT_SERVER,
        } : {}),
      }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (res.status === 404 || res.status === 405) {
      return { supported: false }
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      // Parse FastAPI error detail
      let errorMsg = `VPS error (${res.status})`
      try {
        const errJson = JSON.parse(text)
        errorMsg = errJson.detail || errJson.error || errorMsg
      } catch {
        if (text) errorMsg += ': ' + text.slice(0, 150)
      }
      // On 500, the VPS crashed — likely the EA code caused an issue. Retry is possible.
      return {
        supported: true,
        success: false,
        compileError: res.status === 500 ? errorMsg : undefined,
        data: { success: false, error: errorMsg },
      }
    }

    const data = await res.json()

    if (data.success && data.metrics) {
      const metrics = normalizeMetrics(data.metrics, data.report_b64)
      const equity_curve = parseEquityCurve(data.report_b64, metrics)
      return {
        supported: true,
        success: true,
        data: {
          success: true, metrics, equity_curve,
          report_b64: data.report_b64 || null,
          report_is_mt5: data.report_is_mt5 ?? false,
          slot_id: data.slot_id ?? null,
          vps_host: data.vps_host ?? null,
        },
      }
    }

    return {
      supported: true,
      success: false,
      compileError: data.step === 'compile' ? (data.errors || data.error) : undefined,
      data: { success: false, error: data.error || data.errors || 'Failed' },
    }
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      return { supported: true, success: false, data: { success: false, error: 'Timed out (4 min)' } }
    }
    return { supported: true, success: false, data: { success: false, error: (err as Error).message } }
  }
}

/**
 * Fallback separate calls that return plain data (for use inside streams).
 */
async function runSeparateCalls(
  workerUrl: string, eaName: string, code: string, symbol: string, period: string, slotId: string,
  start?: string, end?: string,
  onStep?: (msg: string) => void
): Promise<Record<string, unknown>> {
  let currentCode = code

  for (let attempt = 0; attempt <= MAX_FIX_RETRIES; attempt++) {
    try {
      const res = await fetch(`${workerUrl}/compile`, {
        method: 'POST',
        headers: workerHeaders(),
        body: JSON.stringify({ ea_name: eaName, mq5_code: currentCode, slot_id: slotId }),
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        if (attempt === MAX_FIX_RETRIES) return { success: false, error: `VPS compile error: ${text.slice(0, 150)}` }
        continue
      }
      const data = await res.json()
      if (data.success) {
        onStep?.(`Compiled successfully · 0 errors`)
        break
      }
      const errors = typeof data.errors === 'string' ? [data.errors] : (data.errors || ['Unknown error'])
      if (attempt < MAX_FIX_RETRIES && getAnthropic()) {
        onStep?.(`Compile error · Auto-fixing with AI (attempt ${attempt + 1}/${MAX_FIX_RETRIES})...`)
        const fixed = await autoFixCode(currentCode, errors)
        if (fixed) {
          currentCode = fixed
          onStep?.(`Re-compiling fixed code...`)
          continue
        }
      }
      return { success: false, error: `Compilation failed: ${errors.slice(0, 3).join('; ').slice(0, 200)}` }
    } catch (err) {
      if (attempt === MAX_FIX_RETRIES) return { success: false, error: `Compile error: ${(err as Error).message}` }
    }
  }

  onStep?.(`Running backtest on ${symbol} ${period}...`)
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 240_000)
    const res = await fetch(`${workerUrl}/backtest`, {
      method: 'POST',
      headers: workerHeaders(),
      body: JSON.stringify({ ea_name: eaName, symbol, period, slot_id: slotId, ...(start ? { start } : {}), ...(end ? { end } : {}) }),
      signal: controller.signal,
    })
    clearTimeout(timeout)
    if (!res.ok) return { success: false, error: `Backtest failed (${res.status})` }
    const data = await res.json()
    if (!data.success) return { success: false, error: data.error || 'Backtest returned no results' }
    const metrics = normalizeMetrics(data.metrics)
    const equity_curve = parseEquityCurve(data.report_b64, metrics)
    return {
      success: true, metrics, equity_curve,
      report_b64: data.report_b64 || null,
      report_is_mt5: data.report_is_mt5 ?? false,
      slot_id: data.slot_id ?? slotId,
      vps_host: data.vps_host ?? null,
    }
  } catch (err) {
    if ((err as Error).name === 'AbortError') return { success: false, error: 'Backtest timed out (4 min)' }
    return { success: false, error: `Backtest error: ${(err as Error).message}` }
  }
}

/**
 * Extract actual error lines from MT5 compile log.
 * The log contains lots of "information: including" lines — we only want errors/warnings.
 */
function extractCompileErrors(log: unknown): string[] {
  if (typeof log !== 'string') return [String(log)]
  // Split on \r\n or \n, and also on path prefixes (VPS sometimes returns one blob)
  const lines = log.split(/\r?\n|(?=C:\\)/)
  const errors: string[] = []
  for (const line of lines) {
    if (line.includes(' error ') && !line.includes('information:')) {
      // Extract: "filename.mq5(line,col) : error XXX: message"
      const match = line.match(/([^\\/]+\.mq5\(\d+,\d+\)\s*:\s*error\s+\d+:\s*.+)/)
      if (match) {
        errors.push(match[1].trim())
      } else {
        // Fallback: strip the path prefix
        const stripped = line.replace(/^.*\\([^\\]+\.mq5)/, '$1').trim()
        errors.push(stripped.slice(0, 150))
      }
    }
  }
  // If no errors extracted, grab the Result line
  if (errors.length === 0) {
    const resultMatch = log.match(/Result:\s*(.+)/)
    if (resultMatch) errors.push(resultMatch[1].trim())
  }
  return errors.length > 0 ? errors : ['Compilation failed (see logs)']
}

function parseNum(val: unknown, fallback = 0): number {
  if (typeof val === 'number') return isNaN(val) ? fallback : val
  if (typeof val === 'string') {
    const match = val.match(/-?[\d,.]+/)
    if (!match) return fallback
    const parsed = parseFloat(match[0].replace(/,/g, '').replace(/ /g, ''))
    return isNaN(parsed) ? fallback : parsed
  }
  return fallback
}

/**
 * Parse the MT5 HTML report to extract metrics the VPS parser misses.
 * MT5 reports use colspan layouts that BeautifulSoup's simple key/value extraction misses.
 */
function parseReportMetrics(reportB64: string | undefined): Record<string, number> {
  if (!reportB64) return {}
  try {
    const buf = Buffer.from(reportB64, 'base64')
    const html = (buf[0] === 0xff && buf[1] === 0xfe) ? buf.toString('utf16le') : buf.toString('utf-8')
    // Strip HTML tags and normalize whitespace (including non-breaking spaces \u00a0)
    const text = html.replace(/<[^>]+>/g, ' ').replace(/[\s\u00a0]+/g, ' ')

    const result: Record<string, number> = {}

    // Sharpe Ratio: -1.93
    const sharpe = text.match(/Sharpe Ratio:?\s*(-?[\d.]+)/)
    if (sharpe) result.sharpe = parseFloat(sharpe[1])

    // Balance Drawdown Maximal: 2 606.48 (2.58%)  OR  Equity Drawdown Maximal: ...
    // Try Balance first, then Equity — use the percentage inside parentheses
    const ddBalance = text.match(/Balance Drawdown Maximal:?\s*[-\d\s,.]+\(([\d.]+)%\)/)
    const ddEquity = text.match(/Equity Drawdown Maximal:?\s*[-\d\s,.]+\(([\d.]+)%\)/)
    // Use the larger of the two (more conservative)
    const ddBalVal = ddBalance ? parseFloat(ddBalance[1]) : 0
    const ddEqVal = ddEquity ? parseFloat(ddEquity[1]) : 0
    const ddVal = Math.max(ddBalVal, ddEqVal)
    if (ddVal > 0) result.max_drawdown = ddVal

    // Profit Trades (% of total): 191 (37.75%)
    const winRate = text.match(/Profit Trades \(% of total\):\s*\d+\s*\(([\d.]+)%\)/)
    if (winRate) result.win_rate = parseFloat(winRate[1])

    // Initial Deposit: 100 000.00
    const deposit = text.match(/Initial Deposit:\s*([\d\s,.]+)/)
    if (deposit) result.initial_deposit = parseFloat(deposit[1].replace(/[\s,]/g, ''))

    // Total Net Profit: -1 595.78
    const netProfit = text.match(/Total Net Profit:\s*(-?[\d\s,.]+)/)
    if (netProfit) result.net_profit = parseFloat(netProfit[1].replace(/[\s,]/g, ''))

    // Profit Factor: 0.90
    const pf = text.match(/Profit Factor:\s*([\d.]+)/)
    if (pf) result.profit_factor = parseFloat(pf[1])

    // Recovery Factor: -0.60
    const rf = text.match(/Recovery Factor:\s*(-?[\d.]+)/)
    if (rf) result.recovery_factor = parseFloat(rf[1])

    // Total Trades: 506
    const trades = text.match(/Total Trades:\s*(\d+)/)
    if (trades) result.total_trades = parseInt(trades[1])

    // Expected Payoff: -3.15
    const ep = text.match(/Expected Payoff:\s*(-?[\d.]+)/)
    if (ep) result.expected_payoff = parseFloat(ep[1])

    return result
  } catch {
    return {}
  }
}

function normalizeMetrics(raw: Record<string, unknown>, reportB64?: string) {
  // Parse the HTML report — this is the authoritative source for metrics.
  // The VPS Python parser only estimates some values (drawdown, sharpe)
  // so we ALWAYS prefer the HTML report values when available.
  const fromReport = parseReportMetrics(reportB64)

  const netProfit = parseNum(fromReport.net_profit ?? raw.net_profit)
  const initialDeposit = fromReport.initial_deposit || 100000
  const totalReturn = initialDeposit > 0 ? (netProfit / initialDeposit) * 100 : 0

  return {
    // Prefer HTML report values (accurate) over VPS estimates
    sharpe: parseNum(fromReport.sharpe ?? raw.sharpe ?? raw.sharpe_ratio),
    max_drawdown: Math.abs(parseNum(fromReport.max_drawdown ?? raw.max_drawdown ?? raw.max_dd)) || 0,
    win_rate: parseNum(fromReport.win_rate ?? raw.win_rate ?? raw.win_pct),
    total_return: totalReturn,
    profit_factor: parseNum(fromReport.profit_factor ?? raw.profit_factor),
    total_trades: parseNum(fromReport.total_trades ?? raw.total_trades),
    net_profit: netProfit,
    recovery_factor: parseNum(fromReport.recovery_factor ?? raw.recovery_factor),
    initial_deposit: initialDeposit,
  }
}

function parseEquityCurve(
  reportB64: string | undefined,
  metrics: { net_profit: number; total_trades: number }
): { date: string; equity: number }[] {
  let equity_curve: { date: string; equity: number }[] = []

  if (reportB64) {
    try {
      const buf = Buffer.from(reportB64, 'base64')
      // Detect encoding: UTF-16LE BOM (0xFF 0xFE) vs UTF-8
      const html = (buf[0] === 0xff && buf[1] === 0xfe)
        ? buf.toString('utf16le')
        : buf.toString('utf-8')

      // Try to extract balance values from MT5 HTML report table rows
      const balanceMatches = [...html.matchAll(/>(\d+\.\d{2})<\/td>\s*<\/tr>/gi)]
      if (balanceMatches.length > 0) {
        for (let i = 0; i < Math.min(balanceMatches.length, 12); i++) {
          const val = parseFloat(balanceMatches[i][1])
          if (val > 100) {
            const month = String(Math.floor(i * 12 / balanceMatches.length) + 1).padStart(2, '0')
            equity_curve.push({ date: `2025-${month}-01`, equity: val })
          }
        }
      }
    } catch { /* ignore parse errors */ }
  }

  return equity_curve
}

async function autoFixCode(
  mq5Code: string,
  errors: string[]
): Promise<string | null> {
  const client = getAnthropic()
  if (!client) return null

  try {
    const response = await client.messages.create({
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

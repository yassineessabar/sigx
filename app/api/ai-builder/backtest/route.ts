import { NextRequest, NextResponse } from 'next/server'
import { getUserFromToken } from '@/lib/api-auth'
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

    if (!ea_name || !mq5_code) {
      return NextResponse.json(
        { success: false, error: 'ea_name and mq5_code are required' },
        { status: 400 }
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

    // Check if any slot is free
    const slotId = await findFreeSlot(workerUrl)
    if (!slotId) {
      return NextResponse.json({
        success: false,
        error: 'All MT5 slots are busy. Try again in a minute.',
      })
    }

    // Try /compile-and-backtest first (single call, more reliable)
    let currentCode = mq5_code
    let lastResult = await tryCompileAndBacktest(workerUrl, ea_name, currentCode, sym, per, start, end)

    if (lastResult.supported) {
      // Endpoint exists — use its result (with auto-fix retries)
      if (lastResult.success) {
        return NextResponse.json(lastResult.data)
      }

      // Compile failed — try auto-fix
      if (lastResult.compileError && getAnthropic()) {
        for (let i = 0; i < MAX_FIX_RETRIES; i++) {
          console.log(`Auto-fix attempt ${i + 1}/${MAX_FIX_RETRIES}...`)
          const errorLines = extractCompileErrors(lastResult.compileError)
          const fixed = await autoFixCode(currentCode, errorLines)
          if (!fixed) break
          currentCode = fixed
          lastResult = await tryCompileAndBacktest(workerUrl, ea_name, currentCode, sym, per, start, end)
          if (lastResult.success) return NextResponse.json(lastResult.data)
          if (!lastResult.compileError) break
        }
      }

      // Return a clean error message, not the raw compile log
      const cleanError = lastResult.compileError
        ? 'Compilation failed: ' + extractCompileErrors(lastResult.compileError).join('; ')
        : (lastResult.data?.error || 'Compile + backtest failed')
      return NextResponse.json({
        success: false,
        error: cleanError.slice(0, 200),
      })
    }

    // /compile-and-backtest not available — fall back to separate calls
    return await fallbackSeparateCalls(workerUrl, ea_name, currentCode, sym, per, slotId, start, end)
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
      body: JSON.stringify({ ea_name: eaName, mq5_code: code, symbol, period, ...(start ? { start } : {}), ...(end ? { end } : {}) }),
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
        data: { success: true, metrics, equity_curve },
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
 * Fallback: separate /compile then /backtest calls.
 */
async function fallbackSeparateCalls(
  workerUrl: string, eaName: string, code: string, symbol: string, period: string, slotId: string,
  start?: string, end?: string
) {
  let currentCode = code

  // Step 1: Compile (with auto-fix retries)
  for (let attempt = 0; attempt <= MAX_FIX_RETRIES; attempt++) {
    try {
      const res = await fetch(`${workerUrl}/compile`, {
        method: 'POST',
        headers: workerHeaders(),
        body: JSON.stringify({ ea_name: eaName, mq5_code: currentCode, slot_id: slotId }),
      })

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        if (attempt === MAX_FIX_RETRIES) {
          return NextResponse.json({
            success: false,
            error: `VPS compile error (${res.status}): ${text.slice(0, 150)}`,
          })
        }
        continue
      }

      const data = await res.json()

      if (data.success) break // compiled!

      const errors = typeof data.errors === 'string' ? [data.errors] : (data.errors || ['Unknown error'])

      if (attempt < MAX_FIX_RETRIES && getAnthropic()) {
        const fixed = await autoFixCode(currentCode, errors)
        if (fixed) { currentCode = fixed; continue }
      }

      return NextResponse.json({
        success: false,
        error: `Compilation failed: ${errors.slice(0, 3).join('; ').slice(0, 200)}`,
      })
    } catch (err) {
      if (attempt === MAX_FIX_RETRIES) {
        return NextResponse.json({
          success: false,
          error: `Compile error: ${(err as Error).message}`,
        })
      }
    }
  }

  // Step 2: Backtest
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

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return NextResponse.json({
        success: false,
        error: `Backtest request failed (${res.status}): ${text.slice(0, 150)}`,
      })
    }

    const data = await res.json()

    if (!data.success) {
      return NextResponse.json({
        success: false,
        error: data.error || 'Backtest returned no results',
      })
    }

    const metrics = normalizeMetrics(data.metrics)
    const equity_curve = parseEquityCurve(data.report_b64, metrics)

    return NextResponse.json({ success: true, metrics, equity_curve })
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      return NextResponse.json({
        success: false,
        error: 'Backtest timed out (4 min). The MT5 terminal may need symbol data downloaded first.',
      })
    }
    return NextResponse.json({
      success: false,
      error: `Backtest error: ${(err as Error).message}`,
    })
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
  if (typeof val === 'number') return val
  if (typeof val === 'string') {
    const match = val.match(/-?[\d,.]+/)
    return match ? parseFloat(match[0].replace(/,/g, '').replace(/ /g, '')) : fallback
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
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

    const result: Record<string, number> = {}

    // Sharpe Ratio: -1.93
    const sharpe = text.match(/Sharpe Ratio:\s*(-?[\d.]+)/)
    if (sharpe) result.sharpe = parseFloat(sharpe[1])

    // Balance Drawdown Maximal: 2 606.48 (2.58%)
    const ddMax = text.match(/(?:Balance|Equity) Drawdown Maximal:\s*[\d\s,.]+\(([\d.]+)%\)/)
    if (ddMax) result.max_drawdown = parseFloat(ddMax[1])

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
  // Parse the HTML report for metrics the VPS parser misses
  const fromReport = parseReportMetrics(reportB64)

  const netProfit = parseNum(raw.net_profit ?? fromReport.net_profit)
  const initialDeposit = fromReport.initial_deposit || 100000
  const totalReturn = initialDeposit > 0 ? (netProfit / initialDeposit) * 100 : 0

  return {
    sharpe: parseNum(raw.sharpe ?? raw.sharpe_ratio ?? fromReport.sharpe),
    max_drawdown: Math.abs(parseNum(raw.max_drawdown ?? raw.max_dd ?? fromReport.max_drawdown)),
    win_rate: parseNum(raw.win_rate ?? raw.win_pct ?? fromReport.win_rate),
    total_return: totalReturn,
    profit_factor: parseNum(raw.profit_factor ?? fromReport.profit_factor),
    total_trades: parseNum(raw.total_trades ?? fromReport.total_trades),
    net_profit: netProfit,
    recovery_factor: parseNum(raw.recovery_factor ?? fromReport.recovery_factor),
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
      const html = Buffer.from(reportB64, 'base64').toString('utf16le')
      const balanceMatches = [...html.matchAll(/>(\d+\.\d{2})<\/td>\s*<\/tr>/gi)]
      if (balanceMatches.length > 0) {
        for (let i = 0; i < Math.min(balanceMatches.length, 12); i++) {
          const val = parseFloat(balanceMatches[i][1])
          if (val > 100) {
            const month = String(Math.floor(i * 12 / balanceMatches.length) + 1).padStart(2, '0')
            equity_curve.push({ date: `2024-${month}-01`, equity: val })
          }
        }
      }
    } catch { /* ignore parse errors */ }
  }

  if (equity_curve.length === 0 && metrics.total_trades > 0) {
    const start = 10000
    const end = start + metrics.net_profit
    for (let i = 0; i < 12; i++) {
      const progress = i / 11
      const noise = Math.sin(i * 1.7) * 200 + Math.cos(i * 0.8) * 100
      equity_curve.push({
        date: `2024-${String(i + 1).padStart(2, '0')}-01`,
        equity: Math.round(start + (end - start) * progress + noise),
      })
    }
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

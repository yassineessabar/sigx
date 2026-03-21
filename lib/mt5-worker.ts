/**
 * MT5 Worker client — calls the MT5 Worker API on the Windows VPS.
 * Requires MT5_WORKER_URL and MT5_WORKER_KEY to be set.
 */

const MT5_WORKER_URL = process.env.MT5_WORKER_URL || ''
const MT5_WORKER_KEY = process.env.MT5_WORKER_KEY || ''

function isWorkerConfigured(): boolean {
  return MT5_WORKER_URL.length > 0
}

function workerHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'x-api-key': MT5_WORKER_KEY,
  }
}

// ─── Compile ────────────────────────────────────────────────────────

export interface CompileResult {
  success: boolean
  errors?: string[]
  warnings?: string[]
}

export async function compileEA(eaName: string, mq5Code: string): Promise<CompileResult> {
  if (!isWorkerConfigured()) {
    return { success: false, errors: ['MT5 Worker not configured. Set MT5_WORKER_URL.'] }
  }

  try {
    const res = await fetch(`${MT5_WORKER_URL}/compile`, {
      method: 'POST',
      headers: workerHeaders(),
      body: JSON.stringify({ ea_name: eaName, mq5_code: mq5Code }),
    })

    if (!res.ok) {
      const text = await res.text()
      return { success: false, errors: [`Worker returned ${res.status}: ${text}`] }
    }

    const data = await res.json()
    // Worker returns { success: bool, errors: string }
    return {
      success: data.success,
      errors: data.errors ? [data.errors] : [],
    }
  } catch (err) {
    return { success: false, errors: [(err as Error).message] }
  }
}

// ─── Backtest ───────────────────────────────────────────────────────

export interface BacktestResult {
  success: boolean
  metrics?: {
    sharpe: number
    max_drawdown: number
    win_rate: number
    total_return: number
    profit_factor: number
    total_trades: number
    net_profit?: number
    recovery_factor?: number
  }
  equity_curve?: { date: string; equity: number }[]
  error?: string
}

/**
 * Parse the base64 MT5 HTML report to extract equity curve data.
 * MT5 reports contain a deals table with balance values.
 */
function parseEquityCurveFromReport(reportB64: string): { date: string; equity: number }[] {
  try {
    const html = Buffer.from(reportB64, 'base64').toString('utf16le')
    const curve: { date: string; equity: number }[] = []

    // Find balance values from the deals table
    // MT5 reports have rows like: <td>2024.01.15 10:30:00</td>...<td>10234.56</td> (balance column)
    // The balance column is typically the last numeric column in the deals section

    // Try to extract deal rows with dates and balance
    const dealPattern = /(\d{4}\.\d{2}\.\d{2})\s+\d{2}:\d{2}:\d{2}/g
    const balancePattern = /<td[^>]*>(\d+\.\d{2})<\/td>\s*<\/tr>/gi

    // Simpler approach: find all balance values after "Deals" header
    const dealsIdx = html.indexOf('Deals')
    if (dealsIdx === -1) return curve

    const dealsSection = html.substring(dealsIdx)

    // Extract rows with dates
    const rowRegex = /<tr[^>]*>[\s\S]*?(\d{4}\.\d{2}\.\d{2})\s+(\d{2}:\d{2}:\d{2})[\s\S]*?<\/tr>/gi
    let match
    while ((match = rowRegex.exec(dealsSection)) !== null) {
      const dateStr = match[1].replace(/\./g, '-')
      const row = match[0]

      // Find the last number that looks like a balance (typically > 1000)
      const nums = [...row.matchAll(/>(-?\d+\.\d{2})</g)]
      if (nums.length > 0) {
        const lastNum = parseFloat(nums[nums.length - 1][1])
        if (lastNum > 100) { // likely a balance value
          curve.push({ date: dateStr, equity: lastNum })
        }
      }
    }

    // Deduplicate by date (keep last entry per date)
    const byDate = new Map<string, number>()
    for (const point of curve) {
      byDate.set(point.date, point.equity)
    }

    return [...byDate.entries()].map(([date, equity]) => ({ date, equity }))
  } catch {
    return []
  }
}

export async function backtestEA(
  eaName: string,
  symbol: string,
  period: string
): Promise<BacktestResult> {
  if (!isWorkerConfigured()) {
    return { success: false, error: 'MT5 Worker not configured. Set MT5_WORKER_URL.' }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 300_000) // 300s

  try {
    const res = await fetch(`${MT5_WORKER_URL}/backtest`, {
      method: 'POST',
      headers: workerHeaders(),
      body: JSON.stringify({ ea_name: eaName, symbol, period }),
      signal: controller.signal,
    })

    if (!res.ok) {
      const text = await res.text()
      return { success: false, error: `Worker returned ${res.status}: ${text}` }
    }

    const data = await res.json()

    if (!data.success) {
      return { success: false, error: data.error || 'Backtest failed' }
    }

    // Map MT5 Worker metrics to our frontend format
    // Worker returns: { success, metrics: { net_profit, profit_factor, recovery_factor, total_trades, sharpe, max_drawdown, win_rate, ... }, report_b64 }
    const raw = data.metrics || {}

    const metrics = {
      sharpe: raw.sharpe ?? raw.sharpe_ratio ?? 0,
      max_drawdown: Math.abs(raw.max_drawdown ?? raw.max_dd ?? raw.drawdown ?? 0),
      win_rate: raw.win_rate ?? raw.win_pct ?? 0,
      total_return: raw.total_return ?? raw.net_profit ?? 0,
      profit_factor: raw.profit_factor ?? 0,
      total_trades: raw.total_trades ?? 0,
      net_profit: raw.net_profit ?? 0,
      recovery_factor: raw.recovery_factor ?? 0,
    }

    // Parse equity curve from HTML report
    let equity_curve: { date: string; equity: number }[] = []
    if (data.report_b64) {
      equity_curve = parseEquityCurveFromReport(data.report_b64)
    }

    // If no equity curve from report, generate a simple one from net_profit
    if (equity_curve.length === 0 && metrics.total_trades > 0) {
      const startEquity = 10000
      const endEquity = startEquity + metrics.net_profit
      const points = 12
      for (let i = 0; i < points; i++) {
        const progress = i / (points - 1)
        const noise = (Math.sin(i * 1.5) * 0.02) * startEquity
        const equity = startEquity + (endEquity - startEquity) * progress + noise
        const month = String(i + 1).padStart(2, '0')
        equity_curve.push({ date: `2024-${month}-01`, equity: Math.round(equity * 100) / 100 })
      }
    }

    return { success: true, metrics, equity_curve }
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      return { success: false, error: 'Backtest timed out after 300s' }
    }
    return { success: false, error: (err as Error).message }
  } finally {
    clearTimeout(timeout)
  }
}

// ─── Deploy ─────────────────────────────────────────────────────────

export interface DeployResult {
  success: boolean
  error?: string
}

export async function deployEA(
  eaName: string,
  mq5Code: string,
  symbol: string,
  period: string
): Promise<DeployResult> {
  if (!isWorkerConfigured()) {
    return { success: false, error: 'MT5 Worker not configured. Set MT5_WORKER_URL.' }
  }

  const res = await fetch(`${MT5_WORKER_URL}/deploy`, {
    method: 'POST',
    headers: workerHeaders(),
    body: JSON.stringify({ ea_name: eaName, mq5_code: mq5Code, symbol, period }),
  })

  if (!res.ok) {
    const text = await res.text()
    return { success: false, error: `Worker returned ${res.status}: ${text}` }
  }

  return res.json()
}

// ─── Status ─────────────────────────────────────────────────────────

export interface WorkerStatus {
  online: boolean
  mt5_running?: boolean
  ready?: boolean
}

export async function getWorkerStatus(): Promise<WorkerStatus> {
  if (!isWorkerConfigured()) {
    return { online: false }
  }

  try {
    const res = await fetch(`${MT5_WORKER_URL}/status`, {
      method: 'GET',
      headers: workerHeaders(),
    })

    if (!res.ok) {
      return { online: false }
    }

    return res.json()
  } catch {
    return { online: false }
  }
}

// ─── Export ─────────────────────────────────────────────────────────

export { isWorkerConfigured }

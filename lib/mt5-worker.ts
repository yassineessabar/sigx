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
    return { success: false, errors: ['MT5 Worker not configured. Set MT5_WORKER_URL in environment variables.'] }
  }

  const res = await fetch(`${MT5_WORKER_URL}/compile`, {
    method: 'POST',
    headers: workerHeaders(),
    body: JSON.stringify({ ea_name: eaName, mq5_code: mq5Code }),
  })

  if (!res.ok) {
    const text = await res.text()
    return { success: false, errors: [`Worker returned ${res.status}: ${text}`] }
  }

  return res.json()
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
  }
  equity_curve?: { date: string; equity: number }[]
  error?: string
}

export async function backtestEA(
  eaName: string,
  symbol: string,
  period: string
): Promise<BacktestResult> {
  if (!isWorkerConfigured()) {
    return { success: false, error: 'MT5 Worker not configured. Set MT5_WORKER_URL in environment variables.' }
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

    return res.json()
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
    return { success: false, error: 'MT5 Worker not configured. Set MT5_WORKER_URL in environment variables.' }
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

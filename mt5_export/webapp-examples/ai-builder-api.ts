/**
 * Next.js API routes for the ai-builder page.
 * These proxy requests to the Hybrid Manager on the Windows VPS.
 *
 * Environment variables needed:
 *   MT5_MANAGER_URL=http://YOUR_VPS_IP:8000
 *   MT5_WORKER_KEY=your-secret-key
 */

// ── POST /api/ai-builder/run ────────────────────────────────────
// Starts a full pipeline job. Returns job_id immediately.

// app/api/ai-builder/run/route.ts
export async function runStrategy(req: Request) {
  const body = await req.json()
  const { prompt, iterations = 3, symbol = 'EURUSD', period = 'H1', ea_name } = body

  const res = await fetch(`${process.env.MT5_MANAGER_URL}/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.MT5_WORKER_KEY!,
    },
    body: JSON.stringify({ prompt, iterations, symbol, period, ea_name }),
  })

  return Response.json(await res.json())
}


// ── GET /api/ai-builder/job/[jobId] ─────────────────────────────
// Poll for job results.

export async function getJob(jobId: string) {
  const res = await fetch(`${process.env.MT5_MANAGER_URL}/job/${jobId}`, {
    headers: { 'x-api-key': process.env.MT5_WORKER_KEY! },
  })
  return res.json()
}


// ── GET /api/ai-builder/stream/[jobId] ──────────────────────────
// Proxy the SSE stream to the client.

// app/api/ai-builder/stream/[jobId]/route.ts
export async function streamJob(req: Request, jobId: string) {
  const res = await fetch(`${process.env.MT5_MANAGER_URL}/job/${jobId}/stream`, {
    headers: { 'x-api-key': process.env.MT5_WORKER_KEY! },
  })

  return new Response(res.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}


// ── POST /api/ai-builder/compile-and-backtest ───────────────────
// Direct mode: compile + backtest without AI (you provide the code).

export async function compileAndBacktest(
  ea_name: string,
  mq5_code: string,
  symbol = 'EURUSD',
  period = 'H1',
) {
  const res = await fetch(`${process.env.MT5_MANAGER_URL}/compile-and-backtest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.MT5_WORKER_KEY!,
    },
    body: JSON.stringify({ ea_name, mq5_code, symbol, period }),
  })
  return res.json()
}


// ── POST /api/ai-builder/deploy ─────────────────────────────────
// Deploy EA to live trading.

export async function deployStrategy(
  ea_name: string,
  mq5_code: string,
  symbol = 'EURUSD',
  period = 'H1',
) {
  const res = await fetch(`${process.env.MT5_MANAGER_URL}/deploy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.MT5_WORKER_KEY!,
    },
    body: JSON.stringify({ ea_name, mq5_code, symbol, period }),
  })
  return res.json()
}


// ── GET /api/ai-builder/status ──────────────────────────────────
// Health check — no auth needed.

export async function getStatus() {
  const res = await fetch(`${process.env.MT5_MANAGER_URL}/status`)
  return res.json()
}

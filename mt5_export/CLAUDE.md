# AI MQL5 Strategy Builder — Hybrid Manager Integration

## Context

This export contains the **Hybrid Manager** — a single FastAPI service running on the Windows VPS that handles everything: AI code generation, compilation, backtesting, optimization, and deployment. Your webapp just makes HTTP calls to it.

**This replaces the old split architecture** (separate worker + backend scripts). The manager does it all.

## Architecture

```
YOUR WEB APP (ai-builder page)
    │
    ├── Frontend: Chat UI + Results Dashboard
    │   User describes strategy → sees progress via SSE → sees results
    │
    └── Your API Backend (Next.js / any framework)
        │
        │  All calls go to the Hybrid Manager on the VPS:
        │
        │  POST /run                → full pipeline (generate+compile+backtest+optimize)
        │  GET  /job/{id}/stream    → SSE real-time progress
        │  GET  /job/{id}           → poll for results
        │  POST /compile-and-backtest → one-shot (no AI, you provide the code)
        │  POST /deploy             → deploy EA to live trading
        │
        ▼
   HYBRID MANAGER (FastAPI :8000 on Windows VPS)
        │
        ├── Claude Code generates/improves .mq5 code    (AI — creative)
        ├── MetaEditor compiles .mq5 → .ex5              (direct — fast)
        ├── Terminal64 runs backtests                     (direct — 30-60s)
        ├── 04_analyse_results parses .htm reports        (direct — instant)
        └── Manages MT5 slot pool for parallel jobs
```

## What's in This Export

```
mt5_export/
├── CLAUDE.md              ← this file (integration guide)
│
├── manager/               ← DEPLOY TO WINDOWS VPS
│   ├── manager.py         ← the hybrid manager service
│   ├── provision.py       ← slot provisioner CLI
│   ├── analyse_results.py ← report parser (used by manager)
│   └── requirements.txt   ← Python dependencies
│
└── webapp-examples/       ← COPY INTO YOUR WEBAPP
    ├── ai-builder-api.ts  ← Next.js API route example
    └── use-strategy.ts    ← React hook for SSE streaming
```

## Setup on Windows VPS

### 1. Copy the manager/ folder to `C:\MT5\manager\`

```bash
# On the VPS
mkdir C:\MT5\manager
# Copy manager.py, provision.py, analyse_results.py, requirements.txt
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Set environment variable

```bash
set MT5_WORKER_KEY=your-secret-key-here
```

### 4. Register the main MT5 install and create slots

```bash
cd C:\MT5\manager
python provision.py register-main    # Register main FTMO install as slot 0
python provision.py create           # Create slot 1 (copies MT5, ~30s)
python provision.py list             # Verify
```

### 5. Start the manager

```bash
cd C:\MT5\manager
python -m uvicorn manager:app --host 0.0.0.0 --port 8000
```

### 6. Ensure Claude Code is installed and authenticated

```bash
claude login
claude -p "say hello" --dangerously-skip-permissions
```

## API Reference

### Agent Mode: Full Autonomous Pipeline

**POST /run** — Start a full generate→compile→backtest→optimize job

```json
// Request
{
  "prompt": "Create an RSI mean-reversion strategy for EURUSD H1 with ATR-based stops",
  "iterations": 5,
  "symbol": "EURUSD",
  "period": "H1",
  "ea_name": "RSI_MeanRev"  // optional, auto-generated if omitted
}

// Response (immediate)
{
  "job_id": "a1b2c3d4",
  "status": "running",
  "ea_name": "RSI_MeanRev"
}
```

**GET /job/{job_id}/stream** — SSE event stream (real-time progress)

Events emitted:
| Event | Data | When |
|-------|------|------|
| `started` | `{ea_name, iterations}` | Job begins |
| `iteration_start` | `{iteration, total}` | Each iteration |
| `generating` | `{ea_name}` | Claude Code writing code |
| `improving` | `{ea_name, metrics}` | Claude Code improving |
| `fixing` | `{ea_name, reason}` | Fixing compile errors |
| `compiled` | `{iteration, attempt}` | Compile OK |
| `compile_failed` | `{iteration, attempt, errors}` | Compile failed |
| `backtesting` | `{iteration, slot_id}` | Backtest running |
| `iteration_done` | `{iteration, metrics, success, duration_s}` | Iteration complete |
| `new_best` | `{iteration, pf, trades}` | New best found |
| `early_exit` | `{reason, pf, trades}` | Stopped early (target met) |
| `completed` | `{best_metrics, iterations_run}` | Done |
| `error` | `{error}` | Failed |
| `done` | `{status}` | Final event |

**GET /job/{job_id}** — Poll for results

```json
// Response (when completed)
{
  "job_id": "a1b2c3d4",
  "status": "completed",
  "current_step": "completed",
  "ea_name": "RSI_MeanRev",
  "result": {
    "best_ea_name": "RSI_MeanRev",
    "best_code": "// full .mq5 source code...",
    "best_metrics": {
      "profit_factor": 1.8,
      "net_profit": 342.50,
      "total_trades": 187,
      "max_drawdown": "-45.20 (0.05%)",
      "sharpe": 1.2
    },
    "iterations_run": 5,
    "all_iterations": [
      {"iteration": 1, "metrics": {...}, "success": true, "duration_s": 95.2},
      {"iteration": 2, "metrics": {...}, "success": true, "duration_s": 88.7},
      ...
    ]
  }
}
```

### Direct Mode: Individual Operations

**POST /compile** — Compile code on a specific slot
```json
{"ea_name": "MyEA", "mq5_code": "...", "slot_id": "0"}
// Returns: {"success": true, "errors": ""}
```

**POST /backtest** — Backtest a compiled EA
```json
{"ea_name": "MyEA", "symbol": "EURUSD", "period": "H1", "slot_id": "0"}
// Returns: {"success": true, "metrics": {...}, "report_b64": "..."}
```

**POST /compile-and-backtest** — Both in one call (auto-selects slot)
```json
{"ea_name": "MyEA", "mq5_code": "...", "symbol": "EURUSD", "period": "H1"}
// Returns: {"success": true, "metrics": {...}, "report_b64": "..."}
```

**POST /deploy** — Deploy EA to live trading
```json
{"ea_name": "MyEA", "mq5_code": "...", "symbol": "EURUSD", "period": "H1", "slot_id": "0"}
// Returns: {"success": true, "message": "EA MyEA deployed on EURUSD H1", "pid": 1234}
```

### Management

**GET /status** — Health check (no auth)
```json
{"ready": true, "total_slots": 2, "available_slots": 2, "busy_slots": 0, "running_jobs": 0}
```

**GET /slots** — List slots
**GET /jobs** — List all jobs
**DELETE /job/{id}** — Delete job + workspace

All endpoints (except /status) require `x-api-key` header.

## Integrating into Your ai-builder Page

### Option A: Full Pipeline (recommended)

Your ai-builder page makes ONE call and streams progress:

```typescript
// app/api/ai-builder/run/route.ts

export async function POST(req: Request) {
  const { prompt, iterations = 3, symbol = 'EURUSD', period = 'H1' } = await req.json()

  const res = await fetch(`${process.env.MT5_MANAGER_URL}/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.MT5_WORKER_KEY!,
    },
    body: JSON.stringify({ prompt, iterations, symbol, period }),
  })

  return Response.json(await res.json())
}
```

```typescript
// app/api/ai-builder/stream/[jobId]/route.ts

export async function GET(req: Request, { params }: { params: { jobId: string } }) {
  const { jobId } = params

  const res = await fetch(`${process.env.MT5_MANAGER_URL}/job/${jobId}/stream`, {
    headers: { 'x-api-key': process.env.MT5_WORKER_KEY! },
  })

  // Proxy the SSE stream to the client
  return new Response(res.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
```

```typescript
// React component — connecting to SSE
function useStrategyStream(jobId: string | null) {
  const [events, setEvents] = useState<any[]>([])
  const [status, setStatus] = useState<string>('idle')

  useEffect(() => {
    if (!jobId) return

    const source = new EventSource(`/api/ai-builder/stream/${jobId}`)

    source.addEventListener('iteration_done', (e) => {
      const data = JSON.parse(e.data)
      setEvents(prev => [...prev, data])
    })

    source.addEventListener('new_best', (e) => {
      const data = JSON.parse(e.data)
      // Update best strategy display
    })

    source.addEventListener('completed', (e) => {
      setStatus('completed')
    })

    source.addEventListener('error', (e) => {
      setStatus('error')
    })

    source.addEventListener('done', () => {
      source.close()
    })

    return () => source.close()
  }, [jobId])

  return { events, status }
}
```

### Option B: Direct Control

If your ai-builder page wants to control each step:

```typescript
// Your backend orchestrates step by step
async function buildStrategy(prompt: string) {
  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': process.env.MT5_WORKER_KEY!,
  }
  const base = process.env.MT5_MANAGER_URL!

  // 1. Generate code with your own Claude API call
  const mq5Code = await generateWithClaude(prompt)

  // 2. Compile + backtest via manager (auto-selects slot)
  const res = await fetch(`${base}/compile-and-backtest`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      ea_name: 'MyStrategy',
      mq5_code: mq5Code,
      symbol: 'EURUSD',
      period: 'H1',
    }),
  })
  const result = await res.json()

  // 3. If compile failed, fix and retry
  if (!result.success && result.step === 'compile') {
    const fixedCode = await fixWithClaude(mq5Code, result.errors)
    // retry...
  }

  return result
}
```

## Environment Variables for Your Webapp

```bash
MT5_MANAGER_URL=http://YOUR_VPS_IP:8000    # Hybrid Manager on Windows VPS
MT5_WORKER_KEY=your-secret-key              # Shared auth key
```

## Key Differences from Old Architecture

| Old (Worker) | New (Hybrid Manager) |
|---|---|
| Webapp backend calls Claude API directly | Manager calls Claude Code on VPS |
| Webapp backend orchestrates the loop | Manager orchestrates autonomously |
| One MT5 instance, one backtest at a time | Slot pool, parallel backtests |
| No streaming | SSE real-time progress |
| Separate compile + backtest calls | One `/run` call does everything |
| Manual compile-error fixing | Auto-fix with Claude Code (3 retries) |
| No deploy endpoint | `POST /deploy` included |

## How the Hybrid Pipeline Works Per Iteration

```
Time   What Happens                      Slot?
─────  ────────────────────────────────  ─────
0s     Claude Code generates .mq5        FREE
30s    Acquire slot, compile             LOCKED
33s    Backtest runs                     LOCKED
90s    Parse report, release slot        FREE
91s    Claude Code improves .mq5         FREE
120s   Acquire slot, compile             LOCKED
...
```

Slots are only locked during compile+backtest (~30-60s), released during AI thinking (~30-60s). This means 2 slots can handle 3-4 concurrent jobs efficiently.

# AI MQL5 Strategy Builder — Integration into ai-builder page

## Context

This project contains 7 Python scripts that form a complete pipeline for AI-powered MQL5 trading strategy generation, backtesting, optimization, and deployment. They were developed and tested on a Windows VPS with MetaTrader 5 installed.

The goal is to integrate this pipeline into a **web app's `ai-builder` page** so users can:
1. Describe a trading strategy in natural language (chat interface)
2. AI generates MQL5 code automatically
3. Backtest runs on a remote Windows VPS (user has NO MetaTrader)
4. Results display as charts (equity curve, metrics)
5. Optimize iteratively (AI improves based on backtest results)
6. Deploy approved strategy to live trading

## Architecture

```
YOUR WEB APP (ai-builder page)
    │
    ├── Frontend: Chat UI + Results Dashboard
    │   User describes strategy → sees code → sees backtest results → approves
    │
    ├── Your API Backend (runs anywhere, no MT5 needed)
    │   ├── Calls Claude API to generate .mq5 code    ← uses 02_generate_strategy.py
    │   ├── Parses backtest reports into JSON           ← uses 04_analyse_results.py
    │   ├── Orchestrates the optimize loop              ← uses 05_optimise_loop.py logic
    │   └── Sends compile/backtest/deploy jobs to MT5 Worker via HTTP
    │
    └── MT5 Worker API (runs on Windows VPS with MetaTrader 5)
        ├── POST /compile   — compiles .mq5 code       ← uses 03_run_backtest.py
        ├── POST /backtest  — runs MT5 Strategy Tester  ← uses 03_run_backtest.py
        ├── POST /deploy    — attaches EA to live chart  ← uses deploy_ea.py
        └── POST /fetch     — pulls price data          ← uses 01_fetch_data.py
```

## The Scripts — What Each Does and Where It Runs

### Scripts that run on YOUR BACKEND (no MT5 needed)

**`02_generate_strategy.py`** — Calls Claude API, returns .mq5 source code.
- Key function: `generate_strategy(prompt, strategy_name)` → returns file path
- Only dependency: `anthropic` Python package
- In your webapp: call this from your ai-builder API route when user submits a prompt
- The function calls `client.messages.create()` with the user's prompt and returns raw MQL5 code

**`04_analyse_results.py`** — Parses MT5 HTML backtest reports into a dict.
- Key function: `parse_mt5_report(html_path)` → returns `{profit_factor, net_profit, max_drawdown, total_trades, sharpe, recovery_factor, ...}`
- Only dependency: `beautifulsoup4`
- MT5 reports are UTF-16 encoded .htm files — the parser handles this
- In your webapp: use this to parse the .htm report returned by the MT5 Worker

**`05_optimise_loop.py`** — Orchestrates generate → backtest → analyse → improve.
- Key function: `optimise_loop(base_prompt, iterations, symbol, period)`
- Imports `generate_strategy` from 02, `run_backtest` from 03, `parse_mt5_report` from 04
- Each iteration: sends previous results + code to Claude → gets improved code → backtests → compares
- In your webapp: rewrite this as an async task. Replace `run_backtest()` call with HTTP POST to MT5 Worker. Replace file I/O with database writes.

**`dashboard.py`** — Dash/Plotly dashboard that reads .htm reports and shows charts.
- Key function: `parse_report(filepath)` → returns metrics + equity curve data (times[] and balances[])
- Extracts deal-by-deal balance for equity curve plotting
- In your webapp: use `parse_report()` in your backend to extract chart data, send as JSON to your React frontend. Render with Plotly.js or Recharts.

### Scripts that run ONLY on the Windows VPS (MT5 Worker)

**`01_fetch_data.py`** — Connects to MT5 broker, pulls OHLCV candle data.
- Uses `MetaTrader5` Python package (Windows-only, requires MT5 running)
- In your webapp: wrap as `POST /fetch` endpoint on MT5 Worker

**`03_run_backtest.py`** — The core MT5 integration. Compiles and backtests.
- Key functions:
  - `copy_ea_to_mt5(mq5_file)` — copies .mq5 to MT5 Experts folder
  - `compile_ea(ea_name)` — runs `metaeditor64.exe`, returns True/False
  - `create_backtest_config(ea_name, symbol, period, start, end, deposit)` — writes .ini file
  - `run_backtest(ea_name, symbol, period)` — kills MT5, launches with config, polls for .htm report
  - `kill_mt5()` — terminates MT5 process
- Hardcoded Windows paths (MT5_TERMINAL, MT5_DATA, METAEDITOR) — these stay on the VPS
- In your webapp: wrap as `POST /compile` and `POST /backtest` endpoints on MT5 Worker

**`deploy_ea.py`** — Deploys a compiled EA to live trading.
- Key function: `deploy(mq5_file, symbol, period)` — compiles, writes live config, restarts MT5 with EA attached
- In your webapp: wrap as `POST /deploy` endpoint on MT5 Worker

## How to Integrate into Your ai-builder Page

### Step 1: Copy scripts into your project

```
your-webapp/
├── mt5/
│   ├── generate_strategy.py    ← copy from 02_generate_strategy.py
│   ├── analyse_results.py      ← copy from 04_analyse_results.py
│   ├── parse_report.py         ← copy parse_report() from dashboard.py
│   └── optimise.py             ← rewrite from 05_optimise_loop.py
│
├── mt5_worker/                  ← this folder deploys to the Windows VPS only
│   ├── worker.py               ← FastAPI app wrapping 01, 03, deploy_ea
│   ├── 01_fetch_data.py        ← copy as-is
│   ├── 03_run_backtest.py      ← copy as-is
│   └── deploy_ea.py            ← copy as-is
│
├── app/
│   ├── api/
│   │   └── ai-builder/
│   │       ├── generate/route.ts    ← calls mt5/generate_strategy.py
│   │       ├── backtest/route.ts    ← proxies to MT5 Worker
│   │       ├── optimize/route.ts    ← runs optimize loop
│   │       └── deploy/route.ts      ← proxies to MT5 Worker
│   └── ai-builder/
│       └── page.tsx                 ← the ai-builder UI
```

### Step 2: Build the MT5 Worker (on Windows VPS)

Create `mt5_worker/worker.py` — a FastAPI app that wraps 01, 03, and deploy_ea:

```python
# mt5_worker/worker.py
# Deploy this ONLY on the Windows VPS that has MetaTrader 5
# Run: pip install fastapi uvicorn && uvicorn worker:app --host 0.0.0.0 --port 8000

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel
import os, sys

# Import existing scripts
sys.path.insert(0, os.path.dirname(__file__))
from importlib import import_module
mod03 = import_module("03_run_backtest")
mod04 = import_module("04_analyse_results")

app = FastAPI()
API_KEY = os.getenv("MT5_WORKER_KEY", "changeme")

def check_key(x_api_key: str = Header()):
    if x_api_key != API_KEY:
        raise HTTPException(401)

class CompileReq(BaseModel):
    ea_name: str
    mq5_code: str

class BacktestReq(BaseModel):
    ea_name: str
    symbol: str = "EURUSD"
    period: str = "H1"
    start: str = "2023.01.01"
    end: str = "2025.01.01"
    deposit: int = 100000

class DeployReq(BaseModel):
    ea_name: str
    mq5_code: str
    symbol: str = "EURUSD"
    period: str = "H1"

@app.post("/compile")
def compile_ea(req: CompileReq, x_api_key: str = Header()):
    check_key(x_api_key)
    path = os.path.join(mod03.MT5_EXPERTS, f"{req.ea_name}.mq5")
    with open(path, "w") as f:
        f.write(req.mq5_code)
    ok = mod03.compile_ea(req.ea_name)
    err = ""
    if not ok:
        log = path.replace(".mq5", ".log")
        if os.path.exists(log):
            with open(log, "r", errors="ignore") as f:
                err = f.read()
    return {"success": ok, "errors": err}

@app.post("/backtest")
def backtest(req: BacktestReq, x_api_key: str = Header()):
    check_key(x_api_key)
    mod03.run_backtest(req.ea_name, req.symbol, req.period)
    for ext in [".htm", ".html"]:
        p = os.path.join("results", f"{req.ea_name}_report{ext}")
        if os.path.exists(p):
            metrics = mod04.parse_mt5_report(p)
            # Read raw report for equity curve parsing on caller side
            with open(p, "rb") as f:
                raw = f.read()
            import base64
            return {"success": True, "metrics": metrics, "report_b64": base64.b64encode(raw).decode()}
    return {"success": False, "metrics": {}, "error": "No report generated"}

@app.post("/deploy")
def deploy(req: DeployReq, x_api_key: str = Header()):
    check_key(x_api_key)
    from deploy_ea import deploy as do_deploy
    path = f"strategies/{req.ea_name}.mq5"
    os.makedirs("strategies", exist_ok=True)
    with open(path, "w") as f:
        f.write(req.mq5_code)
    ok = do_deploy(path, req.symbol, req.period)
    return {"success": ok}

@app.get("/status")
def status():
    import subprocess
    r = subprocess.run(["tasklist"], capture_output=True, text=True)
    mt5 = "terminal64.exe" in r.stdout.lower()
    return {"mt5_running": mt5, "ready": True}
```

### Step 3: Wire the ai-builder page flow

The ai-builder page has this user flow:

```
[Chat Input] → User describes strategy
      │
      ▼
[Generate] → Your backend calls Claude API (02_generate_strategy.py logic)
      │        Returns .mq5 code, show in code preview panel
      ▼
[Compile] → Your backend POSTs to MT5 Worker /compile
      │       If fails: send errors to Claude, auto-fix, retry (max 3x)
      ▼
[Backtest] → Your backend POSTs to MT5 Worker /backtest
      │        Takes 30-120 seconds. Show loading spinner.
      │        Returns metrics + report HTML
      ▼
[Results Panel] → Show equity curve, PF, Sharpe, DD, trades
      │            Use parse_report() from dashboard.py for chart data
      │            Render with Plotly.js in React
      ▼
[Optimize] → User clicks optimize button
      │        Your backend loops N times:
      │          1. Claude API (improve based on results)
      │          2. MT5 Worker /compile
      │          3. MT5 Worker /backtest
      │          4. Compare results, keep best
      │        Show progress bar + iteration results in real-time
      ▼
[Deploy] → User approves → POST to MT5 Worker /deploy
             EA attached to live MT5 chart on VPS
```

### Step 4: How your backend calls the MT5 Worker

```python
# In your webapp backend (Python example)
import httpx

MT5_WORKER = os.getenv("MT5_WORKER_URL")  # http://VPS_IP:8000
MT5_KEY = os.getenv("MT5_WORKER_KEY")

async def compile_and_backtest(ea_name: str, mq5_code: str, symbol="EURUSD", period="H1"):
    headers = {"x-api-key": MT5_KEY}

    # Compile
    r = await httpx.AsyncClient().post(f"{MT5_WORKER}/compile",
        json={"ea_name": ea_name, "mq5_code": mq5_code},
        headers=headers, timeout=60)
    data = r.json()
    if not data["success"]:
        return {"step": "compile", "success": False, "errors": data["errors"]}

    # Backtest
    r = await httpx.AsyncClient().post(f"{MT5_WORKER}/backtest",
        json={"ea_name": ea_name, "symbol": symbol, "period": period},
        headers=headers, timeout=300)
    return r.json()
```

```typescript
// In your Next.js API route (if backend is Node/TS)
// app/api/ai-builder/backtest/route.ts

export async function POST(req: Request) {
  const { ea_name, mq5_code, symbol, period } = await req.json()

  // 1. Compile on MT5 Worker
  const compile = await fetch(`${process.env.MT5_WORKER_URL}/compile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.MT5_WORKER_KEY },
    body: JSON.stringify({ ea_name, mq5_code })
  })
  const compileResult = await compile.json()
  if (!compileResult.success) {
    return Response.json({ step: 'compile', success: false, errors: compileResult.errors })
  }

  // 2. Backtest on MT5 Worker (can take 30-120s)
  const backtest = await fetch(`${process.env.MT5_WORKER_URL}/backtest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.MT5_WORKER_KEY },
    body: JSON.stringify({ ea_name, symbol, period })
  })
  return Response.json(await backtest.json())
}
```

### Step 5: Compile error auto-fix

When .mq5 fails to compile, send errors back to Claude to fix:

```python
async def generate_and_compile(prompt: str, ea_name: str, max_retries=3):
    mq5_code = generate_strategy(prompt, ea_name)  # from 02_generate_strategy.py

    for attempt in range(max_retries):
        result = await compile_on_worker(ea_name, mq5_code)
        if result["success"]:
            return mq5_code

        # Send errors to Claude for fixing
        fix_prompt = f"""This MQL5 code has compile errors. Fix them.

Errors:
{result["errors"]}

Code:
{mq5_code}

Output ONLY the fixed .mq5 code. No explanation, no markdown fences."""

        mq5_code = generate_strategy(fix_prompt, ea_name)

    raise Exception(f"Failed to compile after {max_retries} attempts")
```

## Environment Variables for Your Webapp

```
ANTHROPIC_API_KEY=sk-ant-...          # For Claude API (strategy generation)
MT5_WORKER_URL=http://VPS_IP:8000     # Windows VPS running mt5_worker
MT5_WORKER_KEY=your-secret-key        # Auth between your backend and MT5 Worker
```

## Environment Variables for MT5 Worker (already set on Windows VPS)

```
MT5_TERMINAL=C:\Program Files\FTMO MetaTrader 5\terminal64.exe
MT5_DATA=C:\Users\Administrator\AppData\Roaming\MetaQuotes\Terminal\49CDDEAA95A409ED22BD2287BB67CB9C
METAEDITOR=C:\Program Files\FTMO MetaTrader 5\metaeditor64.exe
MT5_WORKER_KEY=your-secret-key
```

## Key Points

1. **02_generate_strategy.py runs in YOUR backend** — it only calls Claude API, no MT5 needed
2. **03_run_backtest.py runs ONLY on Windows VPS** — it needs metaeditor64.exe and terminal64.exe
3. **04_analyse_results.py runs in YOUR backend** — it just parses HTML, no MT5 needed
4. **05_optimise_loop.py becomes your orchestration logic** — replace `run_backtest()` calls with HTTP to MT5 Worker
5. **dashboard.py chart logic ports to your React frontend** — use Plotly.js, data comes as JSON from your API
6. **Backtest takes 30-120 seconds** — use async/loading states in your ai-builder page
7. **Compile can fail** — always retry with Claude auto-fix (max 3 attempts)
8. **MT5 runs ONE backtest at a time** — queue requests if you have multiple users

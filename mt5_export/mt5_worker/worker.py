"""
MT5 Worker API — runs ONLY on the Windows VPS with MetaTrader 5 installed.

This wraps the existing backtest/compile/deploy scripts as HTTP endpoints
so your web app can call them remotely.

Setup on Windows VPS:
    pip install fastapi uvicorn
    set MT5_WORKER_KEY=your-secret-key
    uvicorn worker:app --host 0.0.0.0 --port 8000

Your webapp calls these endpoints to compile, backtest, and deploy strategies.
"""
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel
import os
import sys
import base64
import subprocess

# Import existing scripts from this folder
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from run_backtest import (
    compile_ea, copy_ea_to_mt5, run_backtest, create_backtest_config,
    kill_mt5, MT5_EXPERTS, MT5_DATA, REPORTS_DIR
)
from analyse_results import parse_mt5_report

app = FastAPI(title="MT5 Worker", version="1.0")

API_KEY = os.getenv("MT5_WORKER_KEY", "changeme")


def _check_key(x_api_key: str):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")


# ── Request models ────────────────────────────────────────

class CompileRequest(BaseModel):
    ea_name: str
    mq5_code: str

class BacktestRequest(BaseModel):
    ea_name: str
    symbol: str = "EURUSD"
    period: str = "H1"
    start: str = "2023.01.01"
    end: str = "2025.01.01"
    deposit: int = 100000

class DeployRequest(BaseModel):
    ea_name: str
    mq5_code: str
    symbol: str = "EURUSD"
    period: str = "H1"


# ── Endpoints ─────────────────────────────────────────────

@app.post("/compile")
def api_compile(req: CompileRequest, x_api_key: str = Header()):
    """Compile .mq5 code using MetaEditor. Returns success + errors."""
    _check_key(x_api_key)

    # Write .mq5 to MT5 Experts folder
    mq5_path = os.path.join(MT5_EXPERTS, f"{req.ea_name}.mq5")
    with open(mq5_path, "w") as f:
        f.write(req.mq5_code)

    success = compile_ea(req.ea_name)

    errors = ""
    if not success:
        log_path = mq5_path.replace(".mq5", ".log")
        if os.path.exists(log_path):
            with open(log_path, "r", encoding="utf-8", errors="ignore") as f:
                errors = f.read()

    return {"success": success, "errors": errors}


@app.post("/backtest")
def api_backtest(req: BacktestRequest, x_api_key: str = Header()):
    """
    Run MT5 Strategy Tester backtest.
    The EA must be compiled first (call /compile).
    Takes 30-180 seconds. Returns metrics + base64-encoded .htm report.
    """
    _check_key(x_api_key)

    run_backtest(req.ea_name, req.symbol, req.period)

    # Find and parse report
    for ext in [".htm", ".html"]:
        path = os.path.join(REPORTS_DIR, f"{req.ea_name}_report{ext}")
        if os.path.exists(path):
            metrics = parse_mt5_report(path)

            # Read raw report so caller can parse equity curve
            with open(path, "rb") as f:
                raw = f.read()

            return {
                "success": True,
                "metrics": metrics,
                "report_b64": base64.b64encode(raw).decode(),
            }

    return {"success": False, "metrics": {}, "error": "No report generated"}


@app.post("/compile-and-backtest")
def api_compile_and_backtest(req: BacktestRequest, x_api_key: str = Header(),
                              mq5_code: str = ""):
    """Convenience: compile + backtest in one call."""
    _check_key(x_api_key)

    if mq5_code:
        mq5_path = os.path.join(MT5_EXPERTS, f"{req.ea_name}.mq5")
        with open(mq5_path, "w") as f:
            f.write(mq5_code)

    if not compile_ea(req.ea_name):
        log_path = os.path.join(MT5_EXPERTS, f"{req.ea_name}.log")
        errors = ""
        if os.path.exists(log_path):
            with open(log_path, "r", errors="ignore") as f:
                errors = f.read()
        return {"success": False, "step": "compile", "errors": errors}

    return api_backtest(req, x_api_key)


@app.post("/deploy")
def api_deploy(req: DeployRequest, x_api_key: str = Header()):
    """Deploy a strategy to live trading. Compiles, restarts MT5 with EA on chart."""
    _check_key(x_api_key)

    from deploy_ea import deploy

    os.makedirs("strategies", exist_ok=True)
    mq5_path = f"strategies/{req.ea_name}.mq5"
    with open(mq5_path, "w") as f:
        f.write(req.mq5_code)

    success = deploy(mq5_path, req.symbol, req.period)
    return {"success": success}


@app.get("/status")
def api_status():
    """Check if MT5 is running and worker is ready."""
    r = subprocess.run(["tasklist"], capture_output=True, text=True)
    mt5_running = "terminal64.exe" in r.stdout.lower()
    return {"mt5_running": mt5_running, "ready": True}


# ── Run ───────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

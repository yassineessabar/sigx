"""
Hybrid Manager — Claude Code for brains, direct scripts for muscle.

Architecture:
  - Claude Code generates/improves MQL5 code (the creative part)
  - Direct scripts compile, backtest, parse reports (the mechanical part)
  - Multiple MT5 slots for parallel backtesting
  - SSE streaming for real-time job progress
  - Dynamic slot loading from config.json

Start:
    cd C:\\MT5\\manager
    python -m uvicorn manager:app --host 0.0.0.0 --port 8000

Or with auto-reload during development:
    python -m uvicorn manager:app --host 0.0.0.0 --port 8000 --reload
"""
import os
import sys
import json
import re
import shutil
import glob as globmod
import uuid
import subprocess
import asyncio
import threading
import time
import base64
import logging
from collections import deque
from datetime import datetime
from typing import Optional

import mimetypes

from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(os.path.join(os.path.dirname(__file__), "manager.log")),
    ],
)
log = logging.getLogger("manager")

# ── Import analysis script ───────────────────────────────────────────────────
sys.path.insert(0, r"C:\Users\Administrator\Documents\metatrader")
from importlib import import_module
mod04 = import_module("04_analyse_results")

# ── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(title="MT5 Strategy Builder — Hybrid Manager", version="2.0")
API_KEY = os.getenv("MT5_WORKER_KEY", "changeme")

# ── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR = r"C:\MT5"
CONFIG_PATH = os.path.join(BASE_DIR, "manager", "config.json")
CONFIGS_DIR = os.path.join(BASE_DIR, "configs")
WORKSPACES_DIR = os.path.join(BASE_DIR, "workspaces")
os.makedirs(CONFIGS_DIR, exist_ok=True)

# ── Slot Management ─────────────────────────────────────────────────────────
# Loaded dynamically from config.json on startup and on demand.

_slots: dict = {}          # slot_id -> slot config dict
_slot_locks: dict = {}     # slot_id -> threading.Lock
_slot_pids: dict = {}      # slot_id -> terminal PID (for targeted kill)

# Job storage
_jobs: dict = {}           # job_id -> job dict
_job_events: dict = {}     # job_id -> list of SSE event dicts


def _load_slots():
    """Reload slot configuration from config.json."""
    global _slots, _slot_locks
    if not os.path.exists(CONFIG_PATH):
        log.warning("config.json not found — no slots available")
        return

    with open(CONFIG_PATH) as f:
        config = json.load(f)

    for sid, slot in config.get("slots", {}).items():
        _slots[sid] = slot
        if sid not in _slot_locks:
            _slot_locks[sid] = threading.Lock()

    # Remove locks for deleted slots
    for sid in list(_slot_locks.keys()):
        if sid not in _slots:
            del _slot_locks[sid]

    log.info(f"Loaded {len(_slots)} slot(s): {list(_slots.keys())}")


@app.on_event("startup")
def startup():
    _load_slots()
    if not _slots:
        log.warning("No slots configured. Run: python provision.py register-main")


# ── Helpers ──────────────────────────────────────────────────────────────────

def _check_key(x_api_key: str):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")


def _emit(job_id: str, event: str, data: dict):
    """Append an SSE event to the job's event stream."""
    entry = {"event": event, "data": data, "ts": datetime.now().isoformat()}
    if job_id in _job_events:
        _job_events[job_id].append(entry)
    log.info(f"[{job_id}] {event}: {json.dumps(data, default=str)[:200]}")


def _get_metaeditor(slot_id: str) -> str:
    """Get the metaeditor path for a slot, with fallback."""
    slot = _slots[slot_id]
    me = slot.get("metaeditor", "")
    if me and os.path.exists(me):
        return me
    # Fallback: main FTMO install
    fallback = r"C:\Program Files\FTMO MetaTrader 5\metaeditor64.exe"
    if os.path.exists(fallback):
        return fallback
    raise FileNotFoundError(f"No metaeditor found for slot {slot_id}")


def _find_free_slot() -> Optional[str]:
    """Try to acquire a free slot. Returns slot_id or None."""
    for sid in _slots:
        if _slot_locks[sid].acquire(blocking=False):
            return sid
    return None


def _release_slot(slot_id: str):
    """Release a slot lock safely."""
    try:
        _slot_locks[slot_id].release()
    except RuntimeError:
        pass  # already released


def _kill_slot_terminal(slot_id: str):
    """Kill only this slot's terminal process (by PID), not all terminals."""
    pid = _slot_pids.get(slot_id)
    if pid:
        try:
            subprocess.run(["taskkill", "/F", "/PID", str(pid)],
                           capture_output=True, timeout=10)
        except Exception:
            pass
        _slot_pids.pop(slot_id, None)
        time.sleep(2)


# ── Direct MT5 Functions (no AI) ────────────────────────────────────────────

def write_ea_to_slot(slot_id: str, ea_name: str, mq5_code: str) -> str:
    """Write .mq5 code to a slot's Experts folder. Returns the file path."""
    experts = os.path.join(_slots[slot_id]["data_dir"], "MQL5", "Experts")
    os.makedirs(experts, exist_ok=True)
    path = os.path.join(experts, f"{ea_name}.mq5")
    with open(path, "w") as f:
        f.write(mq5_code)
    return path


def compile_ea(slot_id: str, ea_name: str) -> dict:
    """Compile EA using metaeditor. Returns {success, errors}."""
    slot = _slots[slot_id]
    experts = os.path.join(slot["data_dir"], "MQL5", "Experts")
    mq5_path = os.path.join(experts, f"{ea_name}.mq5")
    ex5_path = os.path.join(experts, f"{ea_name}.ex5")
    log_path = os.path.join(experts, f"{ea_name}.log")

    if os.path.exists(ex5_path):
        os.remove(ex5_path)

    metaeditor = _get_metaeditor(slot_id)
    try:
        subprocess.run(
            [metaeditor, f"/compile:{mq5_path}", "/log"],
            timeout=60, capture_output=True,
        )
    except subprocess.TimeoutExpired:
        return {"success": False, "errors": "MetaEditor compile timed out (60s)"}

    time.sleep(3)

    if os.path.exists(ex5_path):
        return {"success": True, "errors": ""}

    errors = ""
    if os.path.exists(log_path):
        with open(log_path, "rb") as f:
            raw = f.read()
        try:
            errors = raw.decode("utf-16")
        except (UnicodeDecodeError, UnicodeError):
            errors = raw.replace(b"\x00", b"").decode("utf-8", errors="ignore")

    return {"success": False, "errors": errors}


def run_backtest(slot_id: str, ea_name: str, symbol="EURUSD", period="H1",
                 start="2023.01.01", end="2025.01.01", deposit=100000,
                 timeout_s=180) -> dict:
    """Run backtest on a specific slot. Returns {success, metrics, report_path}."""
    slot = _slots[slot_id]
    report_name = f"{ea_name}_{slot_id}_report"

    # Kill any previous terminal for this slot
    _kill_slot_terminal(slot_id)

    # Build config — ShutdownTerminal=1 so MT5 exits when done
    config_content = f"""\
[Tester]
Expert={ea_name}
Symbol={symbol}
Period={period}
FromDate={start}
ToDate={end}
Optimization=0
Model=1
Deposit={deposit}
Currency=USD
Leverage=100
ExecutionMode=0
Report={report_name}
ReplaceReport=1
ShutdownTerminal=1"""

    config_path = os.path.join(CONFIGS_DIR, f"{ea_name}_{slot_id}.ini")
    with open(config_path, "w") as f:
        f.write(config_content)

    # Launch terminal
    terminal = slot["terminal"]
    proc = subprocess.Popen([terminal, f"/config:{config_path}"])
    _slot_pids[slot_id] = proc.pid
    log.info(f"[slot {slot_id}] Launched terminal PID={proc.pid} for {ea_name}")

    # Poll for report
    search_dirs = [
        slot["data_dir"],
        os.path.join(slot["data_dir"], "MQL5", "Reports"),
    ]

    report_path = None
    elapsed = 0
    while elapsed < timeout_s:
        time.sleep(5)
        elapsed += 5

        # Check if process already exited
        if proc.poll() is not None and elapsed > 10:
            # Terminal exited — give it a moment for file flush
            time.sleep(2)

        for d in search_dirs:
            if not os.path.isdir(d):
                continue
            for ext in [".htm", ".html"]:
                candidate = os.path.join(d, f"{report_name}{ext}")
                if os.path.exists(candidate):
                    time.sleep(2)  # let file finish writing
                    report_path = candidate
                    break
            if report_path:
                break
        if report_path:
            break

    _slot_pids.pop(slot_id, None)

    if not report_path:
        return {"success": False, "metrics": {}, "error": f"No report after {timeout_s}s"}

    try:
        metrics = mod04.parse_mt5_report(report_path)
        return {"success": True, "metrics": metrics, "report_path": report_path}
    except Exception as e:
        return {"success": False, "metrics": {}, "error": str(e)}


# ── Claude Code Integration ─────────────────────────────────────────────────

def generate_code_with_claude(prompt: str, ea_name: str, workspace: str,
                               job_id: str = "") -> str:
    """Call Claude Code to generate MQL5 code. Returns the code string."""
    output_file = os.path.join(workspace, "strategies", f"{ea_name}.mq5")

    gen_prompt = f"""You are an expert MQL5 programmer. Generate a complete, compilable Expert Advisor (.mq5) file.

{prompt}

Requirements:
- Fully self-contained and compilable
- Include proper trade management (CTrade class from <Trade\\Trade.mqh>)
- Handle both buy and sell signals
- Only one position open at a time per direction
- Include input parameters for key values (lot size, SL, TP, indicator periods)
- Risk management: 1% of account per trade unless specified otherwise

Write the complete .mq5 code to: {output_file}
Do NOT write any other files. Do NOT explain. Just write the .mq5 file."""

    _emit(job_id, "generating", {"ea_name": ea_name})

    try:
        result = subprocess.run(
            ["claude", "-p", gen_prompt, "--dangerously-skip-permissions"],
            capture_output=True, text=True, timeout=180, cwd=workspace,
        )
        if result.returncode != 0:
            log.warning(f"Claude Code exited {result.returncode}: {result.stderr[:300]}")
    except subprocess.TimeoutExpired:
        log.error("Claude Code timed out (180s)")
        return ""
    except FileNotFoundError:
        log.error("'claude' CLI not found — is Claude Code installed?")
        return ""

    # Read the generated file
    if os.path.exists(output_file):
        with open(output_file, "r", errors="ignore") as f:
            return f.read()

    # Fallback: find any recently written .mq5
    mq5_files = globmod.glob(os.path.join(workspace, "strategies", "*.mq5"))
    if not mq5_files:
        mq5_files = globmod.glob(os.path.join(workspace, "*.mq5"))
    if mq5_files:
        latest = max(mq5_files, key=os.path.getmtime)
        with open(latest, "r", errors="ignore") as f:
            return f.read()

    return ""


def improve_code_with_claude(mq5_code: str, metrics: dict, compile_errors: str,
                              ea_name: str, workspace: str,
                              job_id: str = "",
                              iteration_history: list = None) -> str:
    """Call Claude Code to fix or improve MQL5 code based on results."""
    output_file = os.path.join(workspace, "strategies", f"{ea_name}.mq5")
    current_file = os.path.join(workspace, "strategies", f"{ea_name}_current.mq5")
    with open(current_file, "w") as f:
        f.write(mq5_code)

    if compile_errors:
        prompt = f"""The MQL5 file at {current_file} has compile errors. Fix them.

COMPILE ERRORS:
{compile_errors}

Read the file, fix all errors, and write the corrected code to: {output_file}
Do NOT explain anything. Just write the fixed .mq5 file."""
        _emit(job_id, "fixing", {"ea_name": ea_name, "reason": "compile_errors"})
    else:
        issues = _diagnose_issues(metrics)
        history_text = _format_iteration_history(iteration_history) if iteration_history else ""
        prompt = f"""You are improving an existing MQL5 EA INCREMENTALLY. This is NOT a rewrite.

CRITICAL RULES:
- Preserve the core strategy structure (same indicator types, same general logic)
- Make ONE or TWO targeted changes per iteration — not a full rewrite
- Every change must have a clear goal: improve a specific metric
- Do NOT add unrelated indicators or completely change the strategy approach
- Do NOT remove working logic — refine it

CURRENT BACKTEST RESULTS:
- Net Profit: {metrics.get('net_profit', 'N/A')}
- Profit Factor: {metrics.get('profit_factor', 'N/A')}
- Total Trades: {metrics.get('total_trades', 'N/A')}
- Max Drawdown: {metrics.get('max_drawdown', 'N/A')}
- Recovery Factor: {metrics.get('recovery_factor', 'N/A')}
- Sharpe: {metrics.get('sharpe', 'N/A')}
- Win Rate: {metrics.get('win_rate', 'N/A')}
{history_text}
DIAGNOSED ISSUES (fix the FIRST one as priority):
{issues}

IMPROVEMENT APPROACH:
{_suggest_improvement_approach(metrics)}

Read the file at {current_file}, make targeted improvements, and write to: {output_file}
Do NOT explain anything. Just write the improved .mq5 file."""
        _emit(job_id, "improving", {"ea_name": ea_name, "metrics": metrics})

    try:
        subprocess.run(
            ["claude", "-p", prompt, "--dangerously-skip-permissions"],
            capture_output=True, text=True, timeout=180, cwd=workspace,
        )
    except (subprocess.TimeoutExpired, FileNotFoundError) as e:
        log.error(f"Claude Code error: {e}")
        return mq5_code

    if os.path.exists(output_file):
        with open(output_file, "r", errors="ignore") as f:
            return f.read()

    # Fallback
    mq5_files = globmod.glob(os.path.join(workspace, "strategies", "*.mq5"))
    if mq5_files:
        latest = max(mq5_files, key=os.path.getmtime)
        if latest != current_file:
            with open(latest, "r", errors="ignore") as f:
                return f.read()

    return mq5_code  # unchanged


def _diagnose_issues(metrics: dict) -> str:
    """Generate prioritized diagnostic feedback from backtest metrics."""
    issues = []
    trades = metrics.get("total_trades", 0) or 0
    pf = metrics.get("profit_factor", 0) or 0
    net = metrics.get("net_profit", 0) or 0
    rf = metrics.get("recovery_factor", 0) or 0
    sharpe = metrics.get("sharpe", 0) or 0
    win_rate = metrics.get("win_rate", 0) or 0
    dd = metrics.get("max_drawdown", "")

    # Priority 1: No trades — nothing else matters
    if trades == 0:
        issues.append("- [P1] ZERO TRADES: Entry conditions never trigger. Relax conditions, widen SL, simplify logic.")
        return "\n".join(issues)
    elif trades < 20:
        issues.append(f"- [P1] TOO FEW TRADES ({trades}): Widen entry conditions or shorten indicator periods.")

    # Priority 2: Losing money
    if pf and pf < 1.0:
        issues.append(f"- [P2] LOSING (PF={pf:.2f}): Widen TP or tighten SL. Consider if entry direction is correct.")
    elif pf and 1.0 <= pf < 1.3:
        issues.append(f"- [P3] MARGINAL (PF={pf:.2f}): Tighten stops or add a trend filter to improve signal quality.")

    if net and net < 0:
        issues.append(f"- [P2] NEGATIVE P&L (${net:.2f}): Entry logic may be inverted or SL/TP ratio is wrong.")

    # Priority 3: Risk metrics
    if rf and rf < 0.5:
        issues.append(f"- [P3] LOW RECOVERY ({rf:.2f}): Drawdowns too deep. Reduce lot size or add max-DD protection.")

    if sharpe and sharpe < 0.5:
        issues.append(f"- [P3] LOW SHARPE ({sharpe:.2f}): Returns inconsistent. Reduce position sizing or add volatility filter.")
    elif sharpe and 0.5 <= sharpe < 1.0:
        issues.append(f"- [P4] MODERATE SHARPE ({sharpe:.2f}): Acceptable but can improve with tighter risk management.")

    if win_rate and win_rate < 35:
        issues.append(f"- [P3] LOW WIN RATE ({win_rate:.1f}%): Entry signals are weak. Tighten entry conditions or add confirmation.")
    elif win_rate and win_rate > 75:
        issues.append(f"- [P4] HIGH WIN RATE ({win_rate:.1f}%) but check if TP is too tight — may be leaving profit on table.")

    return "\n".join(issues) if issues else "- Strategy is profitable. Focus on: tighter risk management, better Sharpe, or lower drawdown."


def _format_iteration_history(history: list) -> str:
    """Format iteration history so Claude can see the improvement trajectory."""
    if not history:
        return ""
    lines = ["\nITERATION HISTORY (showing improvement trajectory):"]
    for entry in history:
        m = entry.get("metrics", {})
        if not m:
            lines.append(f"  Iter {entry.get('iteration', '?')}: failed ({entry.get('error', 'unknown')})")
            continue
        lines.append(
            f"  Iter {entry.get('iteration', '?')}: "
            f"PF={m.get('profit_factor', 'N/A')}, "
            f"Trades={m.get('total_trades', 'N/A')}, "
            f"Sharpe={m.get('sharpe', 'N/A')}, "
            f"DD={m.get('max_drawdown', 'N/A')}, "
            f"WinRate={m.get('win_rate', 'N/A')}"
        )
    lines.append("Aim to improve on the BEST iteration, not regress.")
    return "\n".join(lines)


def _suggest_improvement_approach(metrics: dict) -> str:
    """Suggest a specific, targeted improvement approach based on current metrics."""
    trades = metrics.get("total_trades", 0) or 0
    pf = metrics.get("profit_factor", 0) or 0
    sharpe = metrics.get("sharpe", 0) or 0
    win_rate = metrics.get("win_rate", 0) or 0

    if trades == 0:
        return "SIMPLIFY entry logic. Remove extra filters. Use wider SL/TP. This is the only priority."
    if trades < 20:
        return "Loosen entry conditions: shorter indicator periods, wider thresholds, or remove one filter."
    if pf < 1.0:
        return "Fix SL/TP ratio (e.g. widen TP by 20-30% or tighten SL). Do NOT change the entry signal."
    if pf < 1.3:
        return "Add ONE trend-direction filter (e.g. 200-EMA direction) to filter bad signals. Keep everything else."
    if sharpe < 0.5:
        return "Add volatility-based position sizing or skip trades during high-volatility periods."
    if win_rate < 40:
        return "Add ONE confirmation indicator (e.g. RSI zone check) to filter weak entries. Keep SL/TP unchanged."
    if pf >= 1.5 and sharpe >= 1.0:
        return "Strategy is strong. Make only minor tweaks: fine-tune indicator periods by ±10-20% or adjust SL/TP by small amounts."
    return "Make ONE targeted improvement: either tighten SL, widen TP, or adjust the main indicator period. Do not change multiple things at once."


# ── Job Runner ───────────────────────────────────────────────────────────────

def _run_job(job_id: str):
    """Execute full hybrid pipeline: generate -> compile -> backtest -> optimize."""
    job = _jobs[job_id]
    workspace = job["workspace"]
    ea_name = job["ea_name"]
    slot_id = None

    job["status"] = "running"
    job["started_at"] = datetime.now().isoformat()
    _emit(job_id, "started", {"ea_name": ea_name, "iterations": job["iterations"]})

    try:
        iterations = job["iterations"]
        best_code = None
        best_metrics = None
        best_pf = -999
        all_iterations = []

        for iteration in range(1, iterations + 1):
            iter_start = time.time()
            _emit(job_id, "iteration_start", {"iteration": iteration, "total": iterations})
            job["current_step"] = f"iteration {iteration}/{iterations}"

            # ── STEP 1: Generate or improve code (Claude Code) ──
            if iteration == 1:
                job["current_step"] = f"generating code ({iteration}/{iterations})"
                mq5_code = generate_code_with_claude(
                    job["prompt"], ea_name, workspace, job_id
                )
            else:
                job["current_step"] = f"improving code ({iteration}/{iterations})"
                mq5_code = improve_code_with_claude(
                    best_code, best_metrics or {}, "", ea_name, workspace, job_id,
                    iteration_history=all_iterations
                )

            if not mq5_code or len(mq5_code) < 100:
                _emit(job_id, "iteration_error", {
                    "iteration": iteration, "error": "Code generation failed"
                })
                all_iterations.append({"iteration": iteration, "error": "Code generation failed"})
                continue

            # Save versioned code
            code_path = os.path.join(workspace, "strategies", f"{ea_name}_v{iteration}.mq5")
            with open(code_path, "w") as f:
                f.write(mq5_code)

            # ── STEP 2: Acquire slot and compile ──
            job["current_step"] = f"waiting for slot ({iteration}/{iterations})"
            slot_id = _find_free_slot()
            if slot_id is None:
                # Wait up to 5 minutes for a slot
                for _ in range(60):
                    time.sleep(5)
                    slot_id = _find_free_slot()
                    if slot_id is not None:
                        break
                if slot_id is None:
                    _emit(job_id, "iteration_error", {
                        "iteration": iteration, "error": "No slots available (timeout)"
                    })
                    all_iterations.append({"iteration": iteration, "error": "No slots available"})
                    continue

            try:
                _emit(job_id, "slot_acquired", {"slot_id": slot_id, "iteration": iteration})
                job["current_step"] = f"compiling ({iteration}/{iterations})"

                write_ea_to_slot(slot_id, ea_name, mq5_code)

                # Compile with auto-fix retries
                compile_ok = False
                for attempt in range(3):
                    result = compile_ea(slot_id, ea_name)
                    if result["success"]:
                        compile_ok = True
                        _emit(job_id, "compiled", {"iteration": iteration, "attempt": attempt + 1})
                        break

                    _emit(job_id, "compile_failed", {
                        "iteration": iteration,
                        "attempt": attempt + 1,
                        "errors": result["errors"][:500],
                    })

                    if attempt < 2:
                        job["current_step"] = f"fixing compile errors ({iteration}/{iterations}, attempt {attempt + 2})"
                        mq5_code = improve_code_with_claude(
                            mq5_code, {}, result["errors"], ea_name, workspace, job_id
                        )
                        write_ea_to_slot(slot_id, ea_name, mq5_code)

                if not compile_ok:
                    all_iterations.append({
                        "iteration": iteration,
                        "error": "Compile failed after 3 attempts",
                        "errors": result["errors"][:500],
                    })
                    continue

                # ── STEP 3: Backtest ──
                job["current_step"] = f"backtesting ({iteration}/{iterations})"
                _emit(job_id, "backtesting", {"iteration": iteration, "slot_id": slot_id})

                bt_result = run_backtest(
                    slot_id, ea_name, job["symbol"], job["period"]
                )

                metrics = bt_result.get("metrics", {})
                iter_result = {
                    "iteration": iteration,
                    "metrics": metrics,
                    "success": bt_result["success"],
                    "duration_s": round(time.time() - iter_start, 1),
                }
                all_iterations.append(iter_result)

                _emit(job_id, "iteration_done", iter_result)

                # Track best
                pf = metrics.get("profit_factor", 0) or 0
                trades = metrics.get("total_trades", 0) or 0
                if trades >= 5 and pf > best_pf:
                    best_pf = pf
                    best_code = mq5_code
                    best_metrics = metrics
                    _emit(job_id, "new_best", {"iteration": iteration, "pf": pf, "trades": trades})

                # Early exit if strategy is already good
                if pf >= 1.5 and trades >= 50:
                    _emit(job_id, "early_exit", {"reason": "target_met", "pf": pf, "trades": trades})
                    break

            finally:
                _release_slot(slot_id)
                slot_id = None

        # If no iteration produced valid results, keep the last code
        if best_code is None and mq5_code:
            best_code = mq5_code
            best_metrics = {}

        job["status"] = "completed"
        job["result"] = {
            "best_ea_name": ea_name,
            "best_code": best_code or "",
            "best_metrics": best_metrics or {},
            "iterations_run": len(all_iterations),
            "all_iterations": all_iterations,
        }
        _emit(job_id, "completed", {
            "best_metrics": best_metrics or {},
            "iterations_run": len(all_iterations),
        })

    except Exception as e:
        import traceback
        job["status"] = "error"
        job["error"] = str(e)
        job["traceback"] = traceback.format_exc()
        _emit(job_id, "error", {"error": str(e)})
        log.exception(f"Job {job_id} failed")
    finally:
        if slot_id is not None:
            _release_slot(slot_id)
        job["finished_at"] = datetime.now().isoformat()


# ── Report Inlining ──────────────────────────────────────────────────────────

def _inline_report_images(report_path: str) -> bytes:
    """Read an MT5 .htm report and inline all external image references as data URIs.

    MT5 generates charts as separate files in a folder like 'ReportName.files/'.
    This function embeds them directly in the HTML so the report is self-contained.
    """
    with open(report_path, "rb") as f:
        raw = f.read()

    # Detect encoding
    if raw[:2] == b'\xff\xfe':
        html = raw.decode("utf-16-le", errors="replace")
    else:
        html = raw.decode("utf-8", errors="replace")

    report_dir = os.path.dirname(report_path)
    report_stem = os.path.splitext(os.path.basename(report_path))[0]

    # Possible image directories MT5 uses
    img_dirs = [
        os.path.join(report_dir, f"{report_stem}.files"),
        os.path.join(report_dir, report_stem),
        report_dir,
    ]

    def _resolve_and_inline(match):
        tag_before = match.group(1)
        src = match.group(2)
        tag_after = match.group(3)

        # Skip already-inlined data URIs
        if src.startswith("data:"):
            return match.group(0)

        # Try to find the image file
        img_path = None
        for d in img_dirs:
            candidate = os.path.join(d, src)
            if os.path.isfile(candidate):
                img_path = candidate
                break
            # Also try just the filename (strip subdirectory prefix)
            basename = os.path.basename(src)
            candidate = os.path.join(d, basename)
            if os.path.isfile(candidate):
                img_path = candidate
                break

        if not img_path:
            return match.group(0)  # leave as-is if not found

        try:
            with open(img_path, "rb") as imgf:
                img_data = imgf.read()
            mime = mimetypes.guess_type(img_path)[0] or "image/gif"
            b64 = base64.b64encode(img_data).decode("ascii")
            return f'{tag_before}data:{mime};base64,{b64}{tag_after}'
        except Exception:
            return match.group(0)

    # Replace src="..." in <img> tags
    html = re.sub(
        r'(<img[^>]*\s+src=["\'])([^"\']+)(["\'])',
        _resolve_and_inline,
        html,
        flags=re.IGNORECASE,
    )

    # Re-encode to original format
    if raw[:2] == b'\xff\xfe':
        return html.encode("utf-16-le")
    return html.encode("utf-8")


def _encode_report(report_path: str) -> str:
    """Encode an MT5 report as base64 with images inlined."""
    try:
        data = _inline_report_images(report_path)
    except Exception:
        # Fallback: raw file without inlining
        with open(report_path, "rb") as f:
            data = f.read()
    return base64.b64encode(data).decode()


# ── Request Models ───────────────────────────────────────────────────────────

class RunReq(BaseModel):
    prompt: str
    ea_name: Optional[str] = None
    iterations: int = 3
    symbol: str = "EURUSD"
    period: str = "H1"

class CompileReq(BaseModel):
    ea_name: str
    mq5_code: str
    slot_id: str = "0"

class BacktestReq(BaseModel):
    ea_name: str
    symbol: str = "EURUSD"
    period: str = "H1"
    start: str = "2023.01.01"
    end: str = "2025.01.01"
    deposit: int = 100000
    slot_id: str = "0"

class CompileAndBacktestReq(BaseModel):
    ea_name: str
    mq5_code: str
    symbol: str = "EURUSD"
    period: str = "H1"
    start: str = "2023.01.01"
    end: str = "2025.01.01"
    deposit: int = 100000
    slot_id: Optional[str] = None  # auto-select if None

class DeployReq(BaseModel):
    ea_name: str
    mq5_code: str
    symbol: str = "EURUSD"
    period: str = "H1"
    slot_id: str = "0"


# ── API: Agent Mode (/run) ───────────────────────────────────────────────────

@app.post("/run")
def api_run(req: RunReq, x_api_key: str = Header()):
    """Full hybrid pipeline: generate -> compile -> backtest -> optimize.
    Returns job_id immediately. Poll /job/{id} or stream /job/{id}/stream."""
    _check_key(x_api_key)
    _load_slots()  # refresh slot config

    if not _slots:
        raise HTTPException(503, "No MT5 slots configured")

    job_id = str(uuid.uuid4())[:8]
    ea_name = req.ea_name or f"EA_{job_id}"
    workspace = os.path.join(WORKSPACES_DIR, job_id)
    os.makedirs(os.path.join(workspace, "strategies"), exist_ok=True)
    os.makedirs(os.path.join(workspace, "results"), exist_ok=True)

    _jobs[job_id] = {
        "status": "queued",
        "prompt": req.prompt,
        "ea_name": ea_name,
        "iterations": req.iterations,
        "symbol": req.symbol,
        "period": req.period,
        "workspace": workspace,
        "result": None,
        "error": None,
        "current_step": "queued",
        "started_at": None,
        "finished_at": None,
    }
    _job_events[job_id] = []

    thread = threading.Thread(target=_run_job, args=(job_id,), daemon=True)
    thread.start()

    return {"job_id": job_id, "status": "running", "ea_name": ea_name}


@app.get("/job/{job_id}")
def api_get_job(job_id: str, x_api_key: str = Header()):
    """Poll job status and results."""
    _check_key(x_api_key)
    if job_id not in _jobs:
        raise HTTPException(404, "Job not found")

    job = _jobs[job_id]
    return {
        "job_id": job_id,
        "status": job["status"],
        "current_step": job.get("current_step"),
        "prompt": job["prompt"],
        "ea_name": job["ea_name"],
        "symbol": job.get("symbol"),
        "period": job.get("period"),
        "iterations": job.get("iterations"),
        "result": job.get("result"),
        "error": job.get("error"),
        "started_at": job.get("started_at"),
        "finished_at": job.get("finished_at"),
    }


@app.get("/job/{job_id}/stream")
async def api_stream_job(job_id: str, x_api_key: str = Header()):
    """SSE stream of job events. Connect early, events arrive in real-time."""
    _check_key(x_api_key)
    if job_id not in _jobs:
        raise HTTPException(404, "Job not found")

    async def event_generator():
        sent = 0
        while True:
            events = _job_events.get(job_id, [])
            while sent < len(events):
                ev = events[sent]
                yield f"event: {ev['event']}\ndata: {json.dumps(ev['data'], default=str)}\n\n"
                sent += 1

            # Check if job is done
            job = _jobs.get(job_id, {})
            if job.get("status") in ("completed", "error"):
                # Send final result
                yield f"event: done\ndata: {json.dumps({'status': job['status']}, default=str)}\n\n"
                break

            await asyncio.sleep(1)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.get("/jobs")
def api_list_jobs(x_api_key: str = Header()):
    """List all jobs with summary info."""
    _check_key(x_api_key)
    return {
        jid: {
            "status": j["status"],
            "current_step": j.get("current_step"),
            "ea_name": j["ea_name"],
            "symbol": j.get("symbol"),
            "period": j.get("period"),
            "started_at": j.get("started_at"),
            "finished_at": j.get("finished_at"),
        }
        for jid, j in _jobs.items()
    }


@app.delete("/job/{job_id}")
def api_delete_job(job_id: str, x_api_key: str = Header()):
    """Delete a completed/errored job and optionally its workspace."""
    _check_key(x_api_key)
    if job_id not in _jobs:
        raise HTTPException(404, "Job not found")

    job = _jobs[job_id]
    if job["status"] == "running":
        raise HTTPException(409, "Cannot delete a running job")

    # Clean up workspace
    workspace = job.get("workspace", "")
    if workspace and os.path.isdir(workspace):
        shutil.rmtree(workspace, ignore_errors=True)

    _jobs.pop(job_id, None)
    _job_events.pop(job_id, None)
    return {"deleted": job_id}


# ── API: Direct Mode (/compile, /backtest, /deploy) ─────────────────────────

@app.post("/compile")
def api_compile(req: CompileReq, x_api_key: str = Header()):
    """Direct compile — no AI. Writes code to slot and compiles."""
    _check_key(x_api_key)
    if req.slot_id not in _slots:
        raise HTTPException(400, f"Invalid slot_id. Available: {list(_slots.keys())}")

    write_ea_to_slot(req.slot_id, req.ea_name, req.mq5_code)
    return compile_ea(req.slot_id, req.ea_name)


@app.post("/backtest")
def api_backtest(req: BacktestReq, x_api_key: str = Header()):
    """Direct backtest — no AI. EA must already be compiled."""
    _check_key(x_api_key)
    if req.slot_id not in _slots:
        raise HTTPException(400, f"Invalid slot_id. Available: {list(_slots.keys())}")

    if not _slot_locks[req.slot_id].acquire(timeout=5):
        raise HTTPException(503, f"Slot {req.slot_id} is busy")

    try:
        result = run_backtest(
            req.slot_id, req.ea_name, req.symbol, req.period,
            req.start, req.end, req.deposit,
        )
        # Include base64-encoded report if available
        report_path = result.get("report_path")
        if report_path and os.path.exists(report_path):
            result["report_b64"] = _encode_report(report_path)
        return result
    finally:
        _release_slot(req.slot_id)


@app.post("/compile-and-backtest")
def api_compile_and_backtest(req: CompileAndBacktestReq, x_api_key: str = Header()):
    """Compile + backtest in one call. Auto-selects slot if not specified."""
    _check_key(x_api_key)

    slot_id = req.slot_id
    if slot_id is None:
        slot_id = _find_free_slot()
        if slot_id is None:
            raise HTTPException(503, "All slots are busy")
    else:
        if slot_id not in _slots:
            raise HTTPException(400, f"Invalid slot_id. Available: {list(_slots.keys())}")
        if not _slot_locks[slot_id].acquire(timeout=5):
            raise HTTPException(503, f"Slot {slot_id} is busy")

    try:
        # Compile
        write_ea_to_slot(slot_id, req.ea_name, req.mq5_code)
        comp = compile_ea(slot_id, req.ea_name)
        if not comp["success"]:
            return {"success": False, "step": "compile", "errors": comp["errors"]}

        # Backtest
        result = run_backtest(
            slot_id, req.ea_name, req.symbol, req.period,
            req.start, req.end, req.deposit,
        )
        report_path = result.get("report_path")
        if report_path and os.path.exists(report_path):
            result["report_b64"] = _encode_report(report_path)
        return result
    finally:
        _release_slot(slot_id)


@app.post("/deploy")
def api_deploy(req: DeployReq, x_api_key: str = Header()):
    """Deploy EA to live trading on a specific slot."""
    _check_key(x_api_key)
    if req.slot_id not in _slots:
        raise HTTPException(400, f"Invalid slot_id. Available: {list(_slots.keys())}")

    slot = _slots[req.slot_id]
    experts = os.path.join(slot["data_dir"], "MQL5", "Experts")
    terminal = slot["terminal"]

    # Write and compile
    mq5_path = os.path.join(experts, f"{req.ea_name}.mq5")
    ex5_path = os.path.join(experts, f"{req.ea_name}.ex5")
    with open(mq5_path, "w") as f:
        f.write(req.mq5_code)

    comp = compile_ea(req.slot_id, req.ea_name)
    if not comp["success"]:
        return {"success": False, "step": "compile", "errors": comp["errors"]}

    # Write live config
    config_content = f"""\
[Charts]
Open=1
Symbol={req.symbol}
Period={req.period}
Expert={req.ea_name}
ExpertParameters="""

    config_path = os.path.join(CONFIGS_DIR, f"{req.ea_name}_live.ini")
    with open(config_path, "w") as f:
        f.write(config_content)

    # Kill slot terminal and relaunch with live config
    _kill_slot_terminal(req.slot_id)
    proc = subprocess.Popen([terminal, f"/config:{config_path}"])
    _slot_pids[req.slot_id] = proc.pid

    return {
        "success": True,
        "message": f"EA {req.ea_name} deployed on {req.symbol} {req.period}",
        "pid": proc.pid,
    }


# ── API: Slot Management ────────────────────────────────────────────────────

@app.get("/slots")
def api_slots(x_api_key: str = Header()):
    """List all MT5 slots and their status."""
    _check_key(x_api_key)
    _load_slots()
    return {
        sid: {
            "terminal": s["terminal"],
            "data_dir": s.get("data_dir"),
            "busy": _slot_locks.get(sid, threading.Lock()).locked(),
            "pid": _slot_pids.get(sid),
        }
        for sid, s in _slots.items()
    }


@app.post("/slots/reload")
def api_reload_slots(x_api_key: str = Header()):
    """Reload slot configuration from config.json."""
    _check_key(x_api_key)
    _load_slots()
    return {"slots": list(_slots.keys()), "count": len(_slots)}


@app.get("/status")
def api_status():
    """Public health check — no API key required."""
    total = len(_slots)
    busy = sum(1 for s in _slot_locks.values() if s.locked())
    running = sum(1 for j in _jobs.values() if j["status"] == "running")
    completed = sum(1 for j in _jobs.values() if j["status"] == "completed")
    errored = sum(1 for j in _jobs.values() if j["status"] == "error")
    return {
        "ready": True,
        "total_slots": total,
        "available_slots": total - busy,
        "busy_slots": busy,
        "running_jobs": running,
        "completed_jobs": completed,
        "errored_jobs": errored,
    }


# ── Run ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

"""
MT5 Manager — compile, backtest, and deploy MQL5 Expert Advisors.

Architecture:
  - Webapp generates MQL5 code via Claude API (the creative part)
  - This manager compiles, backtests, parses reports (the mechanical part)
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
import socket as _socket
_HOSTNAME = _socket.gethostname()

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
_slot_lock_times: dict = {}  # slot_id -> timestamp when lock was acquired
SLOT_LOCK_TIMEOUT = 240    # 4 min max — auto-release stale locks (must be > backtest timeout of 180s)

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
    # Fallback: main MetaTrader install
    fallback = r"C:\Program Files\MetaTrader 5\metaeditor64.exe"
    if os.path.exists(fallback):
        return fallback
    raise FileNotFoundError(f"No metaeditor found for slot {slot_id}")


def _cleanup_stale_locks():
    """Auto-release any slot locks held longer than SLOT_LOCK_TIMEOUT."""
    now = time.time()
    for sid in list(_slot_lock_times.keys()):
        lock_time = _slot_lock_times.get(sid, 0)
        if lock_time > 0 and (now - lock_time) > SLOT_LOCK_TIMEOUT:
            held = now - lock_time
            log.warning(f"[slot {sid}] Auto-releasing stale lock (held {held:.0f}s > {SLOT_LOCK_TIMEOUT}s)")
            try:
                _slot_locks[sid].release()
            except RuntimeError:
                # Lock wasn't held — recreate it to be safe
                _slot_locks[sid] = threading.Lock()
            _slot_lock_times.pop(sid, None)
            _kill_slot_terminal(sid)


def _find_free_slot() -> Optional[str]:
    """Try to acquire a free slot. Returns slot_id or None.
    Also auto-releases slots that have been locked for too long (crash recovery)."""
    _cleanup_stale_locks()

    now = time.time()
    for sid in _slots:
        if _slot_locks[sid].acquire(blocking=False):
            _slot_lock_times[sid] = now
            return sid
    return None


def _release_slot(slot_id: str):
    """Release a slot lock safely."""
    _slot_lock_times.pop(slot_id, None)
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


def _parse_tester_log(slot_id: str, deposit: int = 100000, max_age_s: int = 180) -> dict:
    """Parse the MT5 tester log to extract backtest metrics when no .htm report is available.
    Only uses logs modified within the last max_age_s seconds to avoid returning stale results."""
    data_dir = _slots[slot_id]["data_dir"]
    terminal_hash = os.path.basename(data_dir)
    appdata = os.environ.get("APPDATA", "")

    # Search in multiple locations (APPDATA may differ when running as service)
    user_appdata = r"C:\Users\Administrator\AppData\Roaming"
    log_dirs = [
        os.path.join(data_dir, "tester", "logs"),
        os.path.join(user_appdata, "MetaQuotes", "Tester", terminal_hash, "Agent-127.0.0.1-3000", "logs"),
        os.path.join(appdata, "MetaQuotes", "Tester", terminal_hash, "Agent-127.0.0.1-3000", "logs"),
    ]

    now = time.time()
    content = ""
    for log_dir in log_dirs:
        if not os.path.isdir(log_dir):
            continue
        log_files = sorted(
            [f for f in os.listdir(log_dir) if f.endswith(".log")],
            reverse=True
        )
        for log_name in log_files:
            log_file = os.path.join(log_dir, log_name)
            try:
                # CRITICAL: Only use logs modified recently (within max_age_s).
                # Stale logs from previous runs cause identical results every time.
                file_age = now - os.path.getmtime(log_file)
                if file_age > max_age_s:
                    log.info(f"[slot {slot_id}] Skipping stale log {log_name} (age={file_age:.0f}s > {max_age_s}s)")
                    continue

                # MT5 logs are typically UTF-16 LE (BOM: FF FE)
                with open(log_file, "rb") as f:
                    raw = f.read()
                if raw[:2] == b'\xff\xfe':
                    content = raw.decode("utf-16-le", errors="ignore")
                else:
                    content = raw.decode("utf-8", errors="ignore")
                if "final balance" in content.lower():
                    log.info(f"[slot {slot_id}] Found fresh tester log: {log_file} (age={file_age:.0f}s)")
                    break
            except Exception:
                continue
        if content:
            break

    if not content:
        log.warning(f"[slot {slot_id}] No fresh tester log found (all logs older than {max_age_s}s)")
        return {}

    # ── CRITICAL: Use only the LAST run's data from the log ──
    # The log file accumulates ALL runs from the same day.
    # We use findall() and take the LAST match for balance,
    # and find the last run boundary for deal/trade counting.

    # Find the last "final balance" and extract only the run that produced it
    # Each run boundary: look for the last ".ex5" marker before the last "final balance"
    all_balance_positions = [m.start() for m in re.finditer(r"final balance", content, re.IGNORECASE)]
    if all_balance_positions:
        last_balance_pos = all_balance_positions[-1]
        # Find the last ".ex5" line BEFORE this final balance — that's where this run started
        ex5_positions = [m.start() for m in re.finditer(r'\.ex5', content[:last_balance_pos])]
        if ex5_positions:
            # Go back a bit to capture the full line with .ex5
            run_start = content.rfind('\n', 0, ex5_positions[-1])
            if run_start < 0:
                run_start = 0
            content = content[run_start:]

    metrics = {}

    # Extract final balance — use findall and take LAST match
    all_balances = re.findall(r"final balance\s+([\d.,\s]+)", content, re.IGNORECASE)
    if all_balances:
        try:
            balance = float(all_balances[-1].replace(",", "").replace(" ", ""))
            metrics["net_profit"] = round(balance - deposit, 2)
        except ValueError:
            pass

    # Count deals and calculate REAL profit/loss from deal entries
    # Each deal has: deal #N buy/sell X.XX SYMBOL at PRICE [sl/tp PRICE]
    # Closing deals show profit: "deal #N sell 0.01 XAUUSD at 2700.00 [#N buy 0.01 XAUUSD at 2650.00]"
    deal_lines = re.findall(r"deal #\d+", content, re.IGNORECASE)
    deal_count = len(deal_lines)
    metrics["total_trades"] = deal_count // 2  # open + close = 1 trade

    # Extract profit/loss from individual deal closings
    # Format: "close ... profit XXX.XX" or specific profit lines
    profits = re.findall(r"profit\s+(-?[\d.,]+)", content, re.IGNORECASE)
    gross_profit = 0.0
    gross_loss = 0.0
    win_count = 0
    loss_count = 0
    for p in profits:
        try:
            val = float(p.replace(",", "").replace(" ", ""))
            if val > 0:
                gross_profit += val
                win_count += 1
            elif val < 0:
                gross_loss += abs(val)
                loss_count += 1
        except ValueError:
            pass

    # Real profit factor = gross profit / gross loss
    total_closed = win_count + loss_count
    if gross_loss > 0:
        metrics["profit_factor"] = round(gross_profit / gross_loss, 2)
    elif gross_profit > 0:
        metrics["profit_factor"] = 99.99  # all wins
    else:
        metrics["profit_factor"] = 0

    # Real win rate
    if total_closed > 0:
        metrics["win_rate"] = round((win_count / total_closed) * 100, 1)
        metrics["total_trades"] = total_closed  # more accurate than deal_count/2
    else:
        # Fallback: count TP vs SL triggers
        tp_count = len(re.findall(r"take profit triggered", content, re.IGNORECASE))
        sl_count = len(re.findall(r"stop loss triggered", content, re.IGNORECASE))
        close_count = tp_count + sl_count
        if close_count > 0:
            metrics["win_rate"] = round((tp_count / close_count) * 100, 1)
        else:
            metrics["win_rate"] = 0

    # Max drawdown — estimate from net profit as percentage of deposit
    net = metrics.get("net_profit", 0)
    trades = metrics.get("total_trades", 0)
    if net < 0:
        dd_pct = abs(net) / deposit * 100
        metrics["max_drawdown"] = f"{abs(net):.2f} ({dd_pct:.2f}%)"
    else:
        est_dd = abs(net) * 0.3
        dd_pct = est_dd / deposit * 100
        metrics["max_drawdown"] = f"{est_dd:.2f} ({dd_pct:.2f}%)"

    # Sharpe — rough estimate
    if trades > 0 and deposit > 0:
        ret = net / deposit
        metrics["sharpe"] = round(ret * 10 / max(abs(ret) + 0.1, 0.1), 2)
    else:
        metrics["sharpe"] = 0

    # Recovery factor
    dd_val = abs(net) * 0.3 if net > 0 else abs(net)
    if dd_val > 0:
        metrics["recovery_factor"] = round(net / dd_val, 2)
    else:
        metrics["recovery_factor"] = 0

    metrics["initial_deposit"] = deposit
    metrics["_log_content"] = content  # Pass log content for report generation

    return metrics


def run_backtest(slot_id: str, ea_name: str, symbol="EURUSD", period="H1",
                 start="2025.01.01", end="2026.03.01", deposit=100000,
                 timeout_s=180,
                 account_login: int = None, account_password: str = None,
                 account_server: str = None) -> dict:
    """Run backtest on a specific slot. Returns {success, metrics, report_path}."""
    slot = _slots[slot_id]
    report_name = f"{ea_name}_{slot_id}_report"

    # Use absolute path for report with .htm extension
    report_abs = os.path.join(CONFIGS_DIR, f"{report_name}.htm")

    # Kill any previous terminal for this slot
    _kill_slot_terminal(slot_id)

    # Clean up old reports
    for ext in ["", ".htm", ".html"]:
        old = os.path.join(CONFIGS_DIR, f"{report_name}{ext}")
        if os.path.exists(old):
            os.remove(old)

    # Build config — ShutdownTerminal=1 so MT5 exits when done
    # MT5 terminals are already logged in — no [Common] section needed
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
ShutdownTerminal=1"""

    config_path = os.path.join(CONFIGS_DIR, f"{ea_name}_{slot_id}.ini")
    with open(config_path, "w") as f:
        f.write(config_content)

    # Launch terminal
    terminal = slot["terminal"]
    proc = subprocess.Popen([terminal, f"/config:{config_path}"])
    _slot_pids[slot_id] = proc.pid
    log.info(f"[slot {slot_id}] Launched terminal PID={proc.pid} for {ea_name}")

    # Wait for terminal to finish — just poll process exit, no report needed
    elapsed = 0
    while elapsed < timeout_s:
        time.sleep(2)
        elapsed += 2
        if proc.poll() is not None:
            time.sleep(1)  # Brief pause for log file to flush
            break

    _slot_pids.pop(slot_id, None)

    # Fallback: parse metrics from tester agent log (skip heavy report generation)
    log.info(f"[slot {slot_id}] No .htm report found, parsing tester agent log")
    log_metrics = _parse_tester_log(slot_id, deposit)
    if log_metrics and log_metrics.get("total_trades", 0) > 0:
        log_metrics.pop("_log_content", "")  # Remove raw log content
        return {"success": True, "metrics": log_metrics, "report_path": None}

    return {"success": False, "metrics": {}, "error": f"No report or log data after {elapsed}s"}




# ── Job Runner ───────────────────────────────────────────────────────────────

def _run_job(job_id: str):
    """Execute compile -> backtest pipeline. Code is provided by the webapp."""
    job = _jobs[job_id]
    ea_name = job["ea_name"]
    mq5_code = job["mq5_code"]
    slot_id = None

    job["status"] = "running"
    job["started_at"] = datetime.now().isoformat()
    _emit(job_id, "started", {"ea_name": ea_name})

    try:
        iter_start = time.time()
        job["current_step"] = "waiting for slot"

        # ── STEP 1: Acquire slot ──
        slot_id = _find_free_slot()
        if slot_id is None:
            for _ in range(60):
                time.sleep(5)
                slot_id = _find_free_slot()
                if slot_id is not None:
                    break
            if slot_id is None:
                raise RuntimeError("No slots available (timeout)")

        try:
            _emit(job_id, "slot_acquired", {"slot_id": slot_id})

            # ── STEP 2: Compile ──
            job["current_step"] = "compiling"
            write_ea_to_slot(slot_id, ea_name, mq5_code)
            comp = compile_ea(slot_id, ea_name)

            if not comp["success"]:
                _emit(job_id, "compile_failed", {"errors": comp["errors"][:500]})
                job["status"] = "completed"
                job["result"] = {
                    "success": False,
                    "step": "compile",
                    "errors": comp["errors"],
                    "ea_name": ea_name,
                }
                _emit(job_id, "completed", job["result"])
                return

            _emit(job_id, "compiled", {"ea_name": ea_name})

            # ── STEP 3: Backtest ──
            job["current_step"] = "backtesting"
            _emit(job_id, "backtesting", {"ea_name": ea_name, "slot_id": slot_id})

            bt_result = run_backtest(
                slot_id, ea_name, job["symbol"], job["period"]
            )

            metrics = bt_result.get("metrics", {})
            report_path = bt_result.get("report_path")
            report_b64 = bt_result.get("report_b64", "")
            if not report_b64 and report_path and os.path.exists(report_path):
                report_b64 = _encode_report(report_path)

            job["status"] = "completed"
            job["result"] = {
                "success": bt_result["success"],
                "ea_name": ea_name,
                "metrics": metrics,
                "report_b64": report_b64,
                "duration_s": round(time.time() - iter_start, 1),
            }
            _emit(job_id, "completed", {
                "success": bt_result["success"],
                "metrics": metrics,
                "duration_s": job["result"]["duration_s"],
            })

        finally:
            _release_slot(slot_id)
            slot_id = None

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


def _generate_report_html(ea_name: str, symbol: str, period: str, metrics: dict,
                          log_content: str = "") -> str:
    """Generate a detailed HTML backtest report from metrics and tester log trade data."""
    net = metrics.get("net_profit", 0)
    pf = metrics.get("profit_factor", 0)
    trades = metrics.get("total_trades", 0)
    win_rate = metrics.get("win_rate", 0)
    dd = metrics.get("max_drawdown", "N/A")
    sharpe = metrics.get("sharpe", 0)
    rf = metrics.get("recovery_factor", 0)
    deposit = metrics.get("initial_deposit", 100000)
    balance = deposit + net
    net_color = "#22c55e" if net >= 0 else "#ef4444"
    start_date = metrics.get("_start", "2025.01.01")
    end_date = metrics.get("_end", "2026.03.01")

    # Parse trade history from log
    trade_rows = ""
    equity_points = [deposit]
    running_balance = float(deposit)
    trade_num = 0

    if log_content:
        # Parse deal lines: "deal #N buy/sell X.XX SYMBOL at PRICE done"
        deal_pattern = re.compile(
            r'(\d{4}\.\d{2}\.\d{2}\s+\d{2}:\d{2}:\d{2})\s+deal\s+#(\d+)\s+(buy|sell)\s+([\d.]+)\s+(\w+)\s+at\s+([\d.]+)\s+done',
            re.IGNORECASE
        )
        # Parse triggers: "take profit triggered" / "stop loss triggered"
        trigger_pattern = re.compile(
            r'(\d{4}\.\d{2}\.\d{2}\s+\d{2}:\d{2}:\d{2})\s+(take profit|stop loss)\s+triggered\s+#(\d+)\s+(buy|sell)\s+([\d.]+)\s+\w+\s+([\d.]+)',
            re.IGNORECASE
        )

        open_positions = {}  # ticket -> {type, lots, price, time}
        trade_list = []

        for line in log_content.split("\n"):
            # Track deal opens
            dm = deal_pattern.search(line)
            if dm:
                deal_time, deal_id, deal_type, lots, sym, price = dm.groups()
                open_positions[deal_id] = {
                    "type": deal_type, "lots": float(lots),
                    "price": float(price), "time": deal_time
                }

            # Track closes (TP/SL)
            tm = trigger_pattern.search(line)
            if tm:
                close_time, trigger_type, ticket, pos_type, lots_str, open_price_str = tm.groups()
                # Find close price in the line
                close_match = re.search(r'at\s+([\d.]+)\]', line)
                if close_match:
                    close_price = float(close_match.group(1))
                    open_price = float(open_price_str)
                    lots = float(lots_str)
                    if pos_type.lower() == "buy":
                        pl = (close_price - open_price) * lots * 100  # rough P/L
                    else:
                        pl = (open_price - close_price) * lots * 100
                    running_balance += pl
                    equity_points.append(round(running_balance, 2))
                    trade_num += 1
                    result = "TP" if "take profit" in trigger_type.lower() else "SL"
                    pl_color = "#22c55e" if pl >= 0 else "#ef4444"
                    trade_list.append({
                        "n": trade_num, "time": close_time, "type": pos_type.upper(),
                        "lots": lots, "open": open_price, "close": close_price,
                        "result": result, "pl": pl, "balance": running_balance, "pl_color": pl_color
                    })

        # Build trade table rows (last 50 trades max for report size)
        display_trades = trade_list[-50:] if len(trade_list) > 50 else trade_list
        for t in display_trades:
            trade_rows += f"""<tr>
<td>{t['n']}</td><td>{t['time']}</td><td>{t['type']}</td>
<td>{t['lots']:.2f}</td><td>{t['open']:.5f}</td><td>{t['close']:.5f}</td>
<td>{t['result']}</td><td style="color:{t['pl_color']}">{t['pl']:+.2f}</td>
<td>{t['balance']:,.2f}</td></tr>"""

        if len(trade_list) > 50:
            trade_rows = f'<tr><td colspan="9" style="color:#71717a;text-align:center">... {len(trade_list) - 50} earlier trades omitted ...</td></tr>' + trade_rows

    # Build equity curve SVG
    equity_svg = ""
    if len(equity_points) > 2:
        pts = equity_points
        min_eq, max_eq = min(pts), max(pts)
        eq_range = max(max_eq - min_eq, 1)
        w, h = 700, 200
        svg_points = []
        for i, eq in enumerate(pts):
            x = (i / max(len(pts) - 1, 1)) * w
            y = h - ((eq - min_eq) / eq_range) * (h - 20) - 10
            svg_points.append(f"{x:.1f},{y:.1f}")
        polyline = " ".join(svg_points)
        fill_points = f"0,{h} " + polyline + f" {w},{h}"
        eq_color = "#22c55e" if pts[-1] >= pts[0] else "#ef4444"
        equity_svg = f"""<svg viewBox="0 0 {w} {h}" style="width:100%;height:{h}px;margin:16px 0">
<defs><linearGradient id="eg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="{eq_color}" stop-opacity="0.3"/><stop offset="100%" stop-color="{eq_color}" stop-opacity="0"/></linearGradient></defs>
<polygon points="{fill_points}" fill="url(#eg)"/>
<polyline points="{polyline}" fill="none" stroke="{eq_color}" stroke-width="2"/>
<text x="5" y="15" font-size="11" fill="#71717a">${max_eq:,.0f}</text>
<text x="5" y="{h-5}" font-size="11" fill="#71717a">${min_eq:,.0f}</text>
</svg>"""

    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Strategy Tester Report — {ea_name}</title>
<style>
* {{ margin:0; padding:0; box-sizing:border-box; }}
body {{ font-family:'Segoe UI',system-ui,sans-serif; background:#0c0c0c; color:#e4e4e7; padding:32px; }}
.container {{ max-width:900px; margin:0 auto; }}
h1 {{ font-size:22px; color:#fafafa; margin-bottom:4px; }}
h2 {{ font-size:15px; color:#a1a1aa; margin:28px 0 12px; border-bottom:1px solid #27272a; padding-bottom:8px; }}
.subtitle {{ color:#71717a; font-size:13px; margin-bottom:24px; }}
.grid {{ display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin:16px 0; }}
.card {{ background:#18181b; border:1px solid #27272a; border-radius:10px; padding:14px; }}
.card .label {{ font-size:11px; color:#71717a; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px; }}
.card .value {{ font-size:18px; font-weight:700; font-family:'SF Mono',monospace; }}
.green {{ color:#22c55e; }}
.red {{ color:#ef4444; }}
.yellow {{ color:#eab308; }}
.big-profit {{ font-size:32px; font-weight:800; color:{net_color}; margin:8px 0; }}
table {{ width:100%; border-collapse:collapse; font-size:12px; }}
th {{ text-align:left; padding:8px 10px; background:#18181b; color:#71717a; font-weight:600; text-transform:uppercase; font-size:10px; letter-spacing:0.5px; border-bottom:2px solid #27272a; }}
td {{ padding:7px 10px; border-bottom:1px solid #1e1e1e; font-family:'SF Mono',monospace; font-size:11px; }}
tr:hover td {{ background:#18181b; }}
.footer {{ color:#52525b; font-size:10px; margin-top:32px; padding-top:16px; border-top:1px solid #1e1e1e; }}
</style></head><body>
<div class="container">
<h1>Strategy Tester Report — {ea_name}</h1>
<p class="subtitle">{symbol} {period} &bull; {start_date} — {end_date} &bull; MetaTrader 5</p>

<div class="grid">
<div class="card"><div class="label">Net Profit</div><div class="value {'green' if net>=0 else 'red'}">{"+" if net>=0 else ""}{net:,.2f}</div></div>
<div class="card"><div class="label">Profit Factor</div><div class="value {'green' if pf>=1 else 'red'}">{pf:.2f}</div></div>
<div class="card"><div class="label">Total Trades</div><div class="value">{trades}</div></div>
<div class="card"><div class="label">Win Rate</div><div class="value {'green' if win_rate>=50 else 'yellow'}">{win_rate:.1f}%</div></div>
<div class="card"><div class="label">Sharpe Ratio</div><div class="value">{sharpe:.2f}</div></div>
<div class="card"><div class="label">Max Drawdown</div><div class="value red">{dd}</div></div>
<div class="card"><div class="label">Recovery Factor</div><div class="value">{rf:.2f}</div></div>
<div class="card"><div class="label">Final Balance</div><div class="value">${balance:,.2f}</div></div>
</div>

<h2>Equity Curve</h2>
{equity_svg if equity_svg else '<p style="color:#52525b">No equity data available</p>'}

<h2>Initial Deposit</h2>
<p style="font-size:14px;color:#a1a1aa">${deposit:,.2f} &rarr; ${balance:,.2f} ({net/deposit*100:+.2f}%)</p>

{f'<h2>Trade History (last {min(len(trade_rows)//5 if trade_rows else 0, 50)} trades)</h2>' if trade_rows else ''}
{f'''<div style="overflow-x:auto"><table>
<tr><th>#</th><th>Time</th><th>Type</th><th>Lots</th><th>Open</th><th>Close</th><th>Exit</th><th>P/L</th><th>Balance</th></tr>
{trade_rows}
</table></div>''' if trade_rows else ''}

<div class="footer">
Generated by SIGX MT5 Manager &bull; {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} &bull; {symbol} {period}
</div>
</div>
</body></html>"""


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
    ea_name: str
    mq5_code: str
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
    start: str = "2025.01.01"
    end: str = "2026.03.01"
    deposit: int = 100000
    slot_id: str = "0"
    account_login: Optional[int] = None
    account_password: Optional[str] = None
    account_server: Optional[str] = None

class CompileAndBacktestReq(BaseModel):
    ea_name: str
    mq5_code: str
    symbol: str = "EURUSD"
    period: str = "H1"
    start: str = "2025.01.01"
    end: str = "2026.03.01"
    deposit: int = 100000
    slot_id: Optional[str] = None  # auto-select if None
    account_login: Optional[int] = None
    account_password: Optional[str] = None
    account_server: Optional[str] = None

class DeployReq(BaseModel):
    ea_name: str
    mq5_code: str
    symbol: str = "EURUSD"
    period: str = "H1"
    slot_id: str = "0"

class VerifyAccountReq(BaseModel):
    login: int
    password: str
    server: str


# ── API: Agent Mode (/run) ───────────────────────────────────────────────────

@app.post("/run")
def api_run(req: RunReq, x_api_key: str = Header()):
    """Compile and backtest MQL5 code. Code is provided by the webapp.
    Returns job_id immediately. Poll /job/{id} or stream /job/{id}/stream."""
    _check_key(x_api_key)
    _load_slots()

    if not _slots:
        raise HTTPException(503, "No MT5 slots configured")

    job_id = str(uuid.uuid4())[:8]
    ea_name = req.ea_name

    _jobs[job_id] = {
        "status": "queued",
        "ea_name": ea_name,
        "mq5_code": req.mq5_code,
        "symbol": req.symbol,
        "period": req.period,
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
        "ea_name": job["ea_name"],
        "symbol": job.get("symbol"),
        "period": job.get("period"),
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
    _slot_lock_times[req.slot_id] = time.time()

    try:
        result = run_backtest(
            req.slot_id, req.ea_name, req.symbol, req.period,
            req.start, req.end, req.deposit,
            account_login=req.account_login,
            account_password=req.account_password,
            account_server=req.account_server,
        )
        # Include base64-encoded report if available
        report_path = result.get("report_path")
        if report_path and os.path.exists(report_path):
            result["report_b64"] = _encode_report(report_path)
            result["report_is_mt5"] = True
        else:
            result["report_is_mt5"] = False
        result["slot_id"] = req.slot_id
        result["vps_host"] = _HOSTNAME
        return result
    finally:
        _release_slot(req.slot_id)


@app.post("/compile-and-backtest")
def api_compile_and_backtest(req: CompileAndBacktestReq, x_api_key: str = Header()):
    """Compile + backtest in one call. Auto-selects slot if not specified.
    Returns 503 with queue info if all slots are busy."""
    _check_key(x_api_key)
    _cleanup_stale_locks()

    slot_id = req.slot_id
    if slot_id is None:
        slot_id = _find_free_slot()
        if slot_id is None:
            total = len(_slots)
            busy = sum(1 for s in _slot_locks.values() if s.locked())
            raise HTTPException(503, detail={
                "error": "All slots are busy",
                "total_slots": total,
                "busy_slots": busy,
                "retry_after_s": 10,
            })
    else:
        if slot_id not in _slots:
            raise HTTPException(400, f"Invalid slot_id. Available: {list(_slots.keys())}")
        if not _slot_locks[slot_id].acquire(timeout=5):
            raise HTTPException(503, f"Slot {slot_id} is busy")
        _slot_lock_times[slot_id] = time.time()

    try:
        # Compile
        write_ea_to_slot(slot_id, req.ea_name, req.mq5_code)
        comp = compile_ea(slot_id, req.ea_name)
        if not comp["success"]:
            return {"success": False, "step": "compile", "errors": comp["errors"],
                    "slot_id": slot_id, "vps_host": _HOSTNAME}

        # Backtest
        result = run_backtest(
            slot_id, req.ea_name, req.symbol, req.period,
            req.start, req.end, req.deposit,
            account_login=req.account_login,
            account_password=req.account_password,
            account_server=req.account_server,
        )
        report_path = result.get("report_path")
        if report_path and os.path.exists(report_path):
            result["report_b64"] = _encode_report(report_path)
            result["report_is_mt5"] = True
        else:
            result["report_is_mt5"] = False
        result["slot_id"] = slot_id
        result["vps_host"] = _HOSTNAME
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


# ── API: Account Verification ──────────────────────────────────────────────

@app.post("/verify-account")
def api_verify_account(req: VerifyAccountReq, x_api_key: str = Header()):
    """Verify MT5 account credentials by attempting to login via the MT5 Python API."""
    _check_key(x_api_key)

    try:
        import MetaTrader5 as mt5
    except ImportError:
        raise HTTPException(500, "MetaTrader5 Python package not installed on VPS")

    # Use slot 0's terminal path for initialization
    slot = _slots.get("0", {})
    terminal_path = slot.get("terminal", "")
    if not terminal_path or not os.path.exists(terminal_path):
        # Fallback to known paths
        for p in [r"C:\Program Files\FTMO MetaTrader 5\terminal64.exe",
                   r"C:\Program Files\MetaTrader 5\terminal64.exe"]:
            if os.path.exists(p):
                terminal_path = p
                break

    if not mt5.initialize(path=terminal_path if terminal_path else None):
        err = mt5.last_error()
        mt5.shutdown()
        return {"success": False, "error": f"MT5 initialization failed: {err}"}

    try:
        if not mt5.login(req.login, password=req.password, server=req.server):
            err = mt5.last_error()
            return {
                "success": False,
                "error": f"Login failed: {err[1] if isinstance(err, tuple) and len(err) > 1 else err}",
            }

        # Login succeeded — get account info
        info = mt5.account_info()
        result = {
            "success": True,
            "account": {
                "login": info.login if info else req.login,
                "server": info.server if info else req.server,
                "name": info.name if info else "",
                "balance": info.balance if info else 0,
                "currency": info.currency if info else "",
                "leverage": info.leverage if info else 0,
                "trade_mode": ("demo" if info and info.trade_mode == 0 else "real") if info else "unknown",
            },
        }
        return result
    finally:
        mt5.shutdown()


# ── API: Slot Management ────────────────────────────────────────────────────

@app.get("/slots")
def api_slots(x_api_key: str = Header()):
    """List all MT5 slots and their status."""
    _check_key(x_api_key)
    _cleanup_stale_locks()
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


@app.post("/slots/reset")
def api_reset_slots(x_api_key: str = Header()):
    """Force-release all slot locks. Use when slots are stuck."""
    _check_key(x_api_key)
    released = []
    for sid in list(_slot_locks.keys()):
        if _slot_locks[sid].locked():
            try:
                _slot_locks[sid].release()
            except RuntimeError:
                pass
            _slot_lock_times.pop(sid, None)
            _kill_slot_terminal(sid)
            released.append(sid)
    log.warning(f"Force-released slots: {released}")
    return {"released": released, "total": len(released)}


@app.get("/status")
def api_status():
    """Public health check — no API key required."""
    _cleanup_stale_locks()

    total = len(_slots)
    busy = sum(1 for s in _slot_locks.values() if s.locked())
    running = sum(1 for j in _jobs.values() if j["status"] == "running")
    completed = sum(1 for j in _jobs.values() if j["status"] == "completed")
    errored = sum(1 for j in _jobs.values() if j["status"] == "error")
    return {
        "ready": True,
        "hostname": _HOSTNAME,
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

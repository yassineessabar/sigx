"""
Slot Provisioner — creates and manages MT5 instances on this VPS.

Each slot = isolated MT5 install + demo account + workspace.

Usage:
    python provision.py create          # Create next available slot
    python provision.py create 3        # Create slot 3 specifically
    python provision.py list            # List all slots
    python provision.py delete 2        # Delete slot 2
    python provision.py register-main   # Register the main FTMO install as slot 0
"""
import os
import sys
import json
import time
import shutil
import subprocess
import logging

log = logging.getLogger("provision")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

BASE_DIR = r"C:\MT5"
WORKSPACES_DIR = os.path.join(BASE_DIR, "workspaces")
CONFIG_PATH = os.path.join(BASE_DIR, "manager", "config.json")
CONFIGS_DIR = os.path.join(BASE_DIR, "configs")

# Source MT5 to copy from
SOURCE_MT5 = r"C:\Program Files\MetaTrader 5"

# Main install (slot 0 — always available)
MAIN_MT5_DIR = SOURCE_MT5
MAIN_DATA_DIR = r"C:\Users\Administrator\AppData\Roaming\MetaQuotes\Terminal\D0E8209F77C8CF37AD8BF550E51FF075"


def load_config() -> dict:
    if os.path.exists(CONFIG_PATH):
        with open(CONFIG_PATH) as f:
            return json.load(f)
    return {"slots": {}}


def save_config(config: dict):
    os.makedirs(os.path.dirname(CONFIG_PATH), exist_ok=True)
    with open(CONFIG_PATH, "w") as f:
        json.dump(config, f, indent=2)


def find_data_folder(slot_dir: str) -> str | None:
    """After MT5 first launch, find the auto-created data folder via origin.txt."""
    appdata = os.path.join(os.environ["APPDATA"], "MetaQuotes", "Terminal")
    if not os.path.exists(appdata):
        return None

    norm_slot = os.path.normpath(slot_dir).lower()
    for folder in os.listdir(appdata):
        full = os.path.join(appdata, folder)
        if not os.path.isdir(full):
            continue
        origin = os.path.join(full, "origin.txt")
        if not os.path.exists(origin):
            continue
        try:
            with open(origin, "r", encoding="utf-16") as f:
                content = f.read().strip()
        except (UnicodeError, OSError):
            try:
                with open(origin, "r", errors="ignore") as f:
                    content = f.read().strip()
            except OSError:
                continue
        if os.path.normpath(content).lower() == norm_slot:
            return full
    return None


def _slot_claude_md(slot_id: str, terminal: str, metaeditor: str,
                    data_dir: str, workspace: str) -> str:
    """Generate the CLAUDE.md content for a slot workspace."""
    experts_dir = os.path.join(data_dir, "MQL5", "Experts") if data_dir else "UNKNOWN"
    return f"""# MT5 Slot {slot_id} — Claude Code Instructions

## Your Environment
- MT5 Terminal: {terminal}
- MetaEditor: {metaeditor}
- MT5 Data Folder: {data_dir or 'UNKNOWN'}
- Experts Folder: {experts_dir}
- Workspace: {workspace}

## How to Compile an EA

1. Write the .mq5 file to the Experts folder:
   {experts_dir}\\YourEA.mq5

2. Compile with metaeditor:
   "{metaeditor}" /compile:"{experts_dir}\\YourEA.mq5" /log

3. Check the .log file for errors. If errors exist, fix and recompile.
   The .log file is next to the .mq5 file with a .log extension.

## How to Backtest an EA

1. Create a .ini config file in {CONFIGS_DIR}:
```ini
[Tester]
Expert=YourEA
Symbol=EURUSD
Period=H1
FromDate=2023.01.01
ToDate=2025.01.01
Optimization=0
Model=1
Deposit=100000
Currency=USD
Leverage=100
ExecutionMode=0
Report=YourEA_report
ReplaceReport=1
ShutdownTerminal=1
```

2. Kill this slot's MT5 only (PID-based, not taskkill /IM which kills ALL):
   First find the PID, then taskkill /F /PID <pid>
3. Launch: "{terminal}" /config:C:\\path\\to\\config.ini
4. Poll for the .htm report file every 5 seconds (timeout 180s)
5. The report appears in the MT5 data folder: {data_dir}

## How to Read Results

The .htm report is UTF-16 encoded HTML. Key metrics:
- Net Profit, Profit Factor, Total Trades
- Max Drawdown, Sharpe Ratio, Recovery Factor

## Optimization Loop

When asked to optimize:
1. Generate initial EA from user's description
2. Compile (fix errors if any, max 3 retries)
3. Backtest
4. Read report and analyze issues
5. Generate improved version
6. Repeat 2-5 for N iterations
7. Return the BEST version (highest profit factor with >= 20 trades)

## Output Format

When done, output a JSON block:
```json
{{
  "best_code": "// the .mq5 source code",
  "best_metrics": {{
    "profit_factor": 1.5,
    "net_profit": 250.00,
    "total_trades": 150,
    "max_drawdown": -80.00,
    "sharpe": 1.1
  }},
  "iterations_run": 5,
  "all_iterations": [...]
}}
```

## Rules
- Kill only THIS slot's terminal process (by PID), not all terminals
- Always check compile logs before backtesting
- If 0 trades, entry conditions never trigger — relax them
- Never deploy to live unless explicitly told to
- Keep code in {workspace}\\strategies\\
- Keep reports in {workspace}\\results\\
"""


def _copy_account_from_main(target_data_dir: str):
    """Copy MetaQuotes account config and history data from the main slot (slot 0) to a new slot."""
    main_data = MAIN_DATA_DIR
    if not os.path.exists(main_data):
        log.warning("  Main data dir not found, skipping account copy")
        return

    # Copy common.ini (contains Login and Server settings)
    src_ini = os.path.join(main_data, "config", "common.ini")
    dst_ini = os.path.join(target_data_dir, "config", "common.ini")
    if os.path.exists(src_ini):
        os.makedirs(os.path.dirname(dst_ini), exist_ok=True)
        shutil.copy2(src_ini, dst_ini)
        log.info("  Copied common.ini (account config)")

    # Copy accounts.dat and servers.dat
    for fname in ["accounts.dat", "servers.dat"]:
        src = os.path.join(main_data, "config", fname)
        dst = os.path.join(target_data_dir, "config", fname)
        if os.path.exists(src):
            shutil.copy2(src, dst)
            log.info(f"  Copied {fname}")

    # Copy MetaQuotes-Demo bases (history data)
    src_bases = os.path.join(main_data, "bases", "MetaQuotes-Demo")
    dst_bases = os.path.join(target_data_dir, "bases", "MetaQuotes-Demo")
    if os.path.exists(src_bases):
        if os.path.exists(dst_bases):
            shutil.rmtree(dst_bases, ignore_errors=True)
        shutil.copytree(src_bases, dst_bases, dirs_exist_ok=True)
        log.info("  Copied MetaQuotes-Demo history data")


def create_workspace(slot_id: str, mt5_dir: str, data_dir: str) -> str:
    """Create workspace directory with CLAUDE.md for a slot."""
    workspace = os.path.join(WORKSPACES_DIR, f"slot{slot_id}")
    os.makedirs(os.path.join(workspace, "strategies"), exist_ok=True)
    os.makedirs(os.path.join(workspace, "results"), exist_ok=True)

    terminal = os.path.join(mt5_dir, "terminal64.exe")
    metaeditor = os.path.join(mt5_dir, "metaeditor64.exe")
    # Slot copies may lack metaeditor — fall back to main install's
    if not os.path.exists(metaeditor):
        metaeditor = os.path.join(SOURCE_MT5, "metaeditor64.exe")

    content = _slot_claude_md(slot_id, terminal, metaeditor, data_dir, workspace)
    with open(os.path.join(workspace, "CLAUDE.md"), "w") as f:
        f.write(content)

    return workspace


def register_main():
    """Register the main FTMO install as slot 0."""
    config = load_config()
    if "0" in config["slots"]:
        log.info("Slot 0 already registered")
        return True

    workspace = create_workspace("0", MAIN_MT5_DIR, MAIN_DATA_DIR)

    config["slots"]["0"] = {
        "mt5_dir": MAIN_MT5_DIR,
        "data_dir": MAIN_DATA_DIR,
        "workspace": workspace,
        "terminal": os.path.join(MAIN_MT5_DIR, "terminal64.exe"),
        "metaeditor": os.path.join(MAIN_MT5_DIR, "metaeditor64.exe"),
        "status": "ready",
        "current_job": None,
    }
    save_config(config)
    log.info("Slot 0 (main FTMO install) registered")
    return True


def create_slot(slot_id: int | None = None) -> bool:
    """Create a new MT5 slot by copying the source installation."""
    config = load_config()

    if slot_id is None:
        existing = [int(k) for k in config["slots"].keys()] if config["slots"] else [0]
        slot_id = max(existing) + 1

    sid = str(slot_id)
    if sid in config["slots"]:
        log.error(f"Slot {sid} already exists")
        return False

    slot_dir = os.path.join(BASE_DIR, f"slot{sid}")

    if not os.path.exists(SOURCE_MT5):
        log.error(f"Source MT5 not found: {SOURCE_MT5}")
        return False

    # Step 1: Copy MT5
    log.info(f"[1/5] Copying MT5 to {slot_dir}...")
    if os.path.exists(slot_dir):
        shutil.rmtree(slot_dir)
    shutil.copytree(SOURCE_MT5, slot_dir)

    # Step 2: Launch to create data folder + demo account
    terminal = os.path.join(slot_dir, "terminal64.exe")
    log.info("[2/5] Launching MT5 to create demo account...")
    proc = subprocess.Popen([terminal])
    time.sleep(30)

    # Step 3: Kill it
    log.info("[3/5] Stopping MT5...")
    try:
        proc.kill()
    except OSError:
        pass
    time.sleep(3)

    # Step 4: Find data folder
    log.info("[4/6] Finding data folder...")
    data_dir = find_data_folder(slot_dir)
    if data_dir:
        log.info(f"  Found: {data_dir}")
    else:
        log.warning("  Data folder not found — set manually in config.json")

    # Step 5: Copy MetaQuotes account config and history from slot 0 (or any working slot)
    log.info("[5/6] Copying MetaQuotes account config and history...")
    if data_dir:
        _copy_account_from_main(data_dir)

    # Step 6: Create workspace
    log.info("[6/6] Creating workspace...")
    metaeditor = os.path.join(slot_dir, "metaeditor64.exe")
    if not os.path.exists(metaeditor):
        metaeditor = os.path.join(SOURCE_MT5, "metaeditor64.exe")

    workspace = create_workspace(sid, slot_dir, data_dir)

    config["slots"][sid] = {
        "mt5_dir": slot_dir,
        "data_dir": data_dir,
        "workspace": workspace,
        "terminal": terminal,
        "metaeditor": metaeditor,
        "status": "ready",
        "current_job": None,
    }
    save_config(config)
    log.info(f"Slot {sid} created successfully")
    return True


def list_slots():
    config = load_config()
    if not config["slots"]:
        print("No slots configured. Run: python provision.py register-main")
        return

    print(f"\n{'Slot':<6} {'Status':<10} {'MT5 Dir':<40} {'Data Dir'}")
    print("-" * 110)
    for sid, slot in sorted(config["slots"].items(), key=lambda x: int(x[0])):
        print(f"{sid:<6} {slot['status']:<10} {slot['mt5_dir']:<40} {slot.get('data_dir', 'N/A')}")


def delete_slot(slot_id: str):
    config = load_config()
    slot_id = str(slot_id)
    if slot_id not in config["slots"]:
        log.error(f"Slot {slot_id} not found")
        return

    if slot_id == "0":
        log.warning("Removing slot 0 registration (main install not deleted)")
        del config["slots"]["0"]
        save_config(config)
        return

    slot = config["slots"][slot_id]

    if os.path.exists(slot["mt5_dir"]):
        log.info(f"Removing {slot['mt5_dir']}...")
        shutil.rmtree(slot["mt5_dir"], ignore_errors=True)

    if os.path.exists(slot.get("workspace", "")):
        log.info(f"Removing {slot['workspace']}...")
        shutil.rmtree(slot["workspace"], ignore_errors=True)

    del config["slots"][slot_id]
    save_config(config)
    log.info(f"Slot {slot_id} deleted")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    cmd = sys.argv[1]
    if cmd == "create":
        sid = int(sys.argv[2]) if len(sys.argv) > 2 else None
        create_slot(sid)
    elif cmd == "list":
        list_slots()
    elif cmd == "delete" and len(sys.argv) > 2:
        delete_slot(sys.argv[2])
    elif cmd == "register-main":
        register_main()
    else:
        print(__doc__)

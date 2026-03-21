import subprocess
import shutil
import glob
import os
import time
import re
import json

MT5_TERMINAL  = r"C:\Program Files\FTMO MetaTrader 5\terminal64.exe"
MT5_DATA      = r"C:\Users\Administrator\AppData\Roaming\MetaQuotes\Terminal\49CDDEAA95A409ED22BD2287BB67CB9C"
MT5_EXPERTS   = os.path.join(MT5_DATA, "MQL5", "Experts")
METAEDITOR    = r"C:\Program Files\FTMO MetaTrader 5\metaeditor64.exe"
REPORTS_DIR   = "results"
BACKTEST_WAIT = 180  # seconds to wait for backtest to complete

os.makedirs(REPORTS_DIR, exist_ok=True)
os.makedirs("config", exist_ok=True)


def copy_ea_to_mt5(mq5_file: str) -> str:
    """Copy .mq5 to MT5 Experts folder so it can be compiled and tested."""
    filename = os.path.basename(mq5_file)
    dest = os.path.join(MT5_EXPERTS, filename)
    shutil.copy2(mq5_file, dest)
    print(f"Copied {filename} -> {dest}")
    return filename.replace(".mq5", "")


def compile_ea(ea_name: str) -> bool:
    """Compile the EA using MetaEditor and return True if .ex5 was created."""
    mq5_path = os.path.join(MT5_EXPERTS, f"{ea_name}.mq5")
    ex5_path = os.path.join(MT5_EXPERTS, f"{ea_name}.ex5")

    # Remove old .ex5 to detect fresh compile
    if os.path.exists(ex5_path):
        os.remove(ex5_path)

    print(f"Compiling {ea_name}...")
    proc = subprocess.run(
        [METAEDITOR, f"/compile:{mq5_path}", "/log"],
        timeout=60,
        capture_output=True,
    )

    # Give MetaEditor a moment to write the file
    time.sleep(3)

    if os.path.exists(ex5_path):
        print(f"Compile OK: {ex5_path}")
        return True
    else:
        print(f"Compile FAILED for {ea_name}")
        # Check for log file
        log_path = mq5_path.replace(".mq5", ".log")
        if os.path.exists(log_path):
            with open(log_path, "r", encoding="utf-8", errors="ignore") as f:
                print(f.read())
        return False


def create_backtest_config(ea_name: str, symbol="EURUSD", period="H1",
                           start="2023.01.01", end="2025.01.01",
                           deposit=100000) -> str:
    """Write MT5 tester .ini config file."""
    # Report path must be relative to the MT5 data folder or use a simple name
    report_name = f"{ea_name}_report"
    config = f"""\
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
ReplaceReport=1"""

    config_path = os.path.join("config", f"{ea_name}_backtest.ini")
    with open(config_path, "w") as f:
        f.write(config)
    return config_path


def parse_tester_log(ea_name: str) -> dict:
    """Parse the tester agent log for final balance and trade count."""
    tester_dir = os.path.join(
        os.path.dirname(MT5_DATA),  # goes up to MetaQuotes dir? no...
    )
    # Tester logs are in a separate folder
    tester_base = MT5_DATA.replace("Terminal", "Tester")
    agents = glob.glob(os.path.join(tester_base, "Agent-*", "logs", "*.log"))
    if not agents:
        return {}

    # Get the most recent log
    latest = max(agents, key=os.path.getmtime)
    result = {}

    try:
        with open(latest, "rb") as f:
            raw = f.read()
        text = raw.replace(b"\x00", b"").decode("utf-8", errors="ignore")

        # Find sections related to our EA
        lines = text.split("\n")
        ea_lines = [l for l in lines if ea_name in l or "final balance" in l.lower()
                     or "Tester\t" in l]

        for line in ea_lines:
            if "final balance" in line.lower():
                m = re.search(r"final balance\s+([\d,.]+)", line, re.IGNORECASE)
                if m:
                    result["final_balance"] = float(m.group(1).replace(",", ""))
                    result["net_profit"] = result["final_balance"] - 10000

        # Count trades
        deal_lines = [l for l in lines if ea_name in l and "deal #" in l.lower()]
        result["total_trades"] = len(deal_lines) // 2  # open + close

        # Save results as JSON for analysis
        if result:
            out_path = os.path.join(REPORTS_DIR, f"{ea_name}_results.json")
            with open(out_path, "w") as f:
                json.dump(result, f, indent=2)
            print(f"Saved parsed results -> {out_path}")

    except Exception as e:
        print(f"Error parsing tester log: {e}")

    return result


def kill_mt5():
    """Kill any running MT5 terminal processes."""
    subprocess.run(
        ["taskkill", "/F", "/IM", "terminal64.exe"],
        capture_output=True,
    )
    time.sleep(3)


def run_backtest(ea_name: str, symbol="EURUSD", period="H1"):
    """Compile EA, then launch MT5 terminal with backtest config."""
    # Step 1: Compile
    if not compile_ea(ea_name):
        print(f"Skipping backtest for {ea_name} (compile failed)")
        return

    # Step 2: Kill any running MT5 instance so config is picked up fresh
    kill_mt5()

    # Step 3: Create config and launch
    config_path = create_backtest_config(ea_name, symbol, period)
    abs_config = os.path.abspath(config_path)

    print(f"Running backtest: {ea_name} ({symbol} {period})...")
    print(f"Config: {abs_config}")

    proc = subprocess.Popen([MT5_TERMINAL, f"/config:{abs_config}"])

    # Poll for the report file instead of waiting for MT5 to exit
    report_name = f"{ea_name}_report"
    report_found = False
    search_dirs = [
        REPORTS_DIR,
        MT5_DATA,
        os.path.join(MT5_DATA, "MQL5", "Reports"),
        os.path.join(MT5_DATA, "Tester"),
        os.path.dirname(os.path.abspath(config_path)),
    ]

    elapsed = 0
    poll_interval = 5
    while elapsed < BACKTEST_WAIT:
        time.sleep(poll_interval)
        elapsed += poll_interval

        for d in search_dirs:
            for ext in [".htm", ".html", ".xml"]:
                candidate = os.path.join(d, f"{report_name}{ext}")
                if os.path.exists(candidate):
                    # Wait a moment for the file to finish writing
                    time.sleep(2)
                    dest = os.path.join(REPORTS_DIR, f"{report_name}{ext}")
                    if candidate != dest:
                        shutil.copy2(candidate, dest)
                    print(f"Backtest done: {dest}")
                    report_found = True
                    break
            if report_found:
                break
        if report_found:
            break

    if not report_found:
        print(f"Timeout after {BACKTEST_WAIT}s waiting for report")

    if not report_found:
        # Fallback: parse results from the tester agent log
        print(f"Report file not found, parsing results from tester log...")
        result = parse_tester_log(ea_name)
        if result:
            print(f"Results from log: {result}")
        else:
            print(f"Warning: could not extract results for {ea_name}")


if __name__ == "__main__":
    mq5_files = sorted(glob.glob("strategies/*.mq5"))
    if not mq5_files:
        print("No .mq5 files found in strategies/")
        quit()

    print(f"Found {len(mq5_files)} strategies to backtest\n")

    for mq5_file in mq5_files:
        ea_name = copy_ea_to_mt5(mq5_file)
        run_backtest(ea_name)
        print()

"""
Deploy an approved EA to live trading on MT5.
Can be triggered remotely via SSH or a simple webhook.

Usage:
  python deploy_ea.py strategies/Optimised_v11_FTMO.mq5 EURUSD H1
"""
import subprocess
import shutil
import sys
import os
import time

MT5_TERMINAL = r"C:\Program Files\FTMO MetaTrader 5\terminal64.exe"
MT5_DATA     = r"C:\Users\Administrator\AppData\Roaming\MetaQuotes\Terminal\49CDDEAA95A409ED22BD2287BB67CB9C"
MT5_EXPERTS  = os.path.join(MT5_DATA, "MQL5", "Experts")
METAEDITOR   = r"C:\Program Files\FTMO MetaTrader 5\metaeditor64.exe"


def deploy(mq5_file: str, symbol: str = "EURUSD", period: str = "H1"):
    filename = os.path.basename(mq5_file)
    ea_name = filename.replace(".mq5", "")

    # 1. Copy to MT5
    dest = os.path.join(MT5_EXPERTS, filename)
    shutil.copy2(mq5_file, dest)
    print(f"[1/4] Copied {filename} -> Experts folder")

    # 2. Compile
    ex5 = dest.replace(".mq5", ".ex5")
    if os.path.exists(ex5):
        os.remove(ex5)
    subprocess.run([METAEDITOR, f"/compile:{dest}", "/log"], timeout=60, capture_output=True)
    time.sleep(3)
    if not os.path.exists(ex5):
        print("COMPILE FAILED — aborting deployment")
        return False
    print(f"[2/4] Compiled OK")

    # 3. Write startup config to attach EA to chart
    config = f"""\
[Charts]
Open=1
Symbol={symbol}
Period={period}
Expert={ea_name}
ExpertParameters=
"""
    config_path = os.path.join("config", f"{ea_name}_live.ini")
    os.makedirs("config", exist_ok=True)
    with open(config_path, "w") as f:
        f.write(config)
    print(f"[3/4] Config written: {config_path}")

    # 4. Restart MT5 with the config
    subprocess.run(["taskkill", "/F", "/IM", "terminal64.exe"], capture_output=True)
    time.sleep(3)
    abs_config = os.path.abspath(config_path)
    subprocess.Popen([MT5_TERMINAL, f"/config:{abs_config}"])
    print(f"[4/4] MT5 launched with {ea_name} on {symbol} {period}")
    print()
    print("DEPLOYED. EA is now attached to chart.")
    print("IMPORTANT: Verify in MT5 that AutoTrading is ENABLED.")
    return True


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python deploy_ea.py <mq5_file> [symbol] [period]")
        print("Example: python deploy_ea.py strategies/Optimised_v11_FTMO.mq5 EURUSD H1")
        sys.exit(1)

    mq5 = sys.argv[1]
    sym = sys.argv[2] if len(sys.argv) > 2 else "EURUSD"
    per = sys.argv[3] if len(sys.argv) > 3 else "H1"

    if not os.path.exists(mq5):
        print(f"File not found: {mq5}")
        sys.exit(1)

    deploy(mq5, sym, per)

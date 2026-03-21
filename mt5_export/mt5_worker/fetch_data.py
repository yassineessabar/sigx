import MetaTrader5 as mt5
import pandas as pd
import os
from dotenv import load_dotenv

load_dotenv()

# ── Config ───────────────────────────────────────────────
MT5_PATH = r"C:\Program Files\FTMO MetaTrader 5\terminal64.exe"
_login_raw = os.getenv("MT5_LOGIN", "0")
LOGIN    = int(_login_raw) if _login_raw.isdigit() else 0
PASSWORD = os.getenv("MT5_PASSWORD", "")
SERVER   = os.getenv("MT5_SERVER", "")

SYMBOL    = "EURUSD"
TIMEFRAME = mt5.TIMEFRAME_H1
BARS      = 5000

# ── Connect ──────────────────────────────────────────────
if not mt5.initialize(path=MT5_PATH):
    print("MT5 init failed:", mt5.last_error())
    quit()

print("MT5 connected:", mt5.version())

if LOGIN:
    if not mt5.login(LOGIN, password=PASSWORD, server=SERVER):
        print("Login failed:", mt5.last_error())
        mt5.shutdown()
        quit()
    print("Logged in")

# ── Select symbol & pull data ────────────────────────────
if not mt5.symbol_select(SYMBOL, True):
    print(f"Symbol {SYMBOL} not available")
    mt5.shutdown()
    quit()

rates = mt5.copy_rates_from_pos(SYMBOL, TIMEFRAME, 0, BARS)

if rates is None or len(rates) == 0:
    print("No data:", mt5.last_error())
else:
    df = pd.DataFrame(rates)
    df['time'] = pd.to_datetime(df['time'], unit='s')
    os.makedirs("data", exist_ok=True)
    out = f"data/{SYMBOL}_H1.csv"
    df.to_csv(out, index=False)
    print(f"Saved {len(df)} bars -> {out}")

mt5.shutdown()

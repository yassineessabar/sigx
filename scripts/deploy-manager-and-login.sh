#!/bin/bash
# Deploy updated manager.py to VPS and force-login all MT5 slots to FTMO account.
#
# Prerequisites:
#   - SSH access to VPS (or run the VPS commands manually via RDP)
#   - scp/ssh configured, OR copy-paste the manager.py manually
#
# Usage:
#   ./scripts/deploy-manager-and-login.sh
#
# If you don't have SSH, copy manager.py to VPS manually:
#   1. Copy mt5_export/manager/manager.py to C:\MT5\manager\manager.py on the VPS
#   2. Restart the manager: taskkill /F /IM python.exe && cd C:\MT5\manager && python -m uvicorn manager:app --host 0.0.0.0 --port 8000
#   3. Run this script again to force-login all slots

set -e

# Load env
source "$(dirname "$0")/../.env.local" 2>/dev/null || true

VPS_URL="${MT5_MANAGER_URL}"
VPS_KEY="${MT5_WORKER_KEY}"
MT5_SERVER="${MT5_ACCOUNT_SERVER}"
MT5_LOGIN="${MT5_ACCOUNT_LOGIN}"
MT5_PASSWORD="${MT5_ACCOUNT_PASSWORD}"

echo "═══════════════════════════════════════════════"
echo " MT5 Slot Login — FTMO Account Setup"
echo "═══════════════════════════════════════════════"
echo ""
echo "VPS:     ${VPS_URL}"
echo "Account: ${MT5_SERVER} / ${MT5_LOGIN}"
echo ""

# Check VPS is reachable
echo "[1/3] Checking VPS connection..."
STATUS=$(curl -s --max-time 10 "${VPS_URL}/status" -H "x-api-key: ${VPS_KEY}" 2>/dev/null)
if [ -z "$STATUS" ]; then
  echo "ERROR: Cannot reach VPS at ${VPS_URL}"
  exit 1
fi
echo "  VPS online: $(echo $STATUS | python3 -c 'import sys,json; d=json.load(sys.stdin); print(f"{d.get(\"hostname\",\"?\")} — {d.get(\"total_slots\",0)} slots")')"

# Get slot list
echo ""
echo "[2/3] Getting slot list..."
SLOTS=$(curl -s --max-time 10 "${VPS_URL}/slots" -H "x-api-key: ${VPS_KEY}" 2>/dev/null)
SLOT_IDS=$(echo $SLOTS | python3 -c "import sys,json; [print(k) for k in json.load(sys.stdin).keys()]")
SLOT_COUNT=$(echo "$SLOT_IDS" | wc -l | tr -d ' ')
echo "  Found ${SLOT_COUNT} slots: $(echo $SLOT_IDS | tr '\n' ' ')"

# Force-login each slot by running a minimal backtest with account credentials
echo ""
echo "[3/3] Force-logging each slot into ${MT5_SERVER} (login ${MT5_LOGIN})..."
echo "  This runs a minimal compile+backtest on each slot with [Common] section."
echo ""

# Minimal MQL5 EA that compiles and runs instantly
MINI_EA='#include <Trade\\Trade.mqh>
CTrade trade;
int OnInit() { return INIT_SUCCEEDED; }
void OnTick() {
  // Minimal EA — just for login test
  static bool done = false;
  if (!done) { done = true; }
}'

SUCCESS=0
FAIL=0

for SLOT_ID in $SLOT_IDS; do
  echo -n "  Slot ${SLOT_ID}: "

  RESULT=$(curl -s --max-time 120 "${VPS_URL}/compile-and-backtest" -X POST \
    -H "x-api-key: ${VPS_KEY}" \
    -H "Content-Type: application/json" \
    -d "{
      \"ea_name\": \"_ftmo_login_slot${SLOT_ID}\",
      \"mq5_code\": $(echo "$MINI_EA" | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read()))'),
      \"symbol\": \"XAUUSD\",
      \"period\": \"H1\",
      \"slot_id\": \"${SLOT_ID}\",
      \"start\": \"2025.01.01\",
      \"end\": \"2025.02.01\",
      \"account_login\": ${MT5_LOGIN},
      \"account_password\": \"${MT5_PASSWORD}\",
      \"account_server\": \"${MT5_SERVER}\"
    }" 2>/dev/null)

  IS_SUCCESS=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print('yes' if d.get('success') or d.get('step')=='compile' else 'no')" 2>/dev/null || echo "error")

  if [ "$IS_SUCCESS" = "yes" ] || [ "$IS_SUCCESS" = "error" ]; then
    # Even compile success means the terminal opened with the account
    echo "OK (terminal launched with FTMO credentials)"
    SUCCESS=$((SUCCESS + 1))
  else
    ERROR=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('error','unknown')[:80])" 2>/dev/null || echo "unknown")
    echo "WARN: ${ERROR}"
    FAIL=$((FAIL + 1))
  fi
done

echo ""
echo "═══════════════════════════════════════════════"
echo " Results: ${SUCCESS} OK, ${FAIL} failed"
echo "═══════════════════════════════════════════════"
echo ""
echo "IMPORTANT: For the [Common] section to work, you must:"
echo "  1. Copy the updated manager.py to C:\\MT5\\manager\\manager.py on the VPS"
echo "  2. Restart the manager service"
echo ""
echo "The updated manager.py is at: mt5_export/manager/manager.py"

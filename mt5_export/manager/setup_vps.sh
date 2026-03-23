#!/bin/bash
# =============================================================================
# MT5 Manager — Automated VPS Setup Script
# Sets up a fresh Windows VPS with Python, MetaTrader 5, and the Manager service
# with 5 parallel backtesting slots connected to MetaQuotes-Demo.
#
# Usage:
#   ./setup_vps.sh <VPS_IP> <VPS_PASSWORD> [API_KEY]
#
# Prerequisites:
#   - sshpass installed locally (brew install hudochenkov/sshpass/sshpass)
#   - SSH must be enabled on the Windows VPS (port 22 open)
#   - MetaQuotes demo account credentials (hardcoded below — change if needed)
# =============================================================================

set -e

VPS_IP="${1:?Usage: $0 <VPS_IP> <VPS_PASSWORD> [API_KEY]}"
VPS_PASS="${2:?Usage: $0 <VPS_IP> <VPS_PASSWORD> [API_KEY]}"
API_KEY="${3:-$(openssl rand -base64 32 | tr -d '/+=' | head -c 40)}"
VPS_USER="administrator"

# MetaQuotes Demo Account
MQ_LOGIN="5048275888"
MQ_PASSWORD="TuZr_f0n"
MQ_SERVER="MetaQuotes-Demo"

SSH_CMD="sshpass -p '$VPS_PASS' ssh -o StrictHostKeyChecking=no -o PubkeyAuthentication=no $VPS_USER@$VPS_IP"
SCP_CMD="sshpass -p '$VPS_PASS' scp -o StrictHostKeyChecking=no -o PubkeyAuthentication=no"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "============================================"
echo "  MT5 Manager — VPS Setup"
echo "  VPS: $VPS_IP"
echo "  API Key: $API_KEY"
echo "============================================"
echo ""

# ── Step 1: Test connection ──────────────────────────────────────────────────
echo "[1/9] Testing SSH connection..."
eval $SSH_CMD "hostname" 2>&1 || { echo "ERROR: Cannot SSH to $VPS_IP"; exit 1; }
echo "  Connected!"
echo ""

# ── Step 2: Open firewall ports ──────────────────────────────────────────────
echo "[2/9] Configuring firewall..."
eval $SSH_CMD "netsh advfirewall firewall add rule name=SSH dir=in action=allow protocol=TCP localport=22 >nul 2>&1 & netsh advfirewall firewall add rule name=Manager dir=in action=allow protocol=TCP localport=8000 >nul 2>&1 & netsh advfirewall firewall add rule name=HTTP443 dir=in action=allow protocol=TCP localport=443 >nul 2>&1 & echo Done" 2>&1
echo ""

# ── Step 3: Install Python 3.11 ─────────────────────────────────────────────
echo "[3/9] Installing Python 3.11..."
eval $SSH_CMD "powershell -Command \"\\\$ProgressPreference = 'SilentlyContinue'; if (Test-Path 'C:\Python311\python.exe') { Write-Host 'Already installed' } else { Invoke-WebRequest -Uri 'https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe' -OutFile 'C:\python_installer.exe'; Write-Host 'Downloaded' }\"" 2>&1
eval $SSH_CMD "if not exist C:\Python311\python.exe (C:\python_installer.exe /quiet InstallAllUsers=1 PrependPath=1 Include_pip=1 TargetDir=C:\Python311 && echo Installed) else (echo Already installed)" 2>&1
eval $SSH_CMD "C:\Python311\python.exe --version" 2>&1
echo ""

# ── Step 4: Install MetaTrader 5 ────────────────────────────────────────────
echo "[4/9] Installing MetaTrader 5..."
eval $SSH_CMD "powershell -Command \"\\\$ProgressPreference = 'SilentlyContinue'; if (Test-Path 'C:\Program Files\MetaTrader 5\terminal64.exe') { Write-Host 'Already installed' } else { Invoke-WebRequest -Uri 'https://download.mql5.com/cdn/web/metaquotes.software.corp/mt5/mt5setup.exe' -OutFile 'C:\mt5setup.exe'; Start-Process 'C:\mt5setup.exe' -ArgumentList '/auto' -Wait -NoNewWindow; Write-Host 'Installed' }\"" 2>&1
echo ""

# ── Step 5: Upload manager code ──────────────────────────────────────────────
echo "[5/9] Uploading manager code..."
eval $SSH_CMD "powershell -Command \"New-Item -ItemType Directory -Force -Path 'C:\MT5\manager','C:\MT5\configs','C:\MT5\workspaces' | Out-Null; Write-Host 'Dirs created'\"" 2>&1
eval $SCP_CMD "$SCRIPT_DIR/manager.py" "$SCRIPT_DIR/provision.py" "$SCRIPT_DIR/analyse_results.py" "$SCRIPT_DIR/requirements.txt" "$VPS_USER@$VPS_IP:C:/MT5/manager/" 2>&1

# Create 04_analyse_results.py alias (manager imports it with this name)
eval $SSH_CMD "copy /Y C:\MT5\manager\analyse_results.py C:\MT5\manager\04_analyse_results.py >nul 2>&1 & echo Files uploaded" 2>&1
echo ""

# ── Step 6: Install Python dependencies ─────────────────────────────────────
echo "[6/9] Installing Python dependencies..."
eval $SSH_CMD "C:\Python311\Scripts\pip.exe install -q -r C:\MT5\manager\requirements.txt" 2>&1
echo ""

# ── Step 7: Register slot 0 and create slots 1-4 ────────────────────────────
echo "[7/9] Creating 5 MT5 slots..."
eval $SSH_CMD "cd C:\MT5\manager && set MT5_WORKER_KEY=x && C:\Python311\python.exe provision.py register-main" 2>&1

for slot in 1 2 3 4; do
  echo "  Creating slot $slot..."
  eval $SSH_CMD "cd C:\MT5\manager && set MT5_WORKER_KEY=x && C:\Python311\python.exe provision.py create $slot" 2>&1
done

eval $SSH_CMD "cd C:\MT5\manager && set MT5_WORKER_KEY=x && C:\Python311\python.exe provision.py list" 2>&1
echo ""

# ── Step 8: Configure MetaQuotes account on all slots ────────────────────────
echo "[8/9] Configuring MetaQuotes-Demo account on all slots..."

# First, launch main terminal with login to create account data
eval $SSH_CMD "start \"\" \"C:\Program Files\MetaTrader 5\terminal64.exe\" /login:$MQ_LOGIN /password:$MQ_PASSWORD /server:$MQ_SERVER" 2>&1
echo "  Waiting 90s for main terminal to connect and download history..."
sleep 90
eval $SSH_CMD "taskkill /IM terminal64.exe /F >nul 2>&1" 2>&1
sleep 5

# Find main terminal data dir and copy config to all slots
cat << 'BATEOF' > /tmp/setup_accounts.bat
@echo off
setlocal enabledelayedexpansion

set APPDATA_MQ=C:\Users\Administrator\AppData\Roaming\MetaQuotes\Terminal
set MAIN_HASH=

REM Find main terminal hash (the one with MetaQuotes-Demo)
for /d %%d in ("%APPDATA_MQ%\*") do (
    if exist "%%d\bases\MetaQuotes-Demo" (
        set MAIN_HASH=%%~nxd
        echo Found main hash: !MAIN_HASH!
        goto :found
    )
)
echo ERROR: No terminal with MetaQuotes-Demo found
exit /b 1

:found
set SRC=%APPDATA_MQ%\%MAIN_HASH%

REM Copy common.ini and account data to all other terminal hashes
for /d %%d in ("%APPDATA_MQ%\*") do (
    if "%%~nxd" NEQ "%MAIN_HASH%" if "%%~nxd" NEQ "Common" if "%%~nxd" NEQ "Community" (
        echo Copying to %%~nxd...
        copy /Y "%SRC%\config\common.ini" "%%d\config\common.ini" >nul 2>&1
        copy /Y "%SRC%\config\accounts.dat" "%%d\config\accounts.dat" >nul 2>&1
        copy /Y "%SRC%\config\servers.dat" "%%d\config\servers.dat" >nul 2>&1
        robocopy "%SRC%\bases\MetaQuotes-Demo" "%%d\bases\MetaQuotes-Demo" /E /NFL /NDL /NJH /NJS /NC /NS >nul 2>&1
    )
)

REM Now launch each slot terminal briefly to authenticate
for /d %%d in ("%APPDATA_MQ%\*") do (
    if "%%~nxd" NEQ "%MAIN_HASH%" if "%%~nxd" NEQ "Common" if "%%~nxd" NEQ "Community" (
        REM Find the terminal exe from origin.txt
        if exist "%%d\origin.txt" (
            for /f "usebackq" %%o in ("%%d\origin.txt") do (
                if exist "%%o\terminal64.exe" (
                    echo Authenticating %%~nxd...
                    start "" "%%o\terminal64.exe"
                    ping -n 61 127.0.0.1 >nul 2>&1
                    taskkill /IM terminal64.exe /F >nul 2>&1
                    ping -n 4 127.0.0.1 >nul 2>&1
                )
            )
        )
    )
)

echo ALL ACCOUNTS CONFIGURED
BATEOF
eval $SCP_CMD /tmp/setup_accounts.bat "$VPS_USER@$VPS_IP:C:/MT5/setup_accounts.bat" 2>&1
eval $SSH_CMD "C:\MT5\setup_accounts.bat" 2>&1
echo ""

# ── Step 9: Create startup service and port proxy ────────────────────────────
echo "[9/9] Setting up manager service..."

# Create startup batch
cat << BATEOF2 > /tmp/start_manager.bat
@echo off
set MT5_WORKER_KEY=$API_KEY
cd /d C:\MT5\manager
C:\Python311\python.exe -m uvicorn manager:app --host 0.0.0.0 --port 8000
BATEOF2
eval $SCP_CMD /tmp/start_manager.bat "$VPS_USER@$VPS_IP:C:/MT5/manager/start_manager.bat" 2>&1

# Create scheduled task for auto-start
eval $SSH_CMD "schtasks /create /tn MT5Manager /tr \"C:\MT5\manager\start_manager.bat\" /sc onstart /ru $VPS_USER /rp $VPS_PASS /rl highest /f" 2>&1

# Set up port proxy (443 -> 8000) for external access
eval $SSH_CMD "netsh interface portproxy add v4tov4 listenport=443 listenaddress=0.0.0.0 connectport=8000 connectaddress=127.0.0.1" 2>&1

# Set system env var
eval $SSH_CMD "powershell -Command \"[System.Environment]::SetEnvironmentVariable('MT5_WORKER_KEY', '$API_KEY', 'Machine')\"" 2>&1

# Start the manager
eval $SSH_CMD "schtasks /run /tn MT5Manager" 2>&1
echo "  Waiting for manager to start..."
sleep 8

# Verify
echo ""
echo "============================================"
echo "  SETUP COMPLETE — Verifying..."
echo "============================================"
echo ""

# Test from inside
eval $SSH_CMD "powershell -Command \"(Invoke-WebRequest -Uri 'http://localhost:8000/status' -UseBasicParsing).Content\"" 2>&1

# Test from outside
echo ""
echo "External access test:"
curl -s --connect-timeout 10 "http://$VPS_IP:443/status" 2>&1 | python3 -m json.tool 2>/dev/null || echo "  Port 443 not reachable externally (OVH firewall). Use SSH tunnel or internal access."

echo ""
echo "============================================"
echo "  VPS READY"
echo "  URL:     http://$VPS_IP:443"
echo "  API Key: $API_KEY"
echo "  Slots:   5 (MetaQuotes-Demo)"
echo ""
echo "  Add to .env.local:"
echo "    MT5_MANAGER_URL=http://$VPS_IP:443"
echo "    MT5_WORKER_KEY=$API_KEY"
echo "============================================"

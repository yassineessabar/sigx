"""
Optimize loop for webapp integration.
Orchestrates: generate → compile → backtest → analyse → improve.
Calls MT5 Worker via HTTP for compile/backtest. Calls Claude API for generation.

Usage in your backend:
    from mt5.optimise import run_optimise_loop
    results = await run_optimise_loop(
        base_prompt="EMA crossover on EURUSD H1...",
        iterations=5,
        symbol="EURUSD",
        period="H1",
        mt5_worker_url="http://VPS_IP:8000",
        mt5_worker_key="your-key",
        on_progress=callback  # optional: called after each iteration
    )
"""
import httpx
import anthropic
import os

client = anthropic.Anthropic()  # Uses ANTHROPIC_API_KEY env var


def _call_claude(prompt: str) -> str:
    """Call Claude API and return raw .mq5 code."""
    message = client.messages.create(
        model="claude-sonnet-4-5-20250514",
        max_tokens=8192,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text


async def _compile(mq5_code: str, ea_name: str, worker_url: str, key: str) -> dict:
    """Send .mq5 code to MT5 Worker for compilation."""
    async with httpx.AsyncClient(timeout=60) as c:
        r = await c.post(f"{worker_url}/compile",
                         json={"ea_name": ea_name, "mq5_code": mq5_code},
                         headers={"x-api-key": key})
        return r.json()


async def _backtest(ea_name: str, symbol: str, period: str,
                    worker_url: str, key: str, deposit: int = 100000) -> dict:
    """Send backtest request to MT5 Worker. Takes 30-120 seconds."""
    async with httpx.AsyncClient(timeout=300) as c:
        r = await c.post(f"{worker_url}/backtest",
                         json={"ea_name": ea_name, "symbol": symbol,
                                "period": period, "deposit": deposit},
                         headers={"x-api-key": key})
        return r.json()


async def _generate_and_compile(prompt: str, ea_name: str,
                                worker_url: str, key: str, max_retries: int = 3) -> tuple:
    """Generate .mq5 with Claude, compile on MT5 Worker. Auto-fix on failure."""
    mq5_code = _call_claude(prompt)

    for attempt in range(max_retries):
        result = await _compile(mq5_code, ea_name, worker_url, key)
        if result["success"]:
            return mq5_code, True

        # Send compile errors back to Claude to fix
        fix_prompt = f"""This MQL5 code has compile errors. Fix them.

Errors:
{result["errors"]}

Code:
{mq5_code}

Output ONLY the fixed .mq5 code. No explanation, no markdown fences."""
        mq5_code = _call_claude(fix_prompt)

    return mq5_code, False


async def run_optimise_loop(
    base_prompt: str,
    iterations: int = 5,
    symbol: str = "EURUSD",
    period: str = "H1",
    deposit: int = 100000,
    mt5_worker_url: str = None,
    mt5_worker_key: str = None,
    on_progress=None,  # async callback(iteration, total, result_dict)
) -> list:
    """
    Run the full optimize loop. Returns list of all iteration results.

    Args:
        base_prompt: Initial strategy description
        iterations: Number of optimization rounds
        symbol: Trading instrument
        period: Timeframe
        deposit: Backtest starting balance
        mt5_worker_url: URL of the MT5 Worker API
        mt5_worker_key: API key for MT5 Worker
        on_progress: Optional async callback for real-time updates

    Returns:
        List of dicts: [{ea_name, mq5_code, metrics, iteration}, ...]
    """
    worker_url = mt5_worker_url or os.getenv("MT5_WORKER_URL")
    key = mt5_worker_key or os.getenv("MT5_WORKER_KEY")

    if not worker_url:
        raise ValueError("MT5_WORKER_URL not set")

    results_history = []

    for i in range(iterations):
        ea_name = f"Optimised_v{i + 1}"

        # Build prompt
        if results_history:
            best = max(results_history, key=lambda x: x.get("metrics", {}).get("profit_factor", 0))
            best_metrics = best.get("metrics", {})
            best_code = best.get("mq5_code", "")

            prompt = f"""You are an expert MQL5 programmer. Improve this Expert Advisor.

Previous best results:
- Profit Factor: {best_metrics.get('profit_factor', 'N/A')}
- Net Profit: {best_metrics.get('net_profit', 'N/A')}
- Max Drawdown: {best_metrics.get('max_drawdown', 'N/A')}
- Total Trades: {best_metrics.get('total_trades', 'N/A')}
- Win Rate: {best_metrics.get('win_rate', 'N/A')}
- Sharpe Ratio: {best_metrics.get('sharpe', 'N/A')}

Previous best code:
```mql5
{best_code}
```

Improve this strategy to increase profit factor and reduce drawdown.
Target {symbol} {period}.

Output ONLY the raw .mq5 code. No explanation, no markdown fences."""
        else:
            prompt = base_prompt

        # Generate + compile (with auto-fix)
        mq5_code, compiled = await _generate_and_compile(
            prompt, ea_name, worker_url, key)

        if not compiled:
            entry = {"ea_name": ea_name, "iteration": i + 1,
                     "mq5_code": mq5_code, "metrics": {}, "status": "compile_failed"}
            results_history.append(entry)
            if on_progress:
                await on_progress(i + 1, iterations, entry)
            continue

        # Backtest
        bt_result = await _backtest(ea_name, symbol, period, worker_url, key, deposit)

        entry = {
            "ea_name": ea_name,
            "iteration": i + 1,
            "mq5_code": mq5_code,
            "metrics": bt_result.get("metrics", {}),
            "status": "success" if bt_result.get("success") else "backtest_failed",
        }
        results_history.append(entry)

        if on_progress:
            await on_progress(i + 1, iterations, entry)

    return results_history

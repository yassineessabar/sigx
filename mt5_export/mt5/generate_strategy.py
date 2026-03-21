import anthropic
import os

client = anthropic.Anthropic()  # Uses ANTHROPIC_API_KEY env var

STRATEGY_PROMPT = """
You are an expert MQL5 programmer. Generate a complete, compilable Expert Advisor (.mq5) file.

Strategy requirements:
- Name: TrendFollower_EA
- Instrument: EURUSD, H1 timeframe
- Entry: Buy when 20 EMA crosses above 50 EMA. Sell when below.
- Exit: ATR-based stop loss (1.5x ATR), take profit (3x ATR)
- Risk: 1% of account balance per trade
- Only 1 trade open at a time

Output ONLY the raw .mq5 code. No explanation, no markdown fences.
"""


def generate_strategy(prompt: str, strategy_name: str) -> str:
    print(f"Generating {strategy_name}...")

    message = client.messages.create(
        model="claude-sonnet-4-5-20250514",
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    )

    code = message.content[0].text

    os.makedirs("strategies", exist_ok=True)
    filepath = f"strategies/{strategy_name}.mq5"

    with open(filepath, "w") as f:
        f.write(code)

    print(f"Saved -> {filepath}")
    return filepath


if __name__ == "__main__":
    # Generate the main strategy
    generate_strategy(STRATEGY_PROMPT, "Strategy_001_TrendFollower")

    # Batch generation
    STRATEGIES = [
        ("Mean reversion using Bollinger Bands on EURUSD H1", "Strategy_002_MeanReversion"),
        ("RSI divergence strategy on GBPUSD H4", "Strategy_003_RSIDivergence"),
        ("Breakout strategy using Donchian channels on XAUUSD H1", "Strategy_004_Breakout"),
    ]

    for prompt_desc, name in STRATEGIES:
        full_prompt = (
            f"You are an expert MQL5 programmer. Generate a complete, compilable "
            f"Expert Advisor (.mq5) file for: {prompt_desc}.\n"
            f"Include proper risk management (1% per trade), ATR-based stops, "
            f"and only 1 trade open at a time.\n"
            f"Output ONLY the raw .mq5 code. No explanation, no markdown fences."
        )
        generate_strategy(full_prompt, name)

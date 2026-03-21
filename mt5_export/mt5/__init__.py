"""
MT5 AI Strategy Builder — webapp integration modules.

These modules run in YOUR backend (no MetaTrader needed):
- generate_strategy: Claude API → .mq5 code
- analyse_results: Parse MT5 .htm report → metrics dict
- parse_report: Full report parser with equity curve data
- optimise: Orchestrate generate → compile → backtest → improve loop
"""
from .generate_strategy import generate_strategy
from .analyse_results import parse_mt5_report

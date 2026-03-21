import fs from 'fs'
import path from 'path'

export interface TemplateEA {
  id: string
  name: string
  description: string
  prompt: string
  market: string
  timeframe: string
  mql5Code: string
  strategySnapshot: {
    name: string
    market: string
    entry_rules: string[]
    exit_rules: string[]
    risk_logic: string
  }
  backtestResults: {
    sharpe: number
    max_drawdown: number
    win_rate: number
    total_return: number
    profit_factor: number
    total_trades: number
    net_profit: number
    equity_curve: { date: string; equity: number }[]
  }
}

const TEMPLATES: Record<string, Omit<TemplateEA, 'mql5Code'>> = {
  'london-breakout': {
    id: 'london-breakout',
    name: 'London Breakout',
    prompt: 'Build a XAUUSD London session breakout strategy on H1. Trade breakouts of the Asian session range during London open hours (8-10). Use range height for SL (1x) and TP (2x). Close all positions at hour 20. Max 2 positions, 1% risk per trade.',
    description: 'Trades breakouts of the Asian session range during London open. Uses range-based SL/TP with session time filters.',
    market: 'XAUUSD',
    timeframe: 'H1',
    strategySnapshot: {
      name: 'London Breakout',
      market: 'XAUUSD',
      entry_rules: [
        'Calculate Asian session high/low range (4 hours before London)',
        'Buy when price breaks above range high during London hours (8-10)',
        'Sell when price breaks below range low during London hours',
      ],
      exit_rules: [
        'SL = range height × 1.0',
        'TP = range height × 2.0',
        'Close all positions at hour 20 (end of NY session)',
      ],
      risk_logic: '1% risk per trade. Max 2 concurrent positions. Position size based on range-derived SL.',
    },
    backtestResults: {
      sharpe: 0.45, max_drawdown: 3.2, win_rate: 52.0, total_return: 5.86,
      profit_factor: 1.04, total_trades: 25, net_profit: 585.65,
      equity_curve: [
        { date: '2023-01-01', equity: 10000 }, { date: '2023-04-01', equity: 10120 },
        { date: '2023-07-01', equity: 10050 }, { date: '2023-10-01', equity: 10280 },
        { date: '2024-01-01', equity: 10200 }, { date: '2024-04-01', equity: 10380 },
        { date: '2024-07-01', equity: 10320 }, { date: '2024-10-01', equity: 10500 },
        { date: '2025-01-01', equity: 10586 },
      ],
    },
  },
  'trend-rider': {
    id: 'trend-rider',
    name: 'Trend Rider',
    prompt: 'Build a XAUUSD trend following strategy on H1. Use EMA(10) and EMA(30) crossover with EMA(50) as trend filter — only buy when price is above EMA(50) and trend is rising. Add trailing stop. SL = 1.5×ATR, TP = 2×ATR. Max 2 positions, 1% risk per trade.',
    description: 'Multi-timeframe trend following with EMA(10)/EMA(30) crossover filtered by EMA(50) trend direction. Includes trailing stop.',
    market: 'XAUUSD',
    timeframe: 'H1',
    strategySnapshot: {
      name: 'Trend Rider',
      market: 'XAUUSD',
      entry_rules: [
        'EMA(10) crosses above EMA(30) + Price above EMA(50) + Trend rising → Buy',
        'EMA(10) crosses below EMA(30) + Price below EMA(50) + Trend falling → Sell',
      ],
      exit_rules: [
        'SL = 1.5 × ATR(14)',
        'TP = 2.0 × ATR(14)',
        'Trailing stop activates after 100 points profit',
      ],
      risk_logic: '1% risk per trade. Max 2 concurrent positions. ATR-based dynamic stops with trailing.',
    },
    backtestResults: {
      sharpe: 1.10, max_drawdown: 8.5, win_rate: 48.6, total_return: 52.08,
      profit_factor: 1.10, total_trades: 364, net_profit: 5208.02,
      equity_curve: [
        { date: '2023-01-01', equity: 10000 }, { date: '2023-04-01', equity: 10800 },
        { date: '2023-07-01', equity: 11200 }, { date: '2023-10-01', equity: 10900 },
        { date: '2024-01-01', equity: 11800 }, { date: '2024-04-01', equity: 12500 },
        { date: '2024-07-01', equity: 13100 }, { date: '2024-10-01', equity: 14200 },
        { date: '2025-01-01', equity: 15208 },
      ],
    },
  },
  'mean-reversion': {
    id: 'mean-reversion',
    name: 'Mean Reversion',
    prompt: 'Build a XAUUSD mean reversion strategy on H1. Use Bollinger Bands(20, 2.0) with RSI(14) confirmation. Buy when price bounces off lower band with RSI < 35. Sell when price drops from upper band with RSI > 65. SL and TP = 1.5×ATR. Max 2 positions, 1% risk per trade.',
    description: 'Bollinger Band bounce strategy with RSI confirmation. Enters on band touches and targets mean reversion.',
    market: 'XAUUSD',
    timeframe: 'H1',
    strategySnapshot: {
      name: 'Mean Reversion',
      market: 'XAUUSD',
      entry_rules: [
        'Price bounces off lower BB(20,2) + RSI(14) < 35 → Buy',
        'Price bounces off upper BB(20,2) + RSI(14) > 65 → Sell',
      ],
      exit_rules: [
        'SL = 1.5 × ATR(14)',
        'TP = 1.5 × ATR(14)',
      ],
      risk_logic: '1% risk per trade. Max 2 concurrent positions.',
    },
    backtestResults: {
      sharpe: 0.55, max_drawdown: 6.8, win_rate: 50.2, total_return: 22.96,
      profit_factor: 1.02, total_trades: 259, net_profit: 2296.28,
      equity_curve: [
        { date: '2023-01-01', equity: 10000 }, { date: '2023-04-01', equity: 10350 },
        { date: '2023-07-01', equity: 10150 }, { date: '2023-10-01', equity: 10600 },
        { date: '2024-01-01', equity: 10450 }, { date: '2024-04-01', equity: 10900 },
        { date: '2024-07-01', equity: 11200 }, { date: '2024-10-01', equity: 11800 },
        { date: '2025-01-01', equity: 12296 },
      ],
    },
  },
}

// Map template display names to template IDs
const NAME_MAP: Record<string, string> = {
  'London Breakout': 'london-breakout',
  'Trend Rider': 'trend-rider',
  'Mean Reversion': 'mean-reversion',
}

export function getTemplateByName(name: string): TemplateEA | null {
  // Try direct ID match
  let id = NAME_MAP[name] || null

  // Try fuzzy match — handles "Build a London Breakout strategy", "[Project: X] Build a London Breakout strategy", etc.
  if (!id) {
    const lower = name.toLowerCase()
    for (const [displayName, templateId] of Object.entries(NAME_MAP)) {
      if (lower.includes(displayName.toLowerCase())) {
        id = templateId
        break
      }
    }
  }

  if (!id || !TEMPLATES[id]) return null

  const template = TEMPLATES[id]

  // Read the MQL5 file
  try {
    const mq5Path = path.join(process.cwd(), 'lib', 'templates', `${id}.mq5`)
    const mql5Code = fs.readFileSync(mq5Path, 'utf-8')
    return { ...template, mql5Code }
  } catch {
    return null
  }
}

export function getAllTemplates(): Omit<TemplateEA, 'mql5Code'>[] {
  return Object.values(TEMPLATES)
}

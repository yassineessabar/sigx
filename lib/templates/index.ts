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
  backtestResults?: {
    sharpe: number
    max_drawdown: number
    win_rate: number
    total_return: number
    profit_factor: number
    total_trades: number
    net_profit: number
    equity_curve: { date: string; equity: number }[]
  } | null
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

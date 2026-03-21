import fs from 'fs'
import path from 'path'

export interface TemplateEA {
  id: string
  name: string
  description: string
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
}

const TEMPLATES: Record<string, Omit<TemplateEA, 'mql5Code'>> = {
  'london-breakout': {
    id: 'london-breakout',
    name: 'London Breakout',
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
  'scalper-pro': {
    id: 'scalper-pro',
    name: 'Scalper Pro',
    description: 'Fast EMA(8)/EMA(21) crossover scalping on M5 with RSI filter. Tight stops and quick profits.',
    market: 'XAUUSD',
    timeframe: 'M5',
    strategySnapshot: {
      name: 'Scalper Pro',
      market: 'XAUUSD',
      entry_rules: [
        'EMA(8) crosses above EMA(21) + RSI(7) not overbought → Buy',
        'EMA(8) crosses below EMA(21) + RSI(7) not oversold → Sell',
      ],
      exit_rules: [
        'SL = 150 points fixed',
        'TP = 100 points fixed (scalping ratio)',
      ],
      risk_logic: '0.5% risk per trade. Max 3 concurrent positions for scalping frequency.',
    },
  },
  'trend-rider': {
    id: 'trend-rider',
    name: 'Trend Rider',
    description: 'Multi-timeframe trend following with EMA(10)/EMA(30) crossover filtered by EMA(100) trend direction. Wide TP for riding trends.',
    market: 'XAUUSD',
    timeframe: 'H1',
    strategySnapshot: {
      name: 'Trend Rider',
      market: 'XAUUSD',
      entry_rules: [
        'EMA(10) crosses above EMA(30) + Price above EMA(100) → Buy (uptrend)',
        'EMA(10) crosses below EMA(30) + Price below EMA(100) → Sell (downtrend)',
      ],
      exit_rules: [
        'SL = 1.5 × ATR(14)',
        'TP = 3.0 × ATR(14) (wide target for trend riding)',
      ],
      risk_logic: '1% risk per trade. Max 2 concurrent positions. ATR-based dynamic stops.',
    },
  },
  'mean-reversion': {
    id: 'mean-reversion',
    name: 'Mean Reversion',
    description: 'Bollinger Band bounce strategy with RSI confirmation. Enters on band touches and targets mean reversion to middle band.',
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
        'TP = 1.5 × ATR(14) (mean reversion target)',
      ],
      risk_logic: '1% risk per trade. Max 2 concurrent positions.',
    },
  },
  'momentum-alpha': {
    id: 'momentum-alpha',
    name: 'Momentum Alpha',
    description: 'MACD crossover with EMA(50) trend filter. Captures momentum moves with ATR-based risk management.',
    market: 'XAUUSD',
    timeframe: 'H1',
    strategySnapshot: {
      name: 'Momentum Alpha',
      market: 'XAUUSD',
      entry_rules: [
        'MACD(12,26,9) crosses above signal + Price above EMA(50) → Buy',
        'MACD(12,26,9) crosses below signal + Price below EMA(50) → Sell',
      ],
      exit_rules: [
        'SL = 1.5 × ATR(14)',
        'TP = 2.5 × ATR(14)',
      ],
      risk_logic: '1% risk per trade. Max 2 concurrent positions.',
    },
  },
}

// Map template display names to template IDs
const NAME_MAP: Record<string, string> = {
  'London Breakout': 'london-breakout',
  'Scalper Pro': 'scalper-pro',
  'Trend Rider': 'trend-rider',
  'Mean Reversion': 'mean-reversion',
  'Momentum Alpha': 'momentum-alpha',
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

export interface Profile {
  id: string
  email: string
  full_name: string
  avatar_url: string | null
  plan: string
  settings: Record<string, unknown>
  bio: string | null
  location: string | null
  social_links: Record<string, string>
  show_email: boolean
  show_activity: boolean
  credits_balance: number
  cover_url: string | null
  seller_earnings_cents: number
  seller_pending_cents: number
  created_at: string
  updated_at: string
}

export interface Strategy {
  id: string
  user_id: string
  name: string
  description: string | null
  market: string
  timeframe: string
  status: 'draft' | 'backtested' | 'deployed' | 'archived'
  mql5_code: string | null
  strategy_summary: StrategySummary | null
  parameters: Record<string, unknown>
  tags: string[]
  is_public: boolean
  platform: 'mql4' | 'mql5'
  price_cents: number
  marketplace_approved: boolean
  seller_description: string | null
  version: number
  sharpe_ratio: number | null
  max_drawdown: number | null
  win_rate: number | null
  total_return: number | null
  created_at: string
  updated_at: string
}

export interface StrategySummary {
  entry_rules: string[]
  exit_rules: string[]
  risk_logic: string
}

export interface Chat {
  id: string
  user_id: string
  strategy_id: string | null
  title: string
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: string
  chat_id: string
  user_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  metadata: ChatMessageMetadata
  created_at: string
}

export interface ChatMessageMetadata {
  strategy_id?: string
  backtest_id?: string
  type?: 'strategy' | 'backtest' | 'code'
  strategy_snapshot?: {
    name: string
    market: string
    entry_rules: string[]
    exit_rules: string[]
    risk_logic: string
  }
  backtest_snapshot?: {
    sharpe: number
    max_drawdown: number
    win_rate: number
    total_return: number
    profit_factor: number
    total_trades: number
    net_profit?: number
    recovery_factor?: number
    equity_curve?: { date: string; equity: number }[]
  }
  mql5_code?: string
}

export interface Backtest {
  id: string
  strategy_id: string
  user_id: string
  chat_id: string | null
  status: 'pending' | 'running' | 'completed' | 'failed'
  start_date: string | null
  end_date: string | null
  initial_capital: number
  parameters: Record<string, unknown>
  created_at: string
  completed_at: string | null
}

export interface BacktestResult {
  id: string
  backtest_id: string
  user_id: string
  total_return: number | null
  sharpe_ratio: number | null
  sortino_ratio: number | null
  max_drawdown: number | null
  win_rate: number | null
  profit_factor: number | null
  total_trades: number | null
  winning_trades: number | null
  losing_trades: number | null
  avg_win: number | null
  avg_loss: number | null
  final_equity: number | null
  equity_curve: { date: string; equity: number }[] | null
  monthly_returns: Record<string, number> | null
  trade_log: unknown[] | null
  created_at: string
}

// ============================================================
// Extended types for migration_002
// ============================================================

// ProfileExtended removed — fields now on base Profile type

export interface Deployment {
  id: string
  user_id: string
  strategy_id: string
  status: 'running' | 'paused' | 'stopped'
  broker: string | null
  account_id: string | null
  lot_size: number
  pnl: number
  pnl_percent: number
  open_positions: number
  total_trades: number
  winning_trades: number
  losing_trades: number
  max_drawdown: number
  last_signal_at: string | null
  created_at: string
  updated_at: string
  strategy?: Strategy
}

export interface MarketplaceStrategy extends Strategy {
  author_name: string
  author_avatar: string | null
  copy_count: number
}

export interface StrategyCopy {
  id: string
  user_id: string
  strategy_id: string
  created_at: string
}

export interface UserIntegration {
  id: string
  user_id: string
  provider: string
  status: 'connected' | 'disconnected'
  config: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface SupportTicket {
  id: string
  user_id: string
  subject: string
  description: string | null
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  created_at: string
  updated_at: string
}

export interface GiftCard {
  id: string
  sender_id: string
  recipient_email: string
  recipient_name: string | null
  amount: number
  credits: number
  design: string
  message: string | null
  code: string
  status: 'pending' | 'sent' | 'redeemed'
  redeemed_by: string | null
  expires_at: string | null
  redeemed_at: string | null
  stripe_coupon_id: string | null
  stripe_promo_code: string | null
  created_at: string
}

export interface Referral {
  id: string
  referrer_id: string
  referred_email: string
  referred_user_id: string | null
  status: 'pending' | 'completed'
  referrer_credits_awarded: number
  referred_credits_awarded: number
  completed_at: string | null
  created_at: string
}

/**
 * SIGX Credit Cost Model
 *
 * 1 credit ≈ $0.01 of user spend
 * Costs are set at ~5x the actual API/compute cost for sustainable margins.
 *
 * Actual costs (Claude Sonnet 4: $3/1M input, $15/1M output):
 *   Chat message:        ~$0.07-0.13 API  → charge 8 credits ($0.08)  → ~5x margin at 50% utilization
 *   Backtest run:        ~$0.03 VPS       → charge 5 credits ($0.05)  → ~8x margin
 *   Auto-fix attempt:    ~$0.08 API       → charge 4 credits ($0.04)  → included in backtest
 *   Pipeline iteration:  ~$0.15 (AI+BT)   → charge 15 credits ($0.15) → ~5x at 50% util
 *   Optimize iteration:  ~$0.12 (AI+BT)   → charge 12 credits ($0.12) → ~5x at 50% util
 *
 * Target gross margins by plan (at ~50% credit utilization):
 *   Starter ($19/mo, 1,000 cr):  ~75% margin
 *   Builder ($49/mo, 3,000 cr):  ~78% margin
 *   Pro     ($99/mo, 8,000 cr):  ~80% margin
 *   Elite   ($199/mo, 20,000 cr): ~82% margin
 */

export const CREDIT_COSTS = {
  /** Single AI chat message (strategy generation, optimization, Q&A) */
  CHAT_MESSAGE: 8,

  /** Backtest run (compile + backtest on VPS) */
  BACKTEST: 5,

  /** Per-iteration cost for /run pipeline (AI generation + compile + backtest) */
  PIPELINE_ITERATION: 15,

  /** Per-iteration cost for /optimize route */
  OPTIMIZE_ITERATION: 12,

  /** Deploy to live/demo (free — drives engagement) */
  DEPLOY: 0,

  /** Marketplace strategy purchase uses price_cents directly */
} as const

/**
 * Plan definitions — single unified credit pool (no separate "backtest credits").
 *
 * Pricing philosophy:
 * - Credits are fungible: use for AI chat, backtests, pipelines, anything
 * - Higher plans get better $/credit rate (volume discount)
 * - Free tier is generous enough to hook users, stingy enough to convert
 */
export const PLANS = {
  free: {
    name: 'Free',
    monthly_price_cents: 0,
    yearly_price_cents: 0,
    credits: 50,
    description: '~6 AI messages or ~10 backtests',
  },
  starter: {
    name: 'Starter',
    monthly_price_cents: 1900,
    yearly_price_cents: 15200, // $12.67/mo
    credits: 1000,
    description: '~125 AI messages or ~200 backtests',
  },
  builder: {
    name: 'Builder',
    monthly_price_cents: 4900,
    yearly_price_cents: 39200, // $32.67/mo
    credits: 3000,
    description: '~375 AI messages or ~600 backtests',
  },
  pro: {
    name: 'Pro',
    monthly_price_cents: 9900,
    yearly_price_cents: 79200, // $66/mo
    credits: 8000,
    description: '~1,000 AI messages or ~1,600 backtests',
  },
  elite: {
    name: 'Elite',
    monthly_price_cents: 19900,
    yearly_price_cents: 159200, // $132.67/mo
    credits: 20000,
    description: '~2,500 AI messages or ~4,000 backtests',
  },
} as const

export type PlanId = keyof typeof PLANS

/**
 * Helper: deduct credits from a user's balance.
 * Returns { success, new_balance, error? }
 */
export async function deductCredits(
  supabaseAdmin: { from: (table: string) => any },
  userId: string,
  amount: number,
  operation: string
): Promise<{ success: boolean; new_balance: number; error?: string }> {
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('credits_balance')
    .eq('id', userId)
    .single()

  const balance = profile?.credits_balance ?? 0

  if (balance < amount) {
    return {
      success: false,
      new_balance: balance,
      error: `Insufficient credits. ${operation} costs ${amount} credits, you have ${balance}.`,
    }
  }

  const newBalance = balance - amount

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ credits_balance: newBalance })
    .eq('id', userId)

  if (error) {
    return { success: false, new_balance: balance, error: 'Failed to deduct credits' }
  }

  return { success: true, new_balance: newBalance }
}

/**
 * Helper: check if user can afford an operation (without deducting).
 */
export async function canAfford(
  supabaseAdmin: { from: (table: string) => any },
  userId: string,
  amount: number
): Promise<{ canAfford: boolean; balance: number }> {
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('credits_balance')
    .eq('id', userId)
    .single()

  const balance = profile?.credits_balance ?? 0
  return { canAfford: balance >= amount, balance }
}

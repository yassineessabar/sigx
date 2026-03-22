-- Migration 004: $10K Challenge submissions
-- One submission per user (upsert on user_id). Latest submission wins.

CREATE TABLE IF NOT EXISTS challenge_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  strategy_id UUID NOT NULL REFERENCES strategies(id) ON DELETE CASCADE,
  chat_id TEXT,
  metrics JSONB NOT NULL DEFAULT '{}',
  sharpe NUMERIC NOT NULL DEFAULT 0,
  max_drawdown NUMERIC NOT NULL DEFAULT 0,
  total_trades INTEGER NOT NULL DEFAULT 0,
  profit_factor NUMERIC NOT NULL DEFAULT 0,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE challenge_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own challenge submissions"
  ON challenge_submissions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own challenge submissions"
  ON challenge_submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own challenge submissions"
  ON challenge_submissions FOR UPDATE
  USING (auth.uid() = user_id);

-- Index for leaderboard queries (ranked by Sharpe desc)
CREATE INDEX IF NOT EXISTS idx_challenge_sharpe ON challenge_submissions (sharpe DESC);

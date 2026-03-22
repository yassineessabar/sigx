-- Migration 003: Strategy share rewards
-- Awards 20 credits per platform (once per platform per user).
-- Max 4 platforms × 20 = 80 credits total.

CREATE TABLE IF NOT EXISTS strategy_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  strategy_id UUID NOT NULL REFERENCES strategies(id) ON DELETE CASCADE,
  chat_id TEXT,
  platform TEXT NOT NULL DEFAULT 'link',
  credits_awarded INTEGER NOT NULL DEFAULT 20,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, platform)
);

ALTER TABLE strategy_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own strategy shares"
  ON strategy_shares FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own strategy shares"
  ON strategy_shares FOR INSERT
  WITH CHECK (auth.uid() = user_id);

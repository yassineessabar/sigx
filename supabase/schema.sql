-- ═══════════════════════════════════════════════════════════════
-- SIGX Database Schema
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1. PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  plan TEXT DEFAULT 'free',
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. STRATEGIES
CREATE TABLE IF NOT EXISTS public.strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  market TEXT DEFAULT 'XAUUSD',
  timeframe TEXT DEFAULT 'M5',
  status TEXT DEFAULT 'draft',
  mql5_code TEXT,
  strategy_summary JSONB,
  parameters JSONB DEFAULT '{}'::jsonb,
  tags TEXT[] DEFAULT '{}',
  is_public BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  sharpe_ratio NUMERIC,
  max_drawdown NUMERIC,
  win_rate NUMERIC,
  total_return NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "strategies_select_own" ON public.strategies FOR SELECT
  USING (auth.uid() = user_id OR is_public = true);
CREATE POLICY "strategies_insert_own" ON public.strategies FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "strategies_update_own" ON public.strategies FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "strategies_delete_own" ON public.strategies FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_strategies_user_id ON public.strategies(user_id);
CREATE INDEX IF NOT EXISTS idx_strategies_is_public ON public.strategies(is_public);

-- 3. CHATS
CREATE TABLE IF NOT EXISTS public.chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  strategy_id UUID REFERENCES public.strategies(id) ON DELETE SET NULL,
  title TEXT DEFAULT 'New Chat',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chats_select_own" ON public.chats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "chats_insert_own" ON public.chats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "chats_update_own" ON public.chats FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "chats_delete_own" ON public.chats FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_chats_user_id ON public.chats(user_id);

-- 4. CHAT_MESSAGES
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_select_own" ON public.chat_messages FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "messages_insert_own" ON public.chat_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id ON public.chat_messages(chat_id);

-- 5. BACKTESTS
CREATE TABLE IF NOT EXISTS public.backtests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id UUID NOT NULL REFERENCES public.strategies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_id UUID REFERENCES public.chats(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending',
  start_date TEXT,
  end_date TEXT,
  initial_capital NUMERIC DEFAULT 10000,
  parameters JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.backtests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "backtests_select_own" ON public.backtests FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "backtests_insert_own" ON public.backtests FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "backtests_update_own" ON public.backtests FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_backtests_strategy_id ON public.backtests(strategy_id);
CREATE INDEX IF NOT EXISTS idx_backtests_user_id ON public.backtests(user_id);

-- 6. BACKTEST_RESULTS
CREATE TABLE IF NOT EXISTS public.backtest_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backtest_id UUID NOT NULL REFERENCES public.backtests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_return NUMERIC,
  sharpe_ratio NUMERIC,
  sortino_ratio NUMERIC,
  max_drawdown NUMERIC,
  win_rate NUMERIC,
  profit_factor NUMERIC,
  total_trades INTEGER,
  winning_trades INTEGER,
  losing_trades INTEGER,
  avg_win NUMERIC,
  avg_loss NUMERIC,
  final_equity NUMERIC,
  equity_curve JSONB,
  monthly_returns JSONB,
  trade_log JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.backtest_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "results_select_own" ON public.backtest_results FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "results_insert_own" ON public.backtest_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_backtest_results_backtest_id ON public.backtest_results(backtest_id);

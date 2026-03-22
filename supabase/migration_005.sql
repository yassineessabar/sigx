-- Migration 005: Add equity_curve to strategies for card display
ALTER TABLE strategies ADD COLUMN IF NOT EXISTS equity_curve JSONB;

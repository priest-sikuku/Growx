-- Create trader_ratings table
CREATE TABLE IF NOT EXISTS trader_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rater_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rated_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  trade_id UUID NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(trade_id, rater_id)
);

-- Add reputation columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS completed_trades INT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_ratings INT DEFAULT 0;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_trader_ratings_rated_user ON trader_ratings(rated_user_id);
CREATE INDEX IF NOT EXISTS idx_trader_ratings_trade ON trader_ratings(trade_id);

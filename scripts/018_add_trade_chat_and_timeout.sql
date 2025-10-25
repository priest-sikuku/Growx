-- Create trade_messages table for chat
CREATE TABLE IF NOT EXISTS trade_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_trade_messages_trade_id ON trade_messages(trade_id);
CREATE INDEX IF NOT EXISTS idx_trade_messages_created_at ON trade_messages(created_at);

-- Add trade_opened_at column to track when trade was opened
ALTER TABLE trades ADD COLUMN IF NOT EXISTS trade_opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

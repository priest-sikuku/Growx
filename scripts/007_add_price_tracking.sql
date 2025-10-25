-- Create price history table to track ZiroX price over time
CREATE TABLE IF NOT EXISTS price_history (
  id BIGSERIAL PRIMARY KEY,
  price DECIMAL(10, 6) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for efficient time-based queries
CREATE INDEX IF NOT EXISTS idx_price_history_timestamp ON price_history(timestamp DESC);

-- Insert initial price (starting at $0.01)
INSERT INTO price_history (price, timestamp) VALUES (0.010000, NOW());

-- Create function to calculate price based on supply and demand
-- Price increases as more coins are claimed (scarcity model)
CREATE OR REPLACE FUNCTION calculate_zirox_price()
RETURNS DECIMAL(10, 6) AS $$
DECLARE
  total_claimed BIGINT;
  max_supply BIGINT := 200000;
  base_price DECIMAL(10, 6) := 0.010000;
  price_multiplier DECIMAL(10, 6);
BEGIN
  -- Get total claimed coins
  SELECT COALESCE(SUM(coins), 0) INTO total_claimed FROM profiles;
  
  -- Calculate price multiplier based on scarcity (0-100% of supply claimed)
  -- Price increases exponentially as supply decreases
  price_multiplier := 1 + (total_claimed::DECIMAL / max_supply) * 2;
  
  -- Add some randomness for realistic price movement (+/- 5%)
  price_multiplier := price_multiplier * (0.95 + (RANDOM() * 0.1));
  
  RETURN base_price * price_multiplier;
END;
$$ LANGUAGE plpgsql;

-- Create function to update price periodically
CREATE OR REPLACE FUNCTION update_zirox_price()
RETURNS void AS $$
DECLARE
  new_price DECIMAL(10, 6);
BEGIN
  new_price := calculate_zirox_price();
  INSERT INTO price_history (price, timestamp) VALUES (new_price, NOW());
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;

-- Allow all users to read price history
CREATE POLICY "Anyone can view price history"
  ON price_history FOR SELECT
  TO authenticated
  USING (true);

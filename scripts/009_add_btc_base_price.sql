-- Add BTC-based dynamic base price calculation
-- This replaces the hardcoded base price of 0.5 with a dynamic calculation based on Bitcoin price

-- Create a table to store BTC price reference data
CREATE TABLE IF NOT EXISTS btc_price_data (
  id INTEGER PRIMARY KEY DEFAULT 1,
  current_btc_price DECIMAL(15, 2) DEFAULT 8000000, -- Current BTC price in KES
  reference_btc_price DECIMAL(15, 2) DEFAULT 8000000, -- Reference BTC price in KES
  calculated_base_price DECIMAL(10, 6) DEFAULT 0.95, -- Calculated base price
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

-- Insert initial row
INSERT INTO btc_price_data (id, current_btc_price, reference_btc_price, calculated_base_price)
VALUES (1, 8000000, 8000000, 0.95)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE btc_price_data ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read BTC price data
CREATE POLICY "Anyone can read BTC price data"
  ON btc_price_data FOR SELECT
  TO authenticated
  USING (true);

-- Update the price calculation function to use dynamic base price
CREATE OR REPLACE FUNCTION calculate_zirox_price()
RETURNS DECIMAL(10, 6) AS $$
DECLARE
  total_claimed BIGINT;
  active_users BIGINT;
  max_supply BIGINT := 200000;
  base_price DECIMAL(10, 6);
  calculated_price DECIMAL(10, 6);
BEGIN
  -- Get the dynamic base price from btc_price_data
  SELECT calculated_base_price INTO base_price FROM btc_price_data WHERE id = 1;
  
  -- Fallback to 0.95 if not found
  IF base_price IS NULL THEN
    base_price := 0.95;
  END IF;
  
  -- Get total claimed coins from global_stats
  SELECT COALESCE(total_claimed, 0) INTO total_claimed FROM global_stats WHERE id = 1;
  
  -- Get count of active users (users who have claimed at least once)
  SELECT COUNT(*) INTO active_users 
  FROM profiles 
  WHERE last_claim_time IS NOT NULL;
  
  -- Apply the formula: Price = base_price * (1 + 0.002 * active_users) + (total_claimed / 200000)
  calculated_price := base_price * (1 + 0.002 * active_users) + (total_claimed::DECIMAL / max_supply);
  
  RETURN calculated_price;
END;
$$ LANGUAGE plpgsql;

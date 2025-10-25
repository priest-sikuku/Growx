-- Create table to track BTC price and calculate base price from % change
CREATE TABLE IF NOT EXISTS btc_price_tracking (
  id SERIAL PRIMARY KEY,
  btc_price_usd DECIMAL(20, 2) NOT NULL,
  reference_btc_price DECIMAL(20, 2) NOT NULL,
  percent_change DECIMAL(10, 4) NOT NULL,
  base_price DECIMAL(10, 4) NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_btc_tracking_timestamp ON btc_price_tracking(timestamp DESC);

-- Insert initial reference price (current BTC price as starting point)
-- This will be updated by the application
INSERT INTO btc_price_tracking (btc_price_usd, reference_btc_price, percent_change, base_price)
VALUES (100000.00, 100000.00, 0.00, 2.80)
ON CONFLICT DO NOTHING;

-- Function to calculate and update base price based on BTC % change
CREATE OR REPLACE FUNCTION update_btc_base_price(
  p_current_btc_price DECIMAL
) RETURNS TABLE(
  new_base_price DECIMAL,
  percent_change DECIMAL
) AS $$
DECLARE
  v_reference_price DECIMAL;
  v_percent_change DECIMAL;
  v_base_price DECIMAL;
BEGIN
  -- Get the reference BTC price (first entry or most recent reference)
  SELECT reference_btc_price INTO v_reference_price
  FROM btc_price_tracking
  ORDER BY id ASC
  LIMIT 1;

  -- If no reference exists, use current price as reference
  IF v_reference_price IS NULL THEN
    v_reference_price := p_current_btc_price;
  END IF;

  -- Calculate percentage change
  v_percent_change := ((p_current_btc_price - v_reference_price) / v_reference_price) * 100;

  -- Calculate base price: 2.8 * (1 + percent_change / 100)
  -- This means if BTC goes up 10%, base price = 2.8 * 1.10 = 3.08
  -- If BTC goes down 10%, base price = 2.8 * 0.90 = 2.52
  v_base_price := 2.8 * (1 + v_percent_change / 100);

  -- Ensure base price doesn't go below 0.5 or above 20
  v_base_price := GREATEST(0.5, LEAST(20, v_base_price));

  -- Insert new tracking record
  INSERT INTO btc_price_tracking (
    btc_price_usd,
    reference_btc_price,
    percent_change,
    base_price,
    timestamp
  ) VALUES (
    p_current_btc_price,
    v_reference_price,
    v_percent_change,
    v_base_price,
    NOW()
  );

  -- Return the calculated values
  RETURN QUERY SELECT v_base_price, v_percent_change;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE btc_price_tracking ENABLE ROW LEVEL SECURITY;

-- Allow all users to read BTC price data
CREATE POLICY "Allow public read access to BTC price tracking"
  ON btc_price_tracking FOR SELECT
  TO public
  USING (true);

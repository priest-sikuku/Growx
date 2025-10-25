-- Update the price calculation function to use the new formula:
-- Price = Base price * (1 + 0.002 * active users) + (claimed ziroX ÷ 200,000)
-- Where Base price = 0.5

CREATE OR REPLACE FUNCTION calculate_zirox_price()
RETURNS DECIMAL(10, 6) AS $$
DECLARE
  total_claimed BIGINT;
  active_users BIGINT;
  max_supply BIGINT := 200000;
  base_price DECIMAL(10, 6) := 0.5;
  calculated_price DECIMAL(10, 6);
BEGIN
  -- Get total claimed coins from global_stats
  SELECT COALESCE(total_claimed, 0) INTO total_claimed FROM global_stats WHERE id = 1;
  
  -- Get count of active users (users who have claimed at least once)
  -- Active users are those with last_claim_time not null
  SELECT COUNT(*) INTO active_users 
  FROM profiles 
  WHERE last_claim_time IS NOT NULL;
  
  -- Apply the formula: Price = 0.5 * (1 + 0.002 * active_users) + (total_claimed / 200000)
  calculated_price := base_price * (1 + 0.002 * active_users) + (total_claimed::DECIMAL / max_supply);
  
  RETURN calculated_price;
END;
$$ LANGUAGE plpgsql;

-- The update_zirox_price function remains the same
-- It calls calculate_zirox_price and stores the result

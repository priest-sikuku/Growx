-- Create table to store daily prices for the last 7 days
CREATE TABLE IF NOT EXISTS daily_prices (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  price DECIMAL(10, 6) NOT NULL,
  day_date DATE NOT NULL UNIQUE,
  day_type VARCHAR(10) NOT NULL, -- 'green' or 'red'
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create table to store weekly configuration
CREATE TABLE IF NOT EXISTS weekly_config (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  week_start_date DATE NOT NULL UNIQUE,
  green_days INTEGER[] NOT NULL, -- Array of day numbers (0-6) that are green
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_daily_prices_date ON daily_prices(day_date DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_config_date ON weekly_config(week_start_date DESC);

-- Enable RLS
ALTER TABLE daily_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_config ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Anyone can read daily prices"
ON daily_prices FOR SELECT
USING (true);

CREATE POLICY "Anyone can read weekly config"
ON weekly_config FOR SELECT
USING (true);

-- Function to get or create weekly configuration
CREATE OR REPLACE FUNCTION get_or_create_weekly_config()
RETURNS INTEGER[] AS $$
DECLARE
  v_week_start DATE;
  v_green_days INTEGER[];
  v_config_exists BOOLEAN;
  v_attempt INT := 0;
  v_max_attempts INT := 100;
  v_consecutive_count INT := 0;
  v_last_day INT := -1;
  v_green_count INT := 0;
  v_day INT;
BEGIN
  -- Get the start of the current week (Monday)
  v_week_start := CURRENT_DATE - ((EXTRACT(DOW FROM CURRENT_DATE)::INT + 6) % 7);
  
  -- Check if config already exists for this week
  SELECT green_days INTO v_green_days FROM weekly_config 
  WHERE week_start_date = v_week_start;
  
  IF v_green_days IS NOT NULL THEN
    RETURN v_green_days;
  END IF;
  
  -- Generate random green days (5 out of 7, not consecutive for more than 3 days)
  v_green_days := ARRAY[]::INTEGER[];
  v_attempt := 0;
  
  WHILE v_green_count < 5 AND v_attempt < v_max_attempts LOOP
    v_day := FLOOR(RANDOM() * 7)::INT;
    
    -- Check if day is already in array
    IF NOT v_day = ANY(v_green_days) THEN
      -- Check consecutive constraint
      v_consecutive_count := 1;
      
      -- Count consecutive days before
      IF v_day > 0 AND (v_day - 1) = ANY(v_green_days) THEN
        v_consecutive_count := v_consecutive_count + 1;
      END IF;
      
      -- Count consecutive days after
      IF v_day < 6 AND (v_day + 1) = ANY(v_green_days) THEN
        v_consecutive_count := v_consecutive_count + 1;
      END IF;
      
      -- Only add if it doesn't create more than 3 consecutive days
      IF v_consecutive_count <= 3 THEN
        v_green_days := array_append(v_green_days, v_day);
        v_green_count := v_green_count + 1;
      END IF;
    END IF;
    
    v_attempt := v_attempt + 1;
  END LOOP;
  
  -- Insert the new configuration
  INSERT INTO weekly_config (week_start_date, green_days)
  VALUES (v_week_start, v_green_days)
  ON CONFLICT (week_start_date) DO NOTHING;
  
  RETURN v_green_days;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate daily price change
CREATE OR REPLACE FUNCTION calculate_daily_price_change(
  p_base_price DECIMAL,
  p_is_green_day BOOLEAN
)
RETURNS DECIMAL AS $$
DECLARE
  v_change_percent DECIMAL;
  v_micro_fluctuation DECIMAL;
BEGIN
  IF p_is_green_day THEN
    -- Green day: +0.5% to +3%
    v_change_percent := 0.5 + (RANDOM() * 2.5);
  ELSE
    -- Red day: -0.3% to -2%
    v_change_percent := -0.3 - (RANDOM() * 1.7);
  END IF;
  
  -- Add hourly micro-fluctuations (±0.05%)
  v_micro_fluctuation := (RANDOM() - 0.5) * 0.1;
  
  RETURN p_base_price * (1 + (v_change_percent + v_micro_fluctuation) / 100);
END;
$$ LANGUAGE plpgsql;

-- Function to get today's price
CREATE OR REPLACE FUNCTION get_todays_price(p_base_price DECIMAL)
RETURNS TABLE(price DECIMAL, day_type VARCHAR, is_green BOOLEAN) AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_green_days INTEGER[];
  v_day_of_week INT;
  v_is_green BOOLEAN;
  v_yesterday_price DECIMAL;
  v_new_price DECIMAL;
  v_existing_price DECIMAL;
BEGIN
  -- Get weekly green days configuration
  v_green_days := get_or_create_weekly_config();
  
  -- Get day of week (0 = Sunday, 1 = Monday, etc.)
  v_day_of_week := EXTRACT(DOW FROM v_today)::INT;
  
  -- Check if today is a green day
  v_is_green := v_day_of_week = ANY(v_green_days);
  
  -- Check if price already exists for today
  SELECT price INTO v_existing_price FROM daily_prices 
  WHERE day_date = v_today;
  
  IF v_existing_price IS NOT NULL THEN
    RETURN QUERY SELECT v_existing_price, (CASE WHEN v_is_green THEN 'green' ELSE 'red' END), v_is_green;
    RETURN;
  END IF;
  
  -- Get yesterday's price
  SELECT price INTO v_yesterday_price FROM daily_prices 
  WHERE day_date = v_today - INTERVAL '1 day';
  
  -- If no yesterday price, use base price
  IF v_yesterday_price IS NULL THEN
    v_yesterday_price := p_base_price;
  END IF;
  
  -- Calculate today's price
  v_new_price := calculate_daily_price_change(v_yesterday_price, v_is_green);
  
  -- Insert today's price
  INSERT INTO daily_prices (price, day_date, day_type)
  VALUES (v_new_price, v_today, CASE WHEN v_is_green THEN 'green' ELSE 'red' END)
  ON CONFLICT (day_date) DO NOTHING;
  
  RETURN QUERY SELECT v_new_price, (CASE WHEN v_is_green THEN 'green' ELSE 'red' END), v_is_green;
END;
$$ LANGUAGE plpgsql;

-- Function to get 7-day average price
CREATE OR REPLACE FUNCTION get_seven_day_average_price()
RETURNS DECIMAL AS $$
DECLARE
  v_avg_price DECIMAL;
BEGIN
  SELECT AVG(price) INTO v_avg_price FROM daily_prices 
  WHERE day_date >= CURRENT_DATE - INTERVAL '7 days';
  
  -- Default to 1.00 KES if no data
  RETURN COALESCE(v_avg_price, 1.00);
END;
$$ LANGUAGE plpgsql;

-- Function to get weekly trend
CREATE OR REPLACE FUNCTION get_weekly_trend()
RETURNS TABLE(green_count INT, red_count INT, trend_arrow VARCHAR) AS $$
DECLARE
  v_green_count INT;
  v_red_count INT;
BEGIN
  SELECT COUNT(*) INTO v_green_count FROM daily_prices 
  WHERE day_date >= CURRENT_DATE - INTERVAL '7 days' AND day_type = 'green';
  
  SELECT COUNT(*) INTO v_red_count FROM daily_prices 
  WHERE day_date >= CURRENT_DATE - INTERVAL '7 days' AND day_type = 'red';
  
  RETURN QUERY SELECT v_green_count, v_red_count, 
    (CASE WHEN v_green_count >= 4 THEN '↑' ELSE '↓' END);
END;
$$ LANGUAGE plpgsql;

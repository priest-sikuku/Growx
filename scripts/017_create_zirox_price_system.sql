-- Create table to store ZiroX price history
CREATE TABLE IF NOT EXISTS zirox_price_history (
  id BIGSERIAL PRIMARY KEY,
  price DECIMAL(10, 4) NOT NULL,
  change_percent DECIMAL(5, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_zirox_price_created_at ON zirox_price_history(created_at DESC);

-- Create table to store daily price snapshots for 2% average calculation
CREATE TABLE IF NOT EXISTS zirox_daily_prices (
  id BIGSERIAL PRIMARY KEY,
  date DATE UNIQUE NOT NULL,
  opening_price DECIMAL(10, 4) NOT NULL,
  closing_price DECIMAL(10, 4) NOT NULL,
  daily_change_percent DECIMAL(5, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert initial price if not exists
INSERT INTO zirox_price_history (price, change_percent)
SELECT 1.0, 0
WHERE NOT EXISTS (SELECT 1 FROM zirox_price_history);

-- Insert initial daily price if not exists
INSERT INTO zirox_daily_prices (date, opening_price, closing_price, daily_change_percent)
SELECT CURRENT_DATE, 1.0, 1.0, 0
WHERE NOT EXISTS (SELECT 1 FROM zirox_daily_prices WHERE date = CURRENT_DATE);

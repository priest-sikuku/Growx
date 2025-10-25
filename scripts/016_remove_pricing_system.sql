-- Drop pricing-related tables and functions
DROP TABLE IF EXISTS daily_prices CASCADE;
DROP TABLE IF EXISTS weekly_config CASCADE;
DROP TABLE IF EXISTS price_history CASCADE;
DROP FUNCTION IF EXISTS get_or_create_weekly_config() CASCADE;
DROP FUNCTION IF EXISTS calculate_zirox_price() CASCADE;
DROP FUNCTION IF EXISTS update_zirox_price() CASCADE;

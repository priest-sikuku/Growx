-- =====================================================
-- Script 103: Create Price Management RPC Functions
-- =====================================================
-- Purpose: Create the price management functions that are called from the frontend
-- These functions handle automatic price updates and manual price triggers

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_current_gx_price_with_auto_update();
DROP FUNCTION IF EXISTS manual_price_update();

-- =====================================================
-- Function: get_current_gx_price_with_auto_update
-- =====================================================
-- Returns current price and auto-updates if stale (>5 minutes old)
CREATE OR REPLACE FUNCTION get_current_gx_price_with_auto_update()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_price RECORD;
  v_needs_update BOOLEAN;
  v_result JSON;
BEGIN
  -- Get current price data
  SELECT * INTO v_current_price
  FROM gx_current_price
  LIMIT 1;

  -- Check if update is needed (>5 minutes old)
  v_needs_update := (
    v_current_price.updated_at IS NULL OR
    v_current_price.updated_at < NOW() - INTERVAL '5 minutes'
  );

  -- If needs update, trigger the API route (note: this just returns the data, actual update happens in API)
  -- The API route will handle the complex price calculation

  -- Return current data
  v_result := json_build_object(
    'price', COALESCE(v_current_price.price, 16.00),
    'previous_price', COALESCE(v_current_price.previous_price, 16.00),
    'change_percent', COALESCE(v_current_price.change_percent, 0.00),
    'volatility_factor', COALESCE(v_current_price.volatility_factor, 0.02),
    'last_updated', v_current_price.updated_at,
    'needs_update', v_needs_update
  );

  RETURN v_result;
END;
$$;

-- =====================================================
-- Function: manual_price_update
-- =====================================================
-- Manually triggers a price update (calls the API route logic)
CREATE OR REPLACE FUNCTION manual_price_update()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_price NUMERIC;
  v_new_price NUMERIC;
  v_result JSON;
BEGIN
  -- Get current price
  SELECT price INTO v_old_price
  FROM gx_current_price
  LIMIT 1;

  -- Note: The actual price calculation happens in the API route
  -- This function just marks that an update was requested
  -- and returns the current state

  -- Update the timestamp to trigger recalculation
  UPDATE gx_current_price
  SET updated_at = NOW() - INTERVAL '10 minutes' -- Force it to be stale
  WHERE id = (SELECT id FROM gx_current_price LIMIT 1);

  v_result := json_build_object(
    'success', true,
    'message', 'Price update triggered. Call /api/gx-price to get new price.',
    'old_price', v_old_price,
    'new_price', NULL
  );

  RETURN v_result;
END;
$$;

-- =====================================================
-- Grant permissions
-- =====================================================
GRANT EXECUTE ON FUNCTION get_current_gx_price_with_auto_update() TO authenticated;
GRANT EXECUTE ON FUNCTION manual_price_update() TO authenticated;

-- =====================================================
-- Verification
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Script 103 completed successfully';
  RAISE NOTICE '✅ Created get_current_gx_price_with_auto_update() function';
  RAISE NOTICE '✅ Created manual_price_update() function';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Note: These functions work in conjunction with /api/gx-price route';
  RAISE NOTICE '📝 The API route handles the actual price calculation logic';
END $$;

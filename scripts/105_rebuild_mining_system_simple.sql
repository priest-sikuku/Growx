-- =====================================================
-- MINING SYSTEM REBUILD - Simple & Secure
-- =====================================================
-- This script creates a clean, reliable mining system
-- that properly tracks user mining with 3-hour intervals
-- =====================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS process_mining_claim(uuid, numeric);

-- Create the mining claim function
CREATE OR REPLACE FUNCTION process_mining_claim(
  p_user_id UUID,
  p_reward_amount NUMERIC DEFAULT 2.5
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  new_balance NUMERIC,
  next_mine_time TIMESTAMPTZ
) AS $$
DECLARE
  v_current_time TIMESTAMPTZ := NOW();
  v_next_mine_time TIMESTAMPTZ;
  v_last_mined_time TIMESTAMPTZ;
  v_remaining_supply NUMERIC;
  v_new_balance NUMERIC;
BEGIN
  -- Check if user exists
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
    RETURN QUERY SELECT FALSE, 'User not found'::TEXT, 0::NUMERIC, v_current_time;
    RETURN;
  END IF;

  -- Get user's last mining time
  SELECT next_mine_at INTO v_next_mine_time
  FROM profiles
  WHERE id = p_user_id;

  -- Check if user can mine (next_mine_at is NULL or in the past)
  IF v_next_mine_time IS NOT NULL AND v_next_mine_time > v_current_time THEN
    RETURN QUERY SELECT 
      FALSE, 
      'Mining not available yet. Please wait.'::TEXT, 
      0::NUMERIC, 
      v_next_mine_time;
    RETURN;
  END IF;

  -- Check remaining supply
  SELECT remaining_supply INTO v_remaining_supply
  FROM supply_tracking
  LIMIT 1;

  IF v_remaining_supply < p_reward_amount THEN
    RETURN QUERY SELECT 
      FALSE, 
      'Maximum supply reached. Mining halted.'::TEXT, 
      0::NUMERIC, 
      v_current_time;
    RETURN;
  END IF;

  -- Calculate next mine time (3 hours from now)
  v_next_mine_time := v_current_time + INTERVAL '3 hours';

  -- Update user profile
  UPDATE profiles
  SET 
    last_mined_at = v_current_time,
    next_mine_at = v_next_mine_time,
    total_mined = COALESCE(total_mined, 0) + p_reward_amount,
    mining_streak = COALESCE(mining_streak, 0) + 1,
    updated_at = v_current_time
  WHERE id = p_user_id;

  -- Add coins to user's balance
  INSERT INTO coins (user_id, amount, status, claim_type, created_at, updated_at)
  VALUES (p_user_id, p_reward_amount, 'available', 'mining', v_current_time, v_current_time);

  -- Record transaction
  INSERT INTO transactions (user_id, type, amount, description, status, created_at)
  VALUES (
    p_user_id, 
    'mine', 
    p_reward_amount, 
    'Mining reward claimed', 
    'completed', 
    v_current_time
  );

  -- Update supply tracking
  UPDATE supply_tracking
  SET 
    mined_supply = COALESCE(mined_supply, 0) + p_reward_amount,
    remaining_supply = COALESCE(remaining_supply, total_supply) - p_reward_amount,
    last_updated = v_current_time;

  -- Calculate new balance
  SELECT COALESCE(SUM(amount), 0) INTO v_new_balance
  FROM coins
  WHERE user_id = p_user_id AND status IN ('available', 'active');

  -- Return success
  RETURN QUERY SELECT 
    TRUE, 
    'Mining successful! Reward claimed.'::TEXT, 
    v_new_balance, 
    v_next_mine_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION process_mining_claim(UUID, NUMERIC) TO authenticated;

-- Ensure supply_tracking table exists and has data
INSERT INTO supply_tracking (id, total_supply, mined_supply, remaining_supply, last_updated)
VALUES (
  gen_random_uuid(),
  300000,
  0,
  300000,
  NOW()
)
ON CONFLICT DO NOTHING;

-- Update existing profiles to have proper mining fields
UPDATE profiles
SET 
  next_mine_at = NULL,
  last_mined_at = NULL,
  total_mined = COALESCE(total_mined, 0),
  mining_streak = COALESCE(mining_streak, 0)
WHERE next_mine_at IS NULL OR last_mined_at IS NULL;

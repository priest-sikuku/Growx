-- Fix the process_mining_claim function to ensure it always returns a result

-- Drop and recreate the function with better error handling
DROP FUNCTION IF EXISTS process_mining_claim(UUID, NUMERIC);

CREATE OR REPLACE FUNCTION process_mining_claim(
  p_user_id UUID,
  p_reward_amount NUMERIC DEFAULT 2.5
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  next_claim_time TIMESTAMPTZ
) AS $$
DECLARE
  v_can_claim BOOLEAN;
  v_next_claim TIMESTAMPTZ;
  v_current_supply NUMERIC;
  v_remaining_supply NUMERIC;
BEGIN
  -- Log the attempt
  RAISE NOTICE 'Mining claim attempt for user: %, reward: %', p_user_id, p_reward_amount;
  
  -- Check if user exists
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
    RETURN QUERY SELECT 
      FALSE,
      'User profile not found. Please contact support.'::TEXT,
      NULL::TIMESTAMPTZ;
    RETURN;
  END IF;
  
  -- Validate if user can claim
  v_can_claim := validate_mining_claim(p_user_id);
  
  IF NOT v_can_claim THEN
    RETURN QUERY SELECT 
      FALSE,
      'Mining not available yet. Please wait for the countdown to finish.'::TEXT,
      (SELECT next_claim_time FROM profiles WHERE id = p_user_id);
    RETURN;
  END IF;
  
  -- Check supply (if supply_tracking table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'supply_tracking') THEN
    SELECT remaining_supply INTO v_remaining_supply
    FROM supply_tracking
    LIMIT 1;
    
    IF v_remaining_supply IS NOT NULL AND v_remaining_supply < p_reward_amount THEN
      RETURN QUERY SELECT 
        FALSE,
        'Mining halted: Maximum supply reached!'::TEXT,
        NULL::TIMESTAMPTZ;
      RETURN;
    END IF;
  END IF;
  
  -- Calculate next claim time (3 hours from now)
  v_next_claim := NOW() + INTERVAL '3 hours';
  
  -- Update profile with new claim times
  UPDATE profiles
  SET 
    last_claim_time = NOW(),
    next_claim_time = v_next_claim,
    last_mined_at = NOW(),
    next_mine_at = v_next_claim,
    total_mined = COALESCE(total_mined, 0) + p_reward_amount,
    mining_streak = COALESCE(mining_streak, 0) + 1
  WHERE id = p_user_id;
  
  -- Insert coin record
  INSERT INTO coins (user_id, amount, claim_type, status)
  VALUES (p_user_id, p_reward_amount, 'mining', 'available');
  
  -- Insert transaction record
  INSERT INTO transactions (user_id, type, amount, description, status)
  VALUES (p_user_id, 'mining', p_reward_amount, 'Mining reward', 'completed');
  
  -- Update supply tracking if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'supply_tracking') THEN
    UPDATE supply_tracking
    SET 
      remaining_supply = remaining_supply - p_reward_amount,
      total_mined = total_mined + p_reward_amount,
      updated_at = NOW();
  END IF;
  
  -- Return success
  RETURN QUERY SELECT 
    TRUE,
    'Mining successful! You earned ' || p_reward_amount || ' GX'::TEXT,
    v_next_claim;
    
  RAISE NOTICE 'Mining claim successful for user: %', p_user_id;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error
    RAISE NOTICE 'Mining claim error for user %: %', p_user_id, SQLERRM;
    
    -- Return error result
    RETURN QUERY SELECT 
      FALSE,
      'Mining failed: ' || SQLERRM::TEXT,
      NULL::TIMESTAMPTZ;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION process_mining_claim(UUID, NUMERIC) TO authenticated;

-- Test the function (optional - comment out if not needed)
-- SELECT * FROM process_mining_claim('00000000-0000-0000-0000-000000000000'::UUID, 2.5);

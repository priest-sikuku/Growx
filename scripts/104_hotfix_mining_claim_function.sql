-- Hotfix: Recreate process_mining_claim RPC function
-- This fixes the "column total_mined does not exist" error

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS process_mining_claim(uuid, numeric);

-- Create the mining claim function with correct column references
CREATE OR REPLACE FUNCTION process_mining_claim(
  p_user_id UUID,
  p_amount NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_supply NUMERIC;
  v_remaining_supply NUMERIC;
  v_max_supply NUMERIC := 21000000;
  v_user_max_supply NUMERIC;
  v_user_total_mined NUMERIC;
  v_next_claim_time TIMESTAMPTZ;
  v_result JSON;
BEGIN
  -- Check supply tracking
  SELECT remaining_supply, mined_supply 
  INTO v_remaining_supply, v_current_supply
  FROM supply_tracking 
  WHERE id = '00000000-0000-0000-0000-000000000001'
  FOR UPDATE;

  -- Validate supply exists
  IF v_remaining_supply IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Supply tracking not initialized'
    );
  END IF;

  -- Check if enough supply remains
  IF v_remaining_supply < p_amount THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Insufficient remaining supply'
    );
  END IF;

  -- Get user's current mining stats
  SELECT 
    COALESCE(total_mined, 0),
    COALESCE(max_supply_limit, 100000)
  INTO v_user_total_mined, v_user_max_supply
  FROM profiles
  WHERE id = p_user_id;

  -- Check if user has reached their max supply limit
  IF (v_user_total_mined + p_amount) > v_user_max_supply THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User max supply limit reached'
    );
  END IF;

  -- Calculate next claim time (24 hours from now)
  v_next_claim_time := NOW() + INTERVAL '24 hours';

  -- Update supply tracking
  UPDATE supply_tracking
  SET 
    mined_supply = mined_supply + p_amount,
    remaining_supply = remaining_supply - p_amount,
    last_updated = NOW()
  WHERE id = '00000000-0000-0000-0000-000000000001';

  -- Update user profile with mining stats
  UPDATE profiles
  SET 
    total_mined = COALESCE(total_mined, 0) + p_amount,
    last_claim_time = NOW(),
    next_claim_time = v_next_claim_time,
    last_mined_at = NOW(),
    next_mine_at = v_next_claim_time,
    mining_streak = COALESCE(mining_streak, 0) + 1,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Add coins to user's balance
  INSERT INTO coins (
    id,
    user_id,
    amount,
    status,
    claim_type,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    p_user_id,
    p_amount,
    'available',
    'mining',
    NOW(),
    NOW()
  );

  -- Record transaction
  INSERT INTO transactions (
    id,
    user_id,
    type,
    amount,
    description,
    status,
    created_at
  ) VALUES (
    gen_random_uuid(),
    p_user_id,
    'mining',
    p_amount,
    'Mining claim reward',
    'completed',
    NOW()
  );

  -- Build success response
  v_result := json_build_object(
    'success', true,
    'amount', p_amount,
    'next_claim_time', v_next_claim_time,
    'total_mined', v_user_total_mined + p_amount,
    'remaining_supply', v_remaining_supply - p_amount
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION process_mining_claim(UUID, NUMERIC) TO authenticated;

-- Verify the function was created
DO $$
BEGIN
  RAISE NOTICE 'Mining claim function recreated successfully';
END $$;

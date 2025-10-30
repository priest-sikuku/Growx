-- Update mining system for 3-hour circular countdown with persistent state

-- Ensure profiles table has the necessary columns
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS last_claim_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS next_claim_time TIMESTAMPTZ;

-- Update existing records to use next_mine_at as next_claim_time if not set
UPDATE profiles 
SET 
  last_claim_time = last_mined_at,
  next_claim_time = next_mine_at
WHERE next_claim_time IS NULL;

-- Create function to validate mining claims (prevent abuse)
CREATE OR REPLACE FUNCTION validate_mining_claim(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_next_claim_time TIMESTAMPTZ;
BEGIN
  -- Get the user's next claim time
  SELECT next_claim_time INTO v_next_claim_time
  FROM profiles
  WHERE id = p_user_id;
  
  -- If no next claim time set, allow claim
  IF v_next_claim_time IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Check if current time is past next claim time
  IF NOW() >= v_next_claim_time THEN
    RETURN TRUE;
  END IF;
  
  -- Otherwise, claim is not allowed
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to process mining claim
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
BEGIN
  -- Validate if user can claim
  v_can_claim := validate_mining_claim(p_user_id);
  
  IF NOT v_can_claim THEN
    RETURN QUERY SELECT 
      FALSE,
      'Mining not available yet. Please wait for the countdown to finish.'::TEXT,
      (SELECT next_claim_time FROM profiles WHERE id = p_user_id);
    RETURN;
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
  
  -- Return success
  RETURN QUERY SELECT 
    TRUE,
    'Mining successful! You earned ' || p_reward_amount || ' GX'::TEXT,
    v_next_claim;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get mining status
CREATE OR REPLACE FUNCTION get_mining_status(p_user_id UUID)
RETURNS TABLE(
  can_mine BOOLEAN,
  seconds_remaining INTEGER,
  next_claim_time TIMESTAMPTZ,
  last_claim_time TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN p.next_claim_time IS NULL THEN TRUE
      WHEN NOW() >= p.next_claim_time THEN TRUE
      ELSE FALSE
    END as can_mine,
    CASE 
      WHEN p.next_claim_time IS NULL THEN 0
      WHEN NOW() >= p.next_claim_time THEN 0
      ELSE EXTRACT(EPOCH FROM (p.next_claim_time - NOW()))::INTEGER
    END as seconds_remaining,
    p.next_claim_time,
    p.last_claim_time
  FROM profiles p
  WHERE p.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_next_claim_time ON profiles(next_claim_time);
CREATE INDEX IF NOT EXISTS idx_profiles_last_claim_time ON profiles(last_claim_time);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION validate_mining_claim(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION process_mining_claim(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION get_mining_status(UUID) TO authenticated;

-- Fix mining issues caused by referral commission logic
-- Ensure referral commissions don't block mining operations

-- Step 1: Make award_referral_commission more robust with better error handling
CREATE OR REPLACE FUNCTION award_referral_commission(
  p_user_id UUID,
  p_amount NUMERIC,
  p_commission_type TEXT,
  p_source_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_referrer_id UUID;
  v_commission_amount NUMERIC;
  v_user_exists BOOLEAN;
BEGIN
  -- Add check to ensure user exists before processing
  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = p_user_id) INTO v_user_exists;
  
  IF NOT v_user_exists THEN
    RAISE NOTICE 'User % does not exist, skipping commission award', p_user_id;
    RETURN;
  END IF;
  
  -- Get the referrer (upline) of this user
  SELECT referred_by INTO v_referrer_id
  FROM profiles
  WHERE id = p_user_id;
  
  -- Only proceed if user has a referrer
  IF v_referrer_id IS NULL THEN
    RAISE NOTICE 'User % has no referrer, skipping commission award', p_user_id;
    RETURN;
  END IF;
  
  -- Verify referrer exists before awarding commission
  IF NOT EXISTS(SELECT 1 FROM profiles WHERE id = v_referrer_id) THEN
    RAISE NOTICE 'Referrer % does not exist, skipping commission award', v_referrer_id;
    RETURN;
  END IF;
  
  -- Calculate 2% commission
  v_commission_amount := p_amount * 0.02;
  
  -- Insert commission record
  INSERT INTO referral_commissions (
    referrer_id,
    referred_id,
    amount,
    commission_type,
    source_id,
    status
  ) VALUES (
    v_referrer_id,
    p_user_id,
    v_commission_amount,
    p_commission_type,
    p_source_id,
    'completed'
  );
  
  -- Update referrer's balance
  UPDATE profiles
  SET 
    total_mined = COALESCE(total_mined, 0) + v_commission_amount,
    total_commission = COALESCE(total_commission, 0) + v_commission_amount
  WHERE id = v_referrer_id;
  
  -- Update referrals table commission tracking
  IF p_commission_type = 'trading' THEN
    UPDATE referrals
    SET 
      total_trading_commission = COALESCE(total_trading_commission, 0) + v_commission_amount,
      updated_at = NOW()
    WHERE referrer_id = v_referrer_id AND referred_id = p_user_id;
  ELSIF p_commission_type IN ('mining', 'claim') THEN
    UPDATE referrals
    SET 
      total_claim_commission = COALESCE(total_claim_commission, 0) + v_commission_amount,
      updated_at = NOW()
    WHERE referrer_id = v_referrer_id AND referred_id = p_user_id;
  END IF;
  
  RAISE NOTICE 'Awarded % GX commission to referrer % for % transaction', v_commission_amount, v_referrer_id, p_commission_type;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Catch any errors and log them without failing the transaction
    RAISE NOTICE 'Error awarding commission for user %: %', p_user_id, SQLERRM;
    -- Don't re-raise the error - just log it and continue
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Make the trigger more robust to not fail transactions
CREATE OR REPLACE FUNCTION trigger_award_referral_commission()
RETURNS TRIGGER AS $$
BEGIN
  -- Wrap in exception handler to prevent blocking transactions
  BEGIN
    -- Only award commission for completed transactions with positive amounts
    IF NEW.status = 'completed' AND NEW.amount > 0 THEN
      -- Determine commission type based on transaction type
      IF NEW.type IN ('mining', 'claim', 'daily_claim') THEN
        PERFORM award_referral_commission(NEW.user_id, NEW.amount, 'claim', NEW.id);
      ELSIF NEW.type IN ('p2p_buy', 'p2p_sell', 'trade') THEN
        PERFORM award_referral_commission(NEW.user_id, NEW.amount, 'trading', NEW.id);
      END IF;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      -- Log error but don't fail the transaction
      RAISE NOTICE 'Error in referral commission trigger: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Recreate the trigger
DROP TRIGGER IF EXISTS on_transaction_award_commission ON transactions;
CREATE TRIGGER on_transaction_award_commission
AFTER INSERT OR UPDATE OF status ON transactions
FOR EACH ROW
EXECUTE FUNCTION trigger_award_referral_commission();

-- Step 4: Update process_mining_claim to be more explicit about errors
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
  v_profile_exists BOOLEAN;
BEGIN
  -- More detailed logging
  RAISE NOTICE '[Mining] Claim attempt for user: %, reward: %', p_user_id, p_reward_amount;
  
  -- Check if user exists with better error message
  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = p_user_id) INTO v_profile_exists;
  
  IF NOT v_profile_exists THEN
    RAISE NOTICE '[Mining] Profile not found for user: %', p_user_id;
    RETURN QUERY SELECT 
      FALSE,
      'Profile not found. Please try logging out and back in.'::TEXT,
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
  
  RAISE NOTICE '[Mining] Profile updated for user: %', p_user_id;
  
  -- Insert coin record
  INSERT INTO coins (user_id, amount, claim_type, status)
  VALUES (p_user_id, p_reward_amount, 'mining', 'available');
  
  RAISE NOTICE '[Mining] Coin record created for user: %', p_user_id;
  
  -- Insert transaction record (this will trigger referral commission)
  INSERT INTO transactions (user_id, type, amount, description, status)
  VALUES (p_user_id, 'mining', p_reward_amount, 'Mining reward', 'completed');
  
  RAISE NOTICE '[Mining] Transaction created for user: %', p_user_id;
  
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
    
  RAISE NOTICE '[Mining] Claim successful for user: %', p_user_id;
  
EXCEPTION
  WHEN OTHERS THEN
    -- More detailed error logging
    RAISE NOTICE '[Mining] ERROR for user %: % (SQLSTATE: %)', p_user_id, SQLERRM, SQLSTATE;
    
    -- Return error result
    RETURN QUERY SELECT 
      FALSE,
      'Mining failed: ' || SQLERRM::TEXT,
      NULL::TIMESTAMPTZ;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION process_mining_claim(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION award_referral_commission(UUID, NUMERIC, TEXT, UUID) TO authenticated;

COMMENT ON FUNCTION award_referral_commission IS 'Awards 2% commission to upline - now with robust error handling that never blocks transactions';
COMMENT ON FUNCTION trigger_award_referral_commission IS 'Trigger function that awards commissions without blocking the main transaction';

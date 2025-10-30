-- ============================================
-- UNIFIED USER AUTHENTICATION SYSTEM
-- ============================================
-- This script creates a single, cohesive authentication system
-- that synchronizes profiles, mining, trading, and referrals
-- ============================================

-- ============================================
-- PART 1: ENSURE PROFILES TABLE IS COMPLETE
-- ============================================

-- Ensure all necessary columns exist
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS username TEXT,
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS total_referrals INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS referrals_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_commission NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS commission_earned NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS rating NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_mined NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS last_mined_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS next_mine_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_claim_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS next_claim_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS mining_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_supply_limit NUMERIC DEFAULT 1000000,
ADD COLUMN IF NOT EXISTS buyer_id UUID,
ADD COLUMN IF NOT EXISTS seller_id UUID;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON public.profiles(referred_by);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- ============================================
-- PART 2: REFERRAL CODE GENERATION
-- ============================================

CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
  code_exists BOOLEAN;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..6 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    
    SELECT EXISTS(SELECT 1 FROM profiles WHERE referral_code = result) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 3: UNIFIED PROFILE CREATION TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  username_value TEXT;
  referral_code_value TEXT;
  referrer_code TEXT;
  referrer_id UUID;
BEGIN
  RAISE NOTICE 'Creating profile for new user: %', NEW.id;
  
  -- Get username from metadata or email
  username_value := COALESCE(
    NEW.raw_user_meta_data ->> 'username',
    SPLIT_PART(NEW.email, '@', 1)
  );
  
  -- Generate unique referral code
  referral_code_value := generate_referral_code();
  
  -- Check if user signed up with a referral code
  referrer_code := NEW.raw_user_meta_data ->> 'referral_code';
  
  IF referrer_code IS NOT NULL THEN
    -- Find the referrer
    SELECT id INTO referrer_id
    FROM profiles
    WHERE referral_code = referrer_code
    LIMIT 1;
    
    RAISE NOTICE 'Found referrer: % for code: %', referrer_id, referrer_code;
  END IF;
  
  -- Insert or update profile
  INSERT INTO public.profiles (
    id,
    email,
    username,
    referral_code,
    referred_by,
    rating,
    total_referrals,
    referrals_count,
    total_commission,
    commission_earned,
    total_mined,
    mining_streak,
    max_supply_limit,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    username_value,
    referral_code_value,
    referrer_id,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    1000000,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = COALESCE(profiles.email, EXCLUDED.email),
    username = COALESCE(profiles.username, EXCLUDED.username),
    referral_code = COALESCE(profiles.referral_code, EXCLUDED.referral_code),
    referred_by = COALESCE(profiles.referred_by, EXCLUDED.referred_by),
    updated_at = NOW();
  
  -- If there's a referrer, update their referral count
  IF referrer_id IS NOT NULL THEN
    UPDATE profiles
    SET 
      referrals_count = referrals_count + 1,
      total_referrals = total_referrals + 1
    WHERE id = referrer_id;
    
    -- Create referral record
    INSERT INTO referrals (referrer_id, referred_id, referral_code, status)
    VALUES (referrer_id, NEW.id, referrer_code, 'active')
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Updated referrer % with new referral', referrer_id;
  END IF;
  
  RAISE NOTICE 'Profile created successfully for user: %', NEW.id;
  RETURN NEW;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user for %: %', NEW.id, SQLERRM;
    -- Don't fail the signup, just log the error
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- PART 4: MINING VALIDATION FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION validate_mining_claim(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_next_claim TIMESTAMPTZ;
  v_profile_exists BOOLEAN;
BEGIN
  -- Check if profile exists
  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = p_user_id) INTO v_profile_exists;
  
  IF NOT v_profile_exists THEN
    RAISE NOTICE 'Profile does not exist for user: %', p_user_id;
    RETURN FALSE;
  END IF;
  
  -- Get next claim time
  SELECT next_claim_time INTO v_next_claim
  FROM profiles
  WHERE id = p_user_id;
  
  -- If never claimed before, allow claim
  IF v_next_claim IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Check if enough time has passed
  RETURN (NOW() >= v_next_claim);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 5: UNIFIED MINING CLAIM FUNCTION
-- ============================================

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
  v_remaining_supply NUMERIC;
  v_profile_exists BOOLEAN;
BEGIN
  RAISE NOTICE 'Mining claim attempt for user: %, reward: %', p_user_id, p_reward_amount;
  
  -- CRITICAL: Check if profile exists first
  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = p_user_id) INTO v_profile_exists;
  
  IF NOT v_profile_exists THEN
    RAISE WARNING 'Profile not found for user: %', p_user_id;
    
    -- Try to create profile if user exists in auth.users
    IF EXISTS(SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
      RAISE NOTICE 'User exists in auth.users, creating profile...';
      
      INSERT INTO profiles (
        id, email, username, referral_code, rating, total_referrals,
        referrals_count, total_commission, commission_earned, total_mined,
        mining_streak, max_supply_limit, created_at, updated_at
      )
      SELECT 
        id,
        email,
        SPLIT_PART(email, '@', 1),
        generate_referral_code(),
        0, 0, 0, 0, 0, 0, 0, 1000000,
        NOW(), NOW()
      FROM auth.users
      WHERE id = p_user_id
      ON CONFLICT (id) DO NOTHING;
      
      RAISE NOTICE 'Profile created for user: %', p_user_id;
    ELSE
      RETURN QUERY SELECT 
        FALSE,
        'User account not found. Please sign in again.'::TEXT,
        NULL::TIMESTAMPTZ;
      RETURN;
    END IF;
  END IF;
  
  -- Validate if user can claim
  v_can_claim := validate_mining_claim(p_user_id);
  
  IF NOT v_can_claim THEN
    SELECT next_claim_time INTO v_next_claim
    FROM profiles
    WHERE id = p_user_id;
    
    RETURN QUERY SELECT 
      FALSE,
      'Mining not available yet. Please wait for the countdown to finish.'::TEXT,
      v_next_claim;
    RETURN;
  END IF;
  
  -- Check supply
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
  
  -- Calculate next claim time
  v_next_claim := NOW() + INTERVAL '3 hours';
  
  -- Update profile
  UPDATE profiles
  SET 
    last_claim_time = NOW(),
    next_claim_time = v_next_claim,
    last_mined_at = NOW(),
    next_mine_at = v_next_claim,
    total_mined = COALESCE(total_mined, 0) + p_reward_amount,
    mining_streak = COALESCE(mining_streak, 0) + 1,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Insert coin record
  INSERT INTO coins (user_id, amount, claim_type, status, created_at)
  VALUES (p_user_id, p_reward_amount, 'mining', 'available', NOW());
  
  -- Insert transaction record
  INSERT INTO transactions (user_id, type, amount, description, status, created_at)
  VALUES (p_user_id, 'mining', p_reward_amount, 'Mining reward', 'completed', NOW());
  
  -- Update supply tracking
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'supply_tracking') THEN
    UPDATE supply_tracking
    SET 
      remaining_supply = remaining_supply - p_reward_amount,
      mined_supply = COALESCE(mined_supply, 0) + p_reward_amount,
      last_updated = NOW();
  END IF;
  
  -- Return success
  RETURN QUERY SELECT 
    TRUE,
    'Mining successful! You earned ' || p_reward_amount || ' GX'::TEXT,
    v_next_claim;
    
  RAISE NOTICE 'Mining claim successful for user: %', p_user_id;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Mining claim error for user %: %', p_user_id, SQLERRM;
    RETURN QUERY SELECT 
      FALSE,
      'Mining failed: ' || SQLERRM::TEXT,
      NULL::TIMESTAMPTZ;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 6: REFERRAL COMMISSION SYSTEM
-- ============================================

CREATE OR REPLACE FUNCTION award_referral_commission()
RETURNS TRIGGER AS $$
DECLARE
  v_referrer_id UUID;
  v_commission_amount NUMERIC;
  v_commission_type TEXT;
BEGIN
  -- Only process completed transactions
  IF NEW.status != 'completed' THEN
    RETURN NEW;
  END IF;
  
  -- Get the referrer
  SELECT referred_by INTO v_referrer_id
  FROM profiles
  WHERE id = NEW.user_id;
  
  -- If no referrer, exit
  IF v_referrer_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Calculate 2% commission
  v_commission_amount := NEW.amount * 0.02;
  
  -- Determine commission type
  v_commission_type := CASE 
    WHEN NEW.type = 'mining' THEN 'mining'
    WHEN NEW.type IN ('buy', 'sell', 'trade') THEN 'trading'
    ELSE 'other'
  END;
  
  -- Award commission to referrer
  UPDATE profiles
  SET 
    total_commission = COALESCE(total_commission, 0) + v_commission_amount,
    commission_earned = COALESCE(commission_earned, 0) + v_commission_amount,
    updated_at = NOW()
  WHERE id = v_referrer_id;
  
  -- Record the commission
  INSERT INTO referral_commissions (
    referrer_id,
    referred_id,
    source_id,
    amount,
    commission_type,
    status,
    created_at
  )
  VALUES (
    v_referrer_id,
    NEW.user_id,
    NEW.id,
    v_commission_amount,
    v_commission_type,
    'completed',
    NOW()
  );
  
  -- Update referral stats
  IF v_commission_type = 'mining' THEN
    UPDATE referrals
    SET total_claim_commission = COALESCE(total_claim_commission, 0) + v_commission_amount
    WHERE referrer_id = v_referrer_id AND referred_id = NEW.user_id;
  ELSIF v_commission_type = 'trading' THEN
    UPDATE referrals
    SET total_trading_commission = COALESCE(total_trading_commission, 0) + v_commission_amount
    WHERE referrer_id = v_referrer_id AND referred_id = NEW.user_id;
  END IF;
  
  RAISE NOTICE 'Awarded % commission to referrer % for transaction %', v_commission_amount, v_referrer_id, NEW.id;
  
  RETURN NEW;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error awarding commission: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic commission
DROP TRIGGER IF EXISTS on_transaction_award_commission ON transactions;

CREATE TRIGGER on_transaction_award_commission
  AFTER INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION award_referral_commission();

-- ============================================
-- PART 7: BACKFILL AND CLEANUP
-- ============================================

-- Backfill referral codes for existing users
UPDATE profiles
SET referral_code = generate_referral_code()
WHERE referral_code IS NULL OR referral_code = '';

-- Ensure all users have default values
UPDATE profiles
SET 
  total_referrals = COALESCE(total_referrals, 0),
  referrals_count = COALESCE(referrals_count, 0),
  total_commission = COALESCE(total_commission, 0),
  commission_earned = COALESCE(commission_earned, 0),
  rating = COALESCE(rating, 0),
  total_mined = COALESCE(total_mined, 0),
  mining_streak = COALESCE(mining_streak, 0),
  max_supply_limit = COALESCE(max_supply_limit, 1000000),
  updated_at = NOW()
WHERE 
  total_referrals IS NULL 
  OR referrals_count IS NULL 
  OR total_commission IS NULL 
  OR rating IS NULL 
  OR total_mined IS NULL;

-- Create profiles for any auth.users without profiles
INSERT INTO profiles (
  id, email, username, referral_code, rating, total_referrals,
  referrals_count, total_commission, commission_earned, total_mined,
  mining_streak, max_supply_limit, created_at, updated_at
)
SELECT 
  u.id,
  u.email,
  SPLIT_PART(u.email, '@', 1),
  generate_referral_code(),
  0, 0, 0, 0, 0, 0, 0, 1000000,
  NOW(), NOW()
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- PART 8: GRANT PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION generate_referral_code() TO authenticated;
GRANT EXECUTE ON FUNCTION validate_mining_claim(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION process_mining_claim(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION award_referral_commission() TO authenticated;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON FUNCTION handle_new_user() IS 'Unified profile creation trigger that handles referrals, mining, and trading setup';
COMMENT ON FUNCTION process_mining_claim(UUID, NUMERIC) IS 'Unified mining claim function with automatic profile creation and referral commission';
COMMENT ON FUNCTION award_referral_commission() IS 'Automatically awards 2% commission to referrers on all transactions';
COMMENT ON FUNCTION validate_mining_claim(UUID) IS 'Validates if a user can claim mining rewards';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Unified authentication system created successfully!';
  RAISE NOTICE '✅ All profiles, mining, trading, and referrals are now synchronized';
END $$;

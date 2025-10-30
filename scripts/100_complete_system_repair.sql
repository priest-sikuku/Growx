-- ============================================
-- GROWX COMPLETE SYSTEM REPAIR & SYNCHRONIZATION
-- ============================================
-- This script repairs all broken references, rebuilds missing structures,
-- and synchronizes the entire system without deleting existing data.
-- ============================================

-- STEP 1: Ensure all profile columns exist with correct types
-- ============================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
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
ADD COLUMN IF NOT EXISTS total_trades INTEGER DEFAULT 0,
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
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON public.profiles(referred_by);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_next_mine_at ON public.profiles(next_mine_at);
CREATE INDEX IF NOT EXISTS idx_profiles_next_claim_time ON public.profiles(next_claim_time);

-- STEP 2: Ensure transactions table has correct structure
-- ============================================

CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  related_id UUID,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at);

-- STEP 3: Ensure coins table structure
-- ============================================

CREATE TABLE IF NOT EXISTS public.coins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  claim_type TEXT NOT NULL DEFAULT 'mining' CHECK (claim_type IN ('mining', 'trading', 'bonus', 'claim')),
  locked_until TIMESTAMPTZ,
  lock_period_days INTEGER DEFAULT 7,
  bonus_percentage NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'locked', 'claimed', 'available')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coins_user_id ON public.coins(user_id);
CREATE INDEX IF NOT EXISTS idx_coins_status ON public.coins(status);
CREATE INDEX IF NOT EXISTS idx_coins_claim_type ON public.coins(claim_type);

-- STEP 4: Ensure referrals table structure
-- ============================================

CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  total_trading_commission NUMERIC DEFAULT 0,
  total_claim_commission NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(referrer_id, referred_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON public.referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON public.referrals(status);

-- STEP 5: Ensure referral_commissions table structure
-- ============================================

CREATE TABLE IF NOT EXISTS public.referral_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  commission_type TEXT NOT NULL CHECK (commission_type IN ('mining', 'trading', 'claim', 'daily_claim')),
  source_id UUID,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_commissions_referrer ON public.referral_commissions(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_referred ON public.referral_commissions(referred_id);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_type ON public.referral_commissions(commission_type);

-- STEP 6: Ensure p2p_ads table structure
-- ============================================

CREATE TABLE IF NOT EXISTS public.p2p_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ad_type TEXT NOT NULL CHECK (ad_type IN ('buy', 'sell')),
  gx_amount NUMERIC NOT NULL CHECK (gx_amount > 0),
  remaining_amount NUMERIC,
  min_amount NUMERIC NOT NULL CHECK (min_amount > 0),
  max_amount NUMERIC NOT NULL CHECK (max_amount >= min_amount),
  price_per_gx NUMERIC DEFAULT 16.29,
  account_number TEXT,
  mpesa_number TEXT,
  paybill_number TEXT,
  airtel_money TEXT,
  terms_of_trade TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed', 'cancelled')),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '3 days'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_p2p_ads_user_id ON public.p2p_ads(user_id);
CREATE INDEX IF NOT EXISTS idx_p2p_ads_ad_type ON public.p2p_ads(ad_type);
CREATE INDEX IF NOT EXISTS idx_p2p_ads_status ON public.p2p_ads(status);

-- STEP 7: Ensure p2p_trades table structure
-- ============================================

CREATE TABLE IF NOT EXISTS public.p2p_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID REFERENCES public.p2p_ads(id) ON DELETE CASCADE,
  buyer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  gx_amount NUMERIC NOT NULL,
  escrow_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'escrowed', 'payment_sent', 'completed', 'cancelled', 'disputed', 'expired')),
  payment_confirmed_at TIMESTAMPTZ,
  coins_released_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 minutes'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_p2p_trades_buyer ON public.p2p_trades(buyer_id);
CREATE INDEX IF NOT EXISTS idx_p2p_trades_seller ON public.p2p_trades(seller_id);
CREATE INDEX IF NOT EXISTS idx_p2p_trades_status ON public.p2p_trades(status);
CREATE INDEX IF NOT EXISTS idx_p2p_trades_ad ON public.p2p_trades(ad_id);

-- STEP 8: Ensure p2p_ratings table structure
-- ============================================

CREATE TABLE IF NOT EXISTS public.p2p_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID NOT NULL REFERENCES public.p2p_trades(id) ON DELETE CASCADE,
  rater_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rated_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trade_id, rater_id)
);

CREATE INDEX IF NOT EXISTS idx_p2p_ratings_rated_user ON public.p2p_ratings(rated_user_id);
CREATE INDEX IF NOT EXISTS idx_p2p_ratings_trade ON public.p2p_ratings(trade_id);

-- STEP 9: Ensure supply_tracking table structure
-- ============================================

CREATE TABLE IF NOT EXISTS public.supply_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total_supply NUMERIC DEFAULT 300000,
  mined_supply NUMERIC DEFAULT 0,
  remaining_supply NUMERIC DEFAULT 300000,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Initialize supply tracking if empty
INSERT INTO public.supply_tracking (total_supply, mined_supply, remaining_supply)
SELECT 300000, 0, 300000
WHERE NOT EXISTS (SELECT 1 FROM public.supply_tracking);

-- STEP 10: Rebuild critical RPC functions
-- ============================================

-- Function: Generate unique referral code
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

-- Function: Process mining claim
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
  v_next_claim TIMESTAMPTZ;
  v_current_time TIMESTAMPTZ;
  v_can_claim BOOLEAN;
BEGIN
  v_current_time := NOW();
  
  -- Check if user can claim
  SELECT CASE 
    WHEN next_claim_time IS NULL THEN TRUE
    WHEN v_current_time >= next_claim_time THEN TRUE
    ELSE FALSE
  END INTO v_can_claim
  FROM profiles
  WHERE id = p_user_id;
  
  IF NOT v_can_claim THEN
    RETURN QUERY SELECT 
      FALSE,
      'Mining not available yet. Please wait for the countdown to finish.'::TEXT,
      (SELECT next_claim_time FROM profiles WHERE id = p_user_id);
    RETURN;
  END IF;
  
  -- Calculate next claim time (3 hours from now)
  v_next_claim := v_current_time + INTERVAL '3 hours';
  
  -- Update profile
  UPDATE profiles
  SET 
    last_claim_time = v_current_time,
    next_claim_time = v_next_claim,
    last_mined_at = v_current_time,
    next_mine_at = v_next_claim,
    total_mined = COALESCE(total_mined, 0) + p_reward_amount,
    mining_streak = COALESCE(mining_streak, 0) + 1,
    updated_at = v_current_time
  WHERE id = p_user_id;
  
  -- Insert coin record
  INSERT INTO coins (user_id, amount, claim_type, status)
  VALUES (p_user_id, p_reward_amount, 'mining', 'available');
  
  -- Insert transaction record
  INSERT INTO transactions (user_id, type, amount, description, status)
  VALUES (p_user_id, 'mining', p_reward_amount, 'Mining reward', 'completed');
  
  -- Update supply tracking
  UPDATE supply_tracking
  SET 
    mined_supply = mined_supply + p_reward_amount,
    remaining_supply = total_supply - (mined_supply + p_reward_amount),
    last_updated = v_current_time;
  
  RETURN QUERY SELECT 
    TRUE,
    'Mining successful! You earned ' || p_reward_amount || ' GX'::TEXT,
    v_next_claim;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Award referral commission
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
BEGIN
  -- Get the referrer
  SELECT referred_by INTO v_referrer_id
  FROM profiles
  WHERE id = p_user_id;
  
  IF v_referrer_id IS NOT NULL THEN
    v_commission_amount := p_amount * 0.02; -- 2% commission
    
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
    
    -- Update referrer's balance and commission
    UPDATE profiles
    SET 
      total_mined = COALESCE(total_mined, 0) + v_commission_amount,
      total_commission = COALESCE(total_commission, 0) + v_commission_amount,
      commission_earned = COALESCE(commission_earned, 0) + v_commission_amount,
      updated_at = NOW()
    WHERE id = v_referrer_id;
    
    -- Update referrals table
    IF p_commission_type IN ('trading', 'p2p_buy', 'p2p_sell', 'trade') THEN
      UPDATE referrals
      SET 
        total_trading_commission = COALESCE(total_trading_commission, 0) + v_commission_amount,
        updated_at = NOW()
      WHERE referrer_id = v_referrer_id AND referred_id = p_user_id;
    ELSIF p_commission_type IN ('mining', 'claim', 'daily_claim') THEN
      UPDATE referrals
      SET 
        total_claim_commission = COALESCE(total_claim_commission, 0) + v_commission_amount,
        updated_at = NOW()
      WHERE referrer_id = v_referrer_id AND referred_id = p_user_id;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Trigger to award commission on transactions
CREATE OR REPLACE FUNCTION trigger_award_referral_commission()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND NEW.amount > 0 THEN
    IF NEW.type IN ('mining', 'claim', 'daily_claim') THEN
      PERFORM award_referral_commission(NEW.user_id, NEW.amount, 'claim', NEW.id);
    ELSIF NEW.type IN ('p2p_buy', 'p2p_sell', 'trade') THEN
      PERFORM award_referral_commission(NEW.user_id, NEW.amount, 'trading', NEW.id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS on_transaction_award_commission ON transactions;
CREATE TRIGGER on_transaction_award_commission
AFTER INSERT OR UPDATE OF status ON transactions
FOR EACH ROW
EXECUTE FUNCTION trigger_award_referral_commission();

-- Function: Get available balance
CREATE OR REPLACE FUNCTION get_available_balance(p_user_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  total_balance NUMERIC;
  locked_balance NUMERIC;
BEGIN
  SELECT COALESCE(total_mined, 0) INTO total_balance
  FROM profiles
  WHERE id = p_user_id;
  
  SELECT COALESCE(SUM(remaining_amount), 0) INTO locked_balance
  FROM p2p_ads
  WHERE user_id = p_user_id
  AND ad_type = 'sell'
  AND status = 'active'
  AND expires_at > NOW();
  
  RETURN total_balance - locked_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Handle new user referral
CREATE OR REPLACE FUNCTION handle_new_user_referral(
  p_user_id UUID,
  p_referral_code TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_referrer_id UUID;
  v_new_referral_code TEXT;
BEGIN
  v_new_referral_code := generate_referral_code();
  
  UPDATE profiles
  SET referral_code = v_new_referral_code
  WHERE id = p_user_id AND referral_code IS NULL;
  
  IF p_referral_code IS NOT NULL AND p_referral_code != '' THEN
    SELECT id INTO v_referrer_id
    FROM profiles
    WHERE referral_code = p_referral_code;
    
    IF v_referrer_id IS NOT NULL AND v_referrer_id != p_user_id THEN
      UPDATE profiles
      SET referred_by = v_referrer_id
      WHERE id = p_user_id;
      
      INSERT INTO referrals (
        referrer_id,
        referred_id,
        referral_code,
        status
      ) VALUES (
        v_referrer_id,
        p_user_id,
        p_referral_code,
        'active'
      )
      ON CONFLICT (referrer_id, referred_id) DO NOTHING;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 11: Backfill missing data
-- ============================================

-- Generate referral codes for users without them
UPDATE profiles
SET referral_code = generate_referral_code()
WHERE referral_code IS NULL OR referral_code = '';

-- Set default values for NULL fields
UPDATE profiles
SET 
  total_referrals = COALESCE(total_referrals, 0),
  referrals_count = COALESCE(referrals_count, 0),
  total_commission = COALESCE(total_commission, 0),
  commission_earned = COALESCE(commission_earned, 0),
  rating = COALESCE(rating, 0),
  total_mined = COALESCE(total_mined, 0),
  total_trades = COALESCE(total_trades, 0),
  mining_streak = COALESCE(mining_streak, 0),
  max_supply_limit = COALESCE(max_supply_limit, 1000000)
WHERE 
  total_referrals IS NULL 
  OR total_commission IS NULL 
  OR rating IS NULL 
  OR total_mined IS NULL;

-- Sync referral counts
UPDATE profiles p
SET 
  total_referrals = (SELECT COUNT(*) FROM referrals r WHERE r.referrer_id = p.id),
  referrals_count = (SELECT COUNT(*) FROM referrals r WHERE r.referrer_id = p.id)
WHERE EXISTS (SELECT 1 FROM referrals r WHERE r.referrer_id = p.id);

-- STEP 12: Enable Row Level Security
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.p2p_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.p2p_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.p2p_ratings ENABLE ROW LEVEL SECURITY;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION generate_referral_code() TO authenticated;
GRANT EXECUTE ON FUNCTION process_mining_claim(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION award_referral_commission(UUID, NUMERIC, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_balance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION handle_new_user_referral(UUID, TEXT) TO authenticated;

-- STEP 13: Create summary view
-- ============================================

CREATE OR REPLACE VIEW user_system_health AS
SELECT 
  p.id,
  p.username,
  p.email,
  p.referral_code,
  p.total_mined,
  p.total_commission,
  p.total_referrals,
  p.rating,
  p.mining_streak,
  p.next_mine_at,
  COUNT(DISTINCT t.id) as transaction_count,
  COUNT(DISTINCT c.id) as coin_count,
  COUNT(DISTINCT r.id) as referral_count,
  COUNT(DISTINCT rc.id) as commission_count
FROM profiles p
LEFT JOIN transactions t ON t.user_id = p.id
LEFT JOIN coins c ON c.user_id = p.id
LEFT JOIN referrals r ON r.referrer_id = p.id
LEFT JOIN referral_commissions rc ON rc.referrer_id = p.id
GROUP BY p.id, p.username, p.email, p.referral_code, p.total_mined, 
         p.total_commission, p.total_referrals, p.rating, p.mining_streak, p.next_mine_at;

COMMENT ON VIEW user_system_health IS 'Comprehensive view of user data integrity across all tables';

-- ============================================
-- REPAIR COMPLETE
-- ============================================

SELECT 
  'System repair completed successfully!' as status,
  (SELECT COUNT(*) FROM profiles) as total_users,
  (SELECT COUNT(*) FROM transactions) as total_transactions,
  (SELECT COUNT(*) FROM referrals) as total_referrals,
  (SELECT COUNT(*) FROM p2p_ads) as total_ads,
  (SELECT COUNT(*) FROM p2p_trades) as total_trades,
  (SELECT remaining_supply FROM supply_tracking LIMIT 1) as remaining_supply;

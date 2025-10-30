-- ============================================
-- COMPLETE REFERRAL SYSTEM REBUILD
-- ============================================
-- This script creates a fully functional referral system with:
-- 1. Unique 6-character alphanumeric referral codes
-- 2. Automatic 2% commission on all transactions (mining + trading)
-- 3. Lifetime commission tracking
-- 4. Security and anti-abuse measures
-- ============================================

-- Step 1: Ensure profiles table has all necessary columns
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS total_referrals INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_commission NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS referrals_count INTEGER DEFAULT 0;

-- Create index for fast referral code lookups
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON public.profiles(referred_by);

-- Step 2: Function to generate unique 6-character alphanumeric code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Exclude similar looking chars
  result TEXT := '';
  i INTEGER;
  code_exists BOOLEAN;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..6 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM profiles WHERE referral_code = result) INTO code_exists;
    
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Ensure referrals table exists with correct structure
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

-- Step 4: Ensure referral_commissions table exists
CREATE TABLE IF NOT EXISTS public.referral_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  commission_type TEXT NOT NULL CHECK (commission_type IN ('mining', 'trading', 'claim')),
  source_id UUID, -- ID of the transaction that generated this commission
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_commissions_referrer ON public.referral_commissions(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_referred ON public.referral_commissions(referred_id);

-- Step 5: Function to award commission to upline
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
  -- Get the referrer (upline) of this user
  SELECT referred_by INTO v_referrer_id
  FROM profiles
  WHERE id = p_user_id;
  
  -- If user has a referrer, award 2% commission
  IF v_referrer_id IS NOT NULL THEN
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
      total_mined = total_mined + v_commission_amount,
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
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Trigger to award commission on new transactions
CREATE OR REPLACE FUNCTION trigger_award_referral_commission()
RETURNS TRIGGER AS $$
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
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_transaction_award_commission ON transactions;

-- Create trigger on transactions table
CREATE TRIGGER on_transaction_award_commission
AFTER INSERT OR UPDATE OF status ON transactions
FOR EACH ROW
EXECUTE FUNCTION trigger_award_referral_commission();

-- Step 7: Function to update referral count when new referral is created
CREATE OR REPLACE FUNCTION update_referral_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment referrer's total_referrals count
  UPDATE profiles
  SET 
    total_referrals = COALESCE(total_referrals, 0) + 1,
    referrals_count = COALESCE(referrals_count, 0) + 1
  WHERE id = NEW.referrer_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_referral_created ON referrals;

-- Create trigger on referrals table
CREATE TRIGGER on_referral_created
AFTER INSERT ON referrals
FOR EACH ROW
EXECUTE FUNCTION update_referral_count();

-- Step 8: Function to handle new user signup with referral
CREATE OR REPLACE FUNCTION handle_new_user_referral(
  p_user_id UUID,
  p_referral_code TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_referrer_id UUID;
  v_new_referral_code TEXT;
BEGIN
  -- Generate unique referral code for new user
  v_new_referral_code := generate_referral_code();
  
  -- Update user's profile with referral code
  UPDATE profiles
  SET referral_code = v_new_referral_code
  WHERE id = p_user_id AND referral_code IS NULL;
  
  -- If user signed up with a referral code, create referral relationship
  IF p_referral_code IS NOT NULL AND p_referral_code != '' THEN
    -- Find the referrer
    SELECT id INTO v_referrer_id
    FROM profiles
    WHERE referral_code = p_referral_code;
    
    IF v_referrer_id IS NOT NULL AND v_referrer_id != p_user_id THEN
      -- Update user's referred_by
      UPDATE profiles
      SET referred_by = v_referrer_id
      WHERE id = p_user_id;
      
      -- Create referral record
      INSERT INTO referrals (
        referrer_id,
        referred_id,
        referral_code,
        status,
        total_trading_commission,
        total_claim_commission
      ) VALUES (
        v_referrer_id,
        p_user_id,
        p_referral_code,
        'active',
        0,
        0
      )
      ON CONFLICT (referrer_id, referred_id) DO NOTHING;
      
      RAISE NOTICE 'Created referral relationship: % referred %', v_referrer_id, p_user_id;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Backfill referral codes for existing users without codes
UPDATE profiles
SET referral_code = generate_referral_code()
WHERE referral_code IS NULL OR referral_code = '';

-- Step 10: Backfill referral counts
UPDATE profiles p
SET 
  total_referrals = (
    SELECT COUNT(*)
    FROM referrals r
    WHERE r.referrer_id = p.id
  ),
  referrals_count = (
    SELECT COUNT(*)
    FROM referrals r
    WHERE r.referrer_id = p.id
  )
WHERE EXISTS (
  SELECT 1 FROM referrals r WHERE r.referrer_id = p.id
);

-- Step 11: Enable Row Level Security
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_commissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for referrals table
DROP POLICY IF EXISTS "Users can view their own referrals" ON public.referrals;
CREATE POLICY "Users can view their own referrals"
ON public.referrals FOR SELECT
USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

DROP POLICY IF EXISTS "Users can insert referrals" ON public.referrals;
CREATE POLICY "Users can insert referrals"
ON public.referrals FOR INSERT
WITH CHECK (auth.uid() = referred_id);

-- RLS Policies for referral_commissions table
DROP POLICY IF EXISTS "Users can view their own commissions" ON public.referral_commissions;
CREATE POLICY "Users can view their own commissions"
ON public.referral_commissions FOR SELECT
USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- Step 12: Create view for referral stats
CREATE OR REPLACE VIEW referral_stats AS
SELECT 
  p.id as user_id,
  p.referral_code,
  p.total_referrals,
  p.total_commission,
  COALESCE(SUM(rc.amount) FILTER (WHERE rc.commission_type = 'trading'), 0) as total_trading_commission,
  COALESCE(SUM(rc.amount) FILTER (WHERE rc.commission_type IN ('mining', 'claim')), 0) as total_claim_commission,
  COUNT(DISTINCT r.referred_id) as active_referrals
FROM profiles p
LEFT JOIN referrals r ON r.referrer_id = p.id
LEFT JOIN referral_commissions rc ON rc.referrer_id = p.id
GROUP BY p.id, p.referral_code, p.total_referrals, p.total_commission;

-- Grant access to view
GRANT SELECT ON referral_stats TO authenticated;

COMMENT ON FUNCTION generate_referral_code() IS 'Generates a unique 6-character alphanumeric referral code';
COMMENT ON FUNCTION award_referral_commission(UUID, NUMERIC, TEXT, UUID) IS 'Awards 2% commission to upline for any transaction';
COMMENT ON FUNCTION handle_new_user_referral(UUID, TEXT) IS 'Handles referral code generation and relationship creation for new users';
COMMENT ON TABLE referrals IS 'Tracks referral relationships between users';
COMMENT ON TABLE referral_commissions IS 'Tracks individual commission payments to referrers';

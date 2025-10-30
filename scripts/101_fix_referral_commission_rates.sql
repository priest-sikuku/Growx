-- ============================================
-- FIX REFERRAL COMMISSION RATES
-- ============================================
-- This script fixes the commission rates to match documentation:
-- - 2% for trading/P2P transactions
-- - 2% for mining/claim transactions (updated from 1% to 2%)
-- ============================================

-- Update the award_referral_commission function with correct commission rate
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
    -- Consistent 2% commission rate for all transaction types
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
    
    -- Update referrer's balance and commission
    UPDATE profiles
    SET 
      total_mined = COALESCE(total_mined, 0) + v_commission_amount,
      total_commission = COALESCE(total_commission, 0) + v_commission_amount,
      commission_earned = COALESCE(commission_earned, 0) + v_commission_amount,
      updated_at = NOW()
    WHERE id = v_referrer_id;
    
    -- Update referrals table commission tracking
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
    
    -- Create coin record for referrer
    INSERT INTO coins (user_id, amount, claim_type, status)
    VALUES (v_referrer_id, v_commission_amount, 'referral_commission', 'available');
    
    RAISE NOTICE 'Awarded % GX commission to referrer % for % transaction', v_commission_amount, v_referrer_id, p_commission_type;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure trigger is properly set up
DROP TRIGGER IF EXISTS on_transaction_award_commission ON transactions;

CREATE TRIGGER on_transaction_award_commission
AFTER INSERT OR UPDATE OF status ON transactions
FOR EACH ROW
EXECUTE FUNCTION trigger_award_referral_commission();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION award_referral_commission(UUID, NUMERIC, TEXT, UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION award_referral_commission(UUID, NUMERIC, TEXT, UUID) IS 'Awards 2% commission to upline for all transactions (mining + trading)';

-- Verify referral system integrity
DO $$
DECLARE
  missing_codes INTEGER;
  orphaned_referrals INTEGER;
BEGIN
  -- Check for users without referral codes
  SELECT COUNT(*) INTO missing_codes
  FROM profiles
  WHERE referral_code IS NULL OR referral_code = '';
  
  IF missing_codes > 0 THEN
    RAISE NOTICE 'Found % users without referral codes. Generating codes...', missing_codes;
    
    UPDATE profiles
    SET referral_code = generate_referral_code()
    WHERE referral_code IS NULL OR referral_code = '';
  END IF;
  
  -- Check for orphaned referrals (referred_by points to non-existent user)
  SELECT COUNT(*) INTO orphaned_referrals
  FROM profiles p
  WHERE p.referred_by IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = p.referred_by);
  
  IF orphaned_referrals > 0 THEN
    RAISE WARNING 'Found % orphaned referrals. Cleaning up...', orphaned_referrals;
    
    UPDATE profiles
    SET referred_by = NULL
    WHERE referred_by IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = referred_by);
  END IF;
  
  RAISE NOTICE 'Referral system integrity check complete.';
END $$;

-- Sync referral counts with actual data
UPDATE profiles p
SET 
  total_referrals = (
    SELECT COUNT(*)
    FROM referrals r
    WHERE r.referrer_id = p.id AND r.status = 'active'
  ),
  referrals_count = (
    SELECT COUNT(*)
    FROM referrals r
    WHERE r.referrer_id = p.id AND r.status = 'active'
  )
WHERE EXISTS (
  SELECT 1 FROM referrals r WHERE r.referrer_id = p.id
);

-- Sync commission totals
UPDATE profiles p
SET 
  total_commission = (
    SELECT COALESCE(SUM(amount), 0)
    FROM referral_commissions rc
    WHERE rc.referrer_id = p.id AND rc.status = 'completed'
  ),
  commission_earned = (
    SELECT COALESCE(SUM(amount), 0)
    FROM referral_commissions rc
    WHERE rc.referrer_id = p.id AND rc.status = 'completed'
  )
WHERE EXISTS (
  SELECT 1 FROM referral_commissions rc WHERE rc.referrer_id = p.id
);

SELECT 
  'Referral system repaired!' as status,
  (SELECT COUNT(*) FROM referrals WHERE status = 'active') as active_referrals,
  (SELECT COUNT(*) FROM referral_commissions WHERE status = 'completed') as total_commissions,
  (SELECT COALESCE(SUM(amount), 0) FROM referral_commissions WHERE status = 'completed') as total_commission_amount;

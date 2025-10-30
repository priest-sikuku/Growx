-- ============================================
-- COMPLETE P2P MARKETPLACE REPAIR
-- ============================================
-- This script fixes all P2P marketplace issues:
-- 1. Ensures proper escrow management
-- 2. Fixes remaining_amount tracking
-- 3. Adds missing columns and indexes
-- 4. Repairs RPC functions
-- 5. Adds trade_messages table
-- 6. Ensures proper commission integration
-- ============================================

-- Step 1: Ensure p2p_ads table has all necessary columns
ALTER TABLE public.p2p_ads
ADD COLUMN IF NOT EXISTS remaining_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS price_per_gx NUMERIC DEFAULT 0;

-- Update remaining_amount for existing ads
UPDATE public.p2p_ads
SET remaining_amount = gx_amount
WHERE remaining_amount IS NULL OR remaining_amount = 0;

-- Step 2: Ensure p2p_trades table has all necessary columns
ALTER TABLE public.p2p_trades
ADD COLUMN IF NOT EXISTS escrow_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_confirmed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS coins_released_at TIMESTAMPTZ;

-- Step 3: Create trade_messages table if not exists
CREATE TABLE IF NOT EXISTS public.trade_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID NOT NULL REFERENCES public.p2p_trades(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trade_messages_trade_id ON public.trade_messages(trade_id);
CREATE INDEX IF NOT EXISTS idx_trade_messages_sender_id ON public.trade_messages(sender_id);

-- Enable RLS
ALTER TABLE public.trade_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trade_messages
DROP POLICY IF EXISTS "Trade participants can view messages" ON public.trade_messages;
CREATE POLICY "Trade participants can view messages"
ON public.trade_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.p2p_trades
    WHERE id = trade_messages.trade_id
    AND (buyer_id = auth.uid() OR seller_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Trade participants can send messages" ON public.trade_messages;
CREATE POLICY "Trade participants can send messages"
ON public.trade_messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM public.p2p_trades
    WHERE id = trade_messages.trade_id
    AND (buyer_id = auth.uid() OR seller_id = auth.uid())
  )
);

-- Step 4: Fix post_sell_ad_with_escrow function
CREATE OR REPLACE FUNCTION post_sell_ad_with_escrow(
  p_user_id UUID,
  p_gx_amount NUMERIC,
  p_price_per_gx NUMERIC,
  p_min_amount NUMERIC,
  p_max_amount NUMERIC,
  p_account_number TEXT DEFAULT NULL,
  p_mpesa_number TEXT DEFAULT NULL,
  p_paybill_number TEXT DEFAULT NULL,
  p_airtel_money TEXT DEFAULT NULL,
  p_terms_of_trade TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_ad_id UUID;
  v_user_balance NUMERIC;
BEGIN
  -- Check user has enough balance
  SELECT total_mined INTO v_user_balance
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_user_balance IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  IF v_user_balance < p_gx_amount THEN
    RAISE EXCEPTION 'Insufficient balance. You have % GX but trying to sell % GX', v_user_balance, p_gx_amount;
  END IF;

  -- Check minimum amount
  IF p_gx_amount < 50 THEN
    RAISE EXCEPTION 'Minimum amount to post an ad is 50 GX';
  END IF;

  IF p_min_amount < 2 THEN
    RAISE EXCEPTION 'Minimum tradable amount is 2 GX';
  END IF;

  -- Create the ad
  INSERT INTO public.p2p_ads (
    user_id, ad_type, gx_amount, remaining_amount, price_per_gx,
    min_amount, max_amount, account_number, mpesa_number,
    paybill_number, airtel_money, terms_of_trade, status
  ) VALUES (
    p_user_id, 'sell', p_gx_amount, p_gx_amount, p_price_per_gx,
    p_min_amount, p_max_amount, p_account_number, p_mpesa_number,
    p_paybill_number, p_airtel_money, p_terms_of_trade, 'active'
  ) RETURNING id INTO v_ad_id;

  -- Deduct coins from user balance immediately when posting SELL ad
  UPDATE public.profiles
  SET total_mined = total_mined - p_gx_amount,
      updated_at = NOW()
  WHERE id = p_user_id;

  -- Record transaction
  INSERT INTO public.transactions (user_id, type, amount, description, related_id, status)
  VALUES (p_user_id, 'p2p_ad_escrow', -p_gx_amount, 'Coins locked for P2P sell ad', v_ad_id, 'completed');

  RAISE NOTICE 'Sell ad created with ID: %. % GX locked from user balance.', v_ad_id, p_gx_amount;
  
  RETURN v_ad_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Fix initiate_p2p_trade_v2 function
CREATE OR REPLACE FUNCTION initiate_p2p_trade_v2(
  p_ad_id UUID,
  p_buyer_id UUID,
  p_gx_amount NUMERIC
) RETURNS UUID AS $$
DECLARE
  v_trade_id UUID;
  v_seller_id UUID;
  v_ad_type TEXT;
  v_remaining_amount NUMERIC;
  v_seller_balance NUMERIC;
  v_min_amount NUMERIC;
  v_max_amount NUMERIC;
BEGIN
  -- Get ad details
  SELECT user_id, ad_type, remaining_amount, min_amount, max_amount
  INTO v_seller_id, v_ad_type, v_remaining_amount, v_min_amount, v_max_amount
  FROM public.p2p_ads
  WHERE id = p_ad_id AND status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ad not found or not active';
  END IF;

  -- Check minimum trade amount
  IF p_gx_amount < 2 THEN
    RAISE EXCEPTION 'Minimum trade amount is 2 GX';
  END IF;

  -- Check if amount is within ad limits
  IF p_gx_amount < v_min_amount THEN
    RAISE EXCEPTION 'Trade amount must be at least % GX', v_min_amount;
  END IF;

  IF p_gx_amount > v_max_amount THEN
    RAISE EXCEPTION 'Trade amount cannot exceed % GX', v_max_amount;
  END IF;

  -- Check if enough coins available on ad
  IF p_gx_amount > v_remaining_amount THEN
    RAISE EXCEPTION 'Not enough coins available on this ad. Available: % GX', v_remaining_amount;
  END IF;

  -- Prevent self-trading
  IF p_buyer_id = v_seller_id THEN
    RAISE EXCEPTION 'You cannot trade with yourself';
  END IF;

  -- For SELL ads, coins are already in escrow from ad posting
  IF v_ad_type = 'sell' THEN
    -- Create trade (coins already locked)
    INSERT INTO public.p2p_trades (ad_id, buyer_id, seller_id, gx_amount, escrow_amount, status)
    VALUES (p_ad_id, p_buyer_id, v_seller_id, p_gx_amount, p_gx_amount, 'escrowed')
    RETURNING id INTO v_trade_id;
  ELSE
    -- BUY ad: the trade initiator is selling to the ad poster
    SELECT total_mined INTO v_seller_balance
    FROM public.profiles
    WHERE id = p_buyer_id;

    IF v_seller_balance < p_gx_amount THEN
      RAISE EXCEPTION 'Insufficient balance to sell';
    END IF;

    -- Deduct from seller (the trade initiator)
    UPDATE public.profiles
    SET total_mined = total_mined - p_gx_amount,
        updated_at = NOW()
    WHERE id = p_buyer_id;

    -- Create trade (roles are swapped for BUY ads)
    INSERT INTO public.p2p_trades (ad_id, buyer_id, seller_id, gx_amount, escrow_amount, status)
    VALUES (p_ad_id, v_seller_id, p_buyer_id, p_gx_amount, p_gx_amount, 'escrowed')
    RETURNING id INTO v_trade_id;

    -- Record transaction
    INSERT INTO public.transactions (user_id, type, amount, description, related_id, status)
    VALUES (p_buyer_id, 'p2p_escrow', -p_gx_amount, 'Coins moved to escrow for P2P trade', v_trade_id, 'completed');
  END IF;

  -- Decrease remaining_amount on the ad
  UPDATE public.p2p_ads
  SET remaining_amount = remaining_amount - p_gx_amount,
      updated_at = NOW()
  WHERE id = p_ad_id;

  -- If no coins left, mark ad as completed
  UPDATE public.p2p_ads
  SET status = 'completed'
  WHERE id = p_ad_id AND remaining_amount <= 0;

  RAISE NOTICE 'Trade initiated with ID: %', v_trade_id;
  
  RETURN v_trade_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Fix release_p2p_coins function
CREATE OR REPLACE FUNCTION release_p2p_coins(
  p_trade_id UUID,
  p_seller_id UUID
) RETURNS VOID AS $$
DECLARE
  v_buyer_id UUID;
  v_escrow_amount NUMERIC;
  v_trade_status TEXT;
BEGIN
  -- Get trade details
  SELECT buyer_id, escrow_amount, status
  INTO v_buyer_id, v_escrow_amount, v_trade_status
  FROM public.p2p_trades
  WHERE id = p_trade_id AND seller_id = p_seller_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trade not found or you are not the seller';
  END IF;

  IF v_trade_status NOT IN ('escrowed', 'payment_sent') THEN
    RAISE EXCEPTION 'Trade is not in a state to release coins. Current status: %', v_trade_status;
  END IF;

  -- Update trade status
  UPDATE public.p2p_trades
  SET status = 'completed',
      coins_released_at = NOW(),
      updated_at = NOW()
  WHERE id = p_trade_id;

  -- Transfer coins to buyer
  UPDATE public.profiles
  SET total_mined = total_mined + v_escrow_amount,
      updated_at = NOW()
  WHERE id = v_buyer_id;

  -- Record transaction for buyer
  INSERT INTO public.transactions (user_id, type, amount, description, related_id, status)
  VALUES (v_buyer_id, 'p2p_buy', v_escrow_amount, 'Received GX from P2P trade', p_trade_id, 'completed');

  -- Award referral commission if buyer has a referrer
  PERFORM award_referral_commission(v_buyer_id, v_escrow_amount, 'trading', p_trade_id);

  RAISE NOTICE 'Coins released to buyer. Trade completed.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Fix mark_payment_sent function
CREATE OR REPLACE FUNCTION mark_payment_sent(
  p_trade_id UUID,
  p_buyer_id UUID
) RETURNS VOID AS $$
BEGIN
  UPDATE public.p2p_trades
  SET status = 'payment_sent',
      payment_confirmed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_trade_id AND buyer_id = p_buyer_id AND status = 'escrowed';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trade not found, you are not the buyer, or trade is not in escrowed status';
  END IF;

  RAISE NOTICE 'Payment marked as sent for trade %', p_trade_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Fix cancel_p2p_trade function
CREATE OR REPLACE FUNCTION cancel_p2p_trade(
  p_trade_id UUID,
  p_user_id UUID
) RETURNS VOID AS $$
DECLARE
  v_seller_id UUID;
  v_buyer_id UUID;
  v_escrow_amount NUMERIC;
  v_status TEXT;
  v_ad_id UUID;
BEGIN
  -- Get trade details
  SELECT seller_id, buyer_id, escrow_amount, status, ad_id
  INTO v_seller_id, v_buyer_id, v_escrow_amount, v_status, v_ad_id
  FROM public.p2p_trades
  WHERE id = p_trade_id AND (buyer_id = p_user_id OR seller_id = p_user_id);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trade not found or you are not a participant';
  END IF;

  IF v_status = 'completed' THEN
    RAISE EXCEPTION 'Cannot cancel completed trade';
  END IF;

  -- Update trade status
  UPDATE public.p2p_trades
  SET status = 'cancelled',
      updated_at = NOW()
  WHERE id = p_trade_id;

  -- Return coins to seller if they were in escrow
  IF v_escrow_amount > 0 THEN
    UPDATE public.profiles
    SET total_mined = total_mined + v_escrow_amount,
        updated_at = NOW()
    WHERE id = v_seller_id;

    -- Record transaction
    INSERT INTO public.transactions (user_id, type, amount, description, related_id, status)
    VALUES (v_seller_id, 'p2p_refund', v_escrow_amount, 'Coins returned from cancelled P2P trade', p_trade_id, 'completed');
  END IF;

  -- Return coins to ad remaining_amount
  UPDATE public.p2p_ads
  SET remaining_amount = remaining_amount + v_escrow_amount,
      status = 'active',
      updated_at = NOW()
  WHERE id = v_ad_id;

  RAISE NOTICE 'Trade cancelled. Coins returned to seller.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Function to return coins when ad is deleted/expired
CREATE OR REPLACE FUNCTION return_coins_from_ad(
  p_ad_id UUID
) RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
  v_remaining_amount NUMERIC;
  v_ad_type TEXT;
  v_status TEXT;
BEGIN
  -- Get ad details
  SELECT user_id, remaining_amount, ad_type, status
  INTO v_user_id, v_remaining_amount, v_ad_type, v_status
  FROM public.p2p_ads
  WHERE id = p_ad_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ad not found';
  END IF;

  -- Only return coins for SELL ads that are not completed
  IF v_ad_type = 'sell' AND v_remaining_amount > 0 AND v_status != 'completed' THEN
    -- Return remaining coins to user
    UPDATE public.profiles
    SET total_mined = total_mined + v_remaining_amount,
        updated_at = NOW()
    WHERE id = v_user_id;

    -- Record transaction
    INSERT INTO public.transactions (user_id, type, amount, description, related_id, status)
    VALUES (v_user_id, 'p2p_ad_return', v_remaining_amount, 'Coins returned from cancelled/expired ad', p_ad_id, 'completed');

    RAISE NOTICE 'Returned % GX to user from ad', v_remaining_amount;
  END IF;

  -- Update ad status
  UPDATE public.p2p_ads
  SET status = 'cancelled',
      updated_at = NOW()
  WHERE id = p_ad_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 10: Create trigger to return coins when ad is deleted
CREATE OR REPLACE FUNCTION trigger_return_coins_on_ad_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Only return coins if ad is being deleted or cancelled
  IF OLD.status = 'active' AND OLD.ad_type = 'sell' AND OLD.remaining_amount > 0 THEN
    -- Return coins to user
    UPDATE public.profiles
    SET total_mined = total_mined + OLD.remaining_amount,
        updated_at = NOW()
    WHERE id = OLD.user_id;

    -- Record transaction
    INSERT INTO public.transactions (user_id, type, amount, description, related_id, status)
    VALUES (OLD.user_id, 'p2p_ad_return', OLD.remaining_amount, 'Coins returned from deleted ad', OLD.id, 'completed');
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_p2p_ad_delete ON public.p2p_ads;
CREATE TRIGGER on_p2p_ad_delete
BEFORE DELETE ON public.p2p_ads
FOR EACH ROW
EXECUTE FUNCTION trigger_return_coins_on_ad_delete();

-- Step 11: Grant execute permissions
GRANT EXECUTE ON FUNCTION post_sell_ad_with_escrow TO authenticated;
GRANT EXECUTE ON FUNCTION initiate_p2p_trade_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION release_p2p_coins TO authenticated;
GRANT EXECUTE ON FUNCTION mark_payment_sent TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_p2p_trade TO authenticated;
GRANT EXECUTE ON FUNCTION return_coins_from_ad TO authenticated;

-- Step 12: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_p2p_ads_user_id ON public.p2p_ads(user_id);
CREATE INDEX IF NOT EXISTS idx_p2p_ads_status ON public.p2p_ads(status);
CREATE INDEX IF NOT EXISTS idx_p2p_ads_ad_type ON public.p2p_ads(ad_type);
CREATE INDEX IF NOT EXISTS idx_p2p_ads_remaining_amount ON public.p2p_ads(remaining_amount);
CREATE INDEX IF NOT EXISTS idx_p2p_trades_buyer_id ON public.p2p_trades(buyer_id);
CREATE INDEX IF NOT EXISTS idx_p2p_trades_seller_id ON public.p2p_trades(seller_id);
CREATE INDEX IF NOT EXISTS idx_p2p_trades_status ON public.p2p_trades(status);
CREATE INDEX IF NOT EXISTS idx_p2p_trades_ad_id ON public.p2p_trades(ad_id);

-- Step 13: Verify P2P system integrity
DO $$
DECLARE
  total_ads INTEGER;
  active_ads INTEGER;
  total_trades INTEGER;
  active_trades INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_ads FROM public.p2p_ads;
  SELECT COUNT(*) INTO active_ads FROM public.p2p_ads WHERE status = 'active';
  SELECT COUNT(*) INTO total_trades FROM public.p2p_trades;
  SELECT COUNT(*) INTO active_trades FROM public.p2p_trades WHERE status IN ('escrowed', 'payment_sent');

  RAISE NOTICE 'P2P System Status:';
  RAISE NOTICE '- Total Ads: %', total_ads;
  RAISE NOTICE '- Active Ads: %', active_ads;
  RAISE NOTICE '- Total Trades: %', total_trades;
  RAISE NOTICE '- Active Trades: %', active_trades;
END $$;

SELECT 
  'P2P marketplace repaired!' as status,
  (SELECT COUNT(*) FROM p2p_ads WHERE status = 'active') as active_ads,
  (SELECT COUNT(*) FROM p2p_trades WHERE status IN ('escrowed', 'payment_sent')) as active_trades,
  (SELECT COALESCE(SUM(remaining_amount), 0) FROM p2p_ads WHERE status = 'active') as total_gx_available;

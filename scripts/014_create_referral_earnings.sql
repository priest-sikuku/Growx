-- Create referral_earnings table to track commission from referrals
CREATE TABLE IF NOT EXISTS public.referral_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trade_id UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  commission_amount NUMERIC NOT NULL DEFAULT 0,
  transaction_type TEXT NOT NULL, -- 'trade_commission'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_referral_earnings_referrer ON public.referral_earnings(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_earnings_referred_user ON public.referral_earnings(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_earnings_trade ON public.referral_earnings(trade_id);

-- Enable RLS
ALTER TABLE public.referral_earnings ENABLE ROW LEVEL SECURITY;

-- Policies for referral_earnings
CREATE POLICY "Users can view their own referral earnings"
  ON public.referral_earnings
  FOR SELECT
  USING (auth.uid() = referrer_id);

CREATE POLICY "System can insert referral earnings"
  ON public.referral_earnings
  FOR INSERT
  WITH CHECK (true);

-- Add referral_earnings column to profiles if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'referral_earnings'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN referral_earnings NUMERIC DEFAULT 0;
  END IF;
END $$;

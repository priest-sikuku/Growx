-- Drop existing views before recreating to avoid column mismatch errors
DROP VIEW IF EXISTS public.user_stats CASCADE;
DROP VIEW IF EXISTS public.price_history_5days CASCADE;

-- Ensure all required columns exist in profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS total_referrals integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS commission_earned numeric DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS rating numeric(3, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS total_trades integer DEFAULT 0;

-- Create a view for user statistics
CREATE VIEW public.user_stats AS
SELECT 
  p.id as user_id,
  COALESCE(p.username, 'Anonymous') as username,
  COALESCE(p.rating, 0.00) as rating,
  COALESCE(p.total_trades, 0) as total_trades,
  COALESCE(p.total_referrals, 0) as total_referrals,
  COALESCE(p.commission_earned, 0.00) as commission_earned,
  -- Calculate ROI from completed trades
  COALESCE(
    (SELECT 
      SUM(CASE 
        WHEN t.buyer_id = p.id THEN (t.coin_amount * 16.00) - t.total_price
        WHEN t.seller_id = p.id THEN t.total_price - (t.coin_amount * 16.00)
        ELSE 0
      END)
    FROM trades t
    WHERE (t.buyer_id = p.id OR t.seller_id = p.id) 
    AND t.status = 'completed'
    ), 0
  ) as total_roi
FROM profiles p;

-- Grant access to the view
GRANT SELECT ON public.user_stats TO authenticated;

-- Create function to update referral count
CREATE OR REPLACE FUNCTION update_referral_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referred_by IS NOT NULL THEN
    UPDATE profiles 
    SET total_referrals = COALESCE(total_referrals, 0) + 1
    WHERE id = NEW.referred_by;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for referral count
DROP TRIGGER IF EXISTS on_referral_signup ON profiles;
CREATE TRIGGER on_referral_signup
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_referral_count();

-- ============================================
-- FIX SIGNUP DATABASE ERROR
-- ============================================
-- This script fixes the profile creation trigger to work with the actual database schema
-- ============================================

-- Step 1: Ensure all necessary columns exist in profiles table
ALTER TABLE public.profiles
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
ADD COLUMN IF NOT EXISTS max_supply_limit NUMERIC DEFAULT 1000000;

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON public.profiles(referred_by);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- Step 3: Function to generate unique 6-character alphanumeric code
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

-- Step 4: Create or replace the handle_new_user trigger function
-- This function creates a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  username_value TEXT;
  referral_code_value TEXT;
BEGIN
  -- Get username from metadata or email
  username_value := COALESCE(
    NEW.raw_user_meta_data ->> 'username',
    SPLIT_PART(NEW.email, '@', 1)
  );
  
  -- Generate unique referral code
  referral_code_value := generate_referral_code();
  
  -- Insert profile with all necessary fields
  INSERT INTO public.profiles (
    id,
    email,
    username,
    referral_code,
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
    updated_at = NOW();

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the signup
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Step 5: Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 6: Backfill referral codes for existing users
UPDATE profiles
SET referral_code = generate_referral_code()
WHERE referral_code IS NULL OR referral_code = '';

-- Step 7: Ensure default values for existing users
UPDATE profiles
SET 
  total_referrals = COALESCE(total_referrals, 0),
  referrals_count = COALESCE(referrals_count, 0),
  total_commission = COALESCE(total_commission, 0),
  commission_earned = COALESCE(commission_earned, 0),
  rating = COALESCE(rating, 0),
  total_mined = COALESCE(total_mined, 0),
  mining_streak = COALESCE(mining_streak, 0),
  max_supply_limit = COALESCE(max_supply_limit, 1000000)
WHERE 
  total_referrals IS NULL 
  OR referrals_count IS NULL 
  OR total_commission IS NULL 
  OR rating IS NULL 
  OR total_mined IS NULL;

COMMENT ON FUNCTION handle_new_user() IS 'Creates a profile automatically when a new user signs up via Supabase Auth';
COMMENT ON FUNCTION generate_referral_code() IS 'Generates a unique 6-character alphanumeric referral code';

-- Add KES balance to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS kes_balance DECIMAL(15, 2) DEFAULT 1000.00;

-- Create transactions table to track buy/sell history
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('buy', 'sell')),
  zirox_amount DECIMAL(15, 6) NOT NULL,
  kes_amount DECIMAL(15, 2) NOT NULL,
  price_per_zirox DECIMAL(15, 6) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Transactions policies
CREATE POLICY "Users can view their own transactions"
  ON public.transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create index for faster transaction lookups
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);

-- Update existing profiles to have starting KES balance
UPDATE public.profiles
SET kes_balance = 1000.00
WHERE kes_balance IS NULL;

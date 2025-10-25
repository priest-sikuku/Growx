-- Drop old trading system tables if they exist
DROP TABLE IF EXISTS public.transactions CASCADE;

-- Create advertisements table for P2P trading
CREATE TABLE IF NOT EXISTS public.advertisements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ad_type TEXT NOT NULL CHECK (ad_type IN ('buy', 'sell')),
  zirox_amount DECIMAL(15, 6) NOT NULL,
  price_per_zirox DECIMAL(15, 6) NOT NULL,
  min_order DECIMAL(15, 6) NOT NULL,
  max_order DECIMAL(15, 6) NOT NULL,
  mpesa_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trades table for P2P transactions
CREATE TABLE IF NOT EXISTS public.trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID NOT NULL REFERENCES public.advertisements(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  zirox_amount DECIMAL(15, 6) NOT NULL,
  total_kes DECIMAL(15, 2) NOT NULL,
  price_per_zirox DECIMAL(15, 6) NOT NULL,
  mpesa_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'completed', 'cancelled', 'disputed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- Advertisement policies
CREATE POLICY "Anyone can view active advertisements"
  ON public.advertisements FOR SELECT
  USING (status = 'active');

CREATE POLICY "Users can create their own advertisements"
  ON public.advertisements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own advertisements"
  ON public.advertisements FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own advertisements"
  ON public.advertisements FOR DELETE
  USING (auth.uid() = user_id);

-- Trade policies
CREATE POLICY "Users can view their own trades"
  ON public.trades FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Users can create trades"
  ON public.trades FOR INSERT
  WITH CHECK (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Users can update their own trades"
  ON public.trades FOR UPDATE
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_advertisements_user_id ON public.advertisements(user_id);
CREATE INDEX IF NOT EXISTS idx_advertisements_status ON public.advertisements(status);
CREATE INDEX IF NOT EXISTS idx_advertisements_ad_type ON public.advertisements(ad_type);
CREATE INDEX IF NOT EXISTS idx_trades_buyer_id ON public.trades(buyer_id);
CREATE INDEX IF NOT EXISTS idx_trades_seller_id ON public.trades(seller_id);
CREATE INDEX IF NOT EXISTS idx_trades_status ON public.trades(status);
CREATE INDEX IF NOT EXISTS idx_trades_ad_id ON public.trades(ad_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_advertisements_updated_at
  BEFORE UPDATE ON public.advertisements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trades_updated_at
  BEFORE UPDATE ON public.trades
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

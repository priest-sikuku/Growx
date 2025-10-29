-- Add missing columns to trades table
ALTER TABLE public.trades 
ADD COLUMN IF NOT EXISTS price_per_coin NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS escrow_amount NUMERIC DEFAULT 0;

-- Make payment_method nullable since it comes from listing
ALTER TABLE public.trades 
ALTER COLUMN payment_method DROP NOT NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_trades_buyer_id ON public.trades(buyer_id);
CREATE INDEX IF NOT EXISTS idx_trades_seller_id ON public.trades(seller_id);
CREATE INDEX IF NOT EXISTS idx_trades_status ON public.trades(status);

-- Create system settings table for configurable values
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES 
  ('base_claim_amount', '100', 'Base amount of coins users receive per claim'),
  ('referral_bonus', '10', 'Additional coins per referral'),
  ('claim_cooldown_hours', '3', 'Hours between claims')
ON CONFLICT (setting_key) DO NOTHING;

-- Add total_claimed column to profiles if not exists
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS total_claimed INTEGER DEFAULT 0;

-- Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write settings
CREATE POLICY "Admins can manage settings"
ON system_settings
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);

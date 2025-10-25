-- This script helps create an admin user
-- After running this, you need to manually update a user's metadata to make them an admin

-- Instructions:
-- 1. Sign up a user through the normal signup flow
-- 2. Get their user ID from the auth.users table
-- 3. Run this update to make them an admin:

-- UPDATE auth.users
-- SET raw_user_meta_data = raw_user_meta_data || '{"role": "admin"}'::jsonb
-- WHERE email = 'admin@example.com';

-- Note: Replace 'admin@example.com' with the actual admin email

-- For testing purposes, you can also create a policy that allows viewing user metadata
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT raw_user_meta_data->>'role' = 'admin'
    FROM auth.users
    WHERE id = auth.uid()
  );
END;
$$;

-- Add admin policy for viewing all profiles
CREATE POLICY "Admins can view all user details"
  ON public.profiles FOR SELECT
  USING (is_admin());

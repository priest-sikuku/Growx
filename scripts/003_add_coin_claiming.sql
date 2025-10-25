-- Add coin-related columns to profiles table
alter table public.profiles
add column if not exists coins bigint default 0,
add column if not exists last_claim_time timestamp with time zone,
add column if not exists total_claimed bigint default 0;

-- Create index for faster claim queries
create index if not exists idx_profiles_last_claim on public.profiles(last_claim_time);

-- Update RLS policies to allow users to update their own coins
create policy "Users can update their own coins"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Add mining-related fields to profiles table
alter table public.profiles
add column if not exists last_mined_at timestamp with time zone,
add column if not exists next_mine_at timestamp with time zone,
add column if not exists total_mined numeric default 0,
add column if not exists mining_streak integer default 0;

-- Update existing users to allow immediate first mine
update public.profiles
set next_mine_at = now()
where next_mine_at is null;

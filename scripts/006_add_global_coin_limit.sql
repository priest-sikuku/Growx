-- Add global coin tracking table
create table if not exists public.global_stats (
  id integer primary key default 1,
  total_claimed numeric default 0,
  max_supply numeric default 200000,
  updated_at timestamp with time zone default now(),
  constraint single_row check (id = 1)
);

-- Enable RLS
alter table public.global_stats enable row level security;

-- Allow everyone to read global stats
create policy "Anyone can view global stats"
  on public.global_stats for select
  using (true);

-- Only admins can update global stats (this will be done via function)
create policy "Only system can update global stats"
  on public.global_stats for update
  using (false);

-- Insert initial row
insert into public.global_stats (id, total_claimed, max_supply)
values (1, 0, 200000)
on conflict (id) do nothing;

-- Function to safely claim coins with global limit check
create or replace function public.claim_coins_with_limit(
  user_id uuid,
  claim_amount numeric
)
returns jsonb
language plpgsql
security definer
as $$
declare
  current_global_claimed numeric;
  max_supply numeric;
  new_global_total numeric;
  user_profile record;
begin
  -- Get global stats
  select total_claimed, max_supply into current_global_claimed, max_supply
  from public.global_stats
  where id = 1
  for update;

  -- Check if adding this claim would exceed max supply
  new_global_total := current_global_claimed + claim_amount;
  
  if new_global_total > max_supply then
    return jsonb_build_object(
      'success', false,
      'error', 'Global supply limit reached',
      'remaining', max_supply - current_global_claimed
    );
  end if;

  -- Get user profile
  select * into user_profile
  from public.profiles
  where id = user_id
  for update;

  -- Update user profile
  update public.profiles
  set 
    coins = coalesce(coins, 0) + claim_amount,
    last_claim_time = now(),
    total_claimed = coalesce(total_claimed, 0) + claim_amount
  where id = user_id;

  -- Update global stats
  update public.global_stats
  set 
    total_claimed = new_global_total,
    updated_at = now()
  where id = 1;

  return jsonb_build_object(
    'success', true,
    'claimed_amount', claim_amount,
    'new_balance', coalesce(user_profile.coins, 0) + claim_amount,
    'global_claimed', new_global_total,
    'global_remaining', max_supply - new_global_total
  );
end;
$$;

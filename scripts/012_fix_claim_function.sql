-- Fix the ambiguous column reference in claim_coins_with_limit function
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
  v_max_supply numeric; -- renamed from max_supply to avoid ambiguity
  new_global_total numeric;
  user_profile record;
begin
  -- Get global stats
  -- use v_max_supply variable instead of max_supply to avoid column ambiguity
  select total_claimed, max_supply into current_global_claimed, v_max_supply
  from public.global_stats
  where id = 1
  for update;

  -- Check if adding this claim would exceed max supply
  new_global_total := current_global_claimed + claim_amount;
  
  -- use v_max_supply variable
  if new_global_total > v_max_supply then
    return jsonb_build_object(
      'success', false,
      'error', 'Global supply limit reached',
      'remaining', v_max_supply - current_global_claimed
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

  -- use v_max_supply variable
  return jsonb_build_object(
    'success', true,
    'claimed_amount', claim_amount,
    'new_balance', coalesce(user_profile.coins, 0) + claim_amount,
    'global_claimed', new_global_total,
    'global_remaining', v_max_supply - new_global_total
  );
end;
$$;

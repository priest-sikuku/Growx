-- Create global supply tracking table
create table if not exists public.supply_tracking (
  id uuid primary key default gen_random_uuid(),
  total_supply numeric not null default 300000,
  mined_supply numeric not null default 0,
  remaining_supply numeric not null default 300000,
  last_updated timestamp with time zone default now()
);

-- Insert initial supply record
insert into public.supply_tracking (total_supply, mined_supply, remaining_supply)
values (300000, 0, 300000)
on conflict do nothing;

-- Enable RLS
alter table public.supply_tracking enable row level security;

-- Allow everyone to read supply
create policy "supply_select_all"
  on public.supply_tracking for select
  to authenticated
  using (true);

-- Only system can update (we'll use service role for updates)
create policy "supply_update_system"
  on public.supply_tracking for update
  using (false);

-- Create function to update supply when mining
create or replace function update_supply_on_mine()
returns trigger as $$
begin
  -- Only update supply for mining claims
  if new.claim_type = 'mining' then
    update public.supply_tracking
    set 
      mined_supply = mined_supply + new.amount,
      remaining_supply = total_supply - (mined_supply + new.amount),
      last_updated = now()
    where id = (select id from public.supply_tracking limit 1);
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Create trigger to update supply automatically
drop trigger if exists on_mine_update_supply on public.coins;
create trigger on_mine_update_supply
  after insert on public.coins
  for each row
  execute function update_supply_on_mine();

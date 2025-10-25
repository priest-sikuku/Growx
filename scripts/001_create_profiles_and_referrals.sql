-- Create profiles table for user information
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  bio text,
  referral_code text unique not null,
  referred_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- Profiles policies
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Admins can view all profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from auth.users
      where auth.users.id = auth.uid()
      and auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

create policy "Anyone can check if referral code exists"
  on public.profiles for select
  using (true);

-- Function to generate unique referral code
create or replace function generate_referral_code()
returns text
language plpgsql
as $$
declare
  new_code text;
  code_exists boolean;
begin
  loop
    -- Generate 8 character alphanumeric code
    new_code := upper(substring(md5(random()::text) from 1 for 8));
    
    -- Check if code already exists
    select exists(select 1 from public.profiles where referral_code = new_code) into code_exists;
    
    -- Exit loop if code is unique
    exit when not code_exists;
  end loop;
  
  return new_code;
end;
$$;

-- Function to auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  referrer_id uuid;
begin
  -- Check if referred_by code exists and get the referrer's id
  if new.raw_user_meta_data->>'referred_by' is not null then
    select id into referrer_id
    from public.profiles
    where referral_code = new.raw_user_meta_data->>'referred_by';
  end if;

  -- Insert profile with generated referral code
  insert into public.profiles (id, full_name, referral_code, referred_by)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', null),
    generate_referral_code(),
    referrer_id
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Create trigger for new user signup
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Create index for faster referral code lookups
create index if not exists idx_profiles_referral_code on public.profiles(referral_code);
create index if not exists idx_profiles_referred_by on public.profiles(referred_by);

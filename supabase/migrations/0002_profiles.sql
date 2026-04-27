-- Profiles (one row per auth user; created by trigger for new signups, backfill for existing)

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text default '' not null,
  title text default '' not null,
  avatar_url text default null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.profiles enable row level security;

drop policy if exists "Kullanıcı kendi profilini görür" on public.profiles;
create policy "Kullanıcı kendi profilini görür"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Mevcut kullanıcılar için (trigger'dan önce kayıt olanlar)
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

-- Basit denetim günlükleri: kullanıcıya özel, RLS ile korunur.
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  action text not null,
  detail text not null default '',
  ip text,
  created_at timestamptz not null default now()
);

create index audit_logs_user_created_idx on audit_logs (user_id, created_at desc);

alter table audit_logs enable row level security;

create policy "audit_logs_select_own"
  on audit_logs for select
  using (auth.uid() = user_id);

create policy "audit_logs_insert_own"
  on audit_logs for insert
  with check (auth.uid() = user_id);

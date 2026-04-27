create extension if not exists pgcrypto;

create table boards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  title text not null,
  created_at timestamptz default now()
);

create table columns (
  id uuid primary key default gen_random_uuid(),
  board_id uuid references boards on delete cascade not null,
  title text not null,
  position float not null default 1000,
  created_at timestamptz default now()
);

create table cards (
  id uuid primary key default gen_random_uuid(),
  column_id uuid references columns on delete cascade not null,
  title text not null,
  description text default '',
  position float not null default 1000,
  created_at timestamptz default now()
);

alter table boards enable row level security;
alter table columns enable row level security;
alter table cards enable row level security;

create policy "users kendi boardlarini gorur"
  on boards for all using (auth.uid() = user_id);

create policy "board sahibi sutunlari gorur"
  on columns for all using (
    exists (
      select 1
      from boards
      where boards.id = board_id
      and boards.user_id = auth.uid()
    )
  );

create policy "board sahibi kartlari gorur"
  on cards for all using (
    exists (
      select 1
      from columns
      join boards on boards.id = columns.board_id
      where columns.id = column_id
      and boards.user_id = auth.uid()
    )
  );

alter table cards
  add column if not exists ai_magic_applied boolean not null default false;

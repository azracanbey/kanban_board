-- Atomic move helpers for drag-and-drop persistence
-- These functions calculate fractional positions server-side and update rows in a single transaction.

create or replace function public.move_column_tx(
  p_column_id uuid,
  p_prev_position double precision default null,
  p_next_position double precision default null
)
returns table(new_position double precision)
language plpgsql
security invoker
as $$
declare
  v_new_position double precision;
begin
  if p_prev_position is not null and p_next_position is not null then
    v_new_position := (p_prev_position + p_next_position) / 2;
  elsif p_prev_position is null and p_next_position is not null then
    v_new_position := p_next_position / 2;
  elsif p_prev_position is not null and p_next_position is null then
    v_new_position := p_prev_position + 1000;
  else
    v_new_position := 1000;
  end if;

  update public.columns
  set position = v_new_position
  where id = p_column_id;

  return query select v_new_position;
end;
$$;

create or replace function public.move_card_tx(
  p_card_id uuid,
  p_target_column_id uuid,
  p_prev_position double precision default null,
  p_next_position double precision default null
)
returns table(new_position double precision)
language plpgsql
security invoker
as $$
declare
  v_new_position double precision;
begin
  if p_prev_position is not null and p_next_position is not null then
    v_new_position := (p_prev_position + p_next_position) / 2;
  elsif p_prev_position is null and p_next_position is not null then
    v_new_position := p_next_position / 2;
  elsif p_prev_position is not null and p_next_position is null then
    v_new_position := p_prev_position + 1000;
  else
    v_new_position := 1000;
  end if;

  update public.cards
  set
    column_id = p_target_column_id,
    position = v_new_position
  where id = p_card_id;

  return query select v_new_position;
end;
$$;

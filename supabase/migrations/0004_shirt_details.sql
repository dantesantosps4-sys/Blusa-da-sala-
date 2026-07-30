-- ============================================================
-- Blusas da Turma — 0004: detalhes da blusa
-- (cor, tamanho, nome na blusa, número)
-- Idempotente. Depende da 0002/0003.
-- ============================================================

-- ------------------------------------------------------------
-- Novas colunas
-- ------------------------------------------------------------
alter table public.participants add column if not exists shirt_color  text;
alter table public.participants add column if not exists shirt_size   text;
alter table public.participants add column if not exists shirt_name   text;
alter table public.participants add column if not exists shirt_number integer;

-- ------------------------------------------------------------
-- CHECK constraints (idempotentes). Permitem NULL para quem
-- ainda não respondeu; a obrigatoriedade é exigida no submit.
-- ------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'participants_shirt_color_check') then
    alter table public.participants
      add constraint participants_shirt_color_check
      check (shirt_color is null or shirt_color in ('azul', 'branca'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'participants_shirt_size_check') then
    alter table public.participants
      add constraint participants_shirt_size_check
      check (shirt_size is null or shirt_size in ('PP', 'P', 'M', 'G', 'GG', 'XGG'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'participants_shirt_number_check') then
    alter table public.participants
      add constraint participants_shirt_number_check
      check (shirt_number is null or (shirt_number >= 0 and shirt_number <= 999));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'participants_shirt_name_len_check') then
    alter table public.participants
      add constraint participants_shirt_name_len_check
      check (shirt_name is null or char_length(shirt_name) <= 20);
  end if;
end $$;

-- ------------------------------------------------------------
-- get_participant_by_token: passa a devolver os campos da blusa
-- ------------------------------------------------------------
create or replace function public.get_participant_by_token(p_token text)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'name',         name,
    'choice',       choice,
    'amount',       amount,
    'paid',         paid,
    'answered',     answered,
    'submitted_at', submitted_at,
    'shirt_color',  shirt_color,
    'shirt_size',   shirt_size,
    'shirt_name',   shirt_name,
    'shirt_number', shirt_number
  )
  from public.participants
  where token = p_token;
$$;

-- ------------------------------------------------------------
-- submit_response: agora recebe e valida os campos da blusa.
-- A assinatura muda, então removemos a versão antiga (3 args)
-- antes de criar a nova (7 args). Continua idempotente.
-- ------------------------------------------------------------
drop function if exists public.submit_response(text, text, boolean);

create or replace function public.submit_response(
  p_token  text,
  p_choice text,
  p_paid   boolean,
  p_color  text,
  p_size   text,
  p_name   text,
  p_number integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.participants;
  v_amount numeric(10,2);
  v_name text;
begin
  select * into rec from public.participants where token = p_token;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  if rec.answered then
    return jsonb_build_object('status', 'already_used');
  end if;

  -- tipo/valor (derivado no servidor)
  if p_choice = 'blusa' then
    v_amount := 40;
  elsif p_choice = 'blusa_short' then
    v_amount := 70;
  else
    return jsonb_build_object('status', 'invalid_choice');
  end if;

  -- cor
  if p_color is null or p_color not in ('azul', 'branca') then
    return jsonb_build_object('status', 'invalid_color');
  end if;

  -- tamanho
  if p_size is null or p_size not in ('PP', 'P', 'M', 'G', 'GG', 'XGG') then
    return jsonb_build_object('status', 'invalid_size');
  end if;

  -- nome na blusa: MAIÚSCULAS, sem espaços duplicados, 1..20 chars
  v_name := upper(btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g')));
  if char_length(v_name) = 0 or char_length(v_name) > 20 then
    return jsonb_build_object('status', 'invalid_name');
  end if;

  -- número: 0..999
  if p_number is null or p_number < 0 or p_number > 999 then
    return jsonb_build_object('status', 'invalid_number');
  end if;

  update public.participants
     set choice       = p_choice,
         amount       = v_amount,
         paid         = coalesce(p_paid, false),
         shirt_color  = p_color,
         shirt_size   = p_size,
         shirt_name   = v_name,
         shirt_number = p_number,
         answered     = true
   where token = p_token and answered = false;

  return jsonb_build_object('status', 'ok', 'amount', v_amount);
end;
$$;

grant execute on function public.submit_response(text, text, boolean, text, text, text, integer)
  to anon, authenticated;

-- ============================================================
-- Blusas da Turma — v2 (arquitetura por token individual)
-- Migration idempotente: pode rodar quantas vezes quiser.
--
-- Modelo de segurança:
--   * A tabela `participants` NÃO é acessível diretamente pelo
--     papel `anon` (a anon key é pública no front). Todo acesso
--     passa por funções SECURITY DEFINER.
--   * Aluno: acessa só o próprio registro, via token.
--   * Admin: funções protegidas por uma chave (app_config.admin_key).
--     Se a chave estiver vazia, o admin opera aberto (sem trava).
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- Tabela (fresh install). Em bases antigas, os ALTERs abaixo
-- fazem o upgrade sem perder dados.
-- ------------------------------------------------------------
create table if not exists public.participants (
  id           uuid        primary key default gen_random_uuid(),
  name         text        not null,
  token        text,
  choice       text,
  amount       numeric(10,2) not null default 0,
  paid         boolean     not null default false,
  paid_at      timestamptz,
  submitted_at timestamptz,
  answered     boolean     not null default false,
  created_at   timestamptz not null default now()
);

-- Upgrade de bases da v1 (que não tinham esses campos):
alter table public.participants add column if not exists token        text;
alter table public.participants add column if not exists choice       text;
alter table public.participants add column if not exists amount       numeric(10,2) not null default 0;
alter table public.participants add column if not exists submitted_at timestamptz;
alter table public.participants add column if not exists answered     boolean not null default false;

-- ------------------------------------------------------------
-- Geração de token criptograficamente seguro (base64url, ~22 chars).
-- gen_random_bytes vem do pgcrypto (CSPRNG).
-- ------------------------------------------------------------
create or replace function public.gen_token()
returns text
language plpgsql
as $$
declare
  candidate text;
begin
  loop
    candidate := translate(encode(gen_random_bytes(16), 'base64'), '+/=', '-_');
    -- garante unicidade (colisão é astronômica, mas checamos mesmo assim)
    exit when not exists (select 1 from public.participants where token = candidate);
  end loop;
  return candidate;
end;
$$;

-- Backfill: dá token a quem ainda não tem (rows da v1).
update public.participants
   set token = public.gen_token()
 where token is null;

-- Agora token é obrigatório e único.
alter table public.participants alter column token set not null;
create unique index if not exists participants_token_key on public.participants (token);

-- Índices de apoio à ordenação/consulta do admin.
create index if not exists participants_answered_name_idx
  on public.participants (answered, name);

-- ------------------------------------------------------------
-- Constraints de integridade (idempotentes via DO block).
-- choice só pode ser 'blusa', 'blusa_short' ou nulo.
-- ------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'participants_choice_check'
  ) then
    alter table public.participants
      add constraint participants_choice_check
      check (choice is null or choice in ('blusa', 'blusa_short'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'participants_amount_check'
  ) then
    alter table public.participants
      add constraint participants_amount_check
      check (amount >= 0);
  end if;

  -- pago exige data de pagamento
  if not exists (
    select 1 from pg_constraint where conname = 'participants_paid_consistency'
  ) then
    alter table public.participants
      add constraint participants_paid_consistency
      check (
        (paid = true  and paid_at is not null) or
        (paid = false and paid_at is null)
      );
  end if;
end $$;

-- ------------------------------------------------------------
-- Trigger antes de INSERT: garante token.
-- ------------------------------------------------------------
create or replace function public.participants_before_insert()
returns trigger
language plpgsql
as $$
begin
  if new.token is null then
    new.token := public.gen_token();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_participants_before_insert on public.participants;
create trigger trg_participants_before_insert
  before insert on public.participants
  for each row execute function public.participants_before_insert();

-- ------------------------------------------------------------
-- Trigger antes de UPDATE:
--   * carimba submitted_at quando answered vira true;
--   * carimba paid_at quando paid vira true (limpa se voltar a false);
--   * trava a resposta: depois de answered=true, não deixa mexer em
--     choice/amount/paid/answered/token (impede reenvio). Nome continua
--     editável pelo admin.
-- ------------------------------------------------------------
create or replace function public.participants_before_update()
returns trigger
language plpgsql
as $$
begin
  -- carimbos automáticos
  if new.answered = true and old.answered = false and new.submitted_at is null then
    new.submitted_at := now();
  end if;

  if new.paid = true and old.paid = false and new.paid_at is null then
    new.paid_at := now();
  elsif new.paid = false then
    new.paid_at := null;
  end if;

  -- trava pós-resposta (a menos que o reset de admin desligue o trigger)
  if old.answered = true then
    if (new.choice   is distinct from old.choice)
       or (new.amount   is distinct from old.amount)
       or (new.paid     is distinct from old.paid)
       or (new.answered is distinct from old.answered)
       or (new.token    is distinct from old.token) then
      raise exception 'Este link já foi utilizado e não pode ser alterado.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_participants_before_update on public.participants;
create trigger trg_participants_before_update
  before update on public.participants
  for each row execute function public.participants_before_update();

-- ------------------------------------------------------------
-- Config do app (chave de admin). Tabela privada, sem acesso anon.
-- Troque o valor abaixo pela sua chave e coloque a MESMA em
-- VITE_ADMIN_KEY no front. Deixe '' (vazio) para desligar a trava.
-- ------------------------------------------------------------
create table if not exists public.app_config (
  key   text primary key,
  value text not null default ''
);

insert into public.app_config (key, value)
values ('admin_key', 'troque-esta-chave-do-admin')
on conflict (key) do nothing;

create or replace function public.is_admin(p_key text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select value = '' or value = coalesce(p_key, '')
       from public.app_config where key = 'admin_key'),
    false
  );
$$;

-- ============================================================
-- RPCs do ALUNO (token-scoped)
-- ============================================================

-- Retorna só os campos que o aluno pode ver do próprio cadastro.
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
    'submitted_at', submitted_at
  )
  from public.participants
  where token = p_token;
$$;

-- Registra a resposta do aluno. Uma única vez por token.
-- O valor é derivado no servidor (o cliente não define preço).
create or replace function public.submit_response(
  p_token  text,
  p_choice text,
  p_paid   boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.participants;
  v_amount numeric(10,2);
begin
  select * into rec from public.participants where token = p_token;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  if rec.answered then
    return jsonb_build_object('status', 'already_used');
  end if;

  if p_choice = 'blusa' then
    v_amount := 40;
  elsif p_choice = 'blusa_short' then
    v_amount := 70;
  else
    return jsonb_build_object('status', 'invalid_choice');
  end if;

  update public.participants
     set choice   = p_choice,
         amount   = v_amount,
         paid     = coalesce(p_paid, false),
         answered = true
   where token = p_token and answered = false;

  return jsonb_build_object('status', 'ok', 'amount', v_amount);
end;
$$;

-- ============================================================
-- RPCs do ADMIN (protegidas por chave)
-- ============================================================

create or replace function public.admin_list_participants(p_key text)
returns setof public.participants
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.is_admin(p_key) then
    raise exception 'unauthorized';
  end if;
  return query
    select * from public.participants
    order by answered asc, name asc;
end;
$$;

create or replace function public.admin_create_participant(p_key text, p_name text)
returns public.participants
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.participants;
begin
  if not public.is_admin(p_key) then
    raise exception 'unauthorized';
  end if;
  if coalesce(btrim(p_name), '') = '' then
    raise exception 'Nome é obrigatório.';
  end if;
  insert into public.participants (name)
  values (btrim(p_name))
  returning * into rec;
  return rec;
end;
$$;

create or replace function public.admin_update_name(p_key text, p_id uuid, p_name text)
returns public.participants
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.participants;
begin
  if not public.is_admin(p_key) then
    raise exception 'unauthorized';
  end if;
  if coalesce(btrim(p_name), '') = '' then
    raise exception 'Nome é obrigatório.';
  end if;
  update public.participants
     set name = btrim(p_name)
   where id = p_id
  returning * into rec;
  if not found then
    raise exception 'Aluno não encontrado.';
  end if;
  return rec;
end;
$$;

create or replace function public.admin_delete_participant(p_key text, p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(p_key) then
    raise exception 'unauthorized';
  end if;
  delete from public.participants where id = p_id;
  return found;
end;
$$;

-- ------------------------------------------------------------
-- Row Level Security: tranca a tabela.
-- Nenhuma policy de acesso direto para anon/authenticated =>
-- PostgREST nega tudo. O acesso real é só pelas funções acima.
-- ------------------------------------------------------------
alter table public.participants enable row level security;
alter table public.app_config  enable row level security;

revoke all on public.participants from anon, authenticated;
revoke all on public.app_config  from anon, authenticated;

-- Permite chamar apenas as RPCs.
grant execute on function public.get_participant_by_token(text)      to anon, authenticated;
grant execute on function public.submit_response(text, text, boolean) to anon, authenticated;
grant execute on function public.admin_list_participants(text)        to anon, authenticated;
grant execute on function public.admin_create_participant(text, text) to anon, authenticated;
grant execute on function public.admin_update_name(text, uuid, text)  to anon, authenticated;
grant execute on function public.admin_delete_participant(text, uuid) to anon, authenticated;

-- ------------------------------------------------------------
-- Seed: só roda quando a tabela está vazia (bootstrap único).
-- Tokens são gerados pelo trigger de insert.
-- ------------------------------------------------------------
insert into public.participants (name)
select v.name
from (values
  ('Ana Beatriz Ramos'), ('Ana Gabrielly'), ('Ana Kellen'), ('Angela Nicole'),
  ('Antônia Isnaely'), ('Antônia Suellen'), ('Antônio Paulo Vitor'), ('Antônio Ravi'),
  ('Benedito Benicio'), ('Bruna Martins'), ('Carlos Filipe Alves'), ('Carlos Gabriel'),
  ('Caylanne Coelho'), ('Clara de Oliveira'), ('Daniele da Costa'), ('Dante Santos'),
  ('Emanuela Alves'), ('Enzo Renan'), ('Fernanda Paloma'), ('Francisca Cibelle'),
  ('Francisco Ray'), ('Giovanna'), ('Gustavo'), ('Iasmin Ferreira'),
  ('Isabele da Silva'), ('João Ézio Silva'), ('Júlia Ribeiro'), ('Leorgenis Jesus'),
  ('Leticia'), ('Lorrane da Silva'), ('Luan Rodrigues'), ('Luiz Augusto'),
  ('Marcus Alberto'), ('Maria Angelina'), ('Maria Clara de Sousa'), ('Maria Clara Rodrigues'),
  ('Maria Fernanda Silva'), ('Maria Paula'), ('Maysa'), ('Nícolas'),
  ('Ricardo'), ('Ruan Carlos'), ('Stefany Penellope'), ('Vinícius'),
  ('Yvanderson'), ('Gabrielly Vieira'), ('Talisson 2')
) as v(name)
where not exists (select 1 from public.participants);

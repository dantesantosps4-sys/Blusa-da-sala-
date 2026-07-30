-- ============================================================
-- Blusas da Turma — 0003: rastreio de compartilhamento de links
-- Idempotente. Depende da 0002 (arquitetura por token).
-- ============================================================

-- ------------------------------------------------------------
-- Novas colunas
-- ------------------------------------------------------------
alter table public.participants
  add column if not exists shared boolean not null default false;

alter table public.participants
  add column if not exists shared_at timestamptz;

-- Índice de apoio ao filtro/estatística de compartilhados.
create index if not exists participants_shared_idx
  on public.participants (shared);

-- ------------------------------------------------------------
-- Atualiza o trigger de UPDATE para também carimbar shared_at.
-- Mantém tudo que já existia (carimbo de submitted_at/paid_at e a
-- trava pós-resposta). shared/shared_at NÃO entram na trava, então
-- é possível marcar "compartilhado" mesmo em quem já respondeu.
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

  if new.shared = true and old.shared = false and new.shared_at is null then
    new.shared_at := now();
  elsif new.shared = false then
    new.shared_at := null;
  end if;

  -- trava pós-resposta (não inclui shared/shared_at)
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

-- ------------------------------------------------------------
-- RPC admin: marca um aluno como "link compartilhado".
-- Idempotente: se já estava compartilhado, mantém o shared_at original.
-- ------------------------------------------------------------
create or replace function public.admin_mark_shared(p_key text, p_id uuid)
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

  update public.participants
     set shared = true
   where id = p_id
     and shared = false;

  -- retorna o registro atual (marcado agora ou já marcado antes)
  select * into rec from public.participants where id = p_id;
  if not found then
    raise exception 'Aluno não encontrado.';
  end if;
  return rec;
end;
$$;

grant execute on function public.admin_mark_shared(text, uuid) to anon, authenticated;

-- Etapa 2 - Schema para presentes e confirmacoes
-- Rode no SQL Editor do Supabase

create table if not exists public.presentes (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  created_at timestamptz not null default now(),
  constraint presentes_nome_nao_vazio check (char_length(trim(nome)) > 0)
);

create table if not exists public.confirmacoes (
  id uuid primary key default gen_random_uuid(),
  primeiro_nome text not null,
  presente_nome text not null,
  created_at timestamptz not null default now(),
  constraint confirmacoes_nome_nao_vazio check (char_length(trim(primeiro_nome)) > 0)
);

create table if not exists public.convidadas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  whatsapp text not null,
  token text not null unique default gen_random_uuid()::text,
  status text not null default 'pendente',
  presente_id uuid references public.presentes(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint convidadas_nome_nao_vazio check (char_length(trim(nome)) > 0),
  constraint convidadas_whatsapp_formato check (whatsapp ~ '^[0-9]+$'),
  constraint convidadas_status_valido check (status in ('pendente', 'confirmada'))
);

create unique index if not exists convidadas_presente_id_unico
  on public.convidadas (presente_id)
  where presente_id is not null;

create or replace view public.presentes_reservados as
select presente_id
from public.convidadas
where status = 'confirmada'
  and presente_id is not null;

alter table public.presentes enable row level security;
alter table public.confirmacoes enable row level security;
alter table public.convidadas enable row level security;

grant select on public.presentes_reservados to anon, authenticated;

create or replace function public.request_invite_token()
returns text
language sql
stable
as $$
  select nullif(current_setting('request.headers', true)::json ->> 'x-convite-token', '');
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'presentes' and policyname = 'presentes_select_public'
  ) then
    create policy presentes_select_public
      on public.presentes
      for select
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'presentes' and policyname = 'presentes_insert_authenticated'
  ) then
    create policy presentes_insert_authenticated
      on public.presentes
      for insert
      to authenticated
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'presentes' and policyname = 'presentes_delete_authenticated'
  ) then
    create policy presentes_delete_authenticated
      on public.presentes
      for delete
      to authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'presentes' and policyname = 'presentes_update_authenticated'
  ) then
    create policy presentes_update_authenticated
      on public.presentes
      for update
      to authenticated
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'confirmacoes' and policyname = 'confirmacoes_select_authenticated'
  ) then
    create policy confirmacoes_select_authenticated
      on public.confirmacoes
      for select
      to authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'convidadas' and policyname = 'convidadas_select_authenticated'
  ) then
    create policy convidadas_select_authenticated
      on public.convidadas
      for select
      to authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'convidadas' and policyname = 'convidadas_insert_authenticated'
  ) then
    create policy convidadas_insert_authenticated
      on public.convidadas
      for insert
      to authenticated
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'convidadas' and policyname = 'convidadas_update_authenticated'
  ) then
    create policy convidadas_update_authenticated
      on public.convidadas
      for update
      to authenticated
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'convidadas' and policyname = 'convidadas_delete_authenticated'
  ) then
    create policy convidadas_delete_authenticated
      on public.convidadas
      for delete
      to authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'convidadas' and policyname = 'convidadas_select_anon_por_token'
  ) then
    create policy convidadas_select_anon_por_token
      on public.convidadas
      for select
      to anon
      using (token = public.request_invite_token());
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'convidadas' and policyname = 'convidadas_update_anon_por_token'
  ) then
    create policy convidadas_update_anon_por_token
      on public.convidadas
      for update
      to anon
      using (token = public.request_invite_token())
      with check (token = public.request_invite_token());
  end if;
end $$;

create or replace function public.confirmar_presente(
  p_primeiro_nome text,
  p_presente_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome_presente text;
begin
  if coalesce(trim(p_primeiro_nome), '') = '' then
    raise exception 'Primeiro nome obrigatorio.';
  end if;

  delete from public.presentes
  where id = p_presente_id
  returning nome into v_nome_presente;

  if v_nome_presente is null then
    raise exception 'Este presente nao esta mais disponivel.';
  end if;

  insert into public.confirmacoes (primeiro_nome, presente_nome)
  values (trim(p_primeiro_nome), v_nome_presente);

  return jsonb_build_object('presente_nome', v_nome_presente);
end;
$$;

grant execute on function public.confirmar_presente(text, uuid) to anon, authenticated;

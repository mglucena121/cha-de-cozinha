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

alter table public.presentes enable row level security;
alter table public.confirmacoes enable row level security;

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
    select 1 from pg_policies where schemaname = 'public' and tablename = 'confirmacoes' and policyname = 'confirmacoes_select_authenticated'
  ) then
    create policy confirmacoes_select_authenticated
      on public.confirmacoes
      for select
      to authenticated
      using (true);
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

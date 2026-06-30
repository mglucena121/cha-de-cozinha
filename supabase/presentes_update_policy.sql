-- Corrige erro 406 ao editar presentes (RLS bloqueava UPDATE)
-- Rode no SQL Editor do Supabase se a policy ainda não existir

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'presentes'
      and policyname = 'presentes_update_authenticated'
  ) then
    create policy presentes_update_authenticated
      on public.presentes
      for update
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;

-- Execute no SQL Editor do Supabase após criar as tabelas produtos e categorias.
-- Leitura pública do cardápio; escrita somente para usuários autenticados
-- cujo app_metadata.role tenha sido definido como "admin" por um administrador.

alter table public.produtos enable row level security;
alter table public.categorias enable row level security;

drop policy if exists "catalog public read" on public.produtos;
create policy "catalog public read" on public.produtos for select to anon, authenticated using (true);
drop policy if exists "catalog admin insert" on public.produtos;
create policy "catalog admin insert" on public.produtos for insert to authenticated with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
drop policy if exists "catalog admin update" on public.produtos;
create policy "catalog admin update" on public.produtos for update to authenticated using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin') with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
drop policy if exists "catalog admin delete" on public.produtos;
create policy "catalog admin delete" on public.produtos for delete to authenticated using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "catalog public read" on public.categorias;
create policy "catalog public read" on public.categorias for select to anon, authenticated using (true);
drop policy if exists "catalog admin insert" on public.categorias;
create policy "catalog admin insert" on public.categorias for insert to authenticated with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
drop policy if exists "catalog admin update" on public.categorias;
create policy "catalog admin update" on public.categorias for update to authenticated using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin') with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
drop policy if exists "catalog admin delete" on public.categorias;
create policy "catalog admin delete" on public.categorias for delete to authenticated using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Inclui as tabelas na publicação do Realtime caso ainda não estejam nela.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'produtos') then
    alter publication supabase_realtime add table public.produtos;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'categorias') then
    alter publication supabase_realtime add table public.categorias;
  end if;
end $$;

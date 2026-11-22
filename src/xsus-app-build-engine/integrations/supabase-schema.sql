-- DRAFT ONLY: review in a dedicated environment before applying.
-- Requires Supabase Auth and pgcrypto/gen_random_uuid support.
create table if not exists public.xsus_build_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  slug text not null check (slug ~ '^[a-z][a-z0-9-]{1,47}$'),
  manifest jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, slug)
);
alter table public.xsus_build_projects enable row level security;
alter table public.xsus_build_projects force row level security;
create policy "xsus_build_projects_select_owner" on public.xsus_build_projects
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy "xsus_build_projects_insert_owner" on public.xsus_build_projects
  for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "xsus_build_projects_update_owner" on public.xsus_build_projects
  for update to authenticated using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
create policy "xsus_build_projects_delete_owner" on public.xsus_build_projects
  for delete to authenticated using ((select auth.uid()) = owner_id);
-- Explicit Data API grant; RLS still restricts rows by owner.
grant select, insert, update, delete on public.xsus_build_projects to authenticated;
revoke all on public.xsus_build_projects from anon;

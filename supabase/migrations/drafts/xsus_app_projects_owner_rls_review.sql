-- REVIEW DRAFT ONLY — DO NOT APPLY AUTOMATICALLY TO PRODUCTION.
-- XSUS App project ownership prerequisite for Hyper application operations.
-- Confirm existing project schema, creator workflow, grants, and RLS policies
-- before migrating. This draft does NOT enable Hyper plan/build.
begin;

create table if not exists public.xsus_app_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 160),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists xsus_app_projects_owner_id_idx
  on public.xsus_app_projects(owner_id);

alter table public.xsus_app_projects enable row level security;
alter table public.xsus_app_projects force row level security;

-- Explicit grants and RLS: browser users never choose another user's owner_id.
revoke all on public.xsus_app_projects from anon;
grant select, insert, update, delete on public.xsus_app_projects to authenticated;

drop policy if exists xsus_app_projects_select_own on public.xsus_app_projects;
create policy xsus_app_projects_select_own on public.xsus_app_projects
  for select to authenticated using (owner_id = (select auth.uid()));

drop policy if exists xsus_app_projects_insert_own on public.xsus_app_projects;
create policy xsus_app_projects_insert_own on public.xsus_app_projects
  for insert to authenticated with check (owner_id = (select auth.uid()));

drop policy if exists xsus_app_projects_update_own on public.xsus_app_projects;
create policy xsus_app_projects_update_own on public.xsus_app_projects
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists xsus_app_projects_delete_own on public.xsus_app_projects;
create policy xsus_app_projects_delete_own on public.xsus_app_projects
  for delete to authenticated using (owner_id = (select auth.uid()));

commit;

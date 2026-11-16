-- REVIEW DRAFT ONLY: do not run before reviewing existing schema and privileges.
-- Prerequisite: public.xsus_app_projects(id uuid, owner_id uuid) with RLS.
-- Owner and project are both constrained by a composite FK.
begin;

create unique index if not exists xsus_app_projects_id_owner_unique
  on public.xsus_app_projects(id, owner_id);

create table if not exists public.xsus_app_architecture_drafts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  request_id text not null check (request_id ~ '^[A-Za-z0-9_-]{1,128}$'),
  architecture jsonb not null,
  status text not null default 'architecture-draft'
    check (status = 'architecture-draft'),
  created_at timestamptz not null default now(),
  constraint xsus_app_architecture_drafts_project_owner_fk
    foreign key (project_id, owner_id)
    references public.xsus_app_projects(id, owner_id) on delete cascade,
  constraint xsus_app_architecture_drafts_request_unique
    unique (project_id, request_id)
);

create index if not exists xsus_app_architecture_drafts_owner_project_idx
  on public.xsus_app_architecture_drafts(owner_id, project_id);

alter table public.xsus_app_architecture_drafts enable row level security;
alter table public.xsus_app_architecture_drafts force row level security;

revoke all on public.xsus_app_architecture_drafts from anon;
grant select on public.xsus_app_architecture_drafts to authenticated;

drop policy if exists xsus_app_architecture_drafts_select_own
  on public.xsus_app_architecture_drafts;
create policy xsus_app_architecture_drafts_select_own
  on public.xsus_app_architecture_drafts
  for select to authenticated using (owner_id = (select auth.uid()));

-- Writes are server-only via trusted service role after verifying JWT,
-- project ownership and operation permission. No browser insert/update/delete.
commit;

begin;

create table public.xsus_builder_projects (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object' and octet_length(snapshot::text) <= 4194304),
  created_at timestamptz not null default now()
);

create index xsus_builder_projects_owner_created on public.xsus_builder_projects(owner_id, created_at desc, id);
alter table public.xsus_builder_projects enable row level security;
alter table public.xsus_builder_projects force row level security;
revoke all on public.xsus_builder_projects from public, anon, authenticated;
grant select on public.xsus_builder_projects to authenticated;
grant insert (id, owner_id, name, snapshot) on public.xsus_builder_projects to authenticated;
create policy read_own_builder_projects on public.xsus_builder_projects
  for select to authenticated using (owner_id = (select auth.uid()));
create policy save_own_builder_projects on public.xsus_builder_projects
  for insert to authenticated with check (owner_id = (select auth.uid()));

commit;

-- Proposed migration; review and apply explicitly in Supabase.
create table public.logo_projects (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 name text not null check (char_length(name) between 1 and 160),
 document jsonb not null check (jsonb_typeof(document) = 'object' and octet_length(document::text) <= 2000000),
 created_at timestamptz not null default now()
);
alter table public.logo_projects enable row level security;
alter table public.logo_projects force row level security;
create policy logo_owner_access on public.logo_projects for all to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
revoke all on public.logo_projects from anon;
grant select, insert, update, delete on public.logo_projects to authenticated;

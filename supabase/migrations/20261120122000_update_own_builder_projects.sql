begin;

drop policy if exists update_own_builder_projects on public.xsus_builder_projects;
create policy update_own_builder_projects on public.xsus_builder_projects
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

grant update (name, snapshot) on public.xsus_builder_projects to authenticated;

commit;

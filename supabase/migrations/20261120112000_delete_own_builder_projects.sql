begin;

drop policy if exists delete_own_builder_projects on public.xsus_builder_projects;
create policy delete_own_builder_projects on public.xsus_builder_projects
  for delete to authenticated
  using (owner_id = (select auth.uid()));

grant delete on public.xsus_builder_projects to authenticated;

commit;

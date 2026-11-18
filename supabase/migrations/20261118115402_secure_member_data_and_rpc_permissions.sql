-- Private member data: group membership must not expose another member's workouts or body metrics.
drop policy if exists member_data_select_same_group on public.member_data;
create policy member_data_select_own_row on public.member_data
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists member_data_delete_own_row on public.member_data;
create policy member_data_delete_own_row on public.member_data
  for delete to authenticated using (user_id = (select auth.uid()));

revoke all on function public.create_gym_group(text, text) from public, anon;
revoke all on function public.join_gym_group(text, text) from public, anon;
revoke all on function public.remove_gym_member(uuid) from public, anon;
revoke all on function public.is_group_member(uuid) from public, anon;
grant execute on function public.create_gym_group(text, text) to authenticated;
grant execute on function public.join_gym_group(text, text) to authenticated;
grant execute on function public.remove_gym_member(uuid) to authenticated;
grant execute on function public.is_group_member(uuid) to authenticated;
revoke all on function public.rls_auto_enable() from public, anon, authenticated;

alter function public.create_gym_group(text, text) set search_path = pg_catalog, public;
alter function public.join_gym_group(text, text) set search_path = pg_catalog, public;
alter function public.remove_gym_member(uuid) set search_path = pg_catalog, public;
alter function public.is_group_member(uuid) set search_path = pg_catalog, public;
alter function public.rls_auto_enable() set search_path = pg_catalog;

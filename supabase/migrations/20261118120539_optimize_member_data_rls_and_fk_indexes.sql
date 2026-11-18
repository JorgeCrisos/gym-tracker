drop policy if exists member_data_insert_own_row on public.member_data;
create policy member_data_insert_own_row on public.member_data
  for insert to authenticated
  with check (user_id = (select auth.uid()) and is_group_member(group_id));

drop policy if exists member_data_update_own_row on public.member_data;
create policy member_data_update_own_row on public.member_data
  for update to authenticated
  using (user_id = (select auth.uid()) and is_group_member(group_id))
  with check (user_id = (select auth.uid()) and is_group_member(group_id));

create index if not exists groups_created_by_idx on public.groups(created_by);
create index if not exists member_data_user_id_idx on public.member_data(user_id);

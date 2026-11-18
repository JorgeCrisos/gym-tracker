-- Removing group membership must not delete another member's private history.
create or replace function public.remove_gym_member(p_user_id uuid)
returns boolean language plpgsql security definer set search_path=pg_catalog,public
as $function$
declare v_uid uuid:=auth.uid(); v_group_id uuid; v_creator uuid;
begin
 if v_uid is null then raise exception 'Debes iniciar sesión'; end if;
 select gm.group_id into v_group_id from public.group_members gm where gm.user_id=v_uid limit 1;
 if v_group_id is null then raise exception 'No perteneces a ningún grupo'; end if;
 select g.created_by into v_creator from public.groups g where g.id=v_group_id;
 if v_creator<>v_uid then raise exception 'Solo el creador del grupo puede eliminar personas'; end if;
 if p_user_id=v_uid then raise exception 'No puedes eliminarte a ti mismo'; end if;
 delete from public.group_members where group_id=v_group_id and user_id=p_user_id;
 return found;
end; $function$;
revoke all on function public.remove_gym_member(uuid) from public,anon;
grant execute on function public.remove_gym_member(uuid) to authenticated;

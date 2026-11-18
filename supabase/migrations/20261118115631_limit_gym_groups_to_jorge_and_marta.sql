-- One GymLog group has exactly two profiles: Jorge and Marta.
create or replace function public.create_gym_group(p_group_name text,p_display_name text)
returns uuid language plpgsql security definer set search_path=pg_catalog,public
as $function$
declare v_uid uuid:=auth.uid(); v_group_id uuid; v_name text:=initcap(lower(trim(p_display_name)));
begin
 if v_uid is null then raise exception 'Debes iniciar sesión'; end if;
 if exists(select 1 from public.group_members where user_id=v_uid) then raise exception 'Este usuario ya pertenece a un grupo'; end if;
 if nullif(trim(p_group_name),'') is null then raise exception 'El nombre del grupo es obligatorio'; end if;
 if lower(trim(p_display_name)) not in ('jorge','marta') then raise exception 'Elige Jorge o Marta como perfil'; end if;
 insert into public.groups(name,created_by) values(trim(p_group_name),v_uid) returning id into v_group_id;
 insert into public.group_members(group_id,user_id,display_name) values(v_group_id,v_uid,v_name);
 insert into public.shared_data(group_id,routines) values(v_group_id,'[]'::jsonb) on conflict(group_id) do nothing;
 return v_group_id;
end; $function$;
create or replace function public.join_gym_group(p_invite_code text,p_display_name text)
returns uuid language plpgsql security definer set search_path=pg_catalog,public
as $function$
declare v_uid uuid:=auth.uid(); v_group_id uuid; v_name text:=initcap(lower(trim(p_display_name)));
begin
 if v_uid is null then raise exception 'Debes iniciar sesión'; end if;
 if exists(select 1 from public.group_members where user_id=v_uid) then raise exception 'Este usuario ya pertenece a un grupo'; end if;
 if lower(trim(p_display_name)) not in ('jorge','marta') then raise exception 'Elige Jorge o Marta como perfil'; end if;
 select id into v_group_id from public.groups where upper(invite_code)=upper(trim(p_invite_code)) limit 1;
 if v_group_id is null then raise exception 'Código de invitación no válido'; end if;
 if (select count(*) from public.group_members where group_id=v_group_id)>=2 then raise exception 'Este grupo ya tiene dos miembros'; end if;
 if exists(select 1 from public.group_members where group_id=v_group_id and lower(display_name)=lower(v_name)) then raise exception 'Ese perfil ya está ocupado. Elige el otro nombre.'; end if;
 insert into public.group_members(group_id,user_id,display_name) values(v_group_id,v_uid,v_name);
 return v_group_id;
end; $function$;
revoke all on function public.create_gym_group(text,text) from public,anon;
revoke all on function public.join_gym_group(text,text) from public,anon;
grant execute on function public.create_gym_group(text,text) to authenticated;
grant execute on function public.join_gym_group(text,text) to authenticated;

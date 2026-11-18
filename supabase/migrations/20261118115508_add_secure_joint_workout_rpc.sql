-- Initial RPC version; the following migration adds an explicit ON CONFLICT target alias.
create or replace function public.save_gym_workout(
  p_own_workout jsonb,
  p_partner_user_id uuid default null,
  p_partner_workout jsonb default null
)
returns void language plpgsql security definer set search_path = pg_catalog, public
as $function$
declare
  v_uid uuid := auth.uid();
  v_group_id uuid;
  v_own_name text;
  v_partner_name text;
begin
  if v_uid is null then raise exception 'Debes iniciar sesión'; end if;
  if p_own_workout is null or jsonb_typeof(p_own_workout) <> 'object'
     or nullif(p_own_workout->>'id','') is null then raise exception 'Entrenamiento no válido'; end if;
  select gm.group_id, gm.display_name into v_group_id, v_own_name
  from public.group_members gm where gm.user_id = v_uid;
  if v_group_id is null then raise exception 'Primero debes crear o unirte a un grupo'; end if;
  if p_partner_user_id is not null then
    if p_partner_user_id = v_uid or p_partner_workout is null
       or jsonb_typeof(p_partner_workout) <> 'object'
       or coalesce(p_partner_workout->>'id','') <> p_own_workout->>'id' then
      raise exception 'Datos del entrenamiento conjunto no válidos';
    end if;
    select gm.display_name into v_partner_name from public.group_members gm
    where gm.group_id = v_group_id and gm.user_id = p_partner_user_id;
    if v_partner_name is null then raise exception 'La otra persona no pertenece a tu grupo'; end if;
  end if;
  insert into public.member_data(group_id,user_id,display_name,workouts,body_data)
  values(v_group_id,v_uid,v_own_name,jsonb_build_array(p_own_workout),'{}'::jsonb)
  on conflict(group_id,user_id) do update
  set workouts = case when exists(
    select 1 from jsonb_array_elements(coalesce(public.member_data.workouts,'[]'::jsonb)) w
    where w->>'id'=p_own_workout->>'id'
  ) then public.member_data.workouts else coalesce(public.member_data.workouts,'[]'::jsonb)||jsonb_build_array(p_own_workout) end,
  updated_at=now();
  if p_partner_user_id is not null then
    insert into public.member_data(group_id,user_id,display_name,workouts,body_data)
    values(v_group_id,p_partner_user_id,v_partner_name,jsonb_build_array(p_partner_workout),'{}'::jsonb)
    on conflict(group_id,user_id) do update
    set workouts = case when exists(
      select 1 from jsonb_array_elements(coalesce(public.member_data.workouts,'[]'::jsonb)) w
      where w->>'id'=p_partner_workout->>'id'
    ) then public.member_data.workouts else coalesce(public.member_data.workouts,'[]'::jsonb)||jsonb_build_array(p_partner_workout) end,
    updated_at=now();
  end if;
end;
$function$;
revoke all on function public.save_gym_workout(jsonb,uuid,jsonb) from public,anon;
grant execute on function public.save_gym_workout(jsonb,uuid,jsonb) to authenticated;

-- ============================================================
-- RepTrack Pro V2 — Supabase schema / reparación de grupos
-- Ejecutar COMPLETO una vez en Supabase > SQL Editor.
-- Mantiene los datos existentes y corrige las políticas RLS
-- para evitar la recursión de group_members.
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique
    default upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now(),
  unique (group_id, user_id)
);

create table if not exists public.member_data (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  workouts jsonb not null default '[]'::jsonb,
  body_data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.shared_data (
  group_id uuid primary key references public.groups(id) on delete cascade,
  routines jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists idx_group_members_group_id on public.group_members(group_id);
create index if not exists idx_member_data_group_id on public.member_data(group_id);

grant usage on schema public to authenticated;
grant select on public.groups to authenticated;
grant select on public.group_members to authenticated;
grant select, insert, update on public.member_data to authenticated;
grant select, insert, update on public.shared_data to authenticated;

alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.member_data enable row level security;
alter table public.shared_data enable row level security;

-- Helper SECURITY DEFINER: evita la recursión de una política que consulta group_members.
create or replace function public.is_group_member(p_group_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group_id
      and user_id = auth.uid()
  );
$$;

grant execute on function public.is_group_member(uuid) to authenticated;

-- Reemplazamos las políticas antiguas por versiones sin recursión.
drop policy if exists "groups_select_members" on public.groups;
create policy "groups_select_members"
on public.groups for select to authenticated
using (public.is_group_member(id));

drop policy if exists "group_members_select_same_group" on public.group_members;
create policy "group_members_select_same_group"
on public.group_members for select to authenticated
using (public.is_group_member(group_id));

drop policy if exists "member_data_select_same_group" on public.member_data;
create policy "member_data_select_same_group"
on public.member_data for select to authenticated
using (public.is_group_member(group_id));

drop policy if exists "member_data_insert_own_row" on public.member_data;
create policy "member_data_insert_own_row"
on public.member_data for insert to authenticated
with check (user_id = auth.uid() and public.is_group_member(group_id));

drop policy if exists "member_data_update_own_row" on public.member_data;
create policy "member_data_update_own_row"
on public.member_data for update to authenticated
using (user_id = auth.uid() and public.is_group_member(group_id))
with check (user_id = auth.uid() and public.is_group_member(group_id));

drop policy if exists "shared_data_select_same_group" on public.shared_data;
create policy "shared_data_select_same_group"
on public.shared_data for select to authenticated
using (public.is_group_member(group_id));

drop policy if exists "shared_data_insert_same_group" on public.shared_data;
create policy "shared_data_insert_same_group"
on public.shared_data for insert to authenticated
with check (public.is_group_member(group_id));

drop policy if exists "shared_data_update_same_group" on public.shared_data;
create policy "shared_data_update_same_group"
on public.shared_data for update to authenticated
using (public.is_group_member(group_id))
with check (public.is_group_member(group_id));

-- Crear grupo.
create or replace function public.create_gym_group(
  p_group_name text,
  p_display_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_group_id uuid;
begin
  if v_uid is null then raise exception 'Debes iniciar sesión'; end if;
  if exists (select 1 from public.group_members where user_id = v_uid) then
    raise exception 'Este usuario ya pertenece a un grupo';
  end if;
  if nullif(trim(p_group_name), '') is null then raise exception 'El nombre del grupo es obligatorio'; end if;
  if nullif(trim(p_display_name), '') is null then raise exception 'El nombre es obligatorio'; end if;

  insert into public.groups(name, created_by)
  values (trim(p_group_name), v_uid)
  returning id into v_group_id;

  insert into public.group_members(group_id, user_id, display_name)
  values (v_group_id, v_uid, trim(p_display_name));

  insert into public.shared_data(group_id, routines)
  values (v_group_id, '[]'::jsonb)
  on conflict (group_id) do nothing;

  return v_group_id;
end;
$$;

grant execute on function public.create_gym_group(text, text) to authenticated;

-- Unirse mediante código.
create or replace function public.join_gym_group(
  p_invite_code text,
  p_display_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_group_id uuid;
begin
  if v_uid is null then raise exception 'Debes iniciar sesión'; end if;
  if exists (select 1 from public.group_members where user_id = v_uid) then
    raise exception 'Este usuario ya pertenece a un grupo';
  end if;
  if nullif(trim(p_display_name), '') is null then raise exception 'El nombre es obligatorio'; end if;

  select id into v_group_id
  from public.groups
  where upper(invite_code) = upper(trim(p_invite_code))
  limit 1;

  if v_group_id is null then raise exception 'Código de invitación no válido'; end if;

  insert into public.group_members(group_id, user_id, display_name)
  values (v_group_id, v_uid, trim(p_display_name));

  return v_group_id;
end;
$$;

grant execute on function public.join_gym_group(text, text) to authenticated;

-- Cambiar el nombre visible del usuario dentro de su grupo.
create or replace function public.update_gym_member_name(p_display_name text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_group_id uuid;
begin
  if v_uid is null then raise exception 'Debes iniciar sesión'; end if;
  if nullif(trim(p_display_name), '') is null then raise exception 'El nombre es obligatorio'; end if;
  select group_id into v_group_id from public.group_members where user_id=v_uid limit 1;
  if v_group_id is null then raise exception 'No perteneces a ningún grupo'; end if;
  update public.group_members set display_name=trim(p_display_name) where user_id=v_uid and group_id=v_group_id;
  update public.member_data set display_name=trim(p_display_name) where user_id=v_uid and group_id=v_group_id;
  return true;
end;
$$;

grant execute on function public.update_gym_member_name(text) to authenticated;

-- El creador del grupo puede eliminar a otro miembro sin borrar su cuenta de Supabase.
create or replace function public.remove_gym_member(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_group_id uuid;
  v_creator uuid;
begin
  if v_uid is null then raise exception 'Debes iniciar sesión'; end if;

  select gm.group_id into v_group_id
  from public.group_members gm
  where gm.user_id = v_uid
  limit 1;

  if v_group_id is null then raise exception 'No perteneces a ningún grupo'; end if;

  select created_by into v_creator from public.groups where id = v_group_id;
  if v_creator <> v_uid then raise exception 'Solo el creador del grupo puede eliminar personas'; end if;
  if p_user_id = v_uid then raise exception 'No puedes eliminarte a ti mismo'; end if;

  delete from public.member_data where group_id = v_group_id and user_id = p_user_id;
  delete from public.group_members where group_id = v_group_id and user_id = p_user_id;
  return true;
end;
$$;

grant execute on function public.remove_gym_member(uuid) to authenticated;

-- Realtime.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='member_data') then
    alter publication supabase_realtime add table public.member_data;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='shared_data') then
    alter publication supabase_realtime add table public.shared_data;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='group_members') then
    alter publication supabase_realtime add table public.group_members;
  end if;
end $$;

-- ============================================================
-- FIN RepTrack Pro V2
-- ============================================================

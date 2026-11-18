create extension if not exists pgcrypto;

create table public.gymlog_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null check (char_length(display_name) between 1 and 60),
 created_at timestamptz not null default now()
);
create table public.gymlog_groups (
 id uuid primary key default gen_random_uuid(),
 created_by uuid not null references auth.users(id) on delete restrict,
 name text not null default 'GymLog',
 created_at timestamptz not null default now()
);
create table public.gymlog_group_members (
 group_id uuid not null references public.gymlog_groups(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 member_role text not null default 'member' check (member_role in ('owner','member')),
 joined_at timestamptz not null default now(),
 primary key (group_id,user_id)
);
create table public.gymlog_routines (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 title text not null check (char_length(title) between 1 and 100),
 description text not null default '',
 is_shared boolean not null default false,
 created_at timestamptz not null default now()
);
create table public.gymlog_routine_exercises (
 id uuid primary key default gen_random_uuid(),
 routine_id uuid not null references public.gymlog_routines(id) on delete cascade,
 position integer not null check (position >= 0),
 exercise_name text not null check (char_length(exercise_name) between 1 and 120),
 target_sets integer not null default 3 check (target_sets between 1 and 30),
 target_reps text not null default '8-12',
 rest_seconds integer not null default 90 check (rest_seconds between 0 and 3600),
 unique (routine_id,position)
);
create table public.gymlog_sessions (
 id uuid primary key default gen_random_uuid(),
 created_by uuid not null references auth.users(id) on delete restrict,
 group_id uuid references public.gymlog_groups(id) on delete set null,
 session_mode text not null check (session_mode in ('individual','joint')),
 started_at timestamptz not null default now(),
 finished_at timestamptz,
 session_note text not null default '',
 check (finished_at is null or finished_at >= started_at)
);
create table public.gymlog_session_participants (
 session_id uuid not null references public.gymlog_sessions(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 added_at timestamptz not null default now(),
 primary key (session_id,user_id)
);
create table public.gymlog_sets (
 id uuid primary key default gen_random_uuid(),
 session_id uuid not null references public.gymlog_sessions(id) on delete cascade,
 owner_id uuid not null references auth.users(id) on delete cascade,
 exercise_name text not null check (char_length(exercise_name) between 1 and 120),
 set_number integer not null check (set_number > 0),
 weight_kg numeric(7,2) not null default 0 check (weight_kg >= 0),
 repetitions integer not null check (repetitions >= 0),
 rpe numeric(3,1) check (rpe between 1 and 10),
 rest_seconds integer not null default 90 check (rest_seconds between 0 and 3600),
 notes text not null default '',
 created_at timestamptz not null default now()
);
create table public.gymlog_goals (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 title text not null check (char_length(title) between 1 and 160),
 target_value numeric(12,2) not null check (target_value > 0),
 current_value numeric(12,2) not null default 0 check (current_value >= 0),
 unit text not null default 'sessions',
 due_date date,
 completed_at timestamptz,
 created_at timestamptz not null default now()
);
create table public.gymlog_body_metrics (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 measured_on date not null default current_date,
 body_weight_kg numeric(6,2) check (body_weight_kg > 0),
 waist_cm numeric(6,2) check (waist_cm > 0),
 chest_cm numeric(6,2) check (chest_cm > 0),
 hips_cm numeric(6,2) check (hips_cm > 0),
 notes text not null default '',
 created_at timestamptz not null default now()
);
create table public.gymlog_recovery_logs (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 logged_on date not null default current_date,
 sleep_hours numeric(3,1) check (sleep_hours between 0 and 24),
 feeling smallint check (feeling between 1 and 5),
 fatigue smallint check (fatigue between 1 and 10),
 notes text not null default '',
 created_at timestamptz not null default now()
);
create table public.gymlog_progress_photos (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 storage_path text not null unique,
 captured_on date not null default current_date,
 notes text not null default '',
 created_at timestamptz not null default now()
);

create index gymlog_sessions_owner_date_idx on public.gymlog_sessions(created_by,started_at desc);
create index gymlog_sets_owner_date_idx on public.gymlog_sets(owner_id,created_at desc);
create index gymlog_sets_session_owner_idx on public.gymlog_sets(session_id,owner_id);
create index gymlog_metrics_owner_date_idx on public.gymlog_body_metrics(owner_id,measured_on desc);
create index gymlog_recovery_owner_date_idx on public.gymlog_recovery_logs(owner_id,logged_on desc);

alter table public.gymlog_profiles enable row level security;
alter table public.gymlog_groups enable row level security;
alter table public.gymlog_group_members enable row level security;
alter table public.gymlog_routines enable row level security;
alter table public.gymlog_routine_exercises enable row level security;
alter table public.gymlog_sessions enable row level security;
alter table public.gymlog_session_participants enable row level security;
alter table public.gymlog_sets enable row level security;
alter table public.gymlog_goals enable row level security;
alter table public.gymlog_body_metrics enable row level security;
alter table public.gymlog_recovery_logs enable row level security;
alter table public.gymlog_progress_photos enable row level security;

create policy profile_select_own on public.gymlog_profiles for select to authenticated using ((select auth.uid())=user_id);
create policy profile_insert_own on public.gymlog_profiles for insert to authenticated with check ((select auth.uid())=user_id);
create policy profile_update_own on public.gymlog_profiles for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);

create policy groups_select_member on public.gymlog_groups for select to authenticated using (created_by=(select auth.uid()) or exists(select 1 from public.gymlog_group_members m where m.group_id=id and m.user_id=(select auth.uid())));
create policy groups_insert_own on public.gymlog_groups for insert to authenticated with check (created_by=(select auth.uid()));
create policy groups_update_own on public.gymlog_groups for update to authenticated using (created_by=(select auth.uid())) with check (created_by=(select auth.uid()));
create policy members_select_self on public.gymlog_group_members for select to authenticated using (user_id=(select auth.uid()));
create policy members_insert_self on public.gymlog_group_members for insert to authenticated with check (user_id=(select auth.uid()) and exists(select 1 from public.gymlog_groups g where g.id=group_id and g.created_by=(select auth.uid())));
create policy members_delete_self on public.gymlog_group_members for delete to authenticated using (user_id=(select auth.uid()));

create policy routines_select_owner_or_shared on public.gymlog_routines for select to authenticated using (
 owner_id=(select auth.uid()) or (is_shared and exists(select 1 from public.gymlog_group_members a join public.gymlog_group_members b on b.group_id=a.group_id where a.user_id=(select auth.uid()) and b.user_id=owner_id))
);
create policy routines_insert_own on public.gymlog_routines for insert to authenticated with check (owner_id=(select auth.uid()));
create policy routines_update_own on public.gymlog_routines for update to authenticated using (owner_id=(select auth.uid())) with check (owner_id=(select auth.uid()));
create policy routines_delete_own on public.gymlog_routines for delete to authenticated using (owner_id=(select auth.uid()));
create policy routine_exercises_select_visible on public.gymlog_routine_exercises for select to authenticated using (exists(select 1 from public.gymlog_routines r where r.id=routine_id and (r.owner_id=(select auth.uid()) or (r.is_shared and exists(select 1 from public.gymlog_group_members a join public.gymlog_group_members b on b.group_id=a.group_id where a.user_id=(select auth.uid()) and b.user_id=r.owner_id)))));
create policy routine_exercises_insert_owner on public.gymlog_routine_exercises for insert to authenticated with check (exists(select 1 from public.gymlog_routines r where r.id=routine_id and r.owner_id=(select auth.uid())));
create policy routine_exercises_update_owner on public.gymlog_routine_exercises for update to authenticated using (exists(select 1 from public.gymlog_routines r where r.id=routine_id and r.owner_id=(select auth.uid()))) with check (exists(select 1 from public.gymlog_routines r where r.id=routine_id and r.owner_id=(select auth.uid())));
create policy routine_exercises_delete_owner on public.gymlog_routine_exercises for delete to authenticated using (exists(select 1 from public.gymlog_routines r where r.id=routine_id and r.owner_id=(select auth.uid())));

create policy sessions_select_participant on public.gymlog_sessions for select to authenticated using (created_by=(select auth.uid()) or exists(select 1 from public.gymlog_session_participants p where p.session_id=id and p.user_id=(select auth.uid())));
create policy sessions_insert_creator on public.gymlog_sessions for insert to authenticated with check (created_by=(select auth.uid()));
create policy sessions_update_creator on public.gymlog_sessions for update to authenticated using (created_by=(select auth.uid())) with check (created_by=(select auth.uid()));
create policy sessions_delete_creator on public.gymlog_sessions for delete to authenticated using (created_by=(select auth.uid()));
create policy participants_select_self_or_creator on public.gymlog_session_participants for select to authenticated using (user_id=(select auth.uid()) or exists(select 1 from public.gymlog_sessions s where s.id=session_id and s.created_by=(select auth.uid())));
create policy participants_insert_creator on public.gymlog_session_participants for insert to authenticated with check (exists(select 1 from public.gymlog_sessions s where s.id=session_id and s.created_by=(select auth.uid())) and (user_id=(select auth.uid()) or exists(select 1 from public.gymlog_sessions s join public.gymlog_group_members a on a.group_id=s.group_id and a.user_id=s.created_by join public.gymlog_group_members b on b.group_id=s.group_id and b.user_id=user_id where s.id=session_id and s.created_by=(select auth.uid()) and s.session_mode='joint')));
create policy participants_delete_creator on public.gymlog_session_participants for delete to authenticated using (exists(select 1 from public.gymlog_sessions s where s.id=session_id and s.created_by=(select auth.uid())));

create policy sets_select_owner on public.gymlog_sets for select to authenticated using (owner_id=(select auth.uid()));
create policy sets_insert_self on public.gymlog_sets for insert to authenticated with check (owner_id=(select auth.uid()) and exists(select 1 from public.gymlog_session_participants p where p.session_id=session_id and p.user_id=(select auth.uid())));
create policy sets_update_owner on public.gymlog_sets for update to authenticated using (owner_id=(select auth.uid())) with check (owner_id=(select auth.uid()));
create policy sets_delete_owner on public.gymlog_sets for delete to authenticated using (owner_id=(select auth.uid()));
create policy goals_owner_all on public.gymlog_goals for all to authenticated using (owner_id=(select auth.uid())) with check (owner_id=(select auth.uid()));
create policy metrics_owner_all on public.gymlog_body_metrics for all to authenticated using (owner_id=(select auth.uid())) with check (owner_id=(select auth.uid()));
create policy recovery_owner_all on public.gymlog_recovery_logs for all to authenticated using (owner_id=(select auth.uid())) with check (owner_id=(select auth.uid()));
create policy photos_owner_all on public.gymlog_progress_photos for all to authenticated using (owner_id=(select auth.uid())) with check (owner_id=(select auth.uid()));

create schema gymlog_private;
revoke all on schema gymlog_private from public,anon,authenticated;
create function gymlog_private.record_joint_set(p_session_id uuid,p_owner_id uuid,p_exercise_name text,p_set_number integer,p_weight_kg numeric,p_repetitions integer,p_rpe numeric default null,p_rest_seconds integer default 90,p_notes text default '')
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if not exists(select 1 from public.gymlog_sessions s join public.gymlog_session_participants p on p.session_id=s.id and p.user_id=p_owner_id where s.id=p_session_id and s.created_by=auth.uid() and s.session_mode='joint' and s.finished_at is null) then raise exception 'Not allowed'; end if;
 insert into public.gymlog_sets(session_id,owner_id,exercise_name,set_number,weight_kg,repetitions,rpe,rest_seconds,notes)
 values(p_session_id,p_owner_id,p_exercise_name,p_set_number,p_weight_kg,p_repetitions,p_rpe,p_rest_seconds,coalesce(p_notes,'')) returning id into v_id;
 return v_id;
end; $$;
revoke all on function gymlog_private.record_joint_set(uuid,uuid,text,integer,numeric,integer,numeric,integer,text) from public,anon,authenticated;
grant usage on schema gymlog_private to authenticated;
grant execute on function gymlog_private.record_joint_set(uuid,uuid,text,integer,numeric,integer,numeric,integer,text) to authenticated;

grant select,insert,update,delete on public.gymlog_profiles,public.gymlog_groups,public.gymlog_group_members,public.gymlog_routines,public.gymlog_routine_exercises,public.gymlog_sessions,public.gymlog_session_participants,public.gymlog_sets,public.gymlog_goals,public.gymlog_body_metrics,public.gymlog_recovery_logs,public.gymlog_progress_photos to authenticated;
revoke all on public.gymlog_profiles,public.gymlog_groups,public.gymlog_group_members,public.gymlog_routines,public.gymlog_routine_exercises,public.gymlog_sessions,public.gymlog_session_participants,public.gymlog_sets,public.gymlog_goals,public.gymlog_body_metrics,public.gymlog_recovery_logs,public.gymlog_progress_photos from anon;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('gymlog-progress','gymlog-progress',false,10485760,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy gymlog_photo_select_own on storage.objects for select to authenticated using(bucket_id='gymlog-progress' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy gymlog_photo_insert_own on storage.objects for insert to authenticated with check(bucket_id='gymlog-progress' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy gymlog_photo_update_own on storage.objects for update to authenticated using(bucket_id='gymlog-progress' and (storage.foldername(name))[1]=(select auth.uid())::text) with check(bucket_id='gymlog-progress' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy gymlog_photo_delete_own on storage.objects for delete to authenticated using(bucket_id='gymlog-progress' and (storage.foldername(name))[1]=(select auth.uid())::text);

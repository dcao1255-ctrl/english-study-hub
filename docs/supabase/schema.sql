-- 在 Supabase SQL Editor 中执行。
-- 本脚本只创建结构与权限，不包含任何真实学生数据。

create table if not exists public.student_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  stage text not null default '',
  grade text not null default '',
  city text not null default '',
  plan_month text not null default '',
  current_focus text not null default '',
  storage_folder text unique,
  ability_scores jsonb not null default '{}'::jsonb,
  diagnosis jsonb not null default '[]'::jsonb,
  lessons jsonb not null default '[]'::jsonb,
  error_book jsonb not null default '[]'::jsonb,
  phrase_notes jsonb not null default '[]'::jsonb,
  plan jsonb not null default '[]'::jsonb,
  materials jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ability_scores_is_object check (jsonb_typeof(ability_scores) = 'object'),
  constraint diagnosis_is_array check (jsonb_typeof(diagnosis) = 'array'),
  constraint lessons_is_array check (jsonb_typeof(lessons) = 'array'),
  constraint error_book_is_array check (jsonb_typeof(error_book) = 'array'),
  constraint phrase_notes_is_array check (jsonb_typeof(phrase_notes) = 'array'),
  constraint plan_is_array check (jsonb_typeof(plan) = 'array'),
  constraint materials_is_array check (jsonb_typeof(materials) = 'array')
);

alter table public.student_profiles enable row level security;
revoke all on table public.student_profiles from anon;
grant select on table public.student_profiles to authenticated;

drop policy if exists "students_read_own_profile" on public.student_profiles;
create policy "students_read_own_profile"
on public.student_profiles
for select
to authenticated
using ((select auth.uid()) = id);

-- 不创建 insert/update/delete policy：学生端默认没有写权限。

create or replace function public.set_student_profile_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_student_profile_updated_at on public.student_profiles;
create trigger set_student_profile_updated_at
before update on public.student_profiles
for each row execute function public.set_student_profile_updated_at();

create table if not exists public.student_plan_progress (
  student_id uuid not null references auth.users(id) on delete cascade,
  task_key text not null,
  progress smallint not null default 0 check (progress between 0 and 100),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (student_id, task_key)
);

alter table public.student_plan_progress enable row level security;
revoke all on table public.student_plan_progress from anon;
grant select, insert, update on table public.student_plan_progress to authenticated;

drop policy if exists "students_read_own_progress" on public.student_plan_progress;
create policy "students_read_own_progress"
on public.student_plan_progress
for select
to authenticated
using ((select auth.uid()) = student_id);

drop policy if exists "students_insert_own_progress" on public.student_plan_progress;
create policy "students_insert_own_progress"
on public.student_plan_progress
for insert
to authenticated
with check ((select auth.uid()) = student_id);

drop policy if exists "students_update_own_progress" on public.student_plan_progress;
create policy "students_update_own_progress"
on public.student_plan_progress
for update
to authenticated
using ((select auth.uid()) = student_id)
with check ((select auth.uid()) = student_id);

drop trigger if exists set_student_plan_progress_updated_at on public.student_plan_progress;
create trigger set_student_plan_progress_updated_at
before update on public.student_plan_progress
for each row execute function public.set_student_profile_updated_at();

-- 私有 PDF：默认使用 Auth UUID，也可为学生档案绑定唯一的 storage_folder。
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'student-materials',
  'student-materials',
  false,
  52428800,
  array['application/pdf']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "students_read_own_materials" on storage.objects;
create policy "students_read_own_materials"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'student-materials'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or exists (
      select 1
      from public.student_profiles as profile
      where profile.id = (select auth.uid())
        and profile.storage_folder = (storage.foldername(name))[1]
    )
  )
);

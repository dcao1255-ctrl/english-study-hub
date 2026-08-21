-- Study Hub v2 增量升级
-- 在已运行旧版 supabase/schema.sql 的项目中执行。
-- 本脚本只升级结构与权限，不包含真实学生资料。

begin;

alter table public.student_profiles
add column if not exists materials jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.student_profiles'::regclass
      and conname = 'materials_is_array'
  ) then
    alter table public.student_profiles
    add constraint materials_is_array
    check (jsonb_typeof(materials) = 'array');
  end if;
end
$$;

alter table public.student_profiles enable row level security;
revoke all on table public.student_profiles from anon;
grant select on table public.student_profiles to authenticated;

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
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

commit;

-- 验证：应返回 progress_rls = true、materials_bucket_public = false。
select
  c.relrowsecurity as progress_rls,
  b.public as materials_bucket_public
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
cross join storage.buckets b
where n.nspname = 'public'
  and c.relname = 'student_plan_progress'
  and b.id = 'student-materials';

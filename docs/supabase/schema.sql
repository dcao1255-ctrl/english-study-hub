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
  ability_scores jsonb not null default '{}'::jsonb,
  diagnosis jsonb not null default '[]'::jsonb,
  lessons jsonb not null default '[]'::jsonb,
  error_book jsonb not null default '[]'::jsonb,
  phrase_notes jsonb not null default '[]'::jsonb,
  plan jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ability_scores_is_object check (jsonb_typeof(ability_scores) = 'object'),
  constraint diagnosis_is_array check (jsonb_typeof(diagnosis) = 'array'),
  constraint lessons_is_array check (jsonb_typeof(lessons) = 'array'),
  constraint error_book_is_array check (jsonb_typeof(error_book) = 'array'),
  constraint phrase_notes_is_array check (jsonb_typeof(phrase_notes) = 'array'),
  constraint plan_is_array check (jsonb_typeof(plan) = 'array')
);

alter table public.student_profiles enable row level security;

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


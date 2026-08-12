-- 逐光英语：综合学习资料、跟读录音与学习打卡
-- 执行位置：Supabase Dashboard > SQL Editor
-- 安全说明：媒体与学生录音使用私有 bucket；所有学生数据均启用 RLS。

begin;

create table if not exists public.learning_resources (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  collection_slug text references public.learning_resources(slug) on delete set null,
  title text not null,
  series text not null,
  level text not null default '综合',
  unit_label text,
  stage text not null default '综合学习',
  track text not null default 'foundation',
  resource_type text not null default 'mixed',
  format_label text not null default '在线学习',
  skills text[] not null default '{}',
  description text not null default '',
  rights_status text not null default '待确认授权',
  visibility text not null default 'catalog',
  storage_bucket text,
  storage_path text,
  media_kind text,
  duration_seconds integer,
  sort_order integer not null default 100,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint learning_resources_visibility_check
    check (visibility in ('catalog', 'authenticated')),
  constraint learning_resources_type_check
    check (resource_type in ('mixed', 'audio', 'video', 'reading')),
  constraint learning_resources_media_kind_check
    check (media_kind is null or media_kind in ('audio', 'video', 'document')),
  constraint learning_resources_duration_check
    check (duration_seconds is null or duration_seconds >= 0),
  constraint learning_resources_storage_pair_check
    check (
      (storage_bucket is null and storage_path is null)
      or (nullif(btrim(storage_bucket), '') is not null and nullif(btrim(storage_path), '') is not null)
    )
);

create table if not exists public.resource_segments (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.learning_resources(id) on delete cascade,
  sort_order integer not null,
  transcript text not null,
  start_seconds numeric(10, 3) not null default 0,
  end_seconds numeric(10, 3),
  created_at timestamptz not null default now(),
  constraint resource_segments_order_unique unique (resource_id, sort_order),
  constraint resource_segments_time_check
    check (start_seconds >= 0 and (end_seconds is null or end_seconds > start_seconds))
);

create table if not exists public.practice_logs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  resource_id uuid not null references public.learning_resources(id) on delete cascade,
  activity_type text not null,
  progress smallint not null,
  self_rating text not null,
  reflection text not null,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint practice_logs_activity_check
    check (activity_type in ('listening', 'follow_reading', 'reading', 'video')),
  constraint practice_logs_progress_check
    check (progress between 0 and 100),
  constraint practice_logs_rating_check
    check (self_rating in ('easy', 'just_right', 'challenging', 'need_help')),
  constraint practice_logs_reflection_check
    check (char_length(reflection) between 1 and 500)
);

create table if not exists public.speaking_recordings (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  resource_id uuid not null references public.learning_resources(id) on delete cascade,
  segment_id uuid references public.resource_segments(id) on delete set null,
  storage_path text not null unique,
  mime_type text not null,
  duration_seconds integer,
  created_at timestamptz not null default now(),
  constraint speaking_recordings_duration_check
    check (duration_seconds is null or duration_seconds >= 0)
);

create index if not exists resource_segments_resource_order_idx
  on public.resource_segments (resource_id, sort_order);
create index if not exists learning_resources_collection_order_idx
  on public.learning_resources (collection_slug, sort_order);
create index if not exists practice_logs_student_time_idx
  on public.practice_logs (student_id, completed_at desc);
create index if not exists speaking_recordings_student_time_idx
  on public.speaking_recordings (student_id, created_at desc);

alter table public.learning_resources enable row level security;
alter table public.resource_segments enable row level security;
alter table public.practice_logs enable row level security;
alter table public.speaking_recordings enable row level security;

revoke all on table public.learning_resources from anon, authenticated;
revoke all on table public.resource_segments from anon, authenticated;
revoke all on table public.practice_logs from anon, authenticated;
revoke all on table public.speaking_recordings from anon, authenticated;

grant select on table public.learning_resources to anon, authenticated;
grant select on table public.resource_segments to anon, authenticated;
grant select, insert, update on table public.practice_logs to authenticated;
grant select, insert on table public.speaking_recordings to authenticated;

drop policy if exists "learning_resources_public_catalog" on public.learning_resources;
create policy "learning_resources_public_catalog"
on public.learning_resources
for select
to anon, authenticated
using (is_published = true and visibility = 'catalog');

drop policy if exists "learning_resources_signed_in" on public.learning_resources;
create policy "learning_resources_signed_in"
on public.learning_resources
for select
to authenticated
using (is_published = true and visibility = 'authenticated');

drop policy if exists "resource_segments_visible_parent" on public.resource_segments;
create policy "resource_segments_visible_parent"
on public.resource_segments
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.learning_resources resource
    where resource.id = resource_segments.resource_id
      and resource.is_published = true
      and (
        resource.visibility = 'catalog'
        or (auth.uid() is not null and resource.visibility = 'authenticated')
      )
  )
);

drop policy if exists "practice_logs_select_own" on public.practice_logs;
create policy "practice_logs_select_own"
on public.practice_logs
for select
to authenticated
using (student_id = auth.uid());

drop policy if exists "practice_logs_insert_own" on public.practice_logs;
create policy "practice_logs_insert_own"
on public.practice_logs
for insert
to authenticated
with check (student_id = auth.uid());

drop policy if exists "practice_logs_update_own" on public.practice_logs;
create policy "practice_logs_update_own"
on public.practice_logs
for update
to authenticated
using (student_id = auth.uid())
with check (student_id = auth.uid());

drop policy if exists "speaking_recordings_select_own" on public.speaking_recordings;
create policy "speaking_recordings_select_own"
on public.speaking_recordings
for select
to authenticated
using (student_id = auth.uid());

drop policy if exists "speaking_recordings_insert_own" on public.speaking_recordings;
create policy "speaking_recordings_insert_own"
on public.speaking_recordings
for insert
to authenticated
with check (student_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'learning-media',
  'learning-media',
  false,
  209715200,
  array[
    'application/pdf',
    'audio/mpeg',
    'audio/mp4',
    'audio/webm',
    'audio/ogg',
    'video/mp4',
    'text/plain'
  ]
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'student-recordings',
  'student-recordings',
  false,
  26214400,
  array['audio/mpeg', 'audio/mp4', 'audio/webm', 'audio/ogg']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "learning_media_signed_in_read" on storage.objects;
create policy "learning_media_signed_in_read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'learning-media'
  and exists (
    select 1
    from public.learning_resources resource
    where resource.storage_bucket = storage.objects.bucket_id
      and resource.storage_path = storage.objects.name
      and resource.is_published = true
      and resource.visibility in ('catalog', 'authenticated')
  )
);

drop policy if exists "student_recordings_insert_own_folder" on storage.objects;
create policy "student_recordings_insert_own_folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'student-recordings'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "student_recordings_select_own_folder" on storage.objects;
create policy "student_recordings_select_own_folder"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'student-recordings'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "student_recordings_delete_own_folder" on storage.objects;
create policy "student_recordings_delete_own_folder"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'student-recordings'
  and (storage.foldername(name))[1] = auth.uid()::text
);

commit;

-- 验证：四张表均应显示 RLS=true，两个 bucket 均应显示 public=false。
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('learning_resources', 'resource_segments', 'practice_logs', 'speaking_recordings')
order by c.relname;

select id, public, file_size_limit
from storage.buckets
where id in ('learning-media', 'student-recordings')
order by id;

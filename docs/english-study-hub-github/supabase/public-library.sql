-- 逐光英语：五大模块动态公开资料库
-- 在 Supabase SQL Editor 中完整运行一次。
-- 本脚本不会修改学生档案、私人 PDF 或任务进度。

begin;

create table if not exists public.public_learning_resources (
  id bigint generated always as identity primary key,
  module_key text not null,
  resource_type text not null default '学习资料',
  title text not null,
  level text not null default '全阶段',
  description text not null default '',
  access_label text not null default '在线查看',
  external_url text,
  storage_path text,
  sort_order integer not null default 100,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  constraint public_learning_resources_module_check
    check (module_key in ('zhongkao', 'gaokao', 'kaoyan', 'ielts', 'toefl')),
  constraint public_learning_resources_source_check
    check (
      nullif(btrim(coalesce(external_url, '')), '') is not null
      or nullif(btrim(coalesce(storage_path, '')), '') is not null
    )
);

alter table public.public_learning_resources enable row level security;

revoke all on table public.public_learning_resources from anon, authenticated;
grant select on table public.public_learning_resources to anon, authenticated;

drop policy if exists "published_resources_are_public" on public.public_learning_resources;
create policy "published_resources_are_public"
on public.public_learning_resources
for select
to anon, authenticated
using (is_published = true);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'public-learning-materials',
  'public-learning-materials',
  true,
  52428800,
  array['application/pdf']
)
on conflict (id) do update
set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

commit;

-- 验证：应返回 table_rls=true、bucket_public=true、anon_can_select=true。
select
  c.relrowsecurity as table_rls,
  b.public as bucket_public,
  has_table_privilege('anon', 'public.public_learning_resources', 'select') as anon_can_select
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
cross join storage.buckets b
where n.nspname = 'public'
  and c.relname = 'public_learning_resources'
  and b.id = 'public-learning-materials';

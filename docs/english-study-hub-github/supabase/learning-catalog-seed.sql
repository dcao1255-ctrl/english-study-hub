-- 逐光英语：朋友分享资料的目录种子数据
-- 前置条件：先执行 learning-workspace-v3.sql。
-- 这里只建立元数据，不包含电子书、音频或视频文件。

insert into public.learning_resources (
  slug, title, series, level, stage, track, resource_type, format_label,
  skills, description, rights_status, visibility, sort_order, is_published
)
values
  ('power-up-starter', 'Power Up Starter', 'Cambridge Power Up', 'Pre-A1', '启蒙输入', 'starter', 'mixed', '教材 · 音频 · 听力文本', array['听力','口语','阅读','词汇'], '主题单元课程，可用于精听、逐句跟读与课后打卡。', '待确认授权', 'catalog', 10, true),
  ('power-up-1', 'Power Up Level 1', 'Cambridge Power Up', 'Pre-A1', '启蒙输入', 'starter', 'mixed', '教材 · 音频 · 听力文本', array['听力','口语','阅读','词汇'], '主题单元课程，可用于精听、逐句跟读与课后打卡。', '待确认授权', 'catalog', 11, true),
  ('power-up-2', 'Power Up Level 2', 'Cambridge Power Up', 'A1', '基础建立', 'foundation', 'mixed', '教材 · 音频 · 听力文本', array['听力','口语','阅读','词汇'], '主题单元课程，可用于精听、逐句跟读与课后打卡。', '待确认授权', 'catalog', 12, true),
  ('power-up-3', 'Power Up Level 3', 'Cambridge Power Up', 'A1', '基础建立', 'foundation', 'mixed', '教材 · 音频 · 听力文本', array['听力','口语','阅读','词汇'], '主题单元课程，可用于精听、逐句跟读与课后打卡。', '待确认授权', 'catalog', 13, true),
  ('power-up-4', 'Power Up Level 4', 'Cambridge Power Up', 'A2', '基础进阶', 'foundation', 'mixed', '教材 · 音频 · 听力文本', array['听力','口语','阅读','词汇'], '主题单元课程，可用于精听、逐句跟读与课后打卡。', '待确认授权', 'catalog', 14, true),
  ('power-up-5', 'Power Up Level 5', 'Cambridge Power Up', 'A2', '基础进阶', 'foundation', 'mixed', '教材 · 音频 · 听力文本', array['听力','口语','阅读','词汇'], '主题单元课程，可用于精听、逐句跟读与课后打卡。', '待确认授权', 'catalog', 15, true),
  ('power-up-6', 'Power Up Level 6', 'Cambridge Power Up', 'B1', '青少进阶', 'teen', 'mixed', '教材 · 音频 · 听力文本', array['听力','口语','阅读','词汇'], '主题单元课程，可用于精听、逐句跟读与课后打卡。', '待确认授权', 'catalog', 16, true),
  ('think-1', 'Think Student''s Book 1', 'Cambridge Think', 'A2', '青少进阶', 'teen', 'mixed', '教材 · 音频', array['听力','口语','阅读','表达'], '适合已有基础的青少年系统提升。', '待核对版本与授权', 'catalog', 30, true),
  ('think-2', 'Think Student''s Book 2', 'Cambridge Think', 'B1', '青少进阶', 'teen', 'mixed', '教材 · 音频', array['听力','口语','阅读','表达'], '适合已有基础的青少年系统提升。', '待核对版本与授权', 'catalog', 31, true),
  ('think-3', 'Think Student''s Book 3', 'Cambridge Think', 'B1+', '青少进阶', 'teen', 'mixed', '教材 · 音频', array['听力','口语','阅读','表达'], '适合已有基础的青少年系统提升。', '待核对版本与授权', 'catalog', 32, true),
  ('think-4', 'Think Student''s Book 4', 'Cambridge Think', 'B2', '青少进阶', 'teen', 'mixed', '教材 · 音频', array['听力','口语','阅读','表达'], '适合已有基础的青少年系统提升。', '待核对版本与授权', 'catalog', 33, true),
  ('think-5', 'Think Student''s Book 5', 'Cambridge Think', 'C1', '高阶表达', 'advanced', 'mixed', '教材 · 音频', array['听力','口语','阅读','表达'], '适合已有基础的青少年系统提升。', '待核对版本与授权', 'catalog', 34, true),
  ('new-concept-1', '新概念英语 1', '新概念英语', 'A1–A2', '基础建立', 'foundation', 'mixed', '课程讲解 · 课文音频 · 文本', array['精读','听力','背诵','语法'], '沪江版与新东方版按同一核心教材的不同讲解来源管理。', '仅登记目录，待确认授权', 'catalog', 50, true),
  ('new-concept-2', '新概念英语 2', '新概念英语', 'A2–B1', '基础进阶', 'foundation', 'mixed', '课程讲解 · 课文音频 · 文本', array['精读','听力','背诵','语法'], '沪江版与新东方版按同一核心教材的不同讲解来源管理。', '仅登记目录，待确认授权', 'catalog', 51, true),
  ('new-concept-3', '新概念英语 3', '新概念英语', 'B1–B2', '青少进阶', 'teen', 'mixed', '课程讲解 · 课文音频 · 文本', array['精读','听力','背诵','语法'], '沪江版与新东方版按同一核心教材的不同讲解来源管理。', '仅登记目录，待确认授权', 'catalog', 52, true),
  ('new-concept-4', '新概念英语 4', '新概念英语', 'B2–C1', '高阶表达', 'advanced', 'mixed', '课程讲解 · 课文音频 · 文本', array['精读','听力','背诵','语法'], '沪江版与新东方版按同一核心教材的不同讲解来源管理。', '仅登记目录，待确认授权', 'catalog', 53, true),
  ('learning-a-z', 'Learning A-Z 分级阅读', 'Learning A-Z', 'aa–Z2', '分级阅读', 'reading', 'mixed', '绘本 · 音频 · 视频', array['阅读','听力','词汇'], '保留 aa–Z2 原生分级，按书目和级别建立阅读打卡。', '需有效课堂或家庭许可', 'catalog', 70, true),
  ('english-songs-154', '154 首超简单英语儿歌', '英语儿歌', 'Pre-A1–A1', '启蒙输入', 'starter', 'video', 'MP4 视频', array['语音','听力','语块'], '按主题、语音点和高频句型拆分歌单。', '待确认授权', 'catalog', 71, true),
  ('numberblocks', 'Numberblocks 1–8 季', 'Numberblocks', 'Pre-A1–A1', '学科英语', 'starter', 'video', '166 集 MP4 视频', array['数学英语','听力','场景表达'], '按数字、加减乘除等概念组织的 CLIL 数学英语素材。', '仅登记目录，待确认授权', 'catalog', 72, true)
on conflict (slug) do update
set
  title = excluded.title,
  series = excluded.series,
  level = excluded.level,
  stage = excluded.stage,
  track = excluded.track,
  resource_type = excluded.resource_type,
  format_label = excluded.format_label,
  skills = excluded.skills,
  description = excluded.description,
  rights_status = excluded.rights_status,
  sort_order = excluded.sort_order,
  updated_at = now();

select slug, title, level, visibility, storage_path
from public.learning_resources
order by sort_order;

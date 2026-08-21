# 综合资料库、跟读与打卡升级指南

这次升级采用“前端先上线、数据库后启用、资料最后小批量接入”的顺序。前端包含静态目录兜底，因此 Supabase 尚未升级时，首页和资料库仍可正常浏览。

## 一、先更新 GitHub Pages

本次需要上传整个 `english-study-hub-github` 文件夹中的内容，尤其确认这些新增或更新文件已经进入仓库：

```text
index.html
library.html
practice.html
assets/css/site.css
assets/js/catalog-data.js
assets/js/library.js
assets/js/practice.js
assets/js/site-shell.js
assets/js/supabase-config.js
supabase/learning-workspace-v3.sql
supabase/learning-catalog-seed.sql
```

操作步骤：

1. 打开现有 GitHub 仓库 `english-study-hub`。
2. 选择 **Add file → Upload files**。
3. 把本发布目录中的全部内容拖入上传区，允许同名文件覆盖仓库中的旧版本。
4. 在文件列表中确认仓库根目录仍然直接包含 `index.html`，不要多套一层文件夹。
5. 填写本次更新说明，例如 `更新综合资料库和学习打卡页面`，然后提交。
6. 打开仓库的 **Actions** 或 **Settings → Pages**，等待部署完成。
7. 依次访问：
   - `/index.html`
   - `/library.html`
   - `/practice.html?slug=power-up-starter`
   - `/student/`

此时练习页显示“数据库待升级”属于正常现象。

## 二、再升级 Supabase 数据结构

执行前建议在 Supabase Dashboard 查看是否已有同名表；本脚本不会删除现有学生档案表，但任何线上数据库结构变更都应先保留备份。

1. 登录 Supabase Dashboard，进入当前项目。
2. 打开 **SQL Editor → New query**。
3. 打开本地 `supabase/learning-workspace-v3.sql`，复制完整内容到 SQL Editor。
4. 点击 **Run**。
5. 检查底部验证结果：
   - `learning_resources`
   - `resource_segments`
   - `practice_logs`
   - `speaking_recordings`

   四张表的 `rls_enabled` 都应为 `true`。
6. 检查两个 Storage bucket：`learning-media` 和 `student-recordings` 的 `public` 都应为 `false`。
7. 新开一个 SQL 查询，运行 `supabase/learning-catalog-seed.sql`，写入 19 项资料系列元数据。
8. 刷新 `/library.html`，右上角应显示“资料目录已与学习数据库同步”。

不要把 `service_role` 密钥写入网页。当前 `supabase-config.js` 中使用的是可公开的 publishable/anon key，真正的数据隔离由 RLS 完成。

## 三、先用一条音频做小范围验证

不要立即批量上传全部资料。先选择一条已确认有教学使用授权的短音频完成端到端验证。

1. 在 Supabase 打开 **Storage → learning-media**。
2. 建议按下面的层级上传：

```text
power-up/level-1/unit-01/track-01.mp3
```

3. 上传后复制对象路径。数据库中的 `storage_path` 只写 bucket 内部路径，不要包含 `learning-media/` 前缀。
4. 在 SQL Editor 新建一条具体课次记录：

```sql
insert into public.learning_resources (
  slug,
  collection_slug,
  title,
  series,
  level,
  unit_label,
  stage,
  track,
  resource_type,
  format_label,
  skills,
  description,
  rights_status,
  visibility,
  storage_bucket,
  storage_path,
  media_kind,
  sort_order,
  is_published
)
values (
  'power-up-1-unit-01-track-01',
  'power-up-1',
  'Track 01',
  'Cambridge Power Up',
  'Pre-A1',
  'Unit 01',
  '启蒙输入',
  'starter',
  'audio',
  '课文音频',
  array['听力', '跟读'],
  'Unit 01 第一条跟读音频。',
  '已确认教学使用授权',
  'authenticated',
  'learning-media',
  'power-up/level-1/unit-01/track-01.mp3',
  'audio',
  1,
  true
);
```

5. 登录一个测试学生账号。
6. 打开 `/practice.html?slug=power-up-1`，选择 `Unit 01 · Track 01`。
7. 验证播放、0.75/1/1.25 倍速和后退 5 秒。

同一套书的每一课或每一条音轨都建立一条子记录，通过 `collection_slug` 归入对应系列。这样不会把几十条音频挤进一个字段，也方便老师直接分享某套书的固定链接。

## 四、可选：增加逐句文本

有准确听力文本和时间点时，可以增加逐句定位：

```sql
insert into public.resource_segments (
  resource_id,
  sort_order,
  transcript,
  start_seconds,
  end_seconds
)
select id, 1, 'Hello! My name is Alex.', 0.000, 3.800
from public.learning_resources
where slug = 'power-up-1-unit-01-track-01';
```

继续插入 `sort_order` 为 2、3、4 的句子即可。时间单位是秒，结束时间必须大于开始时间。

## 五、验证跟读录音和学习打卡

1. 使用 HTTPS 的 GitHub Pages 地址打开练习页。
2. 登录学生账号。
3. 点击“开始录音”，在浏览器提示时允许麦克风权限。
4. 点击“停止录音”，先回听本地预览。
5. 点击“提交录音”。只有这一步才会把录音写入私有 `student-recordings` bucket。
6. 填写任务、进度、自我感受和一句复盘，保存打卡。
7. 在 Supabase Dashboard 检查：
   - `speaking_recordings` 出现该学生的录音记录；
   - `practice_logs` 出现该学生的打卡；
   - `student-recordings` 中路径第一层是该学生 Auth UUID。
8. 再使用另一个学生账号登录，确认看不到前一个学生的记录和录音。

当前版本让老师先通过 Supabase Dashboard 查看录音与打卡，学生使用网页完成学习。等这一版实际跑通、明确老师最常用的筛选与反馈流程后，再增加教师工作台，避免第一版过度复杂。

## 六、资料上传规则

- GitHub 只放网页代码和公开元数据，不放电子书、MP3、MP4 或学生录音。
- `learning-media` 与 `student-recordings` 必须保持 Private。
- 新概念的沪江版、新东方版作为“讲解来源”区分，不重复建立两条课程主线。
- Learning A-Z 保留 aa–Z2 原生分级，不强行换算 CEFR。
- Numberblocks 归为 CLIL 数学英语，可按数字、加减法、乘除法等主题建立子记录。
- 未确认版权或许可证范围的文件只登记目录，不上传、不公开下载。
- 大批量上传前先用 1 条音频、1 个学生账号完成全部验证，再逐套导入。

## 七、出现问题时优先检查

- 资料库能打开但练习页无媒体：检查学生是否登录、记录是否 `is_published=true`、Storage 路径是否完全一致。
- 播放器提示无法读取：检查 bucket 是否为 `learning-media`，以及 SQL 策略是否成功创建。
- 录音无法开始：检查浏览器麦克风权限，并确认使用 HTTPS 页面。
- 录音上传失败：检查 `student-recordings` 是否为 Private，文件类型是否为允许的音频 MIME。
- 打卡保存失败：检查学生是否登录，以及 `practice_logs` 表的 RLS 和 grants 是否存在。

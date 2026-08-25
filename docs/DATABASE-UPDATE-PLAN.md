# 资料库与学生档案更新方案

## 1. 站点定位

公开站点聚焦“中学及以上英语能力提升与升学考试”。Power Up、儿歌、动画等儿童资料只作为教师备课选材，不再作为主站公开栏目，也不全量上传到 Supabase。

## 2. 免费额度下的三层存储

### A. Supabase Database：存结构化信息

保存资料标题、适用阶段、能力标签、官方链接、学生课堂记录、能力分数、诊断、错题和笔记。不要把 PDF、MP3、MP4 的二进制内容放进数据库表。

### B. Supabase Storage：只存正在使用的私有文件

- `student-materials`：当前学生的课件、反馈和必要作业。
- `learning-media`：已确认授权、网站近期会播放的少量音频或视频。
- 不上传完整出版社电子书、全套动画或整季音视频。
- 文件夹第一层默认使用学生 Auth UUID；如果需要可读名称，则必须在学生档案的 `storage_folder` 中绑定唯一目录名。文件上传并登记后不要只改 Storage 文件夹名而不更新数据库路径。

### C. 本地或网盘归档：保存大体积原始资料

完整教材、音频、动画留在本地硬盘或百度网盘。数据库只登记目录、标签和授权状态；老师备课后再把本周真正要用的少量文件放入 Supabase。

## 3. 学生档案的数据约定

每次课程必须使用同一个 ISO 日期，以便页面联动筛选：

```json
{
  "lessons": [{
    "iso_date": "YYYY-MM-DD",
    "date": "MM/DD",
    "label": "第 N 次课",
    "title": "课堂主题",
    "summary": "课堂摘要",
    "ability_scores": {},
    "diagnosis": [],
    "sources": []
  }],
  "error_book": [{
    "lesson_date": "YYYY-MM-DD",
    "type": "错误类型",
    "question": "题目",
    "wrong": "原答案",
    "right": "正确答案",
    "note": "讲解",
    "source": {}
  }],
  "phrase_notes": [{
    "lesson_date": "YYYY-MM-DD",
    "expression": "词块或重点",
    "note": "解释与用法"
  }]
}
```

`sources` 中只保存 bucket、path、页码和按钮名称。私有文件由登录用户临时获取签名链接，不保存公开 URL。

## 4. 每周更新流程

未来的个人 Skill 分成两个阶段，默认只生成提案，不直接修改线上数据：

1. 读取本周课件与反馈，检查文件名、日期、Storage 路径和授权状态。
2. 生成结构化档案草稿、SQL 草稿、容量报告和网站优化建议。
3. 用户人工核对并明确批准。
4. 批准后才执行数据库更新与必要的网页改动。
5. 回查学生档案、私有文件权限、页面筛选和自动化测试；未经单独授权不提交或推送 Git。

建议每周报告同时显示 Storage 使用率，并在 70%、85%、95% 三个节点提示清理或归档。

## 5. 每周只做的四类数据库操作

- 对 `student_profiles.lessons` 按 `iso_date` 去重后追加或替换。
- 对 `error_book` 和 `phrase_notes` 按 `lesson_date` 归档。
- 对资料目录做元数据 upsert，不上传大型原文件。
- 用只读 SQL 核对 Storage 路径与 RLS，不自动删除旧文件。

## 6. Storage 路径核验

上传完成后先在 SQL Editor 运行下面的只读查询，将日期替换为本次课程日期：

```sql
select bucket_id, name, metadata ->> 'mimetype' as mime_type
from storage.objects
where bucket_id = 'student-materials'
  and name ilike '%YYYY-MM-DD%'
order by name;
```

如果 `name` 的第一段不是学生 Auth UUID，必须确认它与该学生档案的 `storage_folder` 完全一致，同时更新 `materials[*].path`。目录名和数据库路径不同步时，后台可以看到文件，但学生页面无法读取。

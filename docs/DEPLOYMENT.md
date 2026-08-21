# 部署说明

## 一、正确的页面与分支关系

页面层级不应使用 Git 分支实现。推荐结构：

- 一个发布分支：`main`（或单独使用 `gh-pages`）
- 公开首页：`/index.html`
- 公开模块页：`/module.html?id=zhongkao` 等
- 登录入口：`/student/`
- 综合资料库：`/library.html`
- 音视频、跟读与打卡：`/practice.html?slug=资料标识`
- 私有数据与原题 PDF：Supabase 数据库和私有 Storage，不进入 GitHub 仓库

GitHub Pages 中的所有文件都应视为公开文件。即使没有导航链接，知道 URL 的人仍然可以访问文件。

## 二、部署公开站点到 GitHub Pages

1. 新建 GitHub 仓库，例如 `english-study-hub`。
2. 将本目录内的全部文件上传到仓库根目录，确保 `index.html` 位于根目录。
3. 打开仓库 `Settings` -> `Pages`。
4. `Source` 选择 `Deploy from a branch`。
5. 分支选择 `main`，目录选择 `/ (root)`，然后保存。
6. 等待 GitHub Pages 发布完成，访问 GitHub 给出的站点地址。

所有内部链接均使用相对路径，因此同时兼容：

- `https://username.github.io/`
- `https://username.github.io/english-study-hub/`

## 三、创建 Supabase 私有数据服务

1. 在 `https://supabase.com/` 新建项目。
2. 新项目在 SQL Editor 执行 `supabase/schema.sql`；已经运行过旧版脚本的项目只需执行 `supabase/upgrade-v2.sql`。
3. 需要综合资料库、跟读录音和学习打卡时，再按照 `LEARNING-UPGRADE-GUIDE.md` 执行 `supabase/learning-workspace-v3.sql` 与目录种子脚本。
4. 打开 `Project Settings` -> `API`，复制 Project URL 和 anon/public key。
5. 编辑 `assets/js/supabase-config.js`：

```js
window.STUDY_HUB_CONFIG = {
  SUPABASE_URL: "https://YOUR_PROJECT.supabase.co",
  SUPABASE_ANON_KEY: "YOUR_ANON_KEY",
  USERNAME_DOMAIN: "qq.com",
  MATERIALS_BUCKET: "student-materials",
  PUBLIC_MATERIALS_BUCKET: "public-learning-materials",
  LEARNING_MEDIA_BUCKET: "learning-media",
  RECORDINGS_BUCKET: "student-recordings"
};
```

`anon key` 设计上可以放在前端；真正的数据权限由 `schema.sql` 中的 RLS 控制。不要使用 `service_role key`。

## 四、创建用户名和密码

Supabase Auth 原生使用邮箱登录。本站将用户名转换为内部邮箱，因此学生只需输入用户名：

```text
用户名：lihaoyang
内部邮箱：lihaoyang@students.example.com
```

操作步骤：

1. 打开 Supabase `Authentication` -> `Users` -> `Add user`。
2. Email 填写 `用户名@USERNAME_DOMAIN`。
3. 设置一个至少 8 位的随机初始密码。
4. 勾选或选择自动确认用户，避免内部邮箱需要收信验证。
5. 复制新用户的 UUID。
6. 复制 `supabase/profile.example.sql`，替换 UUID 和档案内容后在 SQL Editor 执行。
7. 将用户名和初始密码通过私下渠道发送给学生，并要求不要共享账号。

## 五、上传学生原题 PDF

`schema.sql` 或 `upgrade-v2.sql` 会创建不公开的 `student-materials` bucket。请在 Supabase Dashboard 的 Storage 中按以下层级上传：

```text
student-materials/
└── 学生的 Auth UUID/
    └── 资料文件.pdf
```

例如：

```text
student-materials/
└── 12339c4d-7ed7-48aa-a795-b86e8a5e68fc/
    └── 2026-07-26-homework.pdf
```

数据库档案中的 `materials[].path` 必须与 `UUID/文件名.pdf` 完全一致。不要将 PDF 放进 GitHub 的 `assets`、`student` 或其他公开目录。

学生登录后，网站只为其本人 UUID 目录生成一小时有效的签名地址。学生没有上传、删除或修改 Storage 文件的权限。

## 六、更新学生档案

1. 先上传对应 PDF。
2. 在本机私有 SQL 中为资料设置稳定的 `materials[].id` 和准确路径。
3. 在错题或任务中用 `source.material_id`、`source.page` 关联原题页。
4. 在 SQL Editor 运行私有更新 SQL。
5. 学生刷新个人页面即可看到新内容。

进度由学生自行拖动或点击“标记完成”，保存到 `student_plan_progress`。老师更新任务时请保持 `task_id` 稳定，否则会被视为一个新任务。

## 七、配置站点地址

在 Supabase `Authentication` -> `URL Configuration` 中，将 GitHub Pages 地址填入 `Site URL`。当前用户名密码登录不依赖邮件跳转，但提前配置可避免以后增加重置密码时出现错误链接。

## 八、发布前检查

- GitHub 仓库中不存在真实学生姓名、课件扫描件、错题内容或联系方式。
- 仓库中不存在 `service_role key`、数据库密码或 Supabase 管理令牌。
- 未登录访问 `/student/` 时只能看到登录页。
- 学生 A 登录后不能读取学生 B 的档案。
- Supabase 中 `student_profiles` 表的 RLS 状态为 Enabled。
- Supabase 中 `student_plan_progress` 表的 RLS 状态为 Enabled。
- `student-materials` bucket 的 `Public` 状态为关闭。
- 学生 A 不能读取学生 B UUID 目录中的 PDF。
- 公开模块中的政策说明与官方最新公告一致。

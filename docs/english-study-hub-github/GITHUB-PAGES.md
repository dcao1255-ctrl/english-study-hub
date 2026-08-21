# GitHub Pages 安装

## 最快方式：网页上传

1. 在 GitHub 新建一个公开仓库，例如 `english-study-hub`。
2. 打开仓库，选择 **Add file → Upload files**。
3. 在 Finder 中打开本文件夹，按 `Command + A` 选中其中的全部内容，再整体拖入 GitHub 上传区域。GitHub 会保留 `assets/`、`student/`、`supabase/` 的层级；不要把子文件从文件夹里拿出来。
4. 上传预览中确认根目录直接出现 `index.html`，并同时出现三个文件夹：`assets`、`student`、`supabase`。
5. 提交上传后，打开 **Settings → Pages**。
6. 在 **Build and deployment** 中选择：
   - Source：`Deploy from a branch`
   - Branch：`main`
   - Folder：`/ (root)`
7. 保存并等待 GitHub 生成访问地址。

站点使用相对路径，可直接部署在：

- `https://你的用户名.github.io/`
- `https://你的用户名.github.io/仓库名/`

## 本地预览

直接打开 `index.html` 即可浏览公开模块。

如需查看匿名个人档案演示，建议在文件夹内启动静态服务器后访问：

```text
student/?demo=1
```

## 个人空间

公开页面不包含真实学生资料。需要登录功能时，按照 `DEPLOYMENT.md` 配置 Supabase，
新项目执行 `supabase/schema.sql`；旧项目升级执行 `supabase/upgrade-v2.sql`。综合资料库、跟读和打卡再按 [`LEARNING-UPGRADE-GUIDE.md`](./LEARNING-UPGRADE-GUIDE.md) 执行 `supabase/learning-workspace-v3.sql`。不要把真实学生数据、原题 PDF 或 `service_role` 密钥上传到 GitHub。

## 官网入口

首页每张模块卡和对应模块详情页均有“官网直达”按钮。入口集中定义在：

```text
assets/js/module-data.js
```

以后官方地址变化时，只需修改对应模块的 `source.url`。

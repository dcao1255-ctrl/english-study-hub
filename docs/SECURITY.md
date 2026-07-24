# 隐私与安全规则

## 必须遵守

- 不在 GitHub 仓库、JavaScript、HTML 或图片目录中保存真实学生档案。
- 不在前端保存明文密码、数据库密码或 Supabase `service_role key`。
- 公开前端只使用 Supabase Project URL 和 anon/public key。
- 学生数据表必须保持 Row Level Security 已启用。
- 不要用“前端判断密码”“隐藏链接”“加密后的 JSON 文件”替代服务端权限。

## 当前权限模型

`student_profiles.id` 与 `auth.users.id` 一一对应。RLS 仅允许已登录用户在以下条件成立时读取：

```sql
auth.uid() = student_profiles.id
```

学生没有插入、更新或删除权限。教师通过 Supabase Dashboard 维护档案。

## 密码管理

- 初始密码至少 8 位，建议使用随机密码。
- 不要在公开聊天、仓库 Issue 或提交记录中发送密码。
- 学生离开辅导项目后，应在 Supabase Authentication 中禁用或删除用户。
- 怀疑密码泄露时，立即在 Supabase 中重置密码。

## 课件与图片

课件扫描件可能同时包含学生笔迹和第三方版权内容，不应直接放入公开仓库。需要在线展示时，应使用私有对象存储和短时签名 URL，并另行增加访问策略。


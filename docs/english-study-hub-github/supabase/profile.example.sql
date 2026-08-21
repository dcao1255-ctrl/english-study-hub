-- 这是匿名结构示例。复制后替换 UUID 和内容，再在 Supabase SQL Editor 中执行。
-- 不要把包含真实学生数据的版本提交到 GitHub。

insert into public.student_profiles (
  id,
  display_name,
  stage,
  grade,
  city,
  plan_month,
  current_focus,
  ability_scores,
  diagnosis,
  lessons,
  error_book,
  phrase_notes,
  plan
) values (
  'REPLACE_WITH_AUTH_USER_UUID',
  '示例同学',
  '初中英语',
  '初一升初二',
  '上海',
  '2026 年 8 月',
  '在这里填写阶段观察和当前训练重点。',
  '{"阅读理解": 80, "词汇运用": 70, "翻译表达": 60, "写作输出": 55}',
  '[
    {"tag":"优势","title":"阅读理解","summary":"填写诊断摘要。","next":"填写下一步动作。"},
    {"tag":"重点","title":"语言输出","summary":"填写诊断摘要。","next":"填写下一步动作。"},
    {"tag":"习惯","title":"书写规范","summary":"填写诊断摘要。","next":"填写下一步动作。"}
  ]',
  '[
    {"date":"07/11","label":"第一次课","title":"填写课程主题","summary":"填写课堂观察。"}
  ]',
  '[
    {"type":"介词搭配","wrong":"错误表达","right":"正确表达","note":"填写错因和订正规则"}
  ]',
  '[
    {"expression":"show great interest in","note":"对……表现出浓厚兴趣"}
  ]',
  '[
    {"cadence":"每天","title":"15 + 10 分钟","detail":"填写训练内容。","focus":"填写目标。"}
  ]'
);


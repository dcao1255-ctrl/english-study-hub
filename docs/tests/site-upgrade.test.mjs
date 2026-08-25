import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => readFile(path.join(siteRoot, relativePath), "utf8");

test("首页聚焦五大考试模块并提供基础补齐与外刊入口", async () => {
  const html = await read("index.html");
  assert.match(html, /id="exam-paths"/);
  assert.match(html, /定义你的专属<br \/>英语学习搭子/);
  assert.doesNotMatch(html, /不追求大而全/);
  assert.doesNotMatch(html, /id="ability-paths"/);
  assert.match(html, /资料只为明确任务服务[\s\S]+?进入完整资料库/);
  assert.match(html, /beginner\.html/);
  assert.match(html, /reading\.html/);
  assert.match(html, /library\.html/);
  assert.doesNotMatch(html, /Numberblocks/);
});

test("资料目录包含全部朋友分享的系列", async () => {
  const source = await read("assets/js/catalog-data.js");
  const context = { window: {} };
  vm.runInNewContext(source, context);
  const resources = context.window.StudyHubCatalog.resources;
  assert.equal(resources.length, 19);
  for (const slug of ["power-up-starter", "power-up-6", "think-5", "new-concept-4", "learning-a-z", "english-songs-154", "numberblocks"]) {
    assert.ok(resources.some((item) => item.slug === slug), `缺少 ${slug}`);
  }
});

test("新增页面引用的本地脚本和样式均存在", async () => {
  for (const page of [
    "index.html",
    "beginner.html",
    "zhongkao.html",
    "gaokao.html",
    "kaoyan.html",
    "ielts.html",
    "toefl.html",
    "reading.html",
    "library.html",
    "practice.html",
    "contact.html",
    "module.html",
    "student/index.html"
  ]) {
    const html = await read(page);
    const base = path.dirname(path.join(siteRoot, page));
    const references = [...html.matchAll(/(?:src|href)="([^"?#]+)(?:[?#][^"]*)?"/g)]
      .map((match) => match[1])
      .filter((value) => value.startsWith("./") || value.startsWith("../"));
    references.forEach((reference) => {
      assert.ok(existsSync(path.resolve(base, reference)), `${page} 引用不存在：${reference}`);
    });
  }
});

test("公开专题页具备独立 SEO 信息并进入 sitemap", async () => {
  const pages = ["beginner", "zhongkao", "gaokao", "kaoyan", "ielts", "toefl", "reading", "contact"];
  const sitemap = await read("sitemap.xml");
  const robots = await read("robots.txt");
  assert.match(robots, /Sitemap: https:\/\/dcao1255-ctrl\.github\.io\/english-study-hub\/sitemap\.xml/);
  for (const page of pages) {
    const html = await read(`${page}.html`);
    assert.match(html, /<meta name="description" content="[^"]+"/);
    assert.match(html, /<meta name="robots" content="index,follow"/);
    assert.match(html, new RegExp(`<link rel="canonical" href="https://dcao1255-ctrl\\.github\\.io/english-study-hub/${page}\\.html"`));
    assert.match(sitemap, new RegExp(`/${page}\\.html`));
  }
});

test("联系客服页面通过在线表单提交且不依赖 mailto", async () => {
  const html = await read("contact.html");
  const source = await read("assets/js/contact.js");
  assert.match(html, /id="contact-form"/);
  assert.match(html, /问题类型/);
  assert.match(source, /formsubmit\.co\/ajax\/dcao1255@gmail\.com/);
  assert.match(source, /navigator\.clipboard\.writeText/);
  assert.doesNotMatch(html + source, /mailto:/);
});

test("学生个人空间按课程日期联动能力、错题和笔记且不再显示任务栏", async () => {
  const source = await read("assets/js/student.js");
  assert.match(source, /id="lesson-calendar"/);
  assert.match(source, /calendar-lesson-day/);
  assert.match(source, /class="lesson-ability-layout"/);
  assert.match(source, /id="ability-radar"/);
  assert.match(source, /id="ability-diagnosis"/);
  assert.match(source, /asArray\(item\?\.abilities\)\.includes\(dimension\)/);
  assert.match(source, /getLessonEntries\(currentProfile\?\.error_book, lessonDate\)/);
  assert.match(source, /getLessonEntries\(currentProfile\?\.phrase_notes, lessonDate\)/);
  for (const label of ["错题记录", "重点笔记", "能力雷达", "回到首页", "查看全部错题", "下载错题 PDF", "查看全部笔记", "下载笔记 PDF"]) {
    assert.match(source, new RegExp(label));
  }
  assert.match(source, /function setHistoryView/);
  assert.match(source, /function generateHistoryPdf/);
  assert.match(source, /html2pdf\.js@0\.10\.1/);
  assert.match(source, /class="error-print-detail"/);
  assert.doesNotMatch(source, /id="tasks-panel"|renderTaskCards|progressByTask/);
});

test("首页学习目标使用四卡横向滑动并提供前后按钮", async () => {
  const html = await read("index.html");
  const css = await read("assets/css/site.css");
  const source = await read("assets/js/home.js");
  assert.match(html, /id="module-prev"/);
  assert.match(html, /id="module-next"/);
  assert.match(css, /grid-auto-columns:\s*calc\(\(100% - 36px\) \/ 4\)/);
  assert.match(css, /scroll-snap-type:\s*inline mandatory/);
  assert.match(source, /grid\.scrollBy/);
});

test("页脚按义务阶段、升学考试和服务咨询分类", async () => {
  const source = await read("assets/js/site-shell.js");
  for (const label of ["义务阶段", "幼儿英语", "小学英语", "中考英语", "英语外刊", "升学考试", "高考英语", "考研英语", "雅思备考", "托福备考", "服务与咨询", "个人空间", "联系客服"]) {
    assert.match(source, new RegExp(label));
  }
  assert.match(source, /contact\.html/);
  assert.doesNotMatch(source, /反馈建议|mailto:/);
});

test("Supabase 升级脚本启用 RLS 且媒体桶保持私有", async () => {
  const sql = await read("supabase/learning-workspace-v3.sql");
  for (const table of ["learning_resources", "resource_segments", "practice_logs", "speaking_recordings"]) {
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
  }
  assert.match(sql, /'learning-media'[\s\S]+?false/);
  assert.match(sql, /'student-recordings'[\s\S]+?false/);
  assert.doesNotMatch(sql, /service_role/i);
});

test("前端不包含高权限密钥", async () => {
  const files = [
    "assets/js/supabase-config.js",
    "assets/js/library.js",
    "assets/js/practice.js",
    "assets/js/student.js"
  ];
  for (const file of files) {
    const source = await read(file);
    assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE_KEY/i, file);
    assert.doesNotMatch(source, /eyJ[a-zA-Z0-9_-]{40,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}/, file);
  }
});

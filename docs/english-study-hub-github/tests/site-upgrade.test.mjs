import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => readFile(path.join(siteRoot, relativePath), "utf8");

test("首页保留五大考试模块并增加能力成长与资料入口", async () => {
  const html = await read("index.html");
  assert.match(html, /id="ability-paths"/);
  assert.match(html, /id="exam-paths"/);
  assert.match(html, /library\.html/);
  assert.match(html, /Numberblocks/);
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
  for (const page of ["index.html", "library.html", "practice.html", "module.html", "student/index.html"]) {
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

(function () {
  "use strict";

  const app = document.querySelector("#student-app");
  const form = document.querySelector("#login-form");
  const formMessage = document.querySelector("#form-message");
  const configNotice = document.querySelector("#config-notice");
  const config = window.STUDY_HUB_CONFIG || {};
  const localDemo = ["127.0.0.1", "localhost"].includes(location.hostname) && new URLSearchParams(location.search).get("demo") === "1";
  let supabase = null;

  const demoProfile = {
    display_name: "示例同学",
    stage: "初中英语",
    grade: "初一升初二",
    city: "上海",
    plan_month: "2026 年 8 月",
    updated_at: "2026-07-22T00:00:00Z",
    current_focus: "阅读优势继续保持；当前训练重点转向固定搭配、句子表达和完整写作。",
    ability_scores: { "阅读理解": 90, "词汇运用": 74, "翻译表达": 62, "写作输出": 58, "书写规范": 55 },
    diagnosis: [
      { tag: "优势", title: "阅读理解", summary: "阅读速度快，能够抓住主旨和关键信息。", next: "每周保持 1-2 篇真题阅读。" },
      { tag: "重点", title: "语言输出", summary: "固定搭配和自然语序仍需通过输出训练巩固。", next: "词块默写后进入完整句。" },
      { tag: "习惯", title: "先想后写", summary: "思维速度快于书写，容易出现修改多和字迹不稳。", next: "落笔前先组织完整句。" }
    ],
    lessons: [
      { date: "07/11", label: "第一次课", title: "阅读优势确认，输出短板浮现", summary: "完成阅读、翻译和表达任务，确定暑期训练方向。" },
      { date: "07/18", label: "阶段调整", title: "从阅读输入转向语言输出", summary: "加入词组默写、口语复述、句子翻译和书写习惯训练。" }
    ],
    error_book: [
      { type: "介词搭配", wrong: "have a deep influence of ...", right: "have a deep influence on ...", note: "influence on 表示对……的影响" },
      { type: "词形判断", wrong: "was clearly understanding", right: "was clearly understood", note: "被动语态需要过去分词" },
      { type: "句型书写", wrong: "not ... until ...", right: "It was not until ... that ...", note: "先确认完整结构再落笔" }
    ],
    phrase_notes: [
      { expression: "show great interest in", note: "对……表现出浓厚兴趣" },
      { expression: "be fond of doing", note: "喜欢做某事" },
      { expression: "find it + adj. + to do", note: "发现做某事……" },
      { expression: "give useful advice on", note: "就……提出有用建议" },
      { expression: "turn ... into ...", note: "把……变成……" }
    ],
    plan: [
      { cadence: "每天", title: "15 + 10 分钟", detail: "15 分钟英语朗读；10 分钟词组或句子默写。", focus: "形成稳定输出习惯" },
      { cadence: "每周", title: "1-2 篇精读", detail: "用真题保持阅读能力，并完成复述。", focus: "保持阅读优势" },
      { cadence: "每周", title: "错题四步法", detail: "识别错因、回顾搭配、重写句子、隔日复测。", focus: "避免重复犯错" },
      { cadence: "阶段", title: "启动整篇写作", detail: "从段落组织进入完整作文与复查。", focus: "形成写作流程" }
    ]
  };

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function isConfigured() {
    return /^https:\/\/.+\.supabase\.co$/.test(config.SUPABASE_URL || "") &&
      typeof config.SUPABASE_ANON_KEY === "string" &&
      config.SUPABASE_ANON_KEY.length > 40 &&
      !config.SUPABASE_ANON_KEY.startsWith("YOUR_") &&
      /^[a-z0-9.-]+$/i.test(config.USERNAME_DOMAIN || "");
  }

  function setMessage(message, type) {
    if (!formMessage) return;
    formMessage.textContent = message;
    formMessage.style.color = type === "success" ? "var(--green)" : "var(--coral)";
  }

  function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "未记录" : new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  }

  function renderProfile(profile) {
    const displayName = escapeHtml(profile.display_name || "同学");
    const initial = escapeHtml((profile.display_name || "学").slice(0, 1));
    const scores = Object.entries(profile.ability_scores && typeof profile.ability_scores === "object" ? profile.ability_scores : {});
    const diagnosis = asArray(profile.diagnosis);
    const lessons = asArray(profile.lessons);
    const errors = asArray(profile.error_book);
    const phrases = asArray(profile.phrase_notes);
    const plan = asArray(profile.plan);

    app.innerHTML = `
      <div class="student-dashboard">
        <section class="profile-hero">
          <div class="container profile-hero-grid">
            <div>
              <p class="kicker">PERSONAL LEARNING FILE · 私人学习档案</p>
              <h1>${displayName}的<br />英语学习档案</h1>
              <p class="profile-meta">${escapeHtml(profile.grade)} · ${escapeHtml(profile.city)} · ${escapeHtml(profile.plan_month)}</p>
              <p>${escapeHtml(profile.current_focus)}</p>
              <div class="profile-actions"><a class="button button-yellow" href="#error-book">进入错题本</a><a class="button button-outline" href="#study-plan">查看本月计划</a><button class="button button-quiet" id="logout-button" type="button">退出登录</button></div>
            </div>
            <aside class="ability-sheet">
              <div class="student-id"><span class="student-avatar">${initial}</span><div><strong>${displayName} · 当前学情雷达</strong><small>更新于 ${formatDate(profile.updated_at)}</small></div></div>
              <div class="ability-list">
                ${scores.map(([label, rawScore]) => { const score = Math.max(0, Math.min(100, Number(rawScore) || 0)); return `<div class="ability-row"><span>${escapeHtml(label)}</span><div class="ability-track"><div class="ability-fill" style="width:${score}%"></div></div><span>${score}</span></div>`; }).join("")}
              </div>
              <div class="profile-alert"><strong>老师观察</strong><p>${escapeHtml(profile.current_focus)}</p></div>
            </aside>
          </div>
        </section>

        <section class="section">
          <div class="container"><p class="kicker">DIAGNOSIS · 学情诊断</p><h2>优势要保持，时间投向短板</h2><div class="diagnosis-grid">${diagnosis.map((item) => `<article class="diagnosis-card"><span class="tag">${escapeHtml(item.tag)}</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.summary)}</p><small>下一步：${escapeHtml(item.next)}</small></article>`).join("")}</div></div>
        </section>

        <section class="section lesson-section">
          <div class="container"><p class="kicker light">LESSON LOG · 课程记录</p><h2>课堂记录与阶段变化</h2><div class="lesson-timeline">${lessons.map((lesson) => `<article class="lesson-entry"><div class="lesson-date">${escapeHtml(lesson.date)}<small>${escapeHtml(lesson.label)}</small></div><div class="lesson-copy"><h3>${escapeHtml(lesson.title)}</h3><p>${escapeHtml(lesson.summary)}</p></div></article>`).join("")}</div></div>
        </section>

        <section class="section" id="error-book">
          <div class="container"><p class="kicker">ERROR BOOK · 错题复盘</p><h2>错在哪里，比正确答案更重要</h2><div class="error-list">${errors.map((item, index) => `<article class="error-row"><span class="error-index">${String(index + 1).padStart(2, "0")}</span><strong>${escapeHtml(item.type)}</strong><span class="wrong">${escapeHtml(item.wrong)}</span><span class="right">${escapeHtml(item.right)}</span><span>${escapeHtml(item.note)}</span></article>`).join("")}</div></div>
        </section>

        <section class="section phrase-band">
          <div class="container phrase-layout"><div><p class="kicker">KEY PHRASES · 重点表达</p><h2>不背孤立单词，<br />记住完整表达</h2><p>先理解使用场景，再默写并放入自己的句子中。</p></div><div class="phrase-list">${phrases.map((item, index) => `<div class="phrase-item"><span>${String(index + 1).padStart(2, "0")}</span><strong>${escapeHtml(item.expression)}</strong><small>${escapeHtml(item.note)}</small></div>`).join("")}</div></div>
        </section>

        <section class="section" id="study-plan">
          <div class="container"><p class="kicker">STUDY PLAN · 阶段计划</p><h2>练得少而有效，保持连续反馈</h2><div class="plan-grid">${plan.map((item) => `<article class="plan-card"><span>${escapeHtml(item.cadence)}</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.detail)}</p><small>${escapeHtml(item.focus)}</small></article>`).join("")}</div></div>
        </section>
      </div>`;

    document.querySelector("#logout-button")?.addEventListener("click", async () => {
      if (supabase) await supabase.auth.signOut();
      location.reload();
    });
  }

  async function fetchProfile() {
    const { data, error } = await supabase.from("student_profiles").select("*").single();
    if (error) throw error;
    renderProfile(data);
  }

  async function start() {
    if (localDemo) {
      renderProfile(demoProfile);
      return;
    }

    if (!isConfigured()) {
      configNotice.hidden = false;
      form.querySelector("button[type='submit']").disabled = true;
      setMessage("请站点管理员先按照 DEPLOYMENT.md 完成配置。", "error");
      return;
    }

    try {
      const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm");
      supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
      });

      const { data } = await supabase.auth.getSession();
      if (data.session) await fetchProfile();
    } catch (error) {
      console.error("Student space initialization failed", error);
      setMessage("暂时无法连接个人空间，请稍后再试。", "error");
    }
  }

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!supabase) return;

    const button = form.querySelector("button[type='submit']");
    const formData = new FormData(form);
    const username = String(formData.get("username") || "").trim().toLowerCase();
    const password = String(formData.get("password") || "");

    if (!/^[a-z0-9._-]{3,64}$/.test(username)) {
      setMessage("用户名仅支持 3-64 位小写字母、数字、点、下划线或连字符。", "error");
      return;
    }

    button.disabled = true;
    setMessage("正在验证账号……", "success");
    const email = `${username}@${config.USERNAME_DOMAIN}`;
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      button.disabled = false;
      setMessage("用户名或密码不正确。", "error");
      return;
    }

    try {
      await fetchProfile();
    } catch (error) {
      console.error("Profile loading failed", error);
      button.disabled = false;
      setMessage("账号已通过验证，但尚未创建学习档案。", "error");
    }
  });

  start();
})();

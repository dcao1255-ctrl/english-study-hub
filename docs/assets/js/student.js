(function () {
  "use strict";

  const app = document.querySelector("#student-app");
  const form = document.querySelector("#login-form");
  const formMessage = document.querySelector("#form-message");
  const configNotice = document.querySelector("#config-notice");
  const config = window.STUDY_HUB_CONFIG || {};
  const localDemo = ["127.0.0.1", "localhost"].includes(location.hostname) &&
    new URLSearchParams(location.search).get("demo") === "1";

  let supabase = null;
  let currentProfile = null;
  let insightState = null;
  let insightResizeTimer = null;
  const signedUrlCache = new Map();

  const demoProfile = {
    display_name: "示例同学",
    stage: "初中英语",
    grade: "初一升初二",
    city: "上海",
    plan_month: "2026 年 8 月",
    updated_at: "2026-07-30T00:00:00Z",
    current_focus: "阅读优势继续保持；当前训练重点转向固定搭配、句子表达和完整写作。",
    ability_scores: { "阅读理解": 90, "完形语境": 88, "词汇运用": 76, "翻译表达": 66, "写作输出": 60, "书写规范": 56 },
    diagnosis: [
      { tag: "优势", title: "阅读理解", summary: "阅读速度快，能够抓住主旨和关键信息。", next: "每周保持 1–2 篇高阶阅读。" },
      { tag: "重点", title: "语言输出", summary: "固定搭配和自然语序仍需通过输出训练巩固。", next: "词块默写后进入完整句。" },
      { tag: "习惯", title: "先想后写", summary: "思维速度快于书写，容易出现修改多和字迹不稳。", next: "落笔前先组织完整句。" }
    ],
    lessons: [
      { date: "07/11", iso_date: "2026-07-11", label: "第一次课", title: "阅读优势确认，输出短板浮现", summary: "完成阅读、翻译和表达任务，确定暑期训练方向。", ability_scores: { "阅读理解": 82, "完形语境": 78, "词汇运用": 68, "翻译表达": 58, "写作输出": 52, "书写规范": 44 } },
      { date: "07/18", iso_date: "2026-07-18", label: "阶段调整", title: "从阅读输入转向语言输出", summary: "加入词组默写、口语复述、句子翻译和书写习惯训练。", ability_scores: { "阅读理解": 86, "完形语境": 83, "词汇运用": 72, "翻译表达": 62, "写作输出": 56, "书写规范": 48 } },
      { date: "07/26", iso_date: "2026-07-26", label: "第三次课", title: "高阶理解优势稳定", summary: "训练重点转向拼写、固定结构、完整句和规范书写。", ability_scores: { "阅读理解": 90, "完形语境": 88, "词汇运用": 76, "翻译表达": 66, "写作输出": 60, "书写规范": 56 } },
      { date: "08/02", iso_date: "2026-08-02", label: "第四次课", title: "书写进步明显，阅读进入证据定位阶段", summary: "默写训练带来清晰度提升；开始用高考材料训练定位、同义替换和事实判断。", ability_scores: { "阅读理解": 90, "完形语境": 88, "词汇运用": 78, "翻译表达": 68, "写作输出": 62, "书写规范": 72 } }
    ],
    materials: [],
    error_book: [
      {
        lesson_date: "2026-07-26",
        type: "主谓一致",
        question: "根据中文完成句子：健康的饮食确保你的身体获得足够的能量。",
        wrong: "A healthy diet make sure ...",
        right: "A healthy diet makes sure your body gets enough energy.",
        note: "第三人称单数主语 diet 对应 makes。",
        source: { material_id: "demo", page: 1, label: "0726 作业 · 第 21 版" }
      }
    ],
    phrase_notes: [
      { lesson_date: "2026-07-26", expression: "be responsible for", note: "对……负责；承担……职责" },
      { lesson_date: "2026-08-02", expression: "as few ... as possible", note: "尽可能少的……，用于可数名词复数" },
      { lesson_date: "2026-08-02", expression: "end up with", note: "最终得到；以……结束" }
    ]
  };

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;"
    })[char]);
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function normalizeLessonDate(value) {
    const text = String(value || "");
    const isoMatch = text.match(/(20\d{2})[-_/](\d{1,2})[-_/](\d{1,2})/);
    if (isoMatch) {
      return `${isoMatch[1]}-${isoMatch[2].padStart(2, "0")}-${isoMatch[3].padStart(2, "0")}`;
    }
    const shortMatch = text.match(/(?:^|\D)(\d{1,2})[\/-](\d{1,2})(?:\D|$)/);
    return shortMatch ? `2026-${shortMatch[1].padStart(2, "0")}-${shortMatch[2].padStart(2, "0")}` : "";
  }

  function getLessonDateKey(lesson) {
    return normalizeLessonDate(lesson?.iso_date || lesson?.date);
  }

  function getItemLessonDate(item) {
    return [
      item?.lesson_date,
      item?.iso_date,
      item?.date,
      item?.source?.lesson_date,
      item?.source?.material_id,
      item?.source?.label
    ].map(normalizeLessonDate).find(Boolean) || "";
  }

  function getLessonEntries(items, lessonDate) {
    return asArray(items)
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => lessonDate === "all" || getItemLessonDate(item) === lessonDate);
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
    return Number.isNaN(date.getTime())
      ? "未记录"
      : new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  }

  function renderErrorCards(entries) {
    if (!entries.length) {
      return `<div class="workspace-empty"><strong>暂时没有错题</strong><p>新的错题会按课程持续加入。</p></div>`;
    }

    return entries.map(({ item, index }, displayIndex) => `
      <article class="error-card" data-source-kind="error" data-source-index="${index}">
        <button class="workspace-source-trigger" type="button" data-source-kind="error" data-source-index="${index}">
          <span class="workspace-index">${String(displayIndex + 1).padStart(2, "0")}</span>
          <span>
            <small>${escapeHtml(item.type || "错题")}</small>
            <strong>${escapeHtml(item.question || item.source?.label || item.wrong || "查看原题")}</strong>
          </span>
          <b aria-hidden="true">查看原题 →</b>
        </button>
      </article>`).join("");
  }

  function renderPhraseNotes(entries) {
    if (!entries.length) {
      return `<div class="workspace-empty"><strong>本次课程暂无重点笔记</strong><p>老师补充后会按日期显示在这里。</p></div>`;
    }
    return entries.map(({ item }, index) => `
      <div class="phrase-item">
        <span>${String(index + 1).padStart(2, "0")}</span>
        <strong>${escapeHtml(item.expression)}</strong>
        <small>${escapeHtml(item.note)}</small>
      </div>`).join("");
  }

  function renderLessonDetail(lesson, lessonIndex) {
    if (!lesson) return '<div class="lesson-detail-empty">请选择带有蓝色标记的上课日期。</div>';
    const sources = asArray(lesson.sources);
    return `
      <article class="lesson-detail-card">
        <div class="lesson-detail-meta"><span>${escapeHtml(lesson.date || "课堂")}</span><small>${escapeHtml(lesson.label || "课堂记录")}</small></div>
        <h3>${escapeHtml(lesson.title || "课堂记录")}</h3>
        <p>${escapeHtml(lesson.summary || "本次课堂摘要待补充。")}</p>
        <div class="lesson-material-actions" aria-label="${escapeHtml(lesson.date || "本次")}课程资料">
          ${sources.length ? sources.map((source, sourceIndex) => `
            <button type="button" data-lesson-source data-source-index="${lessonIndex}" data-source-item="${sourceIndex}">
              ${escapeHtml(source.button_label || source.label || `查看资料 ${sourceIndex + 1}`)} <span aria-hidden="true">→</span>
            </button>`).join("") : '<span class="lesson-material-pending">本次资料待老师上传</span>'}
        </div>
      </article>`;
  }

  function setCanvasSize(canvas, height) {
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.max(260, Math.round(canvas.getBoundingClientRect().width || 320));
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    const context = canvas.getContext("2d");
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    return { context, width, height };
  }

  function drawRadarChart(canvas, scores) {
    if (!canvas) return;
    const entries = Object.entries(scores || {}).filter(([, score]) => Number.isFinite(Number(score)));
    if (entries.length < 3) return;
    const { context, width, height } = setCanvasSize(canvas, 270);
    const centerX = width / 2;
    const centerY = height / 2 + 4;
    const radius = Math.min(width * 0.29, 88);
    const angleStep = (Math.PI * 2) / entries.length;
    const startAngle = -Math.PI / 2;
    context.clearRect(0, 0, width, height);

    for (let ring = 1; ring <= 5; ring += 1) {
      context.beginPath();
      entries.forEach((_, index) => {
        const angle = startAngle + angleStep * index;
        const ringRadius = radius * ring / 5;
        const x = centerX + Math.cos(angle) * ringRadius;
        const y = centerY + Math.sin(angle) * ringRadius;
        index ? context.lineTo(x, y) : context.moveTo(x, y);
      });
      context.closePath();
      context.strokeStyle = ring === 5 ? "#b8cbe0" : "#dfe9f3";
      context.lineWidth = 1;
      context.stroke();
    }

    entries.forEach((_, index) => {
      const angle = startAngle + angleStep * index;
      context.beginPath();
      context.moveTo(centerX, centerY);
      context.lineTo(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius);
      context.strokeStyle = "#dfe9f3";
      context.stroke();
    });

    context.beginPath();
    entries.forEach(([, rawScore], index) => {
      const score = Math.max(0, Math.min(100, Number(rawScore) || 0));
      const angle = startAngle + angleStep * index;
      const pointRadius = radius * score / 100;
      const x = centerX + Math.cos(angle) * pointRadius;
      const y = centerY + Math.sin(angle) * pointRadius;
      index ? context.lineTo(x, y) : context.moveTo(x, y);
    });
    context.closePath();
    context.fillStyle = "rgba(0, 71, 150, 0.18)";
    context.strokeStyle = "#004796";
    context.lineWidth = 2;
    context.fill();
    context.stroke();

    context.font = '600 11px Inter, "PingFang SC", sans-serif';
    context.fillStyle = "#294e75";
    context.textBaseline = "middle";
    entries.forEach(([label, rawScore], index) => {
      const angle = startAngle + angleStep * index;
      const labelRadius = radius + 30;
      const x = centerX + Math.cos(angle) * labelRadius;
      const y = centerY + Math.sin(angle) * labelRadius;
      context.textAlign = Math.cos(angle) > 0.2 ? "left" : Math.cos(angle) < -0.2 ? "right" : "center";
      context.fillText(`${label} ${Math.round(Number(rawScore) || 0)}`, x, y);
    });
  }

  function findAbilityDiagnosis(dimension, lesson) {
    const diagnosis = asArray(lesson?.diagnosis).length ? asArray(lesson.diagnosis) : asArray(currentProfile?.diagnosis);
    const aliases = {
      "阅读理解": ["阅读"],
      "完形语境": ["完形", "语境"],
      "词汇运用": ["词汇", "词块"],
      "翻译表达": ["翻译", "语言输出", "表达"],
      "写作输出": ["写作", "语言输出", "输出"],
      "书写规范": ["书写", "习惯", "先想后写"]
    };
    const keywords = [dimension, ...(aliases[dimension] || [])];
    return diagnosis.find((item) => {
      const target = `${item.ability || ""} ${item.title || ""}`;
      return keywords.some((keyword) => target.includes(keyword));
    }) || null;
  }

  function updateAbilityDiagnosis(dimension) {
    if (!insightState) return;
    insightState.dimension = dimension;
    const lesson = insightState.lessons[insightState.selectedLessonIndex];
    const score = Math.max(0, Math.min(100, Number(insightState.radarScores?.[dimension]) || 0));
    const diagnosis = findAbilityDiagnosis(dimension, lesson);
    document.querySelectorAll("[data-ability-dimension]").forEach((button) => {
      const selected = button.dataset.abilityDimension === dimension;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    const panel = document.querySelector("#ability-diagnosis");
    if (!panel) return;
    const status = score >= 80 ? "优势保持" : score >= 65 ? "稳步提升" : "优先训练";
    panel.innerHTML = `
      <div class="ability-diagnosis-heading"><span>${escapeHtml(diagnosis?.tag || status)}</span><strong>${escapeHtml(dimension)} · ${score}</strong></div>
      <div><small>学情诊断</small><p>${escapeHtml(diagnosis?.summary || `${dimension}目前处于${status}阶段，需要结合本次课堂表现继续观察。`)}</p></div>
      <div><small>下一步建议</small><p>${escapeHtml(diagnosis?.next || currentProfile?.current_focus || "保持稳定练习，并在下一次课堂中复查。")}</p></div>`;
  }

  function resetSourceViewer() {
    const empty = document.querySelector("#source-viewer-empty");
    const active = document.querySelector("#source-viewer-active");
    if (empty) {
      empty.hidden = false;
      empty.querySelector("strong").textContent = "选择左侧错题";
      empty.querySelector("p").textContent = "这里会先显示原题页面；正确答案默认隐藏。";
    }
    if (active) active.hidden = true;
  }

  function updateLessonScopedContent(lesson) {
    const lessonDate = getLessonDateKey(lesson);
    const errorEntries = getLessonEntries(currentProfile?.error_book, lessonDate);
    const phraseEntries = getLessonEntries(currentProfile?.phrase_notes, lessonDate);
    const errorsPanel = document.querySelector("#errors-panel");
    const phraseList = document.querySelector("#phrase-list");
    const errorCount = document.querySelector("#filtered-error-count");
    const phraseCount = document.querySelector("#filtered-phrase-count");
    if (errorsPanel) errorsPanel.innerHTML = renderErrorCards(errorEntries);
    if (phraseList) phraseList.innerHTML = renderPhraseNotes(phraseEntries);
    if (errorCount) errorCount.textContent = String(errorEntries.length);
    if (phraseCount) phraseCount.textContent = String(phraseEntries.length);
    bindSourceTriggers(errorsPanel);
    resetSourceViewer();
  }

  function bindLessonSourceTriggers(root = document) {
    root?.querySelectorAll("[data-lesson-source]").forEach((sourceButton) => {
      sourceButton.addEventListener("click", () => {
        openSourceFor("lesson", Number(sourceButton.dataset.sourceIndex), Number(sourceButton.dataset.sourceItem) || 0);
        document.querySelector("#learning-workspace")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  function selectLesson(lessonIndex) {
    if (!insightState?.lessons[lessonIndex]) return;
    insightState.selectedLessonIndex = lessonIndex;
    const lesson = insightState.lessons[lessonIndex];
    const hasLessonScores = lesson.ability_scores && typeof lesson.ability_scores === "object" && Object.keys(lesson.ability_scores).length >= 3;
    const radarScores = hasLessonScores ? lesson.ability_scores : insightState.scores;
    insightState.radarScores = radarScores;
    const dateSelect = document.querySelector("#lesson-date-filter");
    if (dateSelect) dateSelect.value = String(lessonIndex);
    const detail = document.querySelector("#lesson-detail");
    if (detail) {
      detail.innerHTML = renderLessonDetail(lesson, lessonIndex);
      bindLessonSourceTriggers(detail);
    }
    const radarTitle = document.querySelector("#ability-radar-title");
    const radarNote = document.querySelector("#ability-radar-note");
    const selectedDate = document.querySelector("#ability-selected-date");
    if (radarTitle) radarTitle.textContent = `${lesson.date || "本次"} · 能力雷达`;
    if (radarNote) radarNote.textContent = hasLessonScores ? "本次课堂观察指数，不等同于考试分数" : "本次暂无独立快照，暂显示当前总览";
    if (selectedDate) selectedDate.textContent = `已选择 ${lesson.date || "本次课程"}`;
    document.querySelectorAll("[data-ability-dimension]").forEach((button) => {
      const value = Math.max(0, Math.min(100, Number(radarScores[button.dataset.abilityDimension]) || 0));
      const scoreLabel = button.querySelector("strong");
      if (scoreLabel) scoreLabel.textContent = String(value);
    });
    const radarCanvas = document.querySelector("#ability-radar-chart");
    radarCanvas?.setAttribute("aria-label", `${lesson.date || "本次课程"}六项英语能力雷达图`);
    drawRadarChart(radarCanvas, radarScores);
    updateAbilityDiagnosis(insightState.dimension);
    updateLessonScopedContent(lesson);
  }

  function initializeLessonInsights(lessons, scores) {
    if (!lessons.length) return;
    const selectedLessonIndex = Math.max(0, lessons.length - 1);
    const initialDimension = Object.keys(scores || {})[0] || "阅读理解";
    insightState = { lessons, scores, radarScores: scores, selectedLessonIndex, dimension: initialDimension };
    selectLesson(selectedLessonIndex);

    document.querySelectorAll("[data-ability-dimension]").forEach((abilityButton) => {
      abilityButton.addEventListener("click", () => updateAbilityDiagnosis(abilityButton.dataset.abilityDimension));
    });

    document.querySelector("#lesson-date-filter")?.addEventListener("change", (event) => {
      selectLesson(Number(event.currentTarget.value));
    });

    window.removeEventListener("resize", redrawInsightCharts);
    window.addEventListener("resize", redrawInsightCharts);
  }

  function redrawInsightCharts() {
    window.clearTimeout(insightResizeTimer);
    insightResizeTimer = window.setTimeout(() => {
      if (!insightState) return;
      drawRadarChart(document.querySelector("#ability-radar-chart"), insightState.radarScores || insightState.scores);
    }, 120);
  }

  function renderProfile(profile) {
    currentProfile = profile;
    const displayName = escapeHtml(profile.display_name || "同学");
    const initial = escapeHtml((profile.display_name || "学").slice(0, 1));
    const scores = Object.entries(profile.ability_scores && typeof profile.ability_scores === "object" ? profile.ability_scores : {});
    const lessons = asArray(profile.lessons);
    const errors = asArray(profile.error_book);
    const phrases = asArray(profile.phrase_notes);
    const selectedLessonIndex = Math.max(0, lessons.length - 1);
    const selectedLesson = lessons[selectedLessonIndex];
    const selectedLessonDate = getLessonDateKey(selectedLesson);
    const selectedErrors = getLessonEntries(errors, selectedLessonDate);
    const selectedPhrases = getLessonEntries(phrases, selectedLessonDate);

    app.innerHTML = `
      <div class="student-dashboard">
        <section class="profile-hero">
          <div class="container profile-hero-grid">
            <div>
              <p class="kicker">PERSONAL LEARNING FILE · 私人学习档案</p>
              <h1>${displayName}的<br />英语学习工作台</h1>
              <p class="profile-meta">${escapeHtml(profile.grade)} · ${escapeHtml(profile.city)} · ${escapeHtml(profile.plan_month)}</p>
              <p>${escapeHtml(profile.current_focus)}</p>
              <div class="profile-actions">
                <a class="button button-yellow" href="#learning-workspace">打开错题本</a>
                <a class="button button-quiet" href="#key-notes">重点笔记</a>
                <button class="button button-quiet" id="logout-button" type="button">退出登录</button>
              </div>
            </div>
            <aside class="ability-sheet">
              <div class="student-id">
                <span class="student-avatar">${initial}</span>
                <div><strong>${displayName} · 当前学情雷达</strong><small>更新于 ${formatDate(profile.updated_at)}</small></div>
              </div>
              <div class="ability-list">
                ${scores.map(([label, rawScore]) => {
                  const score = Math.max(0, Math.min(100, Number(rawScore) || 0));
                  return `<div class="ability-row"><span>${escapeHtml(label)}</span><div class="ability-track"><div class="ability-fill" style="width:${score}%"></div></div><span>${score}</span></div>`;
                }).join("")}
              </div>
              <div class="profile-alert"><strong>老师观察</strong><p>${escapeHtml(profile.current_focus)}</p></div>
            </aside>
          </div>
        </section>

        <section class="lesson-filter-section" id="lesson-insights">
          <div class="container lesson-filter-layout">
            <div class="lesson-date-control">
              <label for="lesson-date-filter">选择上课日期</label>
              <select id="lesson-date-filter" ${lessons.length ? "" : "disabled"}>
                ${lessons.map((lesson, index) => `<option value="${index}" ${index === selectedLessonIndex ? "selected" : ""}>${escapeHtml(lesson.iso_date || lesson.date || `第 ${index + 1} 次课`)} · ${escapeHtml(lesson.label || lesson.title || "课堂记录")}</option>`).join("")}
              </select>
              <small>下方能力雷达、错题本和重点笔记会随日期同步切换。</small>
            </div>
            <div id="lesson-detail" aria-live="polite">${renderLessonDetail(selectedLesson, selectedLessonIndex)}</div>
          </div>
        </section>

        <section class="section lesson-section">
          <div class="container">
            <div class="lesson-section-heading">
              <div><p class="kicker">ABILITY RADAR · 能力雷达与学情诊断</p><h2>点击能力维度查看诊断</h2></div>
              <p>课堂观察指数用于识别训练方向，不等同于考试分数</p>
            </div>
            <div class="ability-analytics-panel">
                <div class="ability-analytics-heading">
                  <div><strong id="ability-radar-title">能力观察总览</strong><small id="ability-radar-note">课堂观察指数，不等同于考试分数</small></div>
                  <span id="ability-selected-date">更新于 ${formatDate(profile.updated_at)}</span>
                </div>
                <div class="ability-chart-grid">
                  <article class="ability-chart-card radar-card">
                    <canvas id="ability-radar-chart" role="img" aria-label="当前六项英语能力雷达图"></canvas>
                  </article>
                  <article class="ability-chart-card ability-diagnosis-card" id="ability-diagnosis" aria-live="polite">
                    <div class="ability-diagnosis-heading"><span>选择能力</span><strong>学情诊断</strong></div>
                    <div><small>学情诊断</small><p>点击下方任一能力维度，查看对应诊断。</p></div>
                    <div><small>下一步建议</small><p>建议会随上课日期与能力维度同步更新。</p></div>
                  </article>
                </div>
                <div class="ability-dimension-list" aria-label="选择要查看趋势的能力维度">
                  ${scores.map(([label, rawScore], index) => `<button class="${index === 0 ? "selected" : ""}" type="button" data-ability-dimension="${escapeHtml(label)}" aria-pressed="${index === 0}"><span>${escapeHtml(label)}</span><strong>${Math.max(0, Math.min(100, Number(rawScore) || 0))}</strong></button>`).join("")}
                </div>
            </div>
          </div>
        </section>

        <section class="section workspace-section" id="learning-workspace">
          <div class="container">
            <div class="workspace-heading">
              <div><p class="kicker">LEARNING DESK · 学习工作台</p><h2>课件、反馈与错题原文</h2></div>
              <p class="workspace-filter-status">当前日期错题 <strong id="filtered-error-count">${selectedErrors.length}</strong> 条</p>
            </div>

            <div class="workspace-layout">
              <div class="workspace-list">
                <div id="errors-panel">${renderErrorCards(selectedErrors)}</div>
              </div>

              <aside class="source-viewer" aria-live="polite">
                <div class="source-empty" id="source-viewer-empty">
                  <span aria-hidden="true">PDF</span>
                  <strong>选择左侧错题</strong>
                  <p>这里会先显示原题页面；正确答案默认隐藏。</p>
                </div>
                <div class="source-active" id="source-viewer-active" hidden>
                  <div class="source-toolbar">
                    <div><small id="source-page-label">原题</small><strong id="source-title">原始资料</strong></div>
                    <a id="source-open-link" href="#" target="_blank" rel="noreferrer">新窗口打开 ↗</a>
                  </div>
                  <div class="pdf-stage">
                    <iframe id="source-frame" title="原题 PDF 页面" loading="lazy"></iframe>
                    <p id="source-status">正在获取私有原题……</p>
                  </div>
                  <div class="answer-card" id="answer-card" hidden>
                    <p class="answer-question" id="answer-question"></p>
                    <button class="answer-toggle" id="answer-toggle" type="button" aria-expanded="false">查看正确答案</button>
                    <div class="answer-reveal" id="answer-reveal" hidden>
                      <div><small>之前的作答</small><p class="previous-wrong" id="answer-wrong"></p></div>
                      <div><small>正确答案</small><p class="correct-answer" id="answer-right"></p></div>
                      <p class="answer-note" id="answer-note"></p>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </section>

        <section class="section phrase-band" id="key-notes">
          <div class="container phrase-layout">
            <div><p class="kicker">KEY PHRASES · 重点笔记</p><h2>本次重点笔记 <span id="filtered-phrase-count">${selectedPhrases.length}</span> 条</h2><p>先理解使用场景，再默写并放入自己的句子中。</p></div>
            <div class="phrase-list" id="phrase-list">
              ${renderPhraseNotes(selectedPhrases)}
            </div>
          </div>
        </section>
      </div>`;

    bindDashboardEvents();
    initializeLessonInsights(lessons, Object.fromEntries(scores));
  }

  async function getSignedUrl(material) {
    const bucket = material.bucket || config.MATERIALS_BUCKET || "student-materials";
    const cacheKey = `${bucket}:${material.path}`;
    if (signedUrlCache.has(cacheKey)) return signedUrlCache.get(cacheKey);

    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(material.path, 3600);
    if (error) throw error;
    signedUrlCache.set(cacheKey, data.signedUrl);
    return data.signedUrl;
  }

  async function openSourceFor(kind, index, sourceItem = 0) {
    const items = kind === "error" ? asArray(currentProfile?.error_book) : asArray(currentProfile?.lessons);
    const item = items[index];
    if (!item) return;

    document.querySelectorAll(".error-card.active, .lesson-entry.active").forEach((card) => card.classList.remove("active"));
    const selected = document.querySelector(`[data-source-kind="${kind}"][data-source-index="${index}"]`);
    selected?.closest(".error-card, .lesson-entry")?.classList.add("active");

    const empty = document.querySelector("#source-viewer-empty");
    const active = document.querySelector("#source-viewer-active");
    const status = document.querySelector("#source-status");
    const frame = document.querySelector("#source-frame");
    const sourceTitle = document.querySelector("#source-title");
    const sourcePageLabel = document.querySelector("#source-page-label");
    const openLink = document.querySelector("#source-open-link");
    const answerCard = document.querySelector("#answer-card");
    const answerToggle = document.querySelector("#answer-toggle");
    const answerReveal = document.querySelector("#answer-reveal");

    answerReveal.hidden = true;
    answerToggle.setAttribute("aria-expanded", "false");
    answerToggle.textContent = "查看正确答案";
    answerCard.hidden = kind !== "error";

    if (kind === "error") {
      document.querySelector("#answer-question").textContent = item.question || item.source?.label || "请先重新完成原题，再核对答案。";
      document.querySelector("#answer-wrong").textContent = item.wrong || "未记录";
      document.querySelector("#answer-right").textContent = item.right || "未记录";
      document.querySelector("#answer-note").textContent = item.note || "";
    }

    const source = kind === "lesson"
      ? asArray(item.sources)[sourceItem] || item.source
      : item.source;
    const materials = asArray(currentProfile?.materials);
    const material = source ? materials.find((entry) => entry.id === source.material_id) : null;

    if (!source || !material?.path || localDemo) {
      empty.hidden = false;
      active.hidden = true;
      empty.querySelector("strong").textContent = source ? "资料文件尚未上传" : "该项目没有指定资料";
      empty.querySelector("p").textContent = source
        ? "老师上传对应 PDF 后，这里会自动定位到原题页面。"
        : "需要关联 PDF 的课程、错题或任务会显示资料入口。";
      return;
    }

    empty.hidden = true;
    active.hidden = false;
    sourceTitle.textContent = material.title || source.label || "原始资料";
    sourcePageLabel.textContent = `第 ${Number(source.page) || 1} 页 · ${source.label || "原题"}`;
    status.hidden = false;
    status.textContent = "正在获取私有原题……";
    frame.removeAttribute("src");

    try {
      const signedUrl = await getSignedUrl(material);
      const page = Math.max(1, Number(source.page) || 1);
      const viewerUrl = `${signedUrl}#page=${page}&view=FitH&toolbar=1&navpanes=0`;
      frame.src = viewerUrl;
      frame.title = `${material.title || "原题"}第 ${page} 页`;
      openLink.href = viewerUrl;
      frame.addEventListener("load", () => { status.hidden = true; }, { once: true });
    } catch (error) {
      console.error("Material loading failed", error);
      status.textContent = "暂时无法读取原题，请确认文件已上传到本人的私有资料目录。";
      openLink.removeAttribute("href");
    }
  }

  function bindSourceTriggers(root = document) {
    root?.querySelectorAll(".workspace-source-trigger").forEach((button) => {
      button.addEventListener("click", () => {
        const kind = button.dataset.sourceKind;
        openSourceFor(kind, Number(button.dataset.sourceIndex), Number(button.dataset.sourceItem) || 0);
      });
    });
  }

  function bindDashboardEvents() {
    document.querySelector("#logout-button")?.addEventListener("click", async () => {
      if (supabase) await supabase.auth.signOut();
      location.reload();
    });

    bindSourceTriggers();

    document.querySelector("#answer-toggle")?.addEventListener("click", (event) => {
      const reveal = document.querySelector("#answer-reveal");
      const expanded = event.currentTarget.getAttribute("aria-expanded") === "true";
      reveal.hidden = expanded;
      event.currentTarget.setAttribute("aria-expanded", String(!expanded));
      event.currentTarget.textContent = expanded ? "查看正确答案" : "收起答案";
    });
  }

  async function fetchProfile() {
    const { data, error } = await supabase.from("student_profiles").select("*").single();
    if (error) throw error;
    renderProfile(data);
  }

  async function start() {
    if (localDemo) {
      currentProfile = demoProfile;
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
      if (data.session) {
        await fetchProfile();
      }
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
      setMessage("用户名仅支持 3–64 位小写字母、数字、点、下划线或连字符。", "error");
      return;
    }

    button.disabled = true;
    setMessage("正在验证账号……", "success");
    const email = `${username}@${config.USERNAME_DOMAIN}`;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      button.disabled = false;
      setMessage("用户名或密码不正确。", "error");
      return;
    }

    try {
      await fetchProfile();
    } catch (profileError) {
      console.error("Profile loading failed", profileError);
      button.disabled = false;
      setMessage("账号已通过验证，但学习档案暂时无法读取。", "error");
    }
  });

  start();
})();

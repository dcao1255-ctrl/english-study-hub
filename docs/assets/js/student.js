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
  let currentUserId = "";
  let progressByTask = {};
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
        type: "主谓一致",
        question: "根据中文完成句子：健康的饮食确保你的身体获得足够的能量。",
        wrong: "A healthy diet make sure ...",
        right: "A healthy diet makes sure your body gets enough energy.",
        note: "第三人称单数主语 diet 对应 makes。",
        source: { material_id: "demo", page: 1, label: "0726 作业 · 第 21 版" }
      }
    ],
    phrase_notes: [
      { expression: "be responsible for", note: "对……负责；承担……职责" },
      { expression: "as few ... as possible", note: "尽可能少的……，用于可数名词复数" },
      { expression: "end up with", note: "最终得到；以……结束" }
    ],
    plan: [
      {
        task_id: "daily-copy",
        cadence: "每天",
        title: "10–15 分钟范文临摹",
        detail: "临摹高考英语作文范文，注意字母连接、单词间距和句子布局。",
        focus: "提升书写连贯性"
      },
      {
        task_id: "weekly-reading",
        cadence: "每周",
        title: "1 篇高阶完形或阅读",
        detail: "完成后用一句话概括主旨，并解释关键选项依据。",
        focus: "保持理解优势",
        source: { material_id: "demo", page: 5, label: "0726 作业 · 高中完形" }
      }
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

  function getTaskKey(item, index) {
    return String(item.task_id || `task-${index + 1}`);
  }

  function getProgress(item, index) {
    const saved = progressByTask[getTaskKey(item, index)];
    return Math.max(0, Math.min(100, Number(saved?.progress) || 0));
  }

  function renderErrorCards(errors) {
    if (!errors.length) {
      return `<div class="workspace-empty"><strong>暂时没有错题</strong><p>新的错题会按课程持续加入。</p></div>`;
    }

    return errors.map((item, index) => `
      <article class="error-card" data-source-kind="error" data-source-index="${index}">
        <button class="workspace-source-trigger" type="button" data-source-kind="error" data-source-index="${index}">
          <span class="workspace-index">${String(index + 1).padStart(2, "0")}</span>
          <span>
            <small>${escapeHtml(item.type || "错题")}</small>
            <strong>${escapeHtml(item.question || item.source?.label || item.wrong || "查看原题")}</strong>
          </span>
          <b aria-hidden="true">查看原题 →</b>
        </button>
      </article>`).join("");
  }

  function renderTaskCards(plan) {
    if (!plan.length) {
      return `<div class="workspace-empty"><strong>暂时没有任务</strong><p>老师更新阶段计划后会显示在这里。</p></div>`;
    }

    return plan.map((item, index) => {
      const taskKey = getTaskKey(item, index);
      const progress = getProgress(item, index);
      const completed = progress === 100;
      return `
        <article class="task-card ${completed ? "completed" : ""}" data-source-kind="task" data-source-index="${index}" data-task-key="${escapeHtml(taskKey)}">
          <div class="task-topline">
            <span>${escapeHtml(item.cadence || "阶段")}</span>
            <small>${escapeHtml(item.focus || "")}</small>
          </div>
          <button class="task-source workspace-source-trigger" type="button" data-source-kind="task" data-source-index="${index}">
            <strong>${escapeHtml(item.title || "学习任务")}</strong>
            <p>${escapeHtml(item.detail || "")}</p>
            <span>${item.source ? "打开对应原题 →" : "查看任务说明 →"}</span>
          </button>
          <div class="task-progress-row">
            <label for="progress-${index}">完成进度 <b data-progress-label>${progress}%</b></label>
            <input id="progress-${index}" type="range" min="0" max="100" step="5" value="${progress}" data-progress-range data-task-key="${escapeHtml(taskKey)}" aria-label="${escapeHtml(item.title || "任务")}完成进度" />
            <div class="progress-track" aria-hidden="true"><span data-progress-fill style="width:${progress}%"></span></div>
            <button class="complete-button" type="button" data-complete-task data-task-key="${escapeHtml(taskKey)}">${completed ? "已完成 ✓" : "标记完成"}</button>
            <small class="save-status" data-save-status></small>
          </div>
        </article>`;
    }).join("");
  }

  function parseLessonDate(lesson) {
    const isoDate = String(lesson?.iso_date || "");
    if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
      const [year, month, day] = isoDate.split("-").map(Number);
      return new Date(year, month - 1, day, 12);
    }

    const shortDate = String(lesson?.date || "").match(/^(\d{1,2})\/(\d{1,2})$/);
    if (!shortDate) return null;
    return new Date(2026, Number(shortDate[1]) - 1, Number(shortDate[2]), 12);
  }

  function getLessonMonths(lessons) {
    const monthMap = new Map();
    lessons.forEach((lesson) => {
      const date = parseLessonDate(lesson);
      if (!date) return;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      monthMap.set(key, { key, year: date.getFullYear(), month: date.getMonth() });
    });
    return [...monthMap.values()].sort((a, b) => a.key.localeCompare(b.key));
  }

  function renderLessonCalendar(year, month, lessons, selectedLessonIndex) {
    const firstDay = new Date(year, month, 1, 12);
    const daysInMonth = new Date(year, month + 1, 0, 12).getDate();
    const leadingDays = (firstDay.getDay() + 6) % 7;
    const lessonByDay = new Map();

    lessons.forEach((lesson, index) => {
      const date = parseLessonDate(lesson);
      if (date?.getFullYear() === year && date.getMonth() === month) lessonByDay.set(date.getDate(), { lesson, index });
    });

    const cells = [];
    for (let index = 0; index < leadingDays; index += 1) cells.push('<span class="calendar-day calendar-day-empty" aria-hidden="true"></span>');
    for (let day = 1; day <= daysInMonth; day += 1) {
      const lessonInfo = lessonByDay.get(day);
      if (!lessonInfo) {
        cells.push(`<span class="calendar-day"><span>${day}</span></span>`);
        continue;
      }
      const selected = lessonInfo.index === selectedLessonIndex;
      cells.push(`
        <button class="calendar-day calendar-lesson-day ${selected ? "selected" : ""}" type="button" data-calendar-lesson="${lessonInfo.index}" aria-pressed="${selected}" aria-label="${month + 1} 月 ${day} 日，${escapeHtml(lessonInfo.lesson.title || "课堂记录")}">
          <span>${day}</span><i aria-hidden="true"></i>
        </button>`);
    }
    return cells.join("");
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

  function getAbilityTrend(lessons, dimension) {
    return lessons.map((lesson) => ({ lesson, date: parseLessonDate(lesson), score: Number(lesson.ability_scores?.[dimension]) }))
      .filter((item) => item.date && Number.isFinite(item.score))
      .sort((a, b) => a.date - b.date);
  }

  function drawTrendChart(canvas, points, dimension) {
    if (!canvas) return;
    const { context, width, height } = setCanvasSize(canvas, 210);
    const padding = { top: 22, right: 18, bottom: 38, left: 34 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;
    context.clearRect(0, 0, width, height);

    [0, 25, 50, 75, 100].forEach((score) => {
      const y = padding.top + plotHeight - score / 100 * plotHeight;
      context.beginPath();
      context.moveTo(padding.left, y);
      context.lineTo(width - padding.right, y);
      context.strokeStyle = score === 0 ? "#b8cbe0" : "#e4edf5";
      context.stroke();
      if (score === 0 || score === 50 || score === 100) {
        context.fillStyle = "#7890a8";
        context.font = "10px Inter, sans-serif";
        context.textAlign = "right";
        context.textBaseline = "middle";
        context.fillText(String(score), padding.left - 7, y);
      }
    });

    if (!points.length) return;
    const xFor = (index) => padding.left + (points.length === 1 ? plotWidth / 2 : plotWidth * index / (points.length - 1));
    const yFor = (score) => padding.top + plotHeight - Math.max(0, Math.min(100, score)) / 100 * plotHeight;

    if (points.length > 1) {
      context.beginPath();
      points.forEach((point, index) => index ? context.lineTo(xFor(index), yFor(point.score)) : context.moveTo(xFor(index), yFor(point.score)));
      context.strokeStyle = "#004796";
      context.lineWidth = 3;
      context.lineJoin = "round";
      context.stroke();
    }

    points.forEach((point, index) => {
      const x = xFor(index);
      const y = yFor(point.score);
      context.beginPath();
      context.arc(x, y, 5, 0, Math.PI * 2);
      context.fillStyle = index === points.length - 1 ? "#f0cf65" : "#ffffff";
      context.fill();
      context.strokeStyle = "#004796";
      context.lineWidth = 2;
      context.stroke();
      context.fillStyle = "#21486e";
      context.font = "700 10px Inter, sans-serif";
      context.textAlign = "center";
      context.fillText(String(Math.round(point.score)), x, y - 13);
      context.fillStyle = "#7890a8";
      context.font = "10px Inter, sans-serif";
      context.fillText(point.lesson.date || "", x, height - 14);
    });

    canvas.setAttribute("aria-label", `${dimension}课堂观察指数趋势：${points.map((point) => `${point.lesson.date}为${point.score}`).join("，")}`);
  }

  function updateAbilityTrend(dimension) {
    if (!insightState) return;
    insightState.dimension = dimension;
    const points = getAbilityTrend(insightState.lessons, dimension);
    document.querySelectorAll("[data-ability-dimension]").forEach((button) => {
      const selected = button.dataset.abilityDimension === dimension;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    const trendTitle = document.querySelector("#ability-trend-title");
    const trendSummary = document.querySelector("#ability-trend-summary");
    if (trendTitle) trendTitle.textContent = `${dimension} · 日期变化`;
    if (trendSummary) {
      const first = points[0];
      const latest = points[points.length - 1];
      const delta = first && latest ? latest.score - first.score : 0;
      const direction = delta > 0 ? `提升 ${delta} 点` : delta < 0 ? `变化 ${delta} 点` : "保持稳定";
      trendSummary.textContent = first && latest ? `${first.lesson.date} 至 ${latest.lesson.date}：${direction}` : "等待更多课堂记录";
    }
    drawTrendChart(document.querySelector("#ability-trend-chart"), points, dimension);
  }

  function updateCalendarView() {
    if (!insightState) return;
    const monthInfo = insightState.months[insightState.monthIndex];
    const label = document.querySelector("#lesson-calendar-label");
    const grid = document.querySelector("#lesson-calendar-grid");
    const previous = document.querySelector("#calendar-previous");
    const next = document.querySelector("#calendar-next");
    if (label) label.textContent = `${monthInfo.year} 年 ${monthInfo.month + 1} 月`;
    if (grid) grid.innerHTML = renderLessonCalendar(monthInfo.year, monthInfo.month, insightState.lessons, insightState.selectedLessonIndex);
    if (previous) previous.disabled = insightState.monthIndex === 0;
    if (next) next.disabled = insightState.monthIndex === insightState.months.length - 1;
  }

  function selectLesson(lessonIndex) {
    if (!insightState?.lessons[lessonIndex]) return;
    insightState.selectedLessonIndex = lessonIndex;
    const lesson = insightState.lessons[lessonIndex];
    const hasLessonScores = lesson.ability_scores && typeof lesson.ability_scores === "object" && Object.keys(lesson.ability_scores).length >= 3;
    const radarScores = hasLessonScores ? lesson.ability_scores : insightState.scores;
    insightState.radarScores = radarScores;
    const date = parseLessonDate(lesson);
    const monthIndex = insightState.months.findIndex((month) => month.year === date?.getFullYear() && month.month === date?.getMonth());
    if (monthIndex >= 0) insightState.monthIndex = monthIndex;
    updateCalendarView();
    const detail = document.querySelector("#lesson-detail");
    if (detail) detail.innerHTML = renderLessonDetail(lesson, lessonIndex);
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
  }

  function initializeLessonInsights(lessons, scores) {
    const months = getLessonMonths(lessons);
    if (!months.length) return;
    const selectedLessonIndex = Math.max(0, lessons.length - 1);
    const initialDimension = Object.keys(scores || {})[0] || "阅读理解";
    insightState = { lessons, scores, radarScores: scores, months, monthIndex: months.length - 1, selectedLessonIndex, dimension: initialDimension };
    selectLesson(selectedLessonIndex);
    updateAbilityTrend(initialDimension);

    document.querySelector("#lesson-insights")?.addEventListener("click", (event) => {
      const lessonButton = event.target.closest("[data-calendar-lesson]");
      if (lessonButton) {
        selectLesson(Number(lessonButton.dataset.calendarLesson));
        return;
      }
      const sourceButton = event.target.closest("[data-lesson-source]");
      if (sourceButton) {
        openSourceFor("lesson", Number(sourceButton.dataset.sourceIndex), Number(sourceButton.dataset.sourceItem) || 0);
        document.querySelector("#learning-workspace")?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      const abilityButton = event.target.closest("[data-ability-dimension]");
      if (abilityButton) updateAbilityTrend(abilityButton.dataset.abilityDimension);
    });

    document.querySelector("#calendar-previous")?.addEventListener("click", () => {
      if (insightState.monthIndex > 0) {
        insightState.monthIndex -= 1;
        updateCalendarView();
      }
    });
    document.querySelector("#calendar-next")?.addEventListener("click", () => {
      if (insightState.monthIndex < insightState.months.length - 1) {
        insightState.monthIndex += 1;
        updateCalendarView();
      }
    });

    window.removeEventListener("resize", redrawInsightCharts);
    window.addEventListener("resize", redrawInsightCharts);
  }

  function redrawInsightCharts() {
    window.clearTimeout(insightResizeTimer);
    insightResizeTimer = window.setTimeout(() => {
      if (!insightState) return;
      drawRadarChart(document.querySelector("#ability-radar-chart"), insightState.radarScores || insightState.scores);
      updateAbilityTrend(insightState.dimension);
    }, 120);
  }

  function renderProfile(profile) {
    currentProfile = profile;
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
              <h1>${displayName}的<br />英语学习工作台</h1>
              <p class="profile-meta">${escapeHtml(profile.grade)} · ${escapeHtml(profile.city)} · ${escapeHtml(profile.plan_month)}</p>
              <p>${escapeHtml(profile.current_focus)}</p>
              <div class="profile-actions">
                <a class="button button-yellow" href="#learning-workspace" data-workspace-tab="errors">打开错题本</a>
                <a class="button button-primary-blue" href="#learning-workspace" data-workspace-tab="tasks">打开任务栏</a>
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

        <section class="section diagnosis-section">
          <div class="container">
            <div class="section-heading">
              <div><p class="kicker">DIAGNOSIS · 学情诊断</p><h2>优势要保持，时间投向短板</h2></div>
              <p class="section-note">依据课堂任务与作业表现持续更新</p>
            </div>
            <div class="diagnosis-grid">
              ${diagnosis.map((item) => `<article class="diagnosis-card"><span class="tag">${escapeHtml(item.tag)}</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.summary)}</p><small>下一步：${escapeHtml(item.next)}</small></article>`).join("")}
            </div>
          </div>
        </section>

        <section class="section lesson-section" id="lesson-insights">
          <div class="container">
            <div class="lesson-section-heading">
              <div><p class="kicker">LESSON INSIGHTS · 课堂观察</p><h2>课堂记录与能力变化</h2></div>
              <p>点击日期查看资料；点击能力维度查看趋势</p>
            </div>
            <div class="lesson-insights-layout">
              <div class="lesson-calendar-panel">
                <div class="calendar-toolbar">
                  <button id="calendar-previous" type="button" aria-label="上一个有课程记录的月份">←</button>
                  <strong id="lesson-calendar-label">课程日历</strong>
                  <button id="calendar-next" type="button" aria-label="下一个有课程记录的月份">→</button>
                </div>
                <div class="calendar-weekdays" aria-hidden="true"><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span><span>日</span></div>
                <div class="lesson-calendar-grid" id="lesson-calendar-grid" aria-label="课程日历"></div>
                <p class="calendar-legend"><i aria-hidden="true"></i> 蓝色日期表示有课堂记录</p>
                <div id="lesson-detail" aria-live="polite">${renderLessonDetail(lessons[lessons.length - 1], Math.max(0, lessons.length - 1))}</div>
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
                  <article class="ability-chart-card trend-card">
                    <div class="trend-card-heading"><strong id="ability-trend-title">能力日期变化</strong><small id="ability-trend-summary">选择维度查看</small></div>
                    <canvas id="ability-trend-chart" role="img"></canvas>
                  </article>
                </div>
                <div class="ability-dimension-list" aria-label="选择要查看趋势的能力维度">
                  ${scores.map(([label, rawScore], index) => `<button class="${index === 0 ? "selected" : ""}" type="button" data-ability-dimension="${escapeHtml(label)}" aria-pressed="${index === 0}"><span>${escapeHtml(label)}</span><strong>${Math.max(0, Math.min(100, Number(rawScore) || 0))}</strong></button>`).join("")}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="section workspace-section" id="learning-workspace">
          <div class="container">
            <div class="workspace-heading">
              <div><p class="kicker">LEARNING DESK · 学习工作台</p><h2>课件、反馈与错题原文</h2></div>
              <div class="workspace-tabs" role="tablist" aria-label="学习工作台">
                <button class="workspace-tab active" type="button" role="tab" aria-selected="true" data-workspace-tab="errors">错题本 <span>${errors.length}</span></button>
                <button class="workspace-tab" type="button" role="tab" aria-selected="false" data-workspace-tab="tasks">任务栏 <span>${plan.length}</span></button>
              </div>
            </div>

            <div class="workspace-layout">
              <div class="workspace-list">
                <div id="errors-panel" role="tabpanel">${renderErrorCards(errors)}</div>
                <div id="tasks-panel" role="tabpanel" hidden>${renderTaskCards(plan)}</div>
              </div>

              <aside class="source-viewer" aria-live="polite">
                <div class="source-empty" id="source-viewer-empty">
                  <span aria-hidden="true">PDF</span>
                  <strong>选择左侧错题或任务</strong>
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
            <div><p class="kicker">KEY PHRASES · 重点笔记</p><h2>不背孤立单词，<br />记住完整表达</h2><p>先理解使用场景，再默写并放入自己的句子中。</p></div>
            <div class="phrase-list">
              ${phrases.map((item, index) => `<div class="phrase-item"><span>${String(index + 1).padStart(2, "0")}</span><strong>${escapeHtml(item.expression)}</strong><small>${escapeHtml(item.note)}</small></div>`).join("")}
            </div>
          </div>
        </section>
      </div>`;

    bindDashboardEvents(errors, plan);
    initializeLessonInsights(lessons, Object.fromEntries(scores));
    setWorkspaceTab("errors", true);
  }

  function setWorkspaceTab(tabName, openFirstItem) {
    const isErrors = tabName === "errors";
    const errorsPanel = document.querySelector("#errors-panel");
    const tasksPanel = document.querySelector("#tasks-panel");
    if (!errorsPanel || !tasksPanel) return;

    errorsPanel.hidden = !isErrors;
    tasksPanel.hidden = isErrors;
    document.querySelectorAll(".workspace-tab").forEach((button) => {
      const selected = button.dataset.workspaceTab === tabName;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-selected", String(selected));
    });

    if (!openFirstItem) return;
    const items = isErrors ? asArray(currentProfile?.error_book) : asArray(currentProfile?.plan);
    const firstIndex = isErrors ? 0 : Math.max(0, items.findIndex((item) => item.source));
    if (items[firstIndex]) openSourceFor(isErrors ? "error" : "task", firstIndex);
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
    const items = kind === "error"
      ? asArray(currentProfile?.error_book)
      : kind === "task"
        ? asArray(currentProfile?.plan)
        : asArray(currentProfile?.lessons);
    const item = items[index];
    if (!item) return;

    document.querySelectorAll(".error-card.active, .task-card.active, .lesson-entry.active").forEach((card) => card.classList.remove("active"));
    const selected = document.querySelector(`[data-source-kind="${kind}"][data-source-index="${index}"]`);
    selected?.closest(".error-card, .task-card, .lesson-entry")?.classList.add("active");

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

  async function saveProgress(taskKey, progress, card) {
    const status = card?.querySelector("[data-save-status]");
    if (status) status.textContent = "正在保存…";

    if (localDemo || !supabase || !currentUserId) {
      progressByTask[taskKey] = { progress };
      if (status) status.textContent = "演示模式";
      return;
    }

    const payload = {
      student_id: currentUserId,
      task_key: taskKey,
      progress,
      completed_at: progress === 100 ? new Date().toISOString() : null
    };
    const { error } = await supabase
      .from("student_plan_progress")
      .upsert(payload, { onConflict: "student_id,task_key" });

    if (error) {
      console.error("Progress save failed", error);
      if (status) status.textContent = "保存失败，请稍后重试";
      return;
    }

    progressByTask[taskKey] = payload;
    if (status) status.textContent = "已同步";
  }

  function updateProgressCard(card, progress) {
    const safeProgress = Math.max(0, Math.min(100, Number(progress) || 0));
    const label = card.querySelector("[data-progress-label]");
    const fill = card.querySelector("[data-progress-fill]");
    const completeButton = card.querySelector("[data-complete-task]");
    if (label) label.textContent = `${safeProgress}%`;
    if (fill) fill.style.width = `${safeProgress}%`;
    card.classList.toggle("completed", safeProgress === 100);
    if (completeButton) completeButton.textContent = safeProgress === 100 ? "已完成 ✓" : "标记完成";
  }

  function bindDashboardEvents(errors, plan) {
    document.querySelector("#logout-button")?.addEventListener("click", async () => {
      if (supabase) await supabase.auth.signOut();
      location.reload();
    });

    document.querySelectorAll("[data-workspace-tab]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        setWorkspaceTab(button.dataset.workspaceTab, true);
        document.querySelector("#learning-workspace")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    document.querySelectorAll(".workspace-source-trigger").forEach((button) => {
      button.addEventListener("click", () => {
        const kind = button.dataset.sourceKind;
        openSourceFor(kind, Number(button.dataset.sourceIndex), Number(button.dataset.sourceItem) || 0);
        if (kind === "lesson") {
          document.querySelector("#learning-workspace")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    });

    document.querySelectorAll("[data-progress-range]").forEach((range) => {
      range.addEventListener("input", () => {
        const card = range.closest(".task-card");
        if (card) updateProgressCard(card, range.value);
      });
      range.addEventListener("change", () => {
        const card = range.closest(".task-card");
        if (card) saveProgress(range.dataset.taskKey, Number(range.value), card);
      });
    });

    document.querySelectorAll("[data-complete-task]").forEach((button) => {
      button.addEventListener("click", () => {
        const card = button.closest(".task-card");
        const range = card?.querySelector("[data-progress-range]");
        if (!card || !range) return;
        range.value = "100";
        updateProgressCard(card, 100);
        saveProgress(button.dataset.taskKey, 100, card);
      });
    });

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

    const progressResult = await supabase
      .from("student_plan_progress")
      .select("task_key,progress,completed_at");

    if (progressResult.error) {
      console.warn("Progress table is not ready", progressResult.error);
      progressByTask = {};
    } else {
      progressByTask = Object.fromEntries(
        (progressResult.data || []).map((item) => [item.task_key, item])
      );
    }

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
        currentUserId = data.session.user.id;
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
      currentUserId = data.user?.id || data.session?.user?.id || "";
      await fetchProfile();
    } catch (profileError) {
      console.error("Profile loading failed", profileError);
      button.disabled = false;
      setMessage("账号已通过验证，但学习档案暂时无法读取。", "error");
    }
  });

  start();
})();

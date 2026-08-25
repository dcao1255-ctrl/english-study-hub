(function () {
  "use strict";

  const page = document.querySelector("#module-page");
  const modules = window.StudyHub?.modules || {};
  const libraries = window.StudyHub?.libraries || {};
  const config = window.STUDY_HUB_CONFIG || {};
  const requestedId = document.body.dataset.moduleId || new URLSearchParams(location.search).get("id") || "zhongkao";
  const module = modules[requestedId];
  const staticLibrary = libraries[requestedId] || [];
  let library = [...staticLibrary];
  let dynamicLibraryPromise = null;

  if (!page) return;

  if (!module) {
    page.innerHTML = `<section class="section"><div class="container empty-state"><h1>未找到该学习模块</h1><p>请返回首页重新选择。</p><a class="button button-yellow" href="./index.html">返回首页</a></div></section>`;
    return;
  }

  document.title = `${module.name} · 逐光英语`;
  document.querySelector('meta[name="description"]')?.setAttribute("content", module.summary);

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  })[char]);

  const safeUrl = (value) => {
    const rawValue = String(value || "").trim();
    if (!rawValue) return "";
    try {
      const url = new URL(rawValue, location.href);
      return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch {
      return "";
    }
  };

  function publicStorageUrl(storagePath) {
    const projectUrl = String(config.SUPABASE_URL || "").replace(/\/+$/, "");
    const bucket = config.PUBLIC_MATERIALS_BUCKET || "public-learning-materials";
    const encodedPath = String(storagePath || "")
      .split("/")
      .filter(Boolean)
      .map(encodeURIComponent)
      .join("/");
    if (!projectUrl || !encodedPath) return "";
    return `${projectUrl}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodedPath}`;
  }

  async function loadDynamicLibrary() {
    if (dynamicLibraryPromise) return dynamicLibraryPromise;
    const projectUrl = String(config.SUPABASE_URL || "").replace(/\/+$/, "");
    const apiKey = String(config.SUPABASE_ANON_KEY || "");
    if (!/^https:\/\/.+\.supabase\.co$/.test(projectUrl) || apiKey.length < 40) {
      return [];
    }

    dynamicLibraryPromise = (async () => {
      const query = new URLSearchParams({
        select: "id,module_key,resource_type,title,level,description,access_label,external_url,storage_path,sort_order,created_at",
        module_key: `eq.${requestedId}`,
        is_published: "eq.true",
        order: "sort_order.asc,created_at.desc"
      });
      const response = await fetch(`${projectUrl}/rest/v1/public_learning_resources?${query}`, {
        headers: {
          apikey: apiKey,
          Authorization: `Bearer ${apiKey}`
        }
      });
      if (!response.ok) throw new Error(`资料库读取失败：${response.status}`);

      const rows = await response.json();
      const dynamicItems = rows.map((row) => ({
        type: row.resource_type || "学习资料",
        title: row.title,
        level: row.level || "全阶段",
        note: row.description || "",
        access: row.access_label || (row.storage_path ? "打开 PDF" : "访问官网"),
        url: row.storage_path ? publicStorageUrl(row.storage_path) : row.external_url
      }));
      library = [...staticLibrary, ...dynamicItems];
      return dynamicItems;
    })().catch((error) => {
      console.warn("Dynamic library unavailable; using built-in resources.", error);
      return [];
    });

    return dynamicLibraryPromise;
  }

  const renderStages = () => `
    <div class="stage-list">
      ${module.stages.map(([tag, title, desc], index) => `
        <article class="stage-item"><span class="stage-number">0${index + 1} · ${tag}</span><div><h3>${title}</h3><p>${desc}</p></div></article>`).join("")}
    </div>`;

  const renderFocus = () => `
    <div class="content-grid">
      ${module.focus.map(([title, desc]) => `<article class="content-block"><h3>${title}</h3><p>${desc}</p></article>`).join("")}
    </div>`;

  const renderResources = () => `
    <div class="resource-list">
      ${module.resources.map(([title, desc]) => `<article class="resource-row"><span>${title}</span><p>${desc}</p></article>`).join("")}
    </div>`;

  const renderLibraryItems = (items) => `
    <div class="library-grid">
      ${items.map((item) => {
        const itemUrl = safeUrl(item.url);
        return `
        <article class="library-card">
          <div class="library-meta"><span>${escapeHtml(item.type)}</span><small>${escapeHtml(item.level)}</small></div>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.note)}</p>
          ${itemUrl
            ? `<a href="${escapeHtml(itemUrl)}" target="_blank" rel="noreferrer">${escapeHtml(item.access)} ↗</a>`
            : `<span class="library-access">${escapeHtml(item.access)}</span>`}
        </article>`;
      }).join("") || `<div class="empty-state"><p>没有找到匹配资料，请尝试更短的关键词。</p></div>`}
    </div>`;

  const renderLibrary = () => `
    <div class="library-toolbar">
      <div><p class="kicker">CURATED LIBRARY</p><h2>词书、真题与经典文章</h2></div>
      <label class="library-search">
        <span>搜索资料</span>
        <input id="library-search" type="search" placeholder="输入词书、阅读、真题…" autocomplete="off" />
      </label>
    </div>
    <div id="library-results">${renderLibraryItems(library)}</div>
    <p class="copyright-note">带“正版购买”的资料仅作书目推荐；公开模块保留官网入口，不上传或分发受版权保护的电子书。</p>`;

  page.innerHTML = `
    <section class="module-hero">
      <div class="container module-hero-inner">
        <div><p class="kicker light">${module.eyebrow}</p><h1>${module.name}<br />学习模块</h1><p>${module.summary}</p></div>
        <div class="module-stamp" aria-hidden="true">${module.code}</div>
      </div>
    </section>
    <div class="module-tabs-wrap">
      <div class="container module-tabs" role="tablist" aria-label="模块内容">
        <button class="tab-button active" type="button" role="tab" aria-selected="true" data-tab="stages">备考路径</button>
        <button class="tab-button" type="button" role="tab" aria-selected="false" data-tab="focus">核心能力</button>
        <button class="tab-button" type="button" role="tab" aria-selected="false" data-tab="resources">资料框架</button>
        <button class="tab-button" type="button" role="tab" aria-selected="false" data-tab="library">书单与文章</button>
      </div>
    </div>
    <section class="module-body">
      <div class="container module-layout">
        <aside class="module-aside">
          <p class="kicker">MODULE NOTE</p><h2>从目标到实战</h2><p>${module.audience}</p>
          <div class="source-box">
            <strong>官网信息直达</strong>
            <small>${module.source.organization || "官方考试机构"} · 政策、题型和考试安排请以最新通知为准。</small>
            <a href="${module.source.url}" target="_blank" rel="noreferrer">${module.source.name} ↗</a>
          </div>
        </aside>
        <div id="tab-content" role="tabpanel">${renderStages()}</div>
      </div>
    </section>`;

  const content = page.querySelector("#tab-content");
  const renderers = { stages: renderStages, focus: renderFocus, resources: renderResources, library: renderLibrary };

  function bindLibrarySearch() {
    const search = page.querySelector("#library-search");
    const results = page.querySelector("#library-results");
    if (!search || !results) return;
    search.addEventListener("input", () => {
      const query = search.value.trim().toLowerCase();
      const filtered = library.filter((item) =>
        [item.type, item.title, item.level, item.note, item.access].join(" ").toLowerCase().includes(query)
      );
      results.innerHTML = renderLibraryItems(filtered);
    });
  }

  function refreshVisibleLibrary() {
    const search = page.querySelector("#library-search");
    const results = page.querySelector("#library-results");
    if (!search || !results) return;
    const query = search.value.trim().toLowerCase();
    const filtered = library.filter((item) =>
      [item.type, item.title, item.level, item.note, item.access].join(" ").toLowerCase().includes(query)
    );
    results.innerHTML = renderLibraryItems(filtered);
  }

  loadDynamicLibrary().then(refreshVisibleLibrary);

  const tabButtons = Array.from(page.querySelectorAll("[data-tab]"));
  tabButtons.forEach((button, buttonIndex) => {
    button.addEventListener("click", () => {
      tabButtons.forEach((item) => {
        const selected = item === button;
        item.classList.toggle("active", selected);
        item.setAttribute("aria-selected", String(selected));
      });
      content.innerHTML = renderers[button.dataset.tab]();
      if (button.dataset.tab === "library") {
        bindLibrarySearch();
        loadDynamicLibrary().then(refreshVisibleLibrary);
      }
    });

    button.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault();
      const offset = event.key === "ArrowRight" ? 1 : -1;
      const nextIndex = (buttonIndex + offset + tabButtons.length) % tabButtons.length;
      tabButtons[nextIndex].focus();
      tabButtons[nextIndex].click();
    });
  });
})();

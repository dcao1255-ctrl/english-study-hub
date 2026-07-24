(function () {
  "use strict";

  const page = document.querySelector("#module-page");
  const modules = window.StudyHub?.modules || {};
  const requestedId = new URLSearchParams(location.search).get("id") || "zhongkao";
  const module = modules[requestedId];

  if (!page) return;

  if (!module) {
    page.innerHTML = `<section class="section"><div class="container empty-state"><h1>未找到该学习模块</h1><p>请返回首页重新选择。</p><a class="button button-yellow" href="./index.html">返回首页</a></div></section>`;
    return;
  }

  document.title = `${module.name} · 逐光英语`;
  document.querySelector('meta[name="description"]')?.setAttribute("content", module.summary);

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
  const renderers = { stages: renderStages, focus: renderFocus, resources: renderResources };
  page.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      page.querySelectorAll("[data-tab]").forEach((item) => {
        const selected = item === button;
        item.classList.toggle("active", selected);
        item.setAttribute("aria-selected", String(selected));
      });
      content.innerHTML = renderers[button.dataset.tab]();
    });
  });
})();

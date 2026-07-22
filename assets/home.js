(function () {
  "use strict";

  const grid = document.querySelector("#module-grid");
  const modules = window.StudyHub?.modules || {};

  if (!grid) return;

  grid.innerHTML = Object.values(modules).map((module) => `
    <article class="module-card" data-tone="${module.tone}">
      <span class="module-index">${module.index} · ${module.code}</span>
      <h3>${module.name}</h3>
      <p>${module.summary}</p>
      <a href="./module.html?id=${module.id}" aria-label="进入${module.name}模块">进入模块 →</a>
    </article>`).join("");
})();

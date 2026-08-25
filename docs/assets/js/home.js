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
      <div class="module-actions">
        <a class="module-link" href="./${module.id}.html" aria-label="进入${module.name}模块">进入模块 →</a>
        <a class="official-link" href="${module.source.url}" target="_blank" rel="noreferrer" aria-label="前往${module.name}官网信息">官网直达 ↗</a>
      </div>
    </article>`).join("");

  const previousButton = document.querySelector("#module-prev");
  const nextButton = document.querySelector("#module-next");
  const updateControls = () => {
    const maxScroll = Math.max(0, grid.scrollWidth - grid.clientWidth);
    if (previousButton) previousButton.disabled = grid.scrollLeft <= 2;
    if (nextButton) nextButton.disabled = grid.scrollLeft >= maxScroll - 2;
  };
  const scrollModules = (direction) => {
    grid.scrollBy({ left: direction * grid.clientWidth, behavior: "smooth" });
  };

  previousButton?.addEventListener("click", () => scrollModules(-1));
  nextButton?.addEventListener("click", () => scrollModules(1));
  grid.addEventListener("scroll", updateControls, { passive: true });
  window.addEventListener("resize", updateControls);
  updateControls();
})();

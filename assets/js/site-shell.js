(function () {
  "use strict";

  const script = document.currentScript;
  const root = script?.dataset.root || "./";
  const params = new URLSearchParams(location.search);
  const moduleId = params.get("id");
  const onStudentPage = location.pathname.includes("/student/");
  const active = onStudentPage ? "student" : moduleId || (location.pathname.endsWith("module.html") ? "" : "home");

  const links = [
    ["home", "首页", `${root}index.html`],
    ["zhongkao", "中考", `${root}module.html?id=zhongkao`],
    ["gaokao", "高考", `${root}module.html?id=gaokao`],
    ["kaoyan", "考研", `${root}module.html?id=kaoyan`],
    ["ielts", "雅思", `${root}module.html?id=ielts`],
    ["toefl", "托福", `${root}module.html?id=toefl`]
  ];

  const header = document.querySelector("#site-header");
  const footer = document.querySelector("#site-footer");

  if (header) {
    header.className = "site-header";
    header.innerHTML = `
      <div class="slogan-banner"><span>Fuel Your English.</span> Accelerate Your Future.</div>
      <div class="container header-inner">
        <a class="brand" href="${root}index.html" aria-label="逐光英语首页">
          <span class="brand-mark">逐</span>
          <span><strong>逐光英语</strong><small>ENGLISH STUDY HUB</small></span>
        </a>
        <nav class="site-nav" aria-label="主导航">
          ${links.map(([id, label, href]) => `<a class="${active === id ? "active" : ""}" href="${href}">${label}</a>`).join("")}
          <a class="nav-student-mobile ${active === "student" ? "active" : ""}" href="${root}student/">个人空间</a>
        </nav>
        <a class="button button-outline student-link ${active === "student" ? "active" : ""}" href="${root}student/">个人空间</a>
        <button class="menu-toggle" type="button" aria-label="打开导航" aria-expanded="false">
          <span></span><span></span><span></span>
        </button>
      </div>`;

    const menu = header.querySelector(".site-nav");
    const toggle = header.querySelector(".menu-toggle");
    toggle.addEventListener("click", () => {
      const open = menu.classList.toggle("open");
      document.body.classList.toggle("menu-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "关闭导航" : "打开导航");
    });

    menu.addEventListener("click", () => {
      menu.classList.remove("open");
      document.body.classList.remove("menu-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "打开导航");
    });
  }

  if (footer) {
    footer.className = "site-footer";
    footer.innerHTML = `
      <div class="container footer-inner">
        <div><strong class="footer-brand">逐光英语</strong><p>Fuel Your English. Accelerate Your Future.</p></div>
        <p>考试政策与报名信息以各考试机构最新公告为准</p>
      </div>`;
  }
})();

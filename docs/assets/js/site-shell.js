(function () {
  "use strict";

  const script = document.currentScript;
  const root = script?.dataset.root || "./";
  const params = new URLSearchParams(location.search);
  const moduleId = params.get("id");
  const pageModuleId = document.body.dataset.moduleId || "";
  const onStudentPage = location.pathname.includes("/student/");
  const pageName = location.pathname.split("/").pop() || "index.html";
  const active = onStudentPage
    ? "student"
    : pageName === "library.html" || pageName === "practice.html"
      ? "library"
      : pageModuleId || moduleId || (pageName === "module.html" ? "" : "home");

  const links = [
    ["home", "首页", `${root}index.html`],
    ["zhongkao", "中考", `${root}zhongkao.html`],
    ["gaokao", "高考", `${root}gaokao.html`],
    ["kaoyan", "考研", `${root}kaoyan.html`],
    ["ielts", "雅思", `${root}ielts.html`],
    ["toefl", "托福", `${root}toefl.html`]
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
        <div class="footer-about"><strong class="footer-brand">逐光英语</strong><p>面向中学及以上学习者的英语能力提升与升学考试路径。</p></div>
        <nav class="footer-links" aria-label="页脚学习路径">
          <div><strong>学习起点</strong><a href="${root}beginner.html">英语初学者</a><a href="${root}zhongkao.html">中考英语</a><a href="${root}gaokao.html">高考英语</a></div>
          <div><strong>升学考试</strong><a href="${root}kaoyan.html">考研英语</a><a href="${root}ielts.html">雅思备考</a><a href="${root}toefl.html">托福备考</a></div>
          <div><strong>阅读与服务</strong><a href="${root}reading.html">英语外刊推荐</a><a href="${root}library.html">精选资料目录</a><a href="${root}student/">学生个人空间</a></div>
        </nav>
      </div>`;
  }
})();

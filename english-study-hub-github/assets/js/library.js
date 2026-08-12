(function () {
  "use strict";

  const catalog = window.StudyHubCatalog;
  const elements = {
    grid: document.querySelector("#catalog-grid"),
    count: document.querySelector("#catalog-count"),
    status: document.querySelector("#catalog-source-status"),
    track: document.querySelector("#track-filter"),
    level: document.querySelector("#level-filter"),
    format: document.querySelector("#format-filter"),
    search: document.querySelector("#catalog-search"),
    reset: document.querySelector("#reset-filters")
  };

  if (!catalog || !elements.grid) return;

  let resources = catalog.resources.slice().sort((a, b) => a.sortOrder - b.sortOrder);

  function addOptions(select, options) {
    options.forEach((option) => {
      const [value, label] = Array.isArray(option)
        ? option
        : [option === "全部级别" ? "all" : option, option];
      const node = document.createElement("option");
      node.value = value;
      node.textContent = label;
      select.append(node);
    });
  }

  function makeText(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    node.textContent = content;
    return node;
  }

  function createCard(resource) {
    const article = document.createElement("article");
    article.className = "catalog-card";

    const top = document.createElement("div");
    top.className = "catalog-card-top";
    top.append(
      makeText("span", "level-badge", resource.level),
      makeText("small", "", resource.stage)
    );

    article.append(
      top,
      makeText("p", "catalog-series", resource.series),
      makeText("h3", "", resource.title),
      makeText("p", "catalog-description", resource.description)
    );

    const tags = document.createElement("div");
    tags.className = "catalog-tags";
    (resource.skills || []).forEach((skill) => tags.append(makeText("span", "", skill)));
    article.append(tags);

    const details = document.createElement("dl");
    details.className = "catalog-details";
    [["形式", resource.formatLabel], ["版权", resource.rightsStatus]].forEach(([label, value]) => {
      details.append(makeText("dt", "", label), makeText("dd", "", value));
    });
    article.append(details);

    const link = document.createElement("a");
    link.className = "catalog-card-link";
    link.href = `./practice.html?slug=${encodeURIComponent(resource.slug)}`;
    link.textContent = resource.mediaAvailable ? "开始学习 →" : "查看学习方式 →";
    article.append(link);
    return article;
  }

  function render() {
    const track = elements.track.value;
    const level = elements.level.value;
    const format = elements.format.value;
    const search = elements.search.value.trim().toLocaleLowerCase("zh-CN");

    const filtered = resources.filter((resource) => {
      const searchText = [resource.title, resource.series, resource.level, resource.description, ...(resource.skills || [])]
        .join(" ")
        .toLocaleLowerCase("zh-CN");
      return (track === "all" || resource.track === track)
        && (level === "all" || resource.level.includes(level))
        && (format === "all" || resource.format === format)
        && (!search || searchText.includes(search));
    });

    elements.grid.replaceChildren(...filtered.map(createCard));
    elements.count.textContent = `${filtered.length} 项资料`;
    if (!filtered.length) {
      const empty = makeText("p", "empty-state", "没有匹配的资料，请减少筛选条件或换一个关键词。");
      elements.grid.append(empty);
    }
  }

  function mapDatabaseResource(row, fallback) {
    return {
      ...(fallback || {}),
      slug: row.slug,
      title: row.title,
      series: row.series,
      level: row.level,
      stage: row.stage || fallback?.stage || "综合学习",
      track: row.track,
      format: row.resource_type || fallback?.format || "mixed",
      formatLabel: row.format_label || fallback?.formatLabel || "在线学习",
      skills: row.skills || fallback?.skills || [],
      description: row.description || fallback?.description || "",
      rightsStatus: row.rights_status || fallback?.rightsStatus || "待确认授权",
      sortOrder: row.sort_order ?? fallback?.sortOrder ?? 100,
      mediaAvailable: Boolean(row.storage_bucket && row.storage_path)
    };
  }

  async function loadPublishedCatalog() {
    const config = window.STUDY_HUB_CONFIG || {};
    if (!config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) {
      elements.status.textContent = "当前显示内置资料目录";
      return;
    }

    try {
      const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm");
      const client = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
      });
      const { data, error } = await client
        .from("learning_resources")
        .select("slug,title,series,level,stage,track,resource_type,format_label,skills,description,rights_status,storage_bucket,storage_path,sort_order")
        .eq("is_published", true)
        .eq("visibility", "catalog")
        .order("sort_order");
      if (error) throw error;

      const bySlug = new Map(resources.map((item) => [item.slug, item]));
      (data || []).forEach((row) => bySlug.set(row.slug, mapDatabaseResource(row, bySlug.get(row.slug))));
      resources = [...bySlug.values()].sort((a, b) => a.sortOrder - b.sortOrder);
      elements.status.textContent = "资料目录已与学习数据库同步";
      render();
    } catch (_error) {
      elements.status.textContent = "当前显示内置目录；数据库升级后将自动同步";
    }
  }

  addOptions(elements.track, catalog.tracks);
  addOptions(elements.level, catalog.levels);
  addOptions(elements.format, catalog.formats);
  [elements.track, elements.level, elements.format].forEach((select) => select.addEventListener("change", render));
  elements.search.addEventListener("input", render);
  elements.reset.addEventListener("click", () => {
    elements.track.value = "all";
    elements.level.value = "all";
    elements.format.value = "all";
    elements.search.value = "";
    render();
  });

  render();
  loadPublishedCatalog();
})();

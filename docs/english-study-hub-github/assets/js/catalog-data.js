(function () {
  "use strict";

  const powerUp = [
    ["power-up-starter", "Power Up Starter", "Pre-A1", "启蒙输入", "starter"],
    ["power-up-1", "Power Up Level 1", "Pre-A1", "启蒙输入", "starter"],
    ["power-up-2", "Power Up Level 2", "A1", "基础建立", "foundation"],
    ["power-up-3", "Power Up Level 3", "A1", "基础建立", "foundation"],
    ["power-up-4", "Power Up Level 4", "A2", "基础进阶", "foundation"],
    ["power-up-5", "Power Up Level 5", "A2", "基础进阶", "foundation"],
    ["power-up-6", "Power Up Level 6", "B1", "青少进阶", "teen"]
  ].map(([slug, title, level, stage, track], index) => ({
    slug,
    title,
    series: "Cambridge Power Up",
    level,
    stage,
    track,
    format: "mixed",
    formatLabel: "教材 · 音频 · 听力文本",
    skills: ["听力", "口语", "阅读", "词汇"],
    description: "以主题单元组织输入与输出，可把配套音频和听力文本用于精听、逐句跟读与课后打卡。",
    rightsStatus: "待确认授权",
    sortOrder: 10 + index
  }));

  const think = [
    ["think-1", "Think Student’s Book 1", "A2"],
    ["think-2", "Think Student’s Book 2", "B1"],
    ["think-3", "Think Student’s Book 3", "B1+"],
    ["think-4", "Think Student’s Book 4", "B2"],
    ["think-5", "Think Student’s Book 5", "C1"]
  ].map(([slug, title, level], index) => ({
    slug,
    title,
    series: "Cambridge Think",
    level,
    stage: level === "C1" ? "高阶表达" : "青少进阶",
    track: level === "C1" ? "advanced" : "teen",
    format: "mixed",
    formatLabel: "教材 · 音频",
    skills: ["听力", "口语", "阅读", "表达"],
    description: "适合已有基础的青少年系统提升。音频可进入跟读页，教材按单元建立阅读与表达任务。",
    rightsStatus: "待核对版本与授权",
    sortOrder: 30 + index
  }));

  const newConcept = [
    ["new-concept-1", "新概念英语 1", "A1–A2", "基础建立", "foundation"],
    ["new-concept-2", "新概念英语 2", "A2–B1", "基础进阶", "foundation"],
    ["new-concept-3", "新概念英语 3", "B1–B2", "青少进阶", "teen"],
    ["new-concept-4", "新概念英语 4", "B2–C1", "高阶表达", "advanced"]
  ].map(([slug, title, level, stage, track], index) => ({
    slug,
    title,
    series: "新概念英语",
    level,
    stage,
    track,
    format: "mixed",
    formatLabel: "课程讲解 · 课文音频 · 文本",
    skills: ["精读", "听力", "背诵", "语法"],
    description: "沪江版与新东方版作为同一套核心教材的不同讲解来源管理，避免把重复内容拆成两套学习路径。",
    rightsStatus: "仅登记目录，待确认授权",
    providers: ["沪江", "新东方"],
    sortOrder: 50 + index
  }));

  const supplemental = [
    {
      slug: "learning-a-z",
      title: "Learning A-Z 分级阅读",
      series: "Learning A-Z",
      level: "aa–Z2",
      stage: "分级阅读",
      track: "reading",
      format: "mixed",
      formatLabel: "绘本 · 音频 · 视频",
      skills: ["阅读", "听力", "词汇"],
      description: "保留 aa–Z2 原生分级，不强行换算 CEFR；后续可按书目、级别和阅读次数建立打卡记录。",
      rightsStatus: "需有效课堂或家庭许可",
      sortOrder: 70
    },
    {
      slug: "english-songs-154",
      title: "154 首超简单英语儿歌",
      series: "英语儿歌",
      level: "Pre-A1–A1",
      stage: "启蒙输入",
      track: "starter",
      format: "video",
      formatLabel: "MP4 视频",
      skills: ["语音", "听力", "语块"],
      description: "按主题、语音点和高频句型拆分歌单，适合短时高频输入、律动模仿和亲子打卡。",
      rightsStatus: "待确认授权",
      sortOrder: 71
    },
    {
      slug: "numberblocks",
      title: "Numberblocks 1–8 季",
      series: "Numberblocks",
      level: "Pre-A1–A1",
      stage: "学科英语",
      track: "starter",
      format: "video",
      formatLabel: "166 集 MP4 视频",
      skills: ["数学英语", "听力", "场景表达"],
      description: "定位为 CLIL 数学英语素材，按数字、加减乘除等概念组织，而不是放进普通动画片类目。",
      rightsStatus: "仅登记目录，待确认授权",
      sortOrder: 72
    }
  ];

  window.StudyHubCatalog = {
    tracks: [
      ["all", "全部路径"],
      ["starter", "启蒙输入"],
      ["foundation", "基础进阶"],
      ["teen", "青少进阶"],
      ["advanced", "高阶表达"],
      ["reading", "分级阅读"]
    ],
    levels: ["全部级别", "Pre-A1", "A1", "A2", "B1", "B1+", "B2", "C1", "aa–Z2"],
    formats: [
      ["all", "全部形式"],
      ["mixed", "综合教材"],
      ["video", "视频"],
      ["audio", "音频"],
      ["reading", "阅读"]
    ],
    resources: [...powerUp, ...think, ...newConcept, ...supplemental]
  };
})();

(function () {
  "use strict";

  window.StudyHub = window.StudyHub || {};
  window.StudyHub.libraries = {
    zhongkao: [
      {
        type: "开放词表",
        title: "New General Service List (NGSL)",
        level: "基础词汇",
        note: "高频通用英语词汇，可下载并按主题、词频或掌握度二次整理。",
        access: "免费开放",
        url: "https://www.newgeneralservicelist.org/home"
      },
      {
        type: "分级阅读",
        title: "British Council LearnEnglish Reading",
        level: "A2–B1",
        note: "按 CEFR 难度分级的短文与练习，适合建立稳定阅读量。",
        access: "官网阅读",
        url: "https://learnenglish.britishcouncil.org/free-resources/reading"
      },
      {
        type: "经典短篇",
        title: "Aesop's Fables / Sherlock Holmes Short Stories",
        level: "精读素材",
        note: "从公共领域版本中选择短篇，适合词汇标注、朗读与复述。",
        access: "公共领域",
        url: "https://www.gutenberg.org/"
      },
      {
        type: "纸质词书",
        title: "星火英语·中考英语词汇",
        level: "中考",
        note: "用于按考点复习词义、词形和固定搭配；购买最新版后自行建立索引。",
        access: "建议购买",
        url: ""
      }
    ],
    gaokao: [
      {
        type: "官方标准",
        title: "普通高中英语课程标准（2017 年版 2020 年修订）",
        level: "高考框架",
        note: "用于核对课程目标、主题语境、语言知识与学业质量要求。",
        access: "教育部",
        url: "https://www.moe.gov.cn/srcsite/A26/s8001/202006/t20200603_462199.html"
      },
      {
        type: "学术词表",
        title: "Academic Word List (AWL)",
        level: "进阶词汇",
        note: "570 个学术词族，适合高阶阅读、写作和词族扩展。",
        access: "大学官方",
        url: "https://www.wgtn.ac.nz/lals/resources/academicwordlist/information"
      },
      {
        type: "高阶阅读",
        title: "British Council B2–C1 Reading",
        level: "B2–C1",
        note: "训练长文结构、观点态度、信息整合与语境词义。",
        access: "官网阅读",
        url: "https://learnenglish.britishcouncil.org/free-resources/reading"
      },
      {
        type: "纸质词书",
        title: "维克多英语·新高中英语词汇",
        level: "高中",
        note: "适合词义辨析、搭配与语境例句积累；优先购买与当前课标匹配的版本。",
        access: "建议购买",
        url: ""
      }
    ],
    kaoyan: [
      {
        type: "核心词表",
        title: "NGSL + Academic Word List",
        level: "基础到学术",
        note: "先覆盖通用高频词，再补充学术词族，适合建立可检索的词汇底库。",
        access: "免费开放",
        url: "https://www.newgeneralservicelist.org/home"
      },
      {
        type: "外刊阅读",
        title: "Smithsonian Science & Nature",
        level: "长难句精读",
        note: "适合科学、历史与社会类文章精读；只保存个人笔记，文章本身使用官网链接。",
        access: "官网阅读",
        url: "https://www.smithsonianmag.com/category/science-nature/"
      },
      {
        type: "纸质词书",
        title: "新东方·考研英语词汇词根+联想记忆法（乱序版）",
        level: "考研",
        note: "适合系统背诵与词根复习，购买最新版后按真题出现情况建立熟词生义标签。",
        access: "建议购买",
        url: ""
      },
      {
        type: "真题方法",
        title: "阅读的逻辑",
        level: "考研阅读",
        note: "配合历年真题使用，重点记录证据句、干扰项类型和篇章逻辑。",
        access: "建议购买",
        url: ""
      }
    ],
    ielts: [
      {
        type: "官方样题",
        title: "IELTS Official Sample Test Questions",
        level: "Academic / GT",
        note: "官方听说读写样题、答题纸、音频、答案与写作评分示例。",
        access: "免费下载",
        url: "https://ielts.org/take-a-test/preparation-resources/sample-test-questions"
      },
      {
        type: "官方指南",
        title: "The Official Cambridge Guide to IELTS",
        level: "B2–C1",
        note: "四项技能训练、策略讲解与完整官方练习，适合搭建主线课程。",
        access: "正版购买",
        url: "https://shop.cambridge.org/english/product/2700253333"
      },
      {
        type: "真题系列",
        title: "Cambridge IELTS Academic / General Training",
        level: "模考",
        note: "使用当前在售版本进行整套练习，按题型和错因归档。",
        access: "正版购买",
        url: "https://ielts.org/take-a-test/preparation-resources"
      },
      {
        type: "词汇",
        title: "Collins Vocabulary for IELTS",
        level: "主题词汇",
        note: "适合按雅思主题积累词块与输出表达，不建议脱离题目孤立背诵。",
        access: "建议购买",
        url: ""
      }
    ],
    toefl: [
      {
        type: "官方平台",
        title: "TOEFL TestReady",
        level: "四项诊断",
        note: "提供免费模考、每日练习、个性化计划及口语写作反馈。",
        access: "官方免费入口",
        url: "https://www.ets.org/toefl/test-takers/ibt/prepare.html"
      },
      {
        type: "官方指南",
        title: "The Official Guide to the TOEFL iBT Test",
        level: "综合备考",
        note: "涵盖四项题型、评分标准、官方练习与考生作答点评。",
        access: "正版购买",
        url: "https://www.ets.org/toefl/test-takers/ibt/prepare.html"
      },
      {
        type: "官方真题",
        title: "Official TOEFL iBT Tests, Volumes 1 & 2",
        level: "整套模考",
        note: "每册包含完整官方练习；使用时同步记录时间、正确率和输出反馈。",
        access: "正版购买",
        url: "https://www.ets.org/toefl/test-takers/ibt/prepare.html"
      },
      {
        type: "学术输入",
        title: "VOA Learning English + Smithsonian",
        level: "听读扩展",
        note: "分别用于可理解听力输入与科学人文长文精读，保留官网链接而不搬运文章。",
        access: "官网阅读",
        url: "https://learningenglish.voanews.com/"
      }
    ]
  };
})();

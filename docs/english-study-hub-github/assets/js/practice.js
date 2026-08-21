(function () {
  "use strict";

  const slug = new URLSearchParams(location.search).get("slug") || "power-up-starter";
  const staticResource = window.StudyHubCatalog?.resources.find((item) => item.slug === slug)
    || window.StudyHubCatalog?.resources[0];
  const config = window.STUDY_HUB_CONFIG || {};
  const ui = {
    title: document.querySelector("#practice-title"),
    series: document.querySelector("#practice-series"),
    description: document.querySelector("#practice-description"),
    level: document.querySelector("#practice-level"),
    sessionStatus: document.querySelector("#session-status"),
    sessionHint: document.querySelector("#session-hint"),
    login: document.querySelector("#session-login"),
    mediaStage: document.querySelector("#media-stage"),
    playbackControls: document.querySelector("#playback-controls"),
    playbackRate: document.querySelector("#playback-rate"),
    lessonPicker: document.querySelector("#lesson-picker"),
    lessonSelect: document.querySelector("#lesson-select"),
    segmentList: document.querySelector("#segment-list"),
    recordStart: document.querySelector("#record-start"),
    recordStop: document.querySelector("#record-stop"),
    recordUpload: document.querySelector("#record-upload"),
    recordingStatus: document.querySelector("#recording-status"),
    recordingPreview: document.querySelector("#recording-preview"),
    checkinForm: document.querySelector("#checkin-form"),
    checkinStatus: document.querySelector("#checkin-status")
  };

  let client = null;
  let user = null;
  let resource = null;
  let mediaElement = null;
  let recorder = null;
  let recordingStream = null;
  let recordingBlob = null;
  let recordingStartedAt = 0;
  let recordingDuration = 0;

  function setResourceContent(item) {
    if (!item) return;
    ui.title.textContent = item.title;
    ui.series.textContent = `${item.series} · 学习任务`;
    ui.description.textContent = item.description || "完成一次输入、跟读与复盘。";
    ui.level.textContent = item.level || "综合";
    document.title = `${item.title} · 逐光英语`;
  }

  function setStatus(message, isError) {
    ui.recordingStatus.textContent = message;
    ui.recordingStatus.classList.toggle("is-error", Boolean(isError));
  }

  function preferredRecordingType() {
    if (!window.MediaRecorder) return "";
    return ["audio/webm;codecs=opus", "audio/mp4", "audio/webm", "audio/ogg"]
      .find((type) => MediaRecorder.isTypeSupported(type)) || "";
  }

  function extensionFor(type) {
    if (type.includes("mp4")) return "m4a";
    if (type.includes("ogg")) return "ogg";
    return "webm";
  }

  function renderSegments(segments) {
    ui.segmentList.replaceChildren();
    if (!segments?.length) return;
    const heading = document.createElement("strong");
    heading.textContent = "逐句文本（点击定位）";
    ui.segmentList.append(heading);
    segments.forEach((segment) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = segment.transcript;
      button.addEventListener("click", () => {
        if (!mediaElement) return;
        mediaElement.currentTime = Number(segment.start_seconds) || 0;
        mediaElement.play().catch(() => {});
      });
      ui.segmentList.append(button);
    });
  }

  function showMediaPlaceholder(message) {
    mediaElement = null;
    ui.playbackControls.hidden = true;
    const wrapper = document.createElement("div");
    wrapper.className = "media-placeholder";
    const title = document.createElement("strong");
    title.textContent = "资料尚未接入";
    const detail = document.createElement("p");
    detail.textContent = message;
    wrapper.append(title, detail);
    ui.mediaStage.replaceChildren(wrapper);
  }

  async function renderMedia(item) {
    if (!client || !user || !item?.storage_bucket || !item?.storage_path) {
      showMediaPlaceholder(user
        ? "当前课次还没有登记媒体文件，请由管理员先上传并填写 Storage 路径。"
        : "登录后才能读取私有音频、视频或电子书。"
      );
      return;
    }
    const { data, error } = await client.storage.from(item.storage_bucket).createSignedUrl(item.storage_path, 3600);
    if (error || !data?.signedUrl) {
      showMediaPlaceholder("文件暂时无法读取，请检查 Storage 路径和访问策略。");
      return;
    }

    const kind = item.media_kind === "video" ? "video" : "audio";
    mediaElement = document.createElement(kind);
    mediaElement.controls = true;
    mediaElement.preload = "metadata";
    mediaElement.src = data.signedUrl;
    ui.mediaStage.replaceChildren(mediaElement);
    ui.playbackControls.hidden = false;
  }

  async function activateResource(item) {
    resource = item;
    setResourceContent(item);
    renderSegments([]);
    await renderMedia(item);
    const { data: segments, error: segmentError } = await client
      .from("resource_segments")
      .select("id,sort_order,transcript,start_seconds,end_seconds")
      .eq("resource_id", item.id)
      .order("sort_order");
    if (!segmentError) renderSegments(segments);
  }

  async function loadResource() {
    setResourceContent(staticResource);
    if (!config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) {
      ui.sessionStatus.textContent = "学习数据库尚未配置";
      return;
    }

    try {
      const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm");
      client = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
      });
      const { data: sessionData } = await client.auth.getSession();
      user = sessionData.session?.user || null;
      if (user) {
        ui.sessionStatus.textContent = "已连接个人学习空间";
        ui.sessionHint.textContent = "录音和打卡只会写入你的个人记录。";
        ui.login.hidden = true;
      } else {
        ui.sessionStatus.textContent = "当前为访客模式";
        ui.sessionHint.textContent = "登录后可读取私有媒体、提交录音和保存打卡。";
      }

      const { data, error } = await client
        .from("learning_resources")
        .select("id,slug,title,series,level,description,storage_bucket,storage_path,media_kind")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();
      if (error) throw error;
      const collection = data || null;
      if (!collection) {
        ui.sessionHint.textContent = "目录可浏览；完成数据库升级并登记本资料后即可保存学习记录。";
        return;
      }

      const { data: lessons, error: lessonsError } = await client
        .from("learning_resources")
        .select("id,slug,title,series,level,unit_label,description,storage_bucket,storage_path,media_kind,sort_order")
        .eq("collection_slug", slug)
        .eq("is_published", true)
        .order("sort_order");
      if (!lessonsError && lessons?.length) {
        ui.lessonSelect.replaceChildren(...lessons.map((lesson, index) => {
          const option = document.createElement("option");
          option.value = String(index);
          option.textContent = lesson.unit_label ? `${lesson.unit_label} · ${lesson.title}` : lesson.title;
          return option;
        }));
        ui.lessonPicker.hidden = false;
        ui.lessonSelect.addEventListener("change", () => activateResource(lessons[Number(ui.lessonSelect.value)]));
        await activateResource(lessons[0]);
      } else {
        await activateResource(collection);
      }
    } catch (_error) {
      ui.sessionStatus.textContent = user ? "已登录，学习功能待升级" : "当前为目录预览模式";
      ui.sessionHint.textContent = "页面已可部署；运行配套 Supabase 升级脚本后会自动启用媒体、录音和打卡。";
    }
  }

  ui.playbackControls.addEventListener("click", (event) => {
    if (event.target.closest('[data-action="rewind"]') && mediaElement) {
      mediaElement.currentTime = Math.max(0, mediaElement.currentTime - 5);
    }
  });
  ui.playbackRate.addEventListener("change", () => {
    if (mediaElement) mediaElement.playbackRate = Number(ui.playbackRate.value);
  });

  ui.recordStart.addEventListener("click", async () => {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setStatus("当前浏览器不支持录音，请使用最新版 Chrome、Edge 或 Safari。", true);
      return;
    }
    try {
      recordingStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = preferredRecordingType();
      recorder = new MediaRecorder(recordingStream, mimeType ? { mimeType } : undefined);
      const chunks = [];
      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size) chunks.push(event.data);
      });
      recorder.addEventListener("stop", () => {
        const type = recorder.mimeType || mimeType || "audio/webm";
        recordingBlob = new Blob(chunks, { type });
        recordingDuration = Math.max(1, Math.round((Date.now() - recordingStartedAt) / 1000));
        ui.recordingPreview.src = URL.createObjectURL(recordingBlob);
        ui.recordingPreview.hidden = false;
        ui.recordUpload.disabled = !user || !resource;
        setStatus(user && resource ? "录音已保存在本机，可回听或提交。" : "录音已保存在本机；登录并接入资料后才能提交。", false);
        recordingStream?.getTracks().forEach((track) => track.stop());
      });
      recorder.start();
      recordingStartedAt = Date.now();
      ui.recordStart.disabled = true;
      ui.recordStop.disabled = false;
      ui.recordUpload.disabled = true;
      setStatus("正在录音…完成后请点击“停止录音”。", false);
    } catch (_error) {
      setStatus("没有获得麦克风权限，录音未开始。", true);
    }
  });

  ui.recordStop.addEventListener("click", () => {
    if (recorder?.state === "recording") recorder.stop();
    ui.recordStart.disabled = false;
    ui.recordStop.disabled = true;
  });

  ui.recordUpload.addEventListener("click", async () => {
    if (!client || !user || !resource || !recordingBlob) {
      setStatus("请先登录并完成一段录音。", true);
      return;
    }
    ui.recordUpload.disabled = true;
    setStatus("正在安全提交录音…", false);
    const fileId = crypto.randomUUID();
    const extension = extensionFor(recordingBlob.type);
    const path = `${user.id}/${resource.id}/${fileId}.${extension}`;
    const bucket = config.RECORDINGS_BUCKET || "student-recordings";
    const { error: uploadError } = await client.storage.from(bucket).upload(path, recordingBlob, {
      contentType: recordingBlob.type,
      upsert: false
    });
    if (uploadError) {
      ui.recordUpload.disabled = false;
      setStatus(`提交失败：${uploadError.message}`, true);
      return;
    }
    const { error: rowError } = await client.from("speaking_recordings").insert({
      student_id: user.id,
      resource_id: resource.id,
      storage_path: path,
      mime_type: recordingBlob.type,
      duration_seconds: recordingDuration
    });
    if (rowError) {
      await client.storage.from(bucket).remove([path]);
      ui.recordUpload.disabled = false;
      setStatus("文件已上传，但记录写入失败，请联系管理员检查数据表权限。", true);
      return;
    }
    setStatus("录音提交成功，老师可在获得权限后查看。", false);
  });

  ui.checkinForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!client || !user || !resource) {
      ui.checkinStatus.textContent = "请先登录；数据库升级并登记本资料后才能保存打卡。";
      return;
    }
    const payload = {
      student_id: user.id,
      resource_id: resource.id,
      activity_type: document.querySelector("#activity-type").value,
      progress: Number(document.querySelector("#progress-value").value),
      self_rating: document.querySelector("#self-rating").value,
      reflection: document.querySelector("#reflection").value.trim()
    };
    ui.checkinStatus.textContent = "正在保存…";
    const { error } = await client.from("practice_logs").insert(payload);
    ui.checkinStatus.textContent = error ? `保存失败：${error.message}` : "打卡已保存到你的个人学习记录。";
    if (!error) ui.checkinForm.reset();
  });

  loadResource();
})();

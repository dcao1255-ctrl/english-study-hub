(function () {
  "use strict";

  const form = document.querySelector("#contact-form");
  const status = document.querySelector("#contact-form-status");
  const copyButton = document.querySelector("#copy-contact-email");
  const endpoint = "https://formsubmit.co/ajax/dcao1255@gmail.com";

  copyButton?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText("dcao1255@gmail.com");
      copyButton.textContent = "已复制";
    } catch (_) {
      copyButton.textContent = "dcao1255@gmail.com";
    }
    window.setTimeout(() => { copyButton.textContent = "复制邮箱"; }, 1800);
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = form.querySelector("button[type='submit']");
    const formData = new FormData(form);
    if (formData.get("_honey")) return;

    button.disabled = true;
    button.textContent = "正在发送……";
    status.className = "contact-form-status";
    status.textContent = "";

    const type = String(formData.get("type") || "网站反馈");
    const payload = {
      type,
      name: String(formData.get("name") || ""),
      email: String(formData.get("email") || ""),
      _replyto: String(formData.get("email") || ""),
      message: String(formData.get("message") || ""),
      page: location.href,
      _subject: `逐光英语｜${type}`,
      _template: "table"
    };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(`Contact request failed: ${response.status}`);
      form.reset();
      status.classList.add("success");
      status.textContent = "反馈已发送，谢谢你的建议。";
      button.textContent = "发送成功";
    } catch (error) {
      console.error("Contact form submission failed", error);
      status.classList.add("error");
      status.textContent = "暂时无法发送，请复制左侧客服邮箱后手动发送。";
      button.textContent = "重新发送";
    } finally {
      button.disabled = false;
      window.setTimeout(() => {
        if (button.textContent === "发送成功") button.textContent = "发送反馈";
      }, 2200);
    }
  });
})();

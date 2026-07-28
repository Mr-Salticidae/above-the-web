// 发信通道。目前只接 Resend——一个 POST 就完事，不需要第三方 SDK，
// 和这个服务「零依赖」的路子一致。要换别家（阿里云邮件推送等）只需在这里加一个分支，
// 对外的 send() 形状不变。
//
// 没配 API key 时 enabled 为 false：接口照常工作，只是不发信，
// 自助重置会退回「管理台生成链接、站长人工发」。宁可降级，也不要因为漏配就 500。

export class MailError extends Error {
  constructor(code, message, detail = "") {
    super(message);
    this.code = code;
    this.detail = detail;
  }
}

export function createMailer(config, log = console) {
  const settings = config.mail;
  const enabled = settings.provider === "resend" && Boolean(settings.apiKey && settings.from);

  if (!enabled && settings.provider !== "none") {
    log.warn?.(
      "[atw-platform] 没有可用的发信通道（缺 ATW_MAIL_API_KEY / ATW_MAIL_FROM），" +
        "忘记密码将退回人工发链接",
    );
  }

  return {
    enabled,
    provider: enabled ? settings.provider : "none",

    async send({ to, subject, text, html }) {
      if (!enabled) throw new MailError("MAIL_DISABLED", "没有配置发信通道");

      let response;
      try {
        response = await fetch(settings.endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${settings.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: settings.from,
            to: [to],
            subject,
            text,
            ...(html ? { html } : {}),
            ...(settings.replyTo ? { reply_to: settings.replyTo } : {}),
          }),
          signal: AbortSignal.timeout(settings.timeoutMs),
        });
      } catch (error) {
        throw new MailError("MAIL_UNREACHABLE", "发信服务连不上", String(error?.message || error));
      }

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        // 把对方的原话记进日志，但不回给用户——那里面可能有收件人地址
        throw new MailError(
          "MAIL_REJECTED",
          "发信服务拒绝了这封信",
          `${response.status} ${JSON.stringify(payload)}`,
        );
      }
      return { id: payload.id || "" };
    },
  };
}

// 重置密码的信。纯文本必发，HTML 只是好看一点——收件端不支持也不影响用。
export function passwordResetMail({ displayName, resetUrl, ttlMinutes, siteUrl }) {
  const name = displayName || "你";
  const text = [
    `${name}，你好：`,
    "",
    "有人在「蛛网之上」请求重置这个邮箱对应账号的密码。是你本人的话，打开下面的链接设置新密码：",
    "",
    resetUrl,
    "",
    `链接 ${ttlMinutes} 分钟内有效，用过一次就失效。重置成功后，这个账号在所有设备上的登录都会被退掉。`,
    "",
    "不是你本人操作的话，忽略这封信就行——没点链接，密码不会有任何变化。",
    "",
    `— 蛛网之上 ${siteUrl}`,
  ].join("\n");

  const html = `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;line-height:1.8;color:#26232e;max-width:32rem">
  <p>${escapeHtml(name)}，你好：</p>
  <p>有人在「蛛网之上」请求重置这个邮箱对应账号的密码。是你本人的话，点下面的按钮设置新密码：</p>
  <p style="margin:1.6em 0">
    <a href="${escapeHtml(resetUrl)}" style="display:inline-block;padding:.7em 1.6em;border-radius:999px;background:#6d4aff;color:#fff;text-decoration:none">重置密码</a>
  </p>
  <p style="font-size:.9em;color:#6b6577">按钮点不动就复制这个地址：<br /><span style="word-break:break-all">${escapeHtml(resetUrl)}</span></p>
  <p style="font-size:.9em;color:#6b6577">链接 ${ttlMinutes} 分钟内有效，用过一次就失效。重置成功后，这个账号在所有设备上的登录都会被退掉。</p>
  <p style="font-size:.9em;color:#6b6577">不是你本人操作的话，忽略这封信就行——没点链接，密码不会有任何变化。</p>
  <p style="font-size:.85em;color:#6b6577">— 蛛网之上 <a href="${escapeHtml(siteUrl)}" style="color:#6d4aff">${escapeHtml(siteUrl)}</a></p>
</div>`;

  return { subject: "重置你在「蛛网之上」的密码", text, html };
}

function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch],
  );
}

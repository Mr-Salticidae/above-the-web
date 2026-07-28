# 交接：给 tiaozhuxiansheng.com 验证 Resend 发件域名

**执行者**：能操作浏览器的助手（Claude 桌面版 + Chrome 插件），或人自己照着点。
**为什么要做**：站点的「忘记密码」要发信。域名不验证，Resend 一律 `403 domain is not verified`。
**要动的东西**：只往阿里云云解析里**加三条记录**，外加在 Resend 点一次 Verify。不改任何现有记录。

## 完成的判定标准

同时满足两条才算完：

1. Resend 的 `tiaozhuxiansheng.com` 域名状态显示 **Verified**（绿色）。
2. 公网 DNS 能查到这三条（任选一台机器验证，见文末「自查」）。

## 起点（2026-07-28 已确认）

- 域名已在 Resend 里添加好，region 是东京，但 DNS 记录**一条都还没加**。
- 本域 NS 是 `dns23.hichina.com` / `dns24.hichina.com`，即解析托管在**阿里云云解析**。
- 服务器那边的发信配置已经就位，只差 API key（key 在主会话手上，**本次任务不需要碰 key**）。

## 步骤 A · 从 Resend 抄记录

1. 打开 `https://resend.com/domains`，点进 `tiaozhuxiansheng.com`。
2. 找到「Fill in your DNS Records」表格，里面三行：一条 DKIM(TXT)、一条 SPF(TXT)、一条 MX。
3. 把三行的 **Name / Type / Value / Priority** 完整抄下来。

DKIM 那条的值是一长串 `p=MIGfMA0GCSqGSIb3DQEBAQUAA...`，**每个域独有，只能从这一屏复制**，
不要凭印象编。另外两条通常是固定值（东京区）：

| 类型 | Name | Value | 优先级 |
| --- | --- | --- | --- |
| TXT | `resend._domainkey` | `p=MIGfMA0...`（从控制台复制） | — |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` | — |
| MX | `send` | `feedback-smtp.ap-northeast-1.amazonses.com` | `10` |

以 Resend 那一屏为准；跟上表对不上时听控制台的。

## 步骤 B · 在阿里云加这三条

1. 打开 `https://dns.console.aliyun.com/`（阿里云控制台 →「云解析 DNS」）。
2. 左侧「域名解析」列表里找到 `tiaozhuxiansheng.com`，点右侧 **「解析设置」**。
3. 点 **「添加记录」**，按下面填三次，每填完一条点确定，再加下一条。

**第一条 · DKIM**

- 记录类型：`TXT`
- 主机记录：`resend._domainkey`
- 解析线路：默认
- 记录值：步骤 A 抄来的那一长串
- TTL：10 分钟（默认）

**第二条 · SPF**

- 记录类型：`TXT`
- 主机记录：`send`
- 记录值：`v=spf1 include:amazonses.com ~all`
- TTL：默认

**第三条 · MX**

- 记录类型：`MX`
- 主机记录：`send`
- 记录值：`feedback-smtp.ap-northeast-1.amazonses.com`
- **MX 优先级：`10`**（选了 MX 才会出现这个字段，别漏）
- TTL：默认

### 三个容易错的地方

- **主机记录只填前缀**。填 `send` 就好，别填 `send.tiaozhuxiansheng.com`——阿里云会自动补后缀，
  填全了会变成 `send.tiaozhuxiansheng.com.tiaozhuxiansheng.com`，永远验证不过。
- **DKIM 的值整段粘贴**，中间不要换行、不要加引号。阿里云的 TXT 支持长值，粘完整即可。
- **MX 优先级是独立字段**，不要把 `10` 写进记录值里。

## 步骤 C · 回 Resend 点验证

回到 Resend 的域名页，点 **Verify DNS Records**。阿里云生效通常几分钟内，
状态没变就等 5–10 分钟再点一次。三条都打勾即为 Verified。

## 不要做的事

- **不要改或删任何已有记录**，尤其是根域（`@`）上已有的 TXT——那上面可能有别的站点验证；
  以及根域的 MX（企业邮箱可能在用）。我们只在 `send` 子域上加 MX，两者互不影响。
- **不要动 NS 记录**。
- **不要碰 API key、不要登服务器**。填 key、重启服务、发测试信都由主会话做。
- 遇到要手机验证码 / 二次验证 / 付费确认之类需要本人操作的环节，**停下来问用户**，不要自己想办法绕。

## 自查

命令行（PowerShell）：

```powershell
Resolve-DnsName resend._domainkey.tiaozhuxiansheng.com TXT -Server 8.8.8.8
Resolve-DnsName send.tiaozhuxiansheng.com TXT -Server 8.8.8.8
Resolve-DnsName send.tiaozhuxiansheng.com MX  -Server 8.8.8.8
```

三条都能返回值 = DNS 侧到位。Resend 页面显示 Verified = 整件事完成。

## 做完回报什么

一句话即可，包含：

1. 三条记录是否都加上了（有哪条没加、为什么）；
2. Resend 那边现在的状态（Verified / Pending / 报了什么错）。

然后**交回主会话**（Claude Code，这个仓库里），由它接着做：把 API key 填回服务器 `.env`、
`systemctl restart atw-platform`、发一封真实测试信确认端到端，并把线上 `/api/meta` 的
`selfServiceReset` 翻成 `true`。在那之前站点走的是「管理台生成一次性链接、站长人工发」的兜底，
功能可用，只是不自动发信。

/* =========================================================================
   THE FRAUD DESK — editorial dossier build (EN / 中文）
   LIBRARY = full case bank. Each shift draws 5–10 cases at random (CASES).
   A 25s decision timer runs per case; timing out counts as a miss.
   answer: "scam" = fraud, must be FLAGGED. "safe" = genuine, let pass.
   ========================================================================= */

const DECISION_SECONDS = 25;
// Harder cases get less time on the clock — pressure rises exactly where you need to think.
function caseSeconds(c) { const d = (c && c.difficulty) || 1; return d >= 3 ? 16 : d === 2 ? 20 : 25; }
// Crying wolf on a real message costs trust; harder calls cost more.
function trustPenalty(c) { const d = (c && c.difficulty) || 1; return 12 + (d - 1) * 6; } // d1:12  d2:18  d3:24

const L = {
  en: {
    dossierKicker: "An Interactive Dossier", demoBadge: "This is a Demo",
    issueMeta: "Night Shift · Random Draw",
    saved: "Recovered", lost: "Lost", callsRight: "Correct",
    introKicker: "Field Manual · Night Shift",
    coverTitle: 'Catch it before<br/>they <em>click</em>.',
    introDek: "Every day, scammers steal billions — one believable message at a time. Tonight, you sit at the desk where those messages are caught.",
    introBody: "You are the night analyst. Texts, transfers and calls cross your desk; some are honest, some are built to empty a life's savings. Read closely, find the tell, and rule before the clock runs out. Block the frauds — but cry wolf on a real message and you lose trust, too.",
    startBtn: "Begin the shift →",
    introContentsTitle: "How a shift works",
    introContentsBody: "Each shift deals 5–10 cases at random — and gets harder as the night goes on, with less time on the clock. Some real messages are built to look like scams; some scams are dressed up as perfectly ordinary business. Get it wrong either way and it costs you: miss a scam and money is lost; flag a real message and you bleed the desk's trust.",
    caseKickerWord: "Case", exhibitWord: "Exhibit", transcriptWord: "Transcript",
    atRisk: "At risk", timerLabel: "Time to rule",
    rulingPrompt: "Your ruling",
    btnGenuineLbl: "Rule it", btnGenuine: "Genuine",
    btnFraudLbl: "Rule it", btnFraud: "Fraud",
    hint: "Read closely — some real messages look like scams, and some scams look like ordinary business.",
    trustLabel: "Trust", trustWord: "Trust",
    costLostLbl: "Lost", costTrustLbl: "Trust",
    stampBlocked: "Blocked", stampCleared: "Cleared", stampMissed: "Missed", stampFalse: "False Alarm", stampTimeout: "Timed Out",
    tells: "The tells",
    next: "Next case →", seeReport: "Close the file →",
    reportKicker: "End of Shift · Assessment",
    gS: "A flawless shift. Nothing got past you, and every real customer kept their trust in you.",
    gA: "Sharp eyes. You're reading the tells now — and you didn't cry wolf on the real ones.",
    gB: "A solid shift — a couple of clever ones slipped by.",
    gC: "Some got through. Re-read the tells and draw again.",
    gD: "You lost the desk's trust. Too many real messages flagged as fraud — and when every alert is \"fraud,\" people stop believing the real ones.",
    moneySaved: "Recovered", moneyLost: "Lost", accuracy: "Accuracy",
    lockTitle: "What this demo already holds",
    lockItem1: "300+ real scam scripts — overdraft alerts, fake support lines, “safe-account” cons",
    lockItem2: "An ambiguity layer: real messages that look like scams, scams dressed as ordinary business",
    lockItem3: "Two-axis stakes — miss a scam, lose money; flag a real one, lose the desk's trust",
    lockItem4: "Bilingual, instant-switch, free to share — open in any browser, send it to your family",
    mission: "The aim: make fraud awareness a reflex — free, and for everyone.",
    replay: "Draw a new shift →",
    footer: "<b>This is a demo</b><br/>A vertical slice for The Demo Jam, 2026. Built with vanilla HTML/CSS/JS and zero dependencies, vibe-coded with Claude Code (Anthropic). Scam patterns adapted from public anti-fraud education (incl. China's National Anti-Fraud Center, 2025); no real names or brands are used.",
  },
  zh: {
    dossierKicker: "互动调查档案", demoBadge: "这是一个 Demo",
    issueMeta: "夜班 · 随机抽案",
    saved: "已挽回", lost: "已损失", callsRight: "判断正确",
    introKicker: "实务手册 · 夜班",
    coverTitle: '在他们<em>点下去</em>之前，<br/>拦住它。',
    introDek: "每天，骗子卷走数十亿——一次，一条像模像样的消息。今夜，你坐在拦下这些消息的柜台前。",
    introBody: "你是夜班分析员。短信、转账、来电从你桌上经过；有的诚实，有的专为掏空一个人的积蓄而生。仔细读，找出破绽，在倒计时归零前判下裁定。拦下骗局——但对真消息草木皆兵，你也会失去信任。",
    startBtn: "开始当班 →",
    introContentsTitle: "一个班次怎么玩",
    introContentsBody: "每个班次随机发 5–10 桩，越到后面越难、留给你的时间越短。有的真消息，偏偏长得像骗局；有的骗局，偏偏装成一桩正经事。判错哪一边都有代价——漏掉骗局，丢钱；误伤真消息，丢掉柜台对你的信任。",
    caseKickerWord: "案件", exhibitWord: "物证", transcriptWord: "记录",
    atRisk: "风险金额", timerLabel: "限时裁定",
    rulingPrompt: "你的裁定",
    btnGenuineLbl: "判定为", btnGenuine: "属实",
    btnFraudLbl: "判定为", btnFraud: "诈骗",
    hint: "仔细读——有的真消息长得像骗局，有的骗局装得像一桩正经事。",
    trustLabel: "信任", trustWord: "信任",
    costLostLbl: "损失", costTrustLbl: "信任",
    stampBlocked: "已拦截", stampCleared: "已放行", stampMissed: "漏网", stampFalse: "误判", stampTimeout: "超时未判",
    tells: "破绽",
    next: "下一桩 →", seeReport: "归档结案 →",
    reportKicker: "当班结束 · 考评",
    gS: "完美的一班。没有一个漏网，每一位真客户也都还信任你。",
    gA: "好眼力。你已经在读破绽了——而且没有对真消息草木皆兵。",
    gB: "这一班不错——有几个精巧的溜了过去。",
    gC: "有些过去了。重读破绽，再抽一班。",
    gD: "你失去了柜台的信任。太多真消息被你当成诈骗拦下——当每条预警都被喊成「诈骗」，人们就不再相信真正的那一条了。",
    moneySaved: "已挽回", moneyLost: "已损失", accuracy: "准确率",
    lockTitle: "这个 demo 里已经有什么",
    lockItem1: "300+ 真实诈骗剧本——盗刷预警、假冒客服、「安全账户」骗局",
    lockItem2: "歧义层：真消息长得像骗局，骗局装成一桩正经事",
    lockItem3: "双轴代价——漏掉骗局丢钱，误伤真消息丢掉柜台的信任",
    lockItem4: "中英双语即时切换、免费可分享——浏览器打开即玩，转给爸妈也好上手",
    mission: "目标：把反诈意识练成本能——免费，人人可用。",
    replay: "再抽一个班次 →",
    footer: "<b>这是一个 Demo</b><br/>为 The Demo Jam 2026 制作的切片。原生 HTML/CSS/JS、零依赖，借助 Claude Code（Anthropic）vibe-coding。诈骗话术改编自公开反诈科普（含国家反诈中心 2025 年资料），未使用任何真实人名或品牌。",
  },
};

const LIBRARY = [
  {
    answer: "scam", risk: 3200,
    title: { en: "The Thirty-Minute Lockout", zh: "三十分钟冻结术" },
    chan: { en: "SMS", zh: "短信" },
    sender: { en: 'Sender — <b>+1 (804) 220-9913</b>, claiming to be a bank security line',
              zh: '发件人 — <b>+1 (804) 220-9913</b>，自称某银行「安全中心」' },
    text: {
      en: `Bank alert: a login from a NEW DEVICE was detected on your account.
If this was NOT you, your account will be LOCKED in 30 minutes.

Verify now: http://yourbank-secure-verify.com/login
Reply with the 6-digit code we just texted you to confirm it's you.`,
      zh: `银行提醒：检测到您的账户在一台新设备上登录。
如果这不是您本人操作，您的账户将在 30 分钟内被冻结。

立即验证：http://yourbank-secure-verify.com/login
回复我们刚发给您的 6 位验证码以确认身份。` },
    flags: [
      { en: "Manufactured urgency — “locked in 30 minutes” pushes you to act before you think.",
        zh: "人为制造紧迫感——「30 分钟内冻结」逼你不假思索地行动。" },
      { en: "It asks for the one-time code. A real bank will never ask you to share it.",
        zh: "它索要一次性验证码。真正的银行绝不会让你把它交出去。" },
      { en: "A look-alike link that is not the bank's true domain.",
        zh: "一个仿冒链接，并非银行的真实域名。" } ],
    truthScam: { en: "Classic phishing. That code is the last wall between a thief and the account.",
                 zh: "典型钓鱼。那串验证码，是窃贼与账户之间的最后一道墙。" },
    truthSafe: { en: "It was a scam — blocking it kept the customer's balance intact.",
                 zh: "这是骗局——拦下它，保住了客户的余额。" },
  },
  {
    answer: "safe", risk: 0,
    title: { en: "Fifty, No Strings", zh: "五十块，没有钩子" },
    chan: { en: "App notification", zh: "App 通知" },
    sender: { en: 'Source — <b>a wallet app the customer already uses</b>',
              zh: '来源 — <b>客户本来就在用的钱包 App</b>' },
    text: {
      en: `Your friend Mei sent you ¥50.00 — “thanks for dinner!”
The money is already in your balance. No action needed.`,
      zh: `你的好友 Mei 给你转了 ¥50.00 ——「请你吃饭的钱，谢啦！」
钱已到你的余额。无需任何操作。` },
    flags: [
      { en: "No link to tap, no code requested, no countdown.",
        zh: "没有要点的链接，不要验证码，也没有倒计时。" },
      { en: "The money is incoming and already settled — there is nothing to approve.",
        zh: "钱是转入的，而且已经到账——根本没什么要你批准。" },
      { en: "It arrives through the app the customer truly installed, not a stray text.",
        zh: "它来自客户真正安装的 App，而非来路不明的短信。" } ],
    truthScam: { en: "This one was honest — flagging real messages teaches people to distrust real alerts.",
                 zh: "这条是真的——把真消息当骗局拦，会教人不再相信真正的提醒。" },
    truthSafe: { en: "Right call. Not everything is a trap — knowing what's safe matters just as much.",
                 zh: "判得对。不是一切都是陷阱——分得清什么安全，同样重要。" },
  },
  {
    answer: "scam", risk: 8000,
    title: { en: "The Uncle's Private Fund", zh: "叔叔的私募基金" },
    chan: { en: "Dating app → chat", zh: "交友软件 → 私聊" },
    sender: { en: 'Sender — <b>“Daniel”</b>, matched three weeks ago, never met in person',
              zh: '发件人 — <b>「Daniel」</b>，三周前匹配，从未线下见过面' },
    text: {
      en: `I hate seeing you stressed about money. My uncle runs a private
fund — I'm already up 12% this week, look at my dashboard.

The bonus window closes tonight. Start with ¥8,000 and I'll walk
you through every step. Trust me, I'd never let you lose.`,
      zh: `看你为钱发愁，我心疼。我叔叔管着一只私募基金——
这周我已经赚了 12%，看我的后台截图。

加成窗口今晚就关。先投 ¥8,000，我全程教你。
相信我，我绝不会让你亏。` },
    flags: [
      { en: "A “pig-butchering” pattern: romance first, then a can't-lose investment.",
        zh: "「杀猪盘」套路：先谈感情，再推一个稳赚不赔的投资。" },
      { en: "Never met in person, yet steering you to send a very large sum.",
        zh: "从未线下见面，却引导你转出一大笔钱。" },
      { en: "Faked profit screenshots plus a closing “bonus window” to force a fast yes.",
        zh: "伪造的盈利截图，加上即将关闭的「加成窗口」，逼你快速点头。" } ],
    truthScam: { en: "Romance-investment scams are among the costliest of all. The platform is fake; deposits vanish.",
                 zh: "杀猪盘是损失最惨重的骗局之一。平台是假的，入金即蒸发。" },
    truthSafe: { en: "It was a scam — you just stopped an ¥8,000 loss and a breaking heart.",
                 zh: "这是骗局——你刚拦下了 ¥8,000 的损失，和一颗将碎的心。" },
  },
  {
    answer: "scam", risk: 1500,
    title: { en: "A Favour for the Boss", zh: "老板的一个小忙" },
    chan: { en: "Work IM", zh: "工作群消息" },
    sender: { en: 'Sender — <b>“the CEO”</b>, a new account whose photo matches the boss',
              zh: '发件人 — <b>「老板」</b>，一个头像与老板相同的新账号' },
    text: {
      en: `Hi — stuck in a meeting, can't talk. Quick favour: buy
5 × ¥300 gift cards for a client reward and send me the codes.

Keep this between us for now; I'll approve reimbursement after.`,
      zh: `在吗——正开会，不方便讲话。帮个急忙：买
5 张 300 元的礼品卡做客户答谢，把卡密发我。

先别跟别人说，回头我批报销。` },
    flags: [
      { en: "Authority, urgency and secrecy — the three levers of a “boss fraud”.",
        zh: "权威、紧迫、保密——「冒充领导」骗局的三根杠杆。" },
      { en: "Payment as gift-card codes: untraceable, irreversible, never a real company process.",
        zh: "用礼品卡卡密付款：无法追踪、无法撤回，绝非真实的公司流程。" },
      { en: "“New account” and “can't talk now” neatly block you from verifying by voice.",
        zh: "「新账号」加「现在不方便讲话」，刚好堵死你电话核实的路。" } ],
    truthScam: { en: "A boss-impersonation scam. The fix: call the boss back on a number you already know.",
                 zh: "冒充领导骗局。破解：用你早已知道的号码，回拨老板核实。" },
    truthSafe: { en: "It was a scam — a confidential gift-card request is almost always fraud.",
                 zh: "这是骗局——要求保密的礼品卡请求，几乎都是诈骗。" },
  },
  {
    answer: "safe", risk: 0,
    title: { en: "The Call That Says No", zh: "那通说「不」的电话" },
    chan: { en: "Phone call · transcript", zh: "来电 · 通话记录" },
    sender: { en: "Source — the number printed on the back of the customer's own card",
              zh: "来源 — 客户自己卡片背面印着的那个号码" },
    text: {
      en: `“This is your bank's fraud team. We blocked a ¥2,000 charge we don't think was you.
We will never ask for your PIN or a one-time code.

Please don't read any code to anyone. To continue, hang up and call us
back using the number on the back of your card.”`,
      zh: `「这里是您银行的反诈团队。我们拦下了一笔 ¥2,000 的扣款，怀疑不是您本人。
我们绝不会向您索要密码或一次性验证码。

请不要把任何验证码读给任何人。如需继续，请挂断，
用您卡片背面的号码回拨我们。」` },
    flags: [
      { en: "It says outright it will never ask for your code — the opposite of a scammer.",
        zh: "它直截了当地说绝不会要你的验证码——和骗子恰恰相反。" },
      { en: "No link, no pressure to pay; it sends you to the official number to verify.",
        zh: "没有链接、不催你付款；反而让你用官方号码去核实。" },
      { en: "“Hang up and call the number on your card” is exactly the safe habit to build.",
        zh: "「挂断，用卡背号码回拨」正是该养成的安全习惯。" } ],
    truthScam: { en: "It was genuine — over-blocking means the next real fraud alert gets ignored.",
                 zh: "这是真的——过度拦截，意味着下一次真正的反诈提醒会被忽视。" },
    truthSafe: { en: "Right call. The mark of a real bank: it tells you to verify it through official channels.",
                 zh: "判得对。真银行的标志：它让你通过官方渠道去核实它自己。" },
  },

  {
    answer: "scam", risk: 5000,
    title: { en: "Easy Money, One Tap at a Time", zh: "动动手指，日入过千" },
    chan: { en: "Part-time job chat", zh: "兼职群" },
    sender: { en: 'Sender — a “recruiter” who added you after you left your number on a job site',
              zh: '发件人 — 「闪电兼职客服」，你在招聘网站留过手机号后加你' },
    text: {
      en: `Legit online side-gig — boost a shop's sales and earn commission per task.
Your first three tasks paid out instantly. This is a bigger one:
front ¥5,000 and you'll get ¥5,650 back. Slots close today!`,
      zh: `正规线上兼职——给商家刷单冲销量，做一单返一单佣金。
前三单本金加佣金已秒返。这是一笔大额任务：
垫付 ¥5,000，完成后连本带利返 ¥5,650。名额今天截止哦~` },
    flags: [
      { en: "Small early payouts hook you; then a big “task” swallows the money you front.",
        zh: "先用小额返利让你尝到甜头，再设大额任务卷走你垫付的本金。" },
      { en: "Any “pay first, get a rebate” task is a scam — and brushing sales is itself illegal.",
        zh: "任何「先垫钱、再返现」的任务都是诈骗，刷单本身也违法。" },
      { en: "“Slots close today” manufactures urgency so you can't stop to check.",
        zh: "「名额今天截止」制造紧迫，不给你停下来查证的时间。" } ],
    truthScam: { en: "Task-rebate fraud is the single most common scam. The small payout is bait for the big deposit.",
                 zh: "刷单返利是发案量最高的骗局。返的小钱，是钓你垫大钱的饵。" },
    truthSafe: { en: "It was a scam — you blocked ¥5,000 and dodged an illegal brushing job.",
                 zh: "这是骗局——你拦下了 ¥5,000，也躲过了违法刷单。" },
  },
  {
    answer: "scam", risk: 200000,
    title: { en: "The 'Safe Account' That Isn't", zh: "涉嫌洗钱的「安全账户」" },
    chan: { en: "Phone — transferred call", zh: "电话转接" },
    sender: { en: 'Sender — claims to be the “police criminal division”; the number starts with +00',
              zh: '发件人 — 自称「市公安局刑侦支队」，来电显示 +00 开头' },
    text: {
      en: `You're implicated in a major money-laundering case — there's a warrant.
We'll take your statement by video, in strict secrecy; tell no one.
To clear your name, move your funds to our designated “safe account”
for review; you'll get it all back once you're cleared.`,
      zh: `你涉嫌一起特大洗钱案，已有逮捕令。
现在与你视频做笔录，全程保密，不许告诉家人。
为自证清白，请把名下资金转入我们指定的「安全账户」
接受资金清算，查清后原路退回。` },
    flags: [
      { en: "Real police never take statements or demand transfers by phone or video — and “safe accounts” do not exist.",
        zh: "公检法办案绝不会电话或视频要你转账，更没有所谓「安全账户」。" },
      { en: "Fear (“warrant”, “felony”) plus enforced secrecy cuts you off from anyone who'd warn you.",
        zh: "用「逮捕令」「涉嫌重罪」制造恐惧，再用「保密」切断你向家人求证。" },
      { en: "A +00 / spoofed overseas number — no real agency contacts you like this.",
        zh: "来电号码 +00、境外改号——真机关不会这样联系你。" } ],
    truthScam: { en: "Police-impersonation scams cause the heaviest single losses. Transfer to a “safe account” = always fraud.",
                 zh: "冒充公检法，单案损失往往最惨重。转账到「安全账户」＝一定是诈骗。" },
    truthSafe: { en: "It was a scam — you just stopped a ¥200,000 “asset review”.",
                 zh: "这是骗局——你刚拦下一笔 ¥200,000 的「资金清算」。" },
  },
  {
    answer: "scam", risk: 180000,
    title: { en: "Erase Your Student Loan — or Wreck Your Credit", zh: "注销学生贷，否则毁征信" },
    chan: { en: "Phone call", zh: "电话" },
    sender: { en: 'Sender — a “finance / regulator” rep who knows your name and your school',
              zh: '发件人 — 自称「金融平台 / 监管部门」客服，准确报出你的姓名和学校' },
    text: {
      en: `Your old campus-loan account was never closed — under new rules
it will hurt your credit! To fix it, draw down your quota on every
lending app and transfer it to our “supervision account” to verify.
It'll be restored to normal right after.`,
      zh: `您学生时期注册的校园贷账户没有注销——按新规会影响个人征信！
需要配合清空额度：把各网贷平台的额度都借出来，
转到我们的「监管账户」核验，核验完立即恢复正常。` },
    flags: [
      { en: "Credit records are managed solely by the central bank — they cannot be “erased” or “repaired”. The premise is fake.",
        zh: "个人征信由央行统一管理，无法人为「注销」或「修复」，这套说法本身就是假的。" },
      { en: "It makes you take real loans on many apps, then transfer them out — the debt stays yours.",
        zh: "它引导你在多个平台真实借款再转出，债留给你，钱归骗子。" },
      { en: "Knowing your name and school proves nothing — that data is bought and traded.",
        zh: "报得出你的姓名和学校，只是买来的信息，并不代表身份真实。" } ],
    truthScam: { en: "Anything that cites “your credit score” to make you transfer or borrow is a scam.",
                 zh: "凡以「影响征信」为由要你转账或借贷的，都是诈骗。" },
    truthSafe: { en: "It was a scam — you dodged taking on ¥180,000 of loans.",
                 zh: "这是骗局——你躲过了背上 ¥180,000 网贷的陷阱。" },
  },
  {
    answer: "scam", risk: 95000,
    title: { en: "The Boss on the Video Call", zh: "视频里的「领导」" },
    chan: { en: "Video call", zh: "微信视频" },
    sender: { en: 'Sender — a newly added contact whose face on video really looks like your boss',
              zh: '发件人 — 新加的好友，视频里的脸的确是领导本人' },
    text: {
      en: `(the video drops after nine seconds) Bad signal, let's just chat.
I'm away closing a deal and a payment must go out now — wire ¥95,000
from the company account to this number, I'll sort the paperwork later.
Hurry, within ten minutes.`,
      zh: `（视频接通 9 秒后挂断）画面卡了，先这样。
我在外地谈项目，有笔款急着走对公账户，
你先从公司账上垫 ¥95,000 到这个账号，手续费回头报。
急，十分钟内办好。` },
    flags: [
      { en: "AI face-swap and voice-cloning need only seconds of footage — “I saw their face” is no longer proof.",
        zh: "AI 换脸加拟声只需几秒素材，「亲眼看到脸」已不再可信。" },
      { en: "A very short call that “lags” and drops is the classic trick to stop you spotting the fake.",
        zh: "视频极短、信号「卡顿」就挂断，正是不让你细看破绽的惯用手法。" },
      { en: "Urgent transfer, a company account, a ten-minute deadline — any one means: call back to verify first.",
        zh: "急转账、对公账户、十分钟限时——任何一条都该让你先电话核实。" } ],
    truthScam: { en: "When money is involved, call the person back on a number you already have. Seeing is no longer believing.",
                 zh: "涉及转账，务必用旧号码回拨本人当面或电话核实——眼见不再为实。" },
    truthSafe: { en: "It was a scam — you saw through a nine-second deepfake and saved ¥95,000.",
                 zh: "这是骗局——你识破了一段 9 秒的 AI 换脸，守住了 ¥95,000。" },
  },
  {
    answer: "scam", risk: 4000,
    title: { en: "Faulty Order, Triple Refund", zh: "订单有问题，主动赔你三倍" },
    chan: { en: "Phone + SMS link", zh: "电话 + 短信链接" },
    sender: { en: 'Sender — a “marketplace agent” who reads back your real order number and item',
              zh: '发件人 — 自称「电商客服」，准确报出你买过的商品和订单号' },
    text: {
      en: `The item you bought failed a quality check — we're refunding you triple.
Tap the link in our text, enter your bank-card number and the code we
send you, and the compensation lands right away.`,
      zh: `您购买的商品质检不合格，我们主动按三倍理赔。
请点短信里的链接，填写您的银行卡号和收到的验证码，
理赔款立即到账。` },
    flags: [
      { en: "A real refund returns by the original payment path — it never needs your card number or a code.",
        zh: "真退款会原路退回，绝不需要你的卡号和验证码。" },
      { en: "Knowing your order details means your data leaked, not that the caller is official.",
        zh: "准确报出订单信息，是信息泄露，不是官方身份的证明。" },
      { en: "“Triple compensation” is far too generous — it baits the wish for a windfall.",
        zh: "「三倍赔付」远超合理，是用占便宜的心理钓你。" } ],
    truthScam: { en: "When “customer service” asks for your code, that code is the key to drain your account.",
                 zh: "客服「理赔」只要验证码，那串码就是把钱划走的口令。" },
    truthSafe: { en: "It was a scam — you kept the ¥4,000 in the customer's card.",
                 zh: "这是骗局——你保住了卡里的 ¥4,000。" },
  },
  {
    answer: "scam", risk: 6000,
    title: { en: "Flight Cancelled, Claim Compensation", zh: "航班取消，改签赔偿" },
    chan: { en: "SMS", zh: "短信" },
    sender: { en: 'Sender — an “airline” mass-text (actually a spoofed station) quoting your real flight number',
              zh: '发件人 — 「航空公司」短信（其实是伪基站群发），精准报出你的航班号' },
    text: {
      en: `Your flight is cancelled (mechanical fault). You may rebook or refund
and claim ¥300 in compensation. Do NOT use the official app — contact
our dedicated agent on a chat app; bank-card verification required first.`,
      zh: `您乘坐的航班因机械故障取消，可改签或退票并领 ¥300 延误补偿。
请勿在官方 App 操作，联系专属客服在聊天软件办理，
需先验证银行卡。` },
    flags: [
      { en: "A correct flight number lowers your guard — but itinerary data leaks, too.",
        zh: "精准报出航班号会让人卸下戒心，但行程信息也可能泄露。" },
      { en: "“Don't use the official app, message us on a chat app” is designed to pull you off safe channels.",
        zh: "「别用官方 App、加聊天软件私聊办理」正是要把你拉离安全渠道。" },
      { en: "Real rebooking refunds never need you to “verify a bank card” or pay first.",
        zh: "退改签退款从不需要「验证银行卡」，更不会让你先付费。" } ],
    truthScam: { en: "If you get a flight alert, verify only via the airline's official app or the number on your ticket.",
                 zh: "收到航班异常，只在航司官方 App、官网，或票面客服电话核实。" },
    truthSafe: { en: "It was a scam — that spoofed text didn't walk off with ¥6,000.",
                 zh: "这是骗局——你没被那条伪基站短信带走 ¥6,000。" },
  },
  {
    answer: "scam", risk: 12000,
    title: { en: "You're on a ¥800-a-Month Plan", zh: "您开通了会员，每月扣 800" },
    chan: { en: "Phone call", zh: "电话" },
    sender: { en: 'Sender — a “platform agent” saying the system mistakenly enrolled you in a premium plan',
              zh: '发件人 — 自称「平台客服」，说系统误给你开通了付费会员' },
    text: {
      en: `You accidentally signed up for a plan — the system auto-charges ¥800
a month and won't stop. I'll switch it off for you: download this
“meeting” app, share your screen, and follow my steps to cancel.`,
      zh: `您之前不小心开通了会员，系统每月自动扣 ¥800，不取消会一直扣。
我帮您关闭，请下载这个「会议」App，和我屏幕共享，
按我说的操作就能退订。` },
    flags: [
      { en: "“Download an app, share your screen, follow my steps” hands the scammer your banking codes.",
        zh: "「下载 App、屏幕共享、按我操作」＝把你的银行验证码暴露给骗子。" },
      { en: "Real platforms let you cancel in the app's own settings — never via screen-share.",
        zh: "真平台取消扣费，在 App 设置里自己就能关，绝不用屏幕共享。" },
      { en: "It uses fear of “endless charges” and targets those less familiar with phones.",
        zh: "用「持续扣费」制造焦虑，专挑不熟悉手机操作的老人下手。" } ],
    truthScam: { en: "Anyone asking you to “share your screen” to cancel a charge is running a scam.",
                 zh: "任何让你「屏幕共享、远程协助」办理退费的，都是诈骗。" },
    truthSafe: { en: "It was a scam — you protected ¥12,000 in an elderly customer's account.",
                 zh: "这是骗局——你护住了老人卡里的 ¥12,000。" },
  },
  {
    answer: "scam", risk: 8800,
    title: { en: "Tonight's Lucky Viewer", zh: "恭喜被选为幸运观众" },
    chan: { en: "SMS", zh: "短信" },
    sender: { en: 'Sender — claims to be a hit TV show, with a “claim your prize” web link',
              zh: '发件人 — 自称某热播节目组，短信带一个领奖网址' },
    text: {
      en: `Congratulations! Our show drew you as a lucky off-site viewer —
second prize: ¥188,000 and a laptop. Log in to the prize site and pay
¥8,800 in income tax and a deposit, and the prize will be released.`,
      zh: `恭喜！您被某热播节目后台抽为场外幸运观众，
获二等奖 ¥188,000 及笔记本电脑一台。
请登录领奖网址，缴纳个人所得税及保证金 ¥8,800 后发放。` },
    flags: [
      { en: "Legitimate prizes never charge “tax or a deposit” up front — pay-to-claim is always fake.",
        zh: "正规奖项不会先收「税费、保证金」，凡先交钱才能领奖的都是假的。" },
      { en: "You never entered this show, yet you “won second prize”.",
        zh: "你从没参加过这个节目，却「中了二等奖」。" },
      { en: "A stray prize link is usually a phishing site after your logins.",
        zh: "陌生领奖链接多是钓鱼网站，会套走你的账号密码。" } ],
    truthScam: { en: "If a windfall asks you to pay first, it is, without exception, a scam.",
                 zh: "「天上掉馅饼」却先要你交钱的，百分百是诈骗。" },
    truthSafe: { en: "It was a scam — you didn't hand over the ¥8,800 “deposit”.",
                 zh: "这是骗局——你没给那 ¥8,800 的「保证金」。" },
  },
  {
    answer: "safe", risk: 0,
    title: { en: "The Insurance Rebate", zh: "医保返还到账" },
    chan: { en: "SMS · official channel", zh: "短信 · 官方渠道" },
    sender: { en: 'Source — the national insurance service, an official text with no link',
              zh: '来源 — 国家医保局官方短信，没有链接' },
    text: {
      en: `Your 2025 resident health-insurance rebate of ¥260 has been credited;
check it in the official insurance app. Questions? Call the public
hotline 12393. We will never ask you for a code or a transfer.`,
      zh: `您 2025 年度城乡居民医保个人账户返还 ¥260 已到账，
可在「国家医保服务平台」App 查询。如有疑问请拨打 12393。
本短信不会向您索要任何验证码或转账。` },
    flags: [
      { en: "The money is incoming, not requested — and there's no link to tap.",
        zh: "钱是「到账」，不是要你转出；也没有要点的链接。" },
      { en: "It states outright it will never ask for a code or a transfer — exactly what a real agency does.",
        zh: "主动写明「绝不索要验证码或转账」，正是正规机构的做法。" },
      { en: "It points you to the official app and a public hotline to check for yourself.",
        zh: "指引你去官方 App 和公开热线 12393 自助查询。" } ],
    truthScam: { en: "This was genuine — blocking real notices makes people miss money they're owed.",
                 zh: "这条是真的——把真政务通知当骗局拦，会让人错过该领的钱。" },
    truthSafe: { en: "Right call. “We'll never ask for your code” is the mark of a real notice.",
                 zh: "判得对。主动告知「不索要验证码」，是正规通知的标志。" },
  },
  {
    answer: "safe", risk: 0,
    title: { en: "A Charge From Another City", zh: "一笔异地刷卡提醒" },
    chan: { en: "Bank SMS · official number", zh: "银行短信 · 官方号段" },
    sender: { en: "Source — your bank's official alert number",
              zh: "来源 — 你银行的官方短信号段（95 开头）" },
    text: {
      en: `Your card ending 6621 was charged ¥1,299 in another city at 10:24.
If this was you, ignore this. If not, call the number on the back of
your card. We will never ask for your PIN or a code via this message.`,
      zh: `您尾号 6621 信用卡 10:24 在异地完成一笔 ¥1,299 消费。
如为本人操作请忽略；如有疑问请拨打卡片背面客服电话核实。
我行不会以此短信向您索要密码或验证码。` },
    flags: [
      { en: "It simply notifies a charge — no link, no pressure to act.",
        zh: "只是消费「告知」，没有链接、不催你操作。" },
      { en: "It tells you to call the number on your card, not one it provides.",
        zh: "让你拨「卡背官方电话」核实，而不是它给你的号码。" },
      { en: "It says plainly it will never ask for your PIN or code — the opposite of a scammer.",
        zh: "明说「不会索要密码或验证码」，与骗子恰恰相反。" } ],
    truthScam: { en: "This was a genuine alert — over-blocking means a real fraudulent charge gets missed.",
                 zh: "这是真的银行提醒——过度拦截，真有盗刷时反而会被忽略。" },
    truthSafe: { en: "Right call. A real bank sends you to the official number on your card to verify it.",
                 zh: "判得对。真银行让你用卡背官方电话核实它自己。" },
  },
  {
    answer: "safe", risk: 0,
    title: { en: "Parcel at the Pickup Point", zh: "快递已到驿站" },
    chan: { en: "App notification", zh: "App 通知" },
    sender: { en: "Source — the parcel app the customer actually uses",
              zh: "来源 — 客户常用的快递驿站 App 通知" },
    text: {
      en: `Your parcel is at the pickup point. Code 8-2-5103 — show it to
collect. The point will never ask you to pay or for bank details.`,
      zh: `您的包裹已到驿站，取件码 8-2-5103，请凭码取件。
驿站不会要求您付款或提供银行卡信息。` },
    flags: [
      { en: "It gives a pickup code only — no payment, no bank details.",
        zh: "只给取件码，不要钱、不要银行信息。" },
      { en: "It comes from the official app the customer really uses, not a stray link.",
        zh: "来自客户真正安装、常用的官方 App，不是陌生短信链接。" },
      { en: "Scammers usually hook with “lost-parcel compensation” — this asks for nothing.",
        zh: "「包裹丢失理赔」才是骗子常用的切口，这条没有任何索取。" } ],
    truthScam: { en: "This was genuine — an ordinary pickup notice, nothing to fear.",
                 zh: "这条是真的——正常的取件通知，无需警惕。" },
    truthSafe: { en: "Right call. A real notice gives a code and never touches your money or card.",
                 zh: "判得对。真通知只给取件码，不碰你的钱和卡。" },
  },

  /* ---- expanded case bank (+184) ---- */
  {
    answer: "scam", risk: 6800,
    title: { en: "The Warm-Up Payout", zh: "热身返利" },
    chan: { en: "WeChat", zh: "微信" },
    sender: { en: "Sender — <b>a stranger who added you</b>, calling themselves a part-time recruiter", zh: "发件人 — <b>一位主动加你的陌生人</b>，自称兼职招募专员" },
    text: { en: "Easy online work — just 'like' short videos and screenshot. First three tasks paid you ¥3 each, instantly. Nice!\n\nNow the VIP round: top up ¥6,800 to unlock the bundled task, finish it, and we refund your principal PLUS ¥1,400 commission. Slots close at midnight tonight.", zh: "轻松线上任务——给短视频点赞并截图即可。前三单每单 3 元，已秒到账。不错吧！\n\n现在进入 VIP 高级单：先充值 6,800 元解锁组合任务，完成后退还本金外加 1,400 元佣金。今晚零点名额关闭。" },
    flags: [ { en: "Tiny real payouts first, then a demand to front your own money — the classic brushing trap.", zh: "先给小额真返利，再要你垫付自己的钱——典型刷单陷阱。" },
             { en: "'Pay first to unlock, get a rebate later' is never how legitimate work pays.", zh: "「先付费解锁、之后再返利」绝不是正规工作的付薪方式。" },
             { en: "A midnight deadline manufactured to stop you thinking it over.", zh: "零点截止的人为期限，专门让你来不及细想。" } ],
    truthScam: { en: "Brushing scam. The first ¥9 was bait; the ¥6,800 'principal' never comes back.", zh: "刷单诈骗。最初那 9 元是诱饵；6,800 元「本金」一去不回。" },
    truthSafe: { en: "It was a scam — blocking it kept ¥6,800 in the worker's pocket.", zh: "这是骗局——拦下它，6,800 元留在了打工者口袋里。" },
  },
  {
    answer: "scam", risk: 15000,
    title: { en: "Five-Star Boosting", zh: "五星好评单" },
    chan: { en: "App notification", zh: "App 推送" },
    sender: { en: "Sender — <b>a 'merchant task hall' app</b> you were invited to install", zh: "发件人 — <b>一款被邀请安装的「商家任务大厅」App</b>" },
    text: { en: "Welcome, reviewer! Write 5-star app-store reviews and earn per review.\nWarm-up batch cleared: ¥48 credited.\n\nGold batch is live: prepay ¥15,000 to 'activate the merchant's review quota', then your balance + commission unlocks for withdrawal. Quota expires today — don't lose your tier.", zh: "欢迎，测评员！为应用商店写五星好评，按条结算。\n热身批次已完成：到账 48 元。\n\n黄金批次开启：预付 15,000 元「激活商家好评额度」，随后余额加佣金即可提现。额度今日到期——别掉等级。" },
    flags: [ { en: "A small credit you can withdraw, then a large one you must 'activate' with cash.", zh: "先有一笔可提的小额，再来一笔要你掏钱「激活」的大额。" },
             { en: "App-store policies forbid paid reviews — the job itself is fake.", zh: "应用商店明令禁止刷好评——这份工作本身就是假的。" },
             { en: "Same-day expiry on your 'tier' is pressure, not a real rule.", zh: "「等级」当天到期是施压手段，并非真规则。" } ],
    truthScam: { en: "Brushing scam. The withdrawal button stays grey until you've sent enough that walking away hurts.", zh: "刷单诈骗。提现键一直灰着，直到你投入到舍不得走为止。" },
    truthSafe: { en: "It was a scam — the 'review quota' was a funnel for your deposits.", zh: "这是骗局——所谓「好评额度」只是吸你存款的漏斗。" },
  },
  {
    answer: "scam", risk: 38000,
    title: { en: "Rooms You Never Booked", zh: "刷不完的房单" },
    chan: { en: "WeChat", zh: "微信" },
    sender: { en: "Sender — <b>a 'hotel order-filling group'</b> admin", zh: "发件人 — <b>「酒店刷单群」</b>管理员" },
    text: { en: "Help our partner hotels hit booking targets. You 'book' a room with your own money, we instantly refund it plus 8% reward.\n\nFirst two rooms (¥260, ¥520) refunded on the dot — see the chat receipts. Combo task now: book three rooms at once, ¥38,000 total. Group settles within the hour. Three seats left today.", zh: "帮合作酒店冲订单量。你用自己的钱「下单」订房，我们立即返款外加 8% 奖励。\n\n前两间（260 元、520 元）准时返款——群里有回执。现在升级组合单：一次订三间，合计 38,000 元，群内一小时内结算。今日仅剩三个名额。" },
    flags: [ { en: "Two honest refunds to build trust, then a combo task too big to refund.", zh: "先两笔老实返款建立信任，再上一笔大到不会返的组合单。" },
             { en: "Real hotels never need strangers to pre-pay rooms to 'hit targets'.", zh: "真酒店从不需要陌生人垫钱订房来「冲业绩」。" },
             { en: "'Three seats left today' — scarcity invented on the spot.", zh: "「今日仅剩三个名额」——临时编造的稀缺感。" } ],
    truthScam: { en: "Brushing scam. The combo task is the catch; the 'one-hour settlement' never arrives.", zh: "刷单诈骗。组合单才是收网；所谓「一小时结算」永远不来。" },
    truthSafe: { en: "It was a scam — refusing the combo task saved ¥38,000.", zh: "这是骗局——拒掉组合单，省下 38,000 元。" },
  },
  {
    answer: "scam", risk: 2400,
    title: { en: "Likes for Lunch Money", zh: "点赞换零花" },
    chan: { en: "App notification", zh: "App 推送" },
    sender: { en: "Sender — <b>a 'campus part-time' mini-program</b>", zh: "发件人 — <b>一个「校园兼职」小程序</b>" },
    text: { en: "Student gig: like and follow video accounts, ¥2 each. Withdraw anytime.\nYou earned ¥16 today — already in your wallet.\n\nWeekend boost: deposit ¥2,400 to join the 'agency liking pool' for triple pay. New members must pay first; deposit returns with your earnings on Sunday. Pool fills fast.", zh: "学生单：给视频账号点赞关注，每条 2 元，随时提现。\n你今日已赚 16 元——已进钱包。\n\n周末加成：充值 2,400 元加入「机构点赞池」，收益三倍。新成员须先充值，周日连同收益一起退还。池子很快满。" },
    flags: [ { en: "Targets students with pocket-money sums, then asks them to deposit thousands.", zh: "用零花钱诱惑学生，再要他们充值上千元。" },
             { en: "'Members pay first, deposit returns later' — the rebate that never lands.", zh: "「成员先充值、押金后退」——那笔永不到账的返款。" },
             { en: "An 'agency pool' that fills fast manufactures urgency.", zh: "「机构池」很快满，制造紧迫感。" } ],
    truthScam: { en: "Brushing scam aimed at students. The ¥16 was bait; the ¥2,400 funds the con.", zh: "针对学生的刷单诈骗。16 元是诱饵；2,400 元才是骗子要的。" },
    truthSafe: { en: "It was a scam — the student kept their term's savings.", zh: "这是骗局——学生保住了一学期的积蓄。" },
  },
  {
    answer: "scam", risk: 9200,
    title: { en: "Grab the Concert, Lose the Wallet", zh: "代抢演唱会" },
    chan: { en: "WeChat", zh: "微信" },
    sender: { en: "Sender — <b>a 'ticket-grabbing studio'</b> contact", zh: "发件人 — <b>「代抢门票工作室」</b>联系人" },
    text: { en: "Be our ticket runner — we feed you sold-out concert orders, you place them, we pay ¥30 each.\nDemo order done, ¥30 sent (screenshot above).\n\nReal orders need float: load ¥9,200 to your task account so the system can 'grab' simultaneously, refunded with pay after each show. Tonight's batch closes in 40 minutes.", zh: "来当代抢跑单——我们派热门演唱会订单给你，你下单，每单 30 元。\n演示单已完成，30 元已发（见上方截图）。\n\n正式单需要预存：往任务账户充 9,200 元，系统才能同时「抢」，每场结束后连同报酬退还。今晚批次 40 分钟后关闭。" },
    flags: [ { en: "A ¥30 demo payout, then a ¥9,200 'float' you must load yourself.", zh: "先发 30 元演示报酬，再要你自掏 9,200 元「预存」。" },
             { en: "'Refunded after each show' is the rebate hook that never pays.", zh: "「每场后退还」是那个永不兑现的返款钩子。" },
             { en: "A 40-minute countdown to rush the transfer.", zh: "40 分钟倒计时，逼你赶紧转账。" } ],
    truthScam: { en: "Brushing scam dressed as ticket-running. The 'float' is the whole catch.", zh: "披着代抢外衣的刷单诈骗。「预存」就是全部圈套。" },
    truthSafe: { en: "It was a scam — no float sent, no loss.", zh: "这是骗局——没充预存，没有损失。" },
  },
  {
    answer: "scam", risk: 52000,
    title: { en: "The Platform That Froze", zh: "卡单的平台" },
    chan: { en: "App notification", zh: "App 推送" },
    sender: { en: "Sender — <b>'customer service'</b> inside a shop-boosting app", zh: "发件人 — <b>刷单 App 内的「客服」</b>" },
    text: { en: "Your task batch is 'stuck' — the system flagged it incomplete.\nTo release your ¥6,300 earnings, you must complete the remaining bundle: pay ¥52,000 now, all of it returns with commission once the batch clears.\n\nYour account is frozen until then. Resolve before 18:00 or earnings are forfeited.", zh: "您的任务批次「卡单」——系统判定未完成。\n要释放您的 6,300 元收益，须完成剩余组合单：现付 52,000 元，批次解锁后连同佣金全额退还。\n\n在此之前账户冻结。请于 18:00 前处理，否则收益作废。" },
    flags: [ { en: "Holding your 'earnings' hostage forces ever-larger deposits.", zh: "扣住你的「收益」作人质，逼你越垫越多。" },
             { en: "'Pay ¥52,000 to unlock ¥6,300' — the maths only works for the thief.", zh: "「付 52,000 解锁 6,300」——这账只对骗子划算。" },
             { en: "A frozen account and a 6 p.m. cliff are pure coercion.", zh: "冻结账户加 18:00 期限，纯属胁迫。" } ],
    truthScam: { en: "Brushing scam. 'Stuck task / pay to unlock' is the bleed-you-dry stage.", zh: "刷单诈骗。「卡单、付费解锁」正是榨干你的阶段。" },
    truthSafe: { en: "It was a scam — walking away from the 'frozen' account stopped the bleed.", zh: "这是骗局——放弃那个「冻结」账户，止住了失血。" },
  },
  {
    answer: "scam", risk: 700,
    title: { en: "The Retiree's Easy Click", zh: "退休阿姨的轻松单" },
    chan: { en: "WeChat", zh: "微信" },
    sender: { en: "Sender — <b>a neighbour's 'side-income group'</b>", zh: "发件人 — <b>邻居拉的「副业群」</b>" },
    text: { en: "Auntie, perfect for retirees — follow shops on your phone, ¥1.50 a tap.\nYou tried four, ¥6 landed in your wallet. See how easy?\n\nMember upgrade: pay the ¥700 'activation fee' once and your daily limit jumps to 200 taps. Fee comes back with your first payout. Group leader closes upgrades tonight.", zh: "阿姨，特别适合退休的——手机上关注店铺，每点一下 1.5 元。\n您试了四下，6 元已进钱包。是不是很简单？\n\n会员升级：一次性交 700 元「激活费」，每日上限升到 200 单。这费用首次结算时返还。群主今晚截止升级。" },
    flags: [ { en: "A ¥6 taste, then a one-time 'activation fee' you'll never see again.", zh: "先尝 6 元甜头，再来一笔有去无回的「激活费」。" },
             { en: "Legit work never charges YOU an upfront fee to start.", zh: "正规工作绝不会先向你收一笔上岗费。" },
             { en: "Targets a trusting retiree through a neighbour's group.", zh: "借邻居群下手，专挑信任他人的退休老人。" } ],
    truthScam: { en: "Brushing/upfront-fee scam. The 'activation fee' is the whole product.", zh: "刷单兼上岗费诈骗。「激活费」就是骗子的全部商品。" },
    truthSafe: { en: "It was a scam — the retiree kept her ¥700.", zh: "这是骗局——阿姨守住了她的 700 元。" },
  },
  {
    answer: "scam", risk: 21000,
    title: { en: "The Order That Doubled", zh: "越滚越大的单" },
    chan: { en: "Work IM", zh: "办公 IM" },
    sender: { en: "Sender — <b>a 'team lead'</b> in a freelance task channel", zh: "发件人 — <b>兼职任务频道里的「组长」</b>" },
    text: { en: "New combo rule: each order's value doubles the last. Order 1 was ¥80, Order 2 ¥160 — both refunded with 12% on top, as promised.\n\nOrder 5 is ¥21,000. Pay it and the system releases your full ¥26k balance plus all commissions. You're one task from cashing out — don't break the chain now.", zh: "新组合规则：每单金额翻上一单的倍。第一单 80 元，第二单 160 元——都按约定连本带 12% 返还。\n\n第五单是 21,000 元。付清后系统释放你全部 2.6 万余额及所有佣金。你离提现只差一单——别在这时断链。" },
    flags: [ { en: "Doubling 'orders' escalate until you can't afford to stop.", zh: "翻倍的「订单」越滚越大，直到你停不下来。" },
             { en: "'One task from cashing out' is the sunk-cost trap, not a milestone.", zh: "「离提现只差一单」是沉没成本陷阱，不是里程碑。" },
             { en: "A real employer never makes you fund the work that pays you.", zh: "真正的雇主绝不会让你自掏腰包去做发你工资的活。" } ],
    truthScam: { en: "Brushing scam. The doubling chain is engineered to drain the whole account.", zh: "刷单诈骗。翻倍链条专为掏空整个账户而设计。" },
    truthSafe: { en: "It was a scam — breaking the chain saved ¥21,000.", zh: "这是骗局——断开链条，省下 21,000 元。" },
  },
  {
    answer: "scam", risk: 4500,
    title: { en: "Pre-Pay the Cart", zh: "代付购物车" },
    chan: { en: "WeChat", zh: "微信" },
    sender: { en: "Sender — <b>an 'online-shop booster'</b> recruiter", zh: "发件人 — <b>「网店补单」招募员</b>" },
    text: { en: "Boost our shop's sales rank: add items to cart, pay, screenshot. We refund the order + ¥25 fee per cart.\nTrial cart ¥98 refunded in two minutes.\n\nBig cart today: ¥4,500. Same deal, refund + ¥120. Our accountant releases refunds in batches at 5 p.m. — submit before then or miss this round.", zh: "帮我们店冲销量排名：加购、付款、截图，我们退还订单金额外加每单 25 元手续费。\n试单 98 元，两分钟内返还。\n\n今日大单：4,500 元。同样规则，返款外加 120 元。我们会计 17:00 批量放款——之前提交，否则错过本轮。" },
    flags: [ { en: "A ¥98 trial that refunds, then a ¥4,500 cart that won't.", zh: "98 元试单会返，4,500 元大单不会。" },
             { en: "'Batch refunds at 5 p.m.' delays you past the point of doubt.", zh: "「17:00 批量放款」把你拖过起疑的时点。" },
             { en: "Fake-order 'sales boosting' is itself illegal and a known scam.", zh: "虚假下单「冲销量」本身违法，且是已知骗局。" } ],
    truthScam: { en: "Brushing scam. The trial refund exists only to license the big one.", zh: "刷单诈骗。试单返款的唯一作用，是为大单背书。" },
    truthSafe: { en: "It was a scam — the big cart was never going to refund.", zh: "这是骗局——那笔大单从来不会返款。" },
  },
  {
    answer: "scam", risk: 13500,
    title: { en: "VIP Mission Unlock", zh: "VIP 任务解锁" },
    chan: { en: "App notification", zh: "App 推送" },
    sender: { en: "Sender — <b>a 'rebate mall'</b> push", zh: "发件人 — <b>「返利商城」</b>推送" },
    text: { en: "You've unlocked Bronze tasks — ¥58 earned and withdrawable, congrats!\nSilver and Gold missions pay 5×. To unlock them, recharge your task wallet to ¥13,500 (refunded once Gold completes).\n\nUnlock window: 90 minutes. After that your Bronze progress resets to zero.", zh: "您已解锁青铜任务——已赚 58 元且可提现，恭喜！\n白银、黄金任务收益 5 倍。解锁须把任务钱包充值到 13,500 元（黄金完成后退还）。\n\n解锁窗口：90 分钟。逾期青铜进度清零。" },
    flags: [ { en: "A withdrawable ¥58 to prove 'it pays', then a recharge to 'unlock' more.", zh: "先给可提的 58 元证明「真给钱」，再要充值「解锁」更多。" },
             { en: "Threatening to reset your progress is coercion, not a feature.", zh: "威胁清零进度是胁迫，不是功能。" },
             { en: "Recharging your own wallet to 'unlock pay' is never legitimate.", zh: "充值自己的钱包来「解锁工资」绝非正规操作。" } ],
    truthScam: { en: "Brushing scam. Tiers and resets exist only to extract the recharge.", zh: "刷单诈骗。等级与清零的存在，只为榨出那笔充值。" },
    truthSafe: { en: "It was a scam — no recharge, no loss.", zh: "这是骗局——没充值，没损失。" },
  },
  {
    answer: "scam", risk: 1800,
    title: { en: "The Uniform Deposit", zh: "工服押金" },
    chan: { en: "SMS", zh: "短信" },
    sender: { en: "Sender — <b>955XX</b>, an 'HR onboarding desk'", zh: "发件人 — <b>955XX</b>，自称「人事入职处」" },
    text: { en: "Congratulations — you're hired as a warehouse sorter, ¥6,000/month.\nReport Monday. First, transfer the ¥1,800 uniform + badge deposit to the account below; it's fully refunded with your first salary.\n\nSlots are limited — confirm payment today to secure the role.", zh: "恭喜——您已被录用为仓库分拣员，月薪 6,000 元。\n周一报到。请先把 1,800 元工服与工牌押金转入下方账户，首月工资时全额退还。\n\n名额有限——请今日确认付款以保留岗位。" },
    flags: [ { en: "Hired with no interview, then asked to pay a 'deposit' up front.", zh: "没面试就录用，紧接着要你先交「押金」。" },
             { en: "Legitimate employers provide uniforms; they don't bill you for them.", zh: "正规雇主提供工服，绝不向你收费。" },
             { en: "'Confirm payment today' rushes you past the obvious question.", zh: "「今日确认付款」催你跳过那个明显的疑问。" } ],
    truthScam: { en: "Fake-recruitment scam. The 'refundable deposit' is the entire payday — theirs.", zh: "虚假招聘诈骗。「可退押金」就是全部发薪日——骗子的。" },
    truthSafe: { en: "It was a scam — a real job never charges you to start.", zh: "这是骗局——真工作绝不会收钱才让你上岗。" },
  },
  {
    answer: "scam", risk: 980,
    title: { en: "Typing From Home", zh: "在家打字" },
    chan: { en: "WeChat", zh: "微信" },
    sender: { en: "Sender — <b>a 'home typist agency'</b> account", zh: "发件人 — <b>「居家打字社」</b>账号" },
    text: { en: "Type manuscripts at home — ¥30 per thousand characters, settled daily.\nTo receive the encrypted source files you need our typing software; the licence is ¥980, deductible from your first week's pay.\n\nWe only take ten typists this round. Pay the licence to lock your seat.", zh: "在家录入书稿——每千字 30 元，日结。\n要接收加密源文件需安装我们的打字软件；授权费 980 元，可从首周工资抵扣。\n\n本轮仅招十名打字员。交授权费即可锁定名额。" },
    flags: [ { en: "A 'software licence' fee is just an upfront charge in disguise.", zh: "所谓「软件授权费」只是变相的上岗费。" },
             { en: "Home-typing gigs at high per-character rates are a classic lure.", zh: "高单价的居家打字活，是经典诱饵。" },
             { en: "'Only ten seats' pressures you to pay before checking it out.", zh: "「仅十个名额」逼你没核实就先付钱。" } ],
    truthScam: { en: "Fake part-time scam. Pay the licence and the 'agency' vanishes.", zh: "虚假兼职诈骗。交了授权费，「打字社」就消失。" },
    truthSafe: { en: "It was a scam — no licence fee, no loss.", zh: "这是骗局——没交授权费，没损失。" },
  },
  {
    answer: "scam", risk: 30000,
    title: { en: "Casting Call, Cash Call", zh: "招募童模" },
    chan: { en: "WeChat", zh: "微信" },
    sender: { en: "Sender — <b>a 'child-model agency scout'</b>", zh: "发件人 — <b>「童模经纪星探」</b>" },
    text: { en: "Your child's photos are perfect — we'd love to sign them for catalogue shoots, ¥2,000 a day.\nTo book the studio and prep the portfolio we collect a ¥30,000 'training & packaging fee', refunded after the third paid shoot.\n\nWe're confirming this week's roster now — reply to hold the slot.", zh: "您孩子的照片太合适了——我们想签约拍画册，日薪 2,000 元。\n为预订影棚、准备作品集，需先收 3 万元「培训包装费」，第三次有偿拍摄后退还。\n\n本周名单正在确认——回复即可保留名额。" },
    flags: [ { en: "Real agencies pay the talent; they don't charge parents to sign.", zh: "真经纪公司付钱给艺人，不会向家长收签约费。" },
             { en: "A 'refundable training fee' is the whole scam, aimed at proud parents.", zh: "「可退培训费」就是整个骗局，专攻爱子心切的家长。" },
             { en: "'Confirming the roster this week' rushes the payment.", zh: "「本周确认名单」催促付款。" } ],
    truthScam: { en: "Fake-casting scam. Once the fee lands, the shoots never materialise.", zh: "虚假招募诈骗。费用一到，拍摄从不兑现。" },
    truthSafe: { en: "It was a scam — the family kept ¥30,000.", zh: "这是骗局——这家人守住了 3 万元。" },
  },
  {
    answer: "scam", risk: 80000,
    title: { en: "Overseas, Over-Promised", zh: "高薪出国" },
    chan: { en: "WeChat", zh: "微信" },
    sender: { en: "Sender — <b>an 'overseas labour broker'</b>", zh: "发件人 — <b>「境外劳务中介」</b>" },
    text: { en: "Factory job abroad — ¥25,000/month, room and board free, no experience needed.\nWe handle visa, flight and permits. Total agency package: ¥80,000, payable up front; recovered from your first three months' pay.\n\nFlights leave next week — pay the package to confirm your seat.", zh: "境外工厂岗位——月薪 25,000 元，包吃住，无需经验。\n签证、机票、工作许可我们全包。中介套餐共 8 万元，须先付，从前三个月工资中扣回。\n\n下周航班——付清套餐即可确认机位。" },
    flags: [ { en: "A huge upfront 'agency package' for a too-good-to-be-true salary.", zh: "为好到不真实的薪水预付一大笔「中介套餐」。" },
             { en: "Legitimate overseas placement doesn't demand ¥80,000 cash first.", zh: "正规境外派遣不会先索要 8 万元现金。" },
             { en: "'Flights leave next week' forces payment before due diligence.", zh: "「下周航班」逼你来不及核实就付款。" } ],
    truthScam: { en: "Fake-recruitment scam. Pay the package and the 'broker' goes dark.", zh: "虚假招聘诈骗。付了套餐，「中介」就失联。" },
    truthSafe: { en: "It was a scam — no real job, no flight, ¥80,000 saved.", zh: "这是骗局——没工作、没航班，省下 8 万元。" },
  },
  {
    answer: "scam", risk: 26000,
    title: { en: "The Payroll Test Transfer", zh: "工资测试转账" },
    chan: { en: "Work IM", zh: "办公 IM" },
    sender: { en: "Sender — <b>'onboarding finance'</b> after a remote 'interview'", zh: "发件人 — <b>远程「面试」后的「入职财务」</b>" },
    text: { en: "Welcome aboard! Before we set up payroll, we run a card-verification test.\nLink your bank card in our portal and complete a ¥26,000 'verification transfer' to the account shown — it's instantly returned and proves your card can receive salary.\n\nFinance closes onboarding at 17:00 today.", zh: "欢迎入职！开通工资前，我们要做一次银行卡验证。\n请在门户绑定银行卡，并向所示账户完成一笔 26,000 元「验证转账」——立即原路退还，用以证明您的卡能收工资。\n\n财务今日 17:00 截止办理入职。" },
    flags: [ { en: "No employer needs YOU to send money to 'verify' a card.", zh: "没有雇主需要你转钱去「验证」银行卡。" },
             { en: "'Instantly returned' is the rebate lie that hides a one-way transfer.", zh: "「立即退还」是掩盖单向转账的返款谎言。" },
             { en: "A 5 p.m. onboarding cutoff is invented to rush the transfer.", zh: "17:00 入职截止是为催转账而编的。" } ],
    truthScam: { en: "Fake-job scam. The 'verification transfer' is just a theft with a friendly name.", zh: "虚假入职诈骗。「验证转账」不过是换了好听名字的盗款。" },
    truthSafe: { en: "It was a scam — payroll never requires you to pay in.", zh: "这是骗局——开工资从不需要你先转钱进去。" },
  },
  {
    answer: "scam", risk: 3600,
    title: { en: "Lend Us Your Voice", zh: "招配音学员" },
    chan: { en: "WeChat", zh: "微信" },
    sender: { en: "Sender — <b>a 'voice-acting studio'</b> recruiter", zh: "发件人 — <b>「配音工作室」</b>招募员" },
    text: { en: "Your voice clip passed our screening — we have audiobook work, ¥300 per chapter.\nNew talent must enrol in our ¥3,600 voice-certification course first; the cost is recouped from your first four chapters.\n\nThis cohort closes Friday. Pay tuition to reserve your recording slot.", zh: "您的声音样本通过初筛——我们有有声书的活，每章 300 元。\n新人须先报名 3,600 元配音认证课，费用从前四章中抵扣。\n\n本期周五截止。交学费即可预留录音名额。" },
    flags: [ { en: "A 'mandatory certification course' is an upfront fee in costume.", zh: "「必修认证课」是披着外衣的上岗费。" },
             { en: "Real studios audition and hire; they don't sell you a course.", zh: "真工作室是试音录用，不是卖你课程。" },
             { en: "A Friday cohort deadline pressures you to pay tuition fast.", zh: "周五截止逼你赶紧交学费。" } ],
    truthScam: { en: "Fake part-time scam. The course is the product; the audiobook work isn't real.", zh: "虚假兼职诈骗。课程才是商品；有声书的活并不存在。" },
    truthSafe: { en: "It was a scam — no tuition paid, no loss.", zh: "这是骗局——没交学费，没损失。" },
  },
  {
    answer: "scam", risk: 1200,
    title: { en: "Membership Before the Job", zh: "先入会再上岗" },
    chan: { en: "App notification", zh: "App 推送" },
    sender: { en: "Sender — <b>a 'job-board'</b> app message", zh: "发件人 — <b>某「招聘平台」</b>App 私信" },
    text: { en: "A delivery-dispatch company wants to interview you — high base pay, flexible hours.\nThe employer requires applicants to hold our ¥1,200 Premium Jobseeker membership before the interview is scheduled.\n\nThree interview slots remain this week. Upgrade now to be considered.", zh: "一家配送调度公司想面试你——高底薪、时间灵活。\n该雇主要求应聘者先持有我们 1,200 元的「求职旗舰会员」，才能安排面试。\n\n本周仅剩三个面试名额。立即升级以获得资格。" },
    flags: [ { en: "Paying a platform to 'qualify' for an interview is never real.", zh: "为「获得面试资格」向平台付费，从来不是真的。" },
             { en: "A genuine employer never gates interviews behind your purchase.", zh: "真正的雇主绝不会把面试卡在你买会员上。" },
             { en: "'Three slots this week' is fabricated scarcity.", zh: "「本周仅剩三个名额」是编造的稀缺。" } ],
    truthScam: { en: "Fake-recruitment scam. The 'membership' is the whole transaction; the job is bait.", zh: "虚假招聘诈骗。「会员」就是全部交易；工作只是诱饵。" },
    truthSafe: { en: "It was a scam — no membership bought, no loss.", zh: "这是骗局——没买会员，没损失。" },
  },
  {
    answer: "scam", risk: 5400,
    title: { en: "Mystery Shopper, Real Cost", zh: "神秘顾客" },
    chan: { en: "SMS", zh: "短信" },
    sender: { en: "Sender — <b>+00 21 559 0042</b>, a 'mystery-shopper program'", zh: "发件人 — <b>+00 21 559 0042</b>，自称「神秘顾客项目」" },
    text: { en: "Hiring part-time mystery shoppers — ¥400 per assignment, evaluate stores online.\nFirst assignment: buy ¥5,400 of gift cards from the link, report the codes, and we reimburse the full amount plus your fee within 24 hours.\n\nAssignment expires tonight — accept to begin.", zh: "招聘兼职神秘顾客——每单 400 元，线上评估商家。\n第一单：从链接购买 5,400 元礼品卡，上报卡密，24 小时内全额报销外加报酬。\n\n任务今晚到期——接受即开始。" },
    flags: [ { en: "'Buy gift cards and report the codes' is a textbook drain.", zh: "「买礼品卡并上报卡密」是教科书级的盗刷。" },
             { en: "'Reimbursed in 24 hours' is the rebate hook for an irreversible buy.", zh: "「24 小时内报销」是为不可逆消费设的返款钩子。" },
             { en: "A same-night expiry rushes you before the codes are spent.", zh: "「今晚到期」抢在卡密被花掉之前催你动手。" } ],
    truthScam: { en: "Fake-job scam. Once they have the gift-card codes, the money's gone.", zh: "虚假兼职诈骗。卡密一到手，钱就没了。" },
    truthSafe: { en: "It was a scam — gift-card codes are as good as cash to a thief.", zh: "这是骗局——礼品卡卡密对骗子来说等于现金。" },
  },
  {
    answer: "scam", risk: 300,
    title: { en: "The Three-Hundred Foot in the Door", zh: "三百元入场费" },
    chan: { en: "WeChat", zh: "微信" },
    sender: { en: "Sender — <b>a 'survey-filling group'</b> admin", zh: "发件人 — <b>「问卷填写群」</b>管理员" },
    text: { en: "Fill online questionnaires from home — ¥15 each, beginner-friendly.\nTo receive task links you must join the working group, and new members pay a one-time ¥300 'group management fee'. It's returned after your first ten surveys.\n\nFee waived only for those who join today.", zh: "在家填网络问卷——每份 15 元，新手友好。\n要领取任务链接须先进工作群，新成员交一次性 300 元「群管理费」，完成前十份问卷后退还。\n\n仅今日入群者可享免费名额。" },
    flags: [ { en: "A small 'group fee' to join is still an upfront charge for a job.", zh: "小额「群管理费」仍是为一份工作预收的上岗费。" },
             { en: "'Returned after ten surveys' is the rebate that never comes.", zh: "「填十份后退还」是那笔永不到账的返款。" },
             { en: "'Join today' urgency pushes a quick, low-friction payment.", zh: "「仅今日」的紧迫感，催出一笔低门槛的快速付款。" } ],
    truthScam: { en: "Fake part-time scam. Small fee, mass victims — the model is volume.", zh: "虚假兼职诈骗。费用小、受害者多——靠走量赚钱。" },
    truthSafe: { en: "It was a scam — even ¥300 to start a 'job' is a red line.", zh: "这是骗局——上岗先交钱，哪怕只是 300 元也是红线。" },
  },
  {
    answer: "scam", risk: 18000,
    title: { en: "The Card That Proves You", zh: "验资证明卡" },
    chan: { en: "Phone call", zh: "电话" },
    sender: { en: "Sender — <b>+00 755 1182 6600</b>, a 'finance department' caller", zh: "发件人 — <b>+00 755 1182 6600</b>，自称「财务部」来电" },
    text: { en: "[Call transcript]\nHR: You passed the interview for our overseas-shipping clerk role. One last step — finance needs to confirm your bank card can hold payroll.\nHR: Move ¥18,000 of your own funds into the card, then we add you to the salary system. Keep the funds untouched for the check; you withdraw them after. Can you confirm today?", zh: "【通话记录】\n人事：您已通过我司海外货运文员面试。最后一步——财务要确认您的银行卡能承载工资。\n人事：请把您自己的 18,000 元转入该卡，我们再把您加入工资系统。验资期间别动这笔钱，之后即可取出。今天能确认吗？" },
    flags: [ { en: "'Prove your card with your own funds' is a setup for theft or money-muling.", zh: "「用自己的钱验资」是盗款或当工具人的前奏。" },
             { en: "No payroll system verifies a card by making you hold a sum.", zh: "没有任何工资系统靠让你存一笔钱来验证银行卡。" },
             { en: "'Confirm today' pressure on a phone call leaves no time to verify.", zh: "电话里「今天确认」的施压，让你没时间核实。" } ],
    truthScam: { en: "Fake-job scam. 'Verify your card with cash' either steals it or turns you into a mule.", zh: "虚假入职诈骗。「用现金验卡」要么盗走，要么把你变成洗钱工具人。" },
    truthSafe: { en: "It was a scam — a real job verifies you with documents, not your savings.", zh: "这是骗局——真工作靠证件核实你，而不是你的存款。" },
  },
  {
    answer: "scam", risk: 280000,
    title: { en: "The Case With Your Name On It", zh: "一桩印着你名字的案子" },
    chan: { en: "Phone call · transferred", zh: "电话 · 被转接" },
    sender: { en: "Caller — <b>+00 21 8800 6612</b>, claiming to be a city public-security economic-crime unit", zh: "来电 — <b>+00 21 8800 6612</b>，自称某市公安经侦支队" },
    text: { en: "This is Officer Zhao, badge 03187, city public-security bureau.\nA bank card opened under your ID was used to launder ¥2.6 million. There is a warrant out for your arrest.\n\nI am transferring you to the case prosecutor now. Do NOT hang up and do NOT tell family — this is a sealed investigation.\nTo prove your funds are clean, you will move everything to a state \"safe account\" we monitor.", zh: "我是市公安局赵警官，警号03187。\n一张用你身份证开的银行卡涉及260万洗钱，目前已对你发出逮捕令。\n\n现在把你转接给办案检察官，全程不许挂电话、不许告诉家人——这是保密案件。\n为证明你资金清白，你要把名下所有钱转到我们监管的国家「安全账户」。" },
    flags: [ { en: "No real police force arrests you by phone or moves your money to a \"safe account\" — that account does not exist.", zh: "真警察绝不会电话办案、也不会让你把钱转到「安全账户」——那种账户根本不存在。" },
             { en: "Demands secrecy and forbids contacting family — isolation is the con's core move.", zh: "要求保密、不许联系家人——孤立你正是骗局的核心手段。" },
             { en: "Spoofed +00 number and a theatrical \"transfer to the prosecutor\".", zh: "伪造的 +00 境外号码，还有戏剧性的「转接检察官」。" } ],
    truthScam: { en: "Impersonating-police fraud. The \"safe account\" is the thief's wallet; secrecy buys time before anyone warns you.", zh: "冒充公检法诈骗。「安全账户」就是骗子的钱包；保密只是为了在有人提醒你之前争取时间。" },
    truthSafe: { en: "It was a scam — blocking it kept the family's savings where they belong.", zh: "这是骗局——拦下它，把全家积蓄留在了原处。" },
  },
  {
    answer: "scam", risk: 150000,
    title: { en: "The Anti-Fraud Center That Defrauds", zh: "会行骗的「反诈中心」" },
    chan: { en: "Phone call", zh: "电话" },
    sender: { en: "Caller — <b>+00 10 4007 2295</b>, claiming to be the National Anti-Fraud Center", zh: "来电 — <b>+00 10 4007 2295</b>，自称国家反诈中心" },
    text: { en: "Hello, this is the Anti-Fraud Center. Your phone number is linked to a fraud ring under investigation.\nWe believe you are a victim, but your accounts must be \"frozen and verified\" or you become a suspect.\n\nDownload the screen-share tool we send and log into your banking app while we watch, so we can confirm your balance is clean.", zh: "您好，这里是反诈中心。您的手机号与一个正在侦办的诈骗团伙有关联。\n我们认为您是受害者，但您的账户必须「冻结核验」，否则您将转为嫌疑人。\n\n请下载我们发给您的屏幕共享工具，在我们监看下登录网银，以便确认您余额清白。" },
    flags: [ { en: "The real Anti-Fraud Center warns you — it never asks you to share your screen or log into your bank.", zh: "真正的反诈中心是来提醒你的——绝不会让你共享屏幕或登录网银。" },
             { en: "Screen-share + live banking login hands the scammer your codes and balance in real time.", zh: "屏幕共享＋实时登录网银，等于把验证码和余额实时交给骗子。" },
             { en: "\"Victim or suspect\" is a false choice built to scare you into compliance.", zh: "「不是受害者就是嫌疑人」是为了吓你就范的伪选择题。" } ],
    truthScam: { en: "They wear the badge of the very agency that fights them. Screen-share is the new \"safe account\".", zh: "他们披着反诈机构的外衣行骗。屏幕共享就是新版的「安全账户」。" },
    truthSafe: { en: "It was a scam — you hung up before the screen ever turned against you.", zh: "这是骗局——你在屏幕反咬你之前就挂断了。" },
  },
  {
    answer: "scam", risk: 420000,
    title: { en: "A Warrant Read Over Video", zh: "视频里宣读的逮捕令" },
    chan: { en: "Video call", zh: "视频通话" },
    sender: { en: "Caller — a WeChat video request from a stranger in a fake uniform", zh: "来电 — 一个穿假制服陌生人的微信视频请求" },
    text: { en: "[On video, a man at a desk holds up a document with your photo]\nYou are formally a suspect in a money-laundering case. This is your arrest warrant — note the case number.\nStay on camera. Show me your bank balances now. To avoid detention, transfer your assets for \"clearance review\" to the account I dictate.\nClose your curtains. No one else may see this call.", zh: "【视频里，一名男子坐在办公桌前，举起一份贴着你照片的文件】\n你已被正式列为某洗钱案嫌疑人。这是你的逮捕令，记下案号。\n别离开镜头，现在把你的银行余额给我看。为免被羁押，按我报的账户把资产转去做「清查核验」。\n拉上窗帘，这通电话不许任何人看到。" },
    flags: [ { en: "A \"warrant\" shown over a video call is a prop — courts serve warrants in person, never on WeChat.", zh: "视频里举着的「逮捕令」是道具——法院当面送达，绝不会走微信。" },
             { en: "Asset \"clearance review\" by transfer is fiction; clean money is never proven by moving it.", zh: "用转账做「资产清查」是编出来的；清白的钱从不靠转走来自证。" },
             { en: "Curtains-closed, camera-on isolation keeps you under pressure and unwitnessed.", zh: "拉窗帘、不许离开镜头的孤立，是为了让你持续承压、无人作证。" } ],
    truthScam: { en: "The uniform, the desk, the warrant — all staging. The only real thing is the account you'd wire to.", zh: "制服、办公桌、逮捕令，全是布景。唯一真实的，是那个让你汇款的账户。" },
    truthSafe: { en: "It was a scam — ending the call ended the performance.", zh: "这是骗局——挂断通话，这场表演也就散了。" },
  },
  {
    answer: "scam", risk: 95000,
    title: { en: "Your ID Was Used in Another Province", zh: "你的身份证在外省被冒用" },
    chan: { en: "Phone call · transferred", zh: "电话 · 被转接" },
    sender: { en: "Caller — <b>+00 755 2010 8841</b>, posing as a mail courier then \"transferred to police\"", zh: "来电 — <b>+00 755 2010 8841</b>，先冒充快递员，再「转接公安」" },
    text: { en: "Courier here — a parcel under your name in another province held 40 fake bank cards. It's now a police matter.\n[transferred] This is the receiving district police. Your leaked ID has made you a money-laundering suspect.\nClear yourself: deposit your funds into the designated supervision account and we'll certify them.", zh: "我是快递员——一个用你名字寄往外省的包裹里查出40张伪卡，现已转公安处理。\n【转接】这里是收件地公安。你的身份证信息被泄露，已使你成为洗钱嫌疑人。\n要自证清白：把你的钱存入指定的监管账户，我们核验后出具证明。" },
    flags: [ { en: "The courier-then-police \"transfer\" is a scripted handoff between two fraudsters.", zh: "「快递员转公安」是两个骗子之间排练好的接力。" },
             { en: "A leaked ID does not make you a suspect, and police never run a \"supervision account\".", zh: "身份证泄露不会让你变成嫌疑人，公安也不会经营什么「监管账户」。" },
             { en: "Proving innocence by depositing money is the unmistakable tell.", zh: "靠「存钱」自证清白，是最明显的破绽。" } ],
    truthScam: { en: "Two actors, one wallet. The parcel never existed; the supervision account is theirs.", zh: "两个演员，一个钱包。包裹根本不存在，监管账户是他们的。" },
    truthSafe: { en: "It was a scam — you refused to deposit, and the \"case\" evaporated.", zh: "这是骗局——你拒绝存钱，这桩「案子」便烟消云散。" },
  },
  {
    answer: "scam", risk: 360000,
    title: { en: "The Prosecutor Who Texts on WeChat", zh: "用微信发文书的「检察官」" },
    chan: { en: "WeChat", zh: "微信" },
    sender: { en: "Sender — <b>WeChat: ProsecutorOffice_Gao</b>, after a phone call \"escalated your case\"", zh: "发件人 — <b>微信号：检察院_高检察官</b>，先有一通电话「移送了你的案件」" },
    text: { en: "Per our call, I've sent you the case file and a \"Confidentiality Order\" image. Read it, do not screenshot.\nYour ID is tied to a laundering ring. Penalty: 7 years — unless you cooperate with asset verification.\nReply with your bank balances. We will guide each transfer to the case-control account step by step.", zh: "按通话所说，我已把案卷和一份《保密令》图片发你，看完别截图。\n你的身份证与一个洗钱团伙关联，量刑7年——除非你配合资产核验。\n回复你的银行余额，我会一步步引导你把钱转入案件管控账户。" },
    flags: [ { en: "Prosecutors do not serve case files or \"confidentiality orders\" over WeChat — those are PDFs anyone can fake.", zh: "检察官不会用微信送案卷或《保密令》——那种图片谁都能伪造。" },
             { en: "A \"case-control account\" you transfer to is, in law, nothing. It's the scammer's account.", zh: "让你转账的「案件管控账户」在法律上根本不存在，那就是骗子的账户。" },
             { en: "Dangling a 7-year sentence to force \"cooperation\" is pure coercion.", zh: "拿「判7年」逼你「配合」，纯属胁迫。" } ],
    truthScam: { en: "Real justice has a courthouse address; this one has a chat ID. The file is a forgery; the account is the point.", zh: "真正的司法有法院地址；这个只有一个微信号。文书是伪造的，账户才是目的。" },
    truthSafe: { en: "It was a scam — you didn't transfer, and the \"7 years\" was never real.", zh: "这是骗局——你没转账，那「7年」从来就不存在。" },
  },
  {
    answer: "scam", risk: 60000,
    title: { en: "The Pension That Got You Investigated", zh: "把你卷进调查的「养老金」" },
    chan: { en: "Phone call", zh: "电话" },
    sender: { en: "Caller — <b>+00 28 6611 0049</b>, claiming to be a social-security fraud task force", zh: "来电 — <b>+00 28 6611 0049</b>，自称社保涉诈专案组" },
    text: { en: "Auntie, this is the social-security bureau working with police.\nSomeone used your retiree account to receive criminal funds. You may lose your pension and face charges.\nTo protect your money, withdraw it in cash and deposit it into the audit-safe account our officer gives you. Tell no one at the bank why.", zh: "阿姨，这里是社保局，正配合公安办案。\n有人用您的退休账户接收了犯罪资金，您可能被取消养老金并被追责。\n为保住您的钱，请把钱取成现金，存入我们警官给您的「审计安全账户」。到银行别跟人说原因。" },
    flags: [ { en: "Targets an elderly retiree and weaponizes fear of losing the pension.", zh: "专挑年长退休者下手，拿「丢养老金」的恐惧做武器。" },
             { en: "\"Withdraw cash, deposit elsewhere, tell the bank nothing\" is exactly what tellers are trained to stop.", zh: "「取现金、转存别处、对柜员保密」正是银行柜员被培训要拦下的行为。" },
             { en: "No safety account protects your money by moving it out of your own name.", zh: "没有哪种「安全账户」是靠把钱转出你名下来保护你的。" } ],
    truthScam: { en: "The whole point of \"tell no one\" is to bypass the bank clerk who would have saved her.", zh: "「别跟人说」的全部目的，就是绕开那个本可以救她的银行柜员。" },
    truthSafe: { en: "It was a scam — she kept the cash and her pension was never at risk.", zh: "这是骗局——她留住了现金，养老金也从未真正有过风险。" },
  },
  {
    answer: "scam", risk: 200000,
    title: { en: "Step Into a Quiet Room for Your Statement", zh: "请找个安静房间「做笔录」" },
    chan: { en: "Phone call · transferred", zh: "电话 · 被转接" },
    sender: { en: "Caller — <b>+00 27 8500 3320</b>, claiming a telecom-bureau then court transfer", zh: "来电 — <b>+00 27 8500 3320</b>，先称通信管理局，再「转接法院」" },
    text: { en: "Your phone line will be suspended for involvement in a fraud case. To appeal, I transfer you to the court.\n[transferred] Court clerk here. We must take your statement remotely — go to a quiet room alone, lock the door, stay on the line.\nWe will read you the charges, then walk you through clearing your accounts to a judicial holding account.", zh: "您的手机号因涉诈案件即将停机。要申诉，我帮您转接法院。\n【转接】这里是法院书记员。我们要远程给您做笔录——请独自到安静房间、锁门、保持通话。\n我们先向您宣读指控，再引导您把账户清算到司法暂存账户。" },
    flags: [ { en: "\"Go to a quiet room, lock the door, stay on the line\" isolates you for hours of control.", zh: "「进安静房间、锁门、别挂电话」是把你孤立起来，便于长时间操控。" },
             { en: "Courts take statements in courtrooms, not by phone into a \"judicial holding account\".", zh: "法院在法庭做笔录，不会用电话把钱清算进什么「司法暂存账户」。" },
             { en: "A real telecom never resolves a suspension by transferring you to a \"court\".", zh: "真正的运营商绝不会用「转接法院」来处理停机问题。" } ],
    truthScam: { en: "The locked door isn't for privacy — it's so no one interrupts the script before you transfer.", zh: "锁门不是为了隐私——是为了在你转账前，没人能打断这套话术。" },
    truthSafe: { en: "It was a scam — you opened the door and the spell broke.", zh: "这是骗局——你打开门，咒语就破了。" },
  },
  {
    answer: "scam", risk: 130000,
    title: { en: "Customs Found Contraband in Your Name", zh: "海关查到一件你名下的违禁品" },
    chan: { en: "Phone call · transferred", zh: "电话 · 被转接" },
    sender: { en: "Caller — <b>+00 20 3300 7781</b>, posing as customs then \"border police\"", zh: "来电 — <b>+00 20 3300 7781</b>，冒充海关，再「转边境公安」" },
    text: { en: "Customs notice: a package under your ID was intercepted holding banned items and forged passports.\n[transferred] Border police. This makes you a suspect in a cross-border crime. The matter is classified.\nVerify your innocence by transferring funds for inspection to the national security-deposit account. Do not discuss with anyone.", zh: "海关通知：一个用你身份证寄的包裹被截获，内含违禁品和伪造护照。\n【转接】边境公安。此事已使你成为跨境犯罪嫌疑人，案件涉密。\n请把资金转入国家「安全保证金账户」接受查验以自证清白，不得对任何人提起。" },
    flags: [ { en: "Customs and police never resolve a \"case\" by having you wire a security deposit.", zh: "海关和公安绝不会让你汇一笔「保证金」来了结案件。" },
             { en: "The classified / tell-no-one demand is the standard isolation tactic.", zh: "「涉密、别声张」是标准的孤立套路。" },
             { en: "Spoofed +00 number and a scripted customs-to-police handoff.", zh: "伪造的 +00 号码，加上排练好的「海关转公安」。" } ],
    truthScam: { en: "No deposit clears your name. The contraband story exists only to justify the wire.", zh: "没有哪笔保证金能洗清你的名字。违禁品的故事，只为给那笔汇款找借口。" },
    truthSafe: { en: "It was a scam — you wired nothing and there was no package.", zh: "这是骗局——你一分没汇，包裹也从不存在。" },
  },
  {
    answer: "scam", risk: 500000,
    title: { en: "Forty Minutes to Clear ¥500,000", zh: "四十分钟清空五十万" },
    chan: { en: "Phone call", zh: "电话" },
    sender: { en: "Caller — <b>+00 25 8800 1190</b>, claiming to be a provincial procuratorate", zh: "来电 — <b>+00 25 8800 1190</b>，自称省检察院" },
    text: { en: "This is the procuratorate. A laundering account in your name has moved millions. A freeze order is being issued at 4 p.m.\nBefore then, prove your funds are untainted: consolidate every account and transfer the total to the asset-verification account I assign.\nStay on the line until the transfer clears. This call is monitored for your protection.", zh: "这里是检察院。一个你名下的洗钱账户已转走数百万，下午4点将下达冻结令。\n在那之前，请自证资金清白：把名下所有账户归集，再把总额转入我指定的「资产核验账户」。\n转账到账前不要挂断，本通话已监听，是为了保护你。" },
    flags: [ { en: "A countdown to a \"freeze order\" manufactures panic so you skip thinking.", zh: "用「冻结令」倒计时制造恐慌，逼你跳过思考。" },
             { en: "Consolidating everything into one \"verification account\" is how they take it all at once.", zh: "把所有钱归集进一个「核验账户」，正是他们一次性卷走的手法。" },
             { en: "\"Stay on the line, call is monitored\" keeps you compliant and isolated.", zh: "「别挂断、通话被监听」让你保持顺从、与外界隔绝。" } ],
    truthScam: { en: "There is no verification account, only an emptying one. The deadline is the weapon.", zh: "没有什么核验账户，只有一个被清空的账户。截止时间就是凶器。" },
    truthSafe: { en: "It was a scam — the half-million stayed yours.", zh: "这是骗局——这五十万，仍然是你的。" },
  },
  {
    answer: "scam", risk: 88000,
    title: { en: "An Officer Who Knows Your Whole ID", zh: "把你身份证背得滚瓜烂熟的「警官」" },
    chan: { en: "WeChat", zh: "微信" },
    sender: { en: "Sender — <b>WeChat: CIB_OfficerLin</b>, friend-added after a cold call", zh: "发件人 — <b>微信号：刑侦_林警官</b>，一通陌生电话后加你好友" },
    text: { en: "I've added you to send the official documents. Note: I recited your full name, ID number, and home address — only police have these.\nYour identity was used to open laundering accounts. Cooperate quietly or we issue a wanted notice.\nFirst, list your savings and lending-app credit lines. We will guide a full \"asset freeze\" into a secure custody account.", zh: "我加你是为了发正式文书。注意：我能报出你的全名、身份证号和住址——只有公安才有这些。\n你的身份被人用来开洗钱账户，配合就低调处理，否则发通缉令。\n先报一下你的存款和各借贷App额度，我们引导你把资产「整体冻结」到一个安全托管账户。" },
    flags: [ { en: "Reciting leaked personal data is theater — that data is bought on black markets, not proof of police.", zh: "背出泄露的个人信息是表演——那些数据是黑市买来的，不能证明是警察。" },
             { en: "Asking about lending-app credit lines means they plan to make you borrow too.", zh: "问你借贷App额度，说明他们打算让你连贷款一起转走。" },
             { en: "A \"secure custody account\" you transfer into is the scammer's account, full stop.", zh: "让你转入的「安全托管账户」就是骗子的账户，没有例外。" } ],
    truthScam: { en: "Knowing your ID number proves a data leak, not a badge. The freeze is a transfer out.", zh: "知道你的身份证号只能证明数据泄露，不能证明警徽。所谓冻结，其实是转出。" },
    truthSafe: { en: "It was a scam — you blocked the contact before any account was \"frozen\".", zh: "这是骗局——你在任何账户被「冻结」前就拉黑了对方。" },
  },
  {
    answer: "scam", risk: 18000,
    title: { en: "Your Student Loan Must Be Cancelled", zh: "你的校园贷必须注销" },
    chan: { en: "Phone call", zh: "电话" },
    sender: { en: "Caller — <b>+00 21 5566 0042</b>, claiming to be a campus-loan platform's compliance team", zh: "来电 — <b>+00 21 5566 0042</b>，自称某校园贷平台「合规部」" },
    text: { en: "We're calling all former student users. Under new rules, your old campus-loan account must be cancelled or it will harm your credit for life.\nThe account still shows an open credit line. To cancel it, you must first DRAW that line down to zero and transfer it to our clearance account, then we close everything.\nIt's just a formality — the money comes right back.", zh: "我们在通知所有曾用过的学生用户。按新规，你的旧校园贷账户必须注销，否则会影响你一辈子的征信。\n系统显示你账户还有一笔未用额度。要注销，必须先把这笔额度「提现」清零、转到我们的清算账户，我们才能彻底关闭。\n只是走个流程，钱马上原路退回。" },
    flags: [ { en: "Cancelling an account never requires you to first borrow money and send it away.", zh: "注销账户从不需要你先把钱借出来再转走。" },
             { en: "\"It comes right back\" is the promise that never gets kept.", zh: "「钱马上原路退回」是一句永远不会兑现的承诺。" },
             { en: "Targets young graduates' fear of a ruined credit record.", zh: "拿「征信被毁一辈子」吓唬刚毕业的年轻人。" } ],
    truthScam: { en: "There's nothing to cancel. They just want you to take out a loan and hand it over.", zh: "根本没有什么要注销的。他们只是想让你借出一笔钱，然后交给他们。" },
    truthSafe: { en: "It was a scam — you never drew the line down, so there was no loan to lose.", zh: "这是骗局——你没去提现额度，也就没有一笔贷款可丢。" },
  },
  {
    answer: "scam", risk: 26000,
    title: { en: "A Bad Record From Your Campus Days", zh: "学生时代留下的一条「污点」" },
    chan: { en: "WeChat", zh: "微信" },
    sender: { en: "Sender — <b>WeChat: CreditFix_Advisor</b>, a stranger who added you", zh: "发件人 — <b>微信号：征信修复_顾问</b>，一个主动加你的陌生人" },
    text: { en: "Hi, I'm a credit advisor. Our system flags a campus-era loan account left half-open under your name — it's dragging your score down.\nLenders will reject you for mortgages and jobs. I can clear it today.\nOpen your lending apps, borrow the full available amount, and transfer it to the verification account I'll send. Once the system sees the balance settled, the flag is wiped and your money returns.", zh: "你好，我是征信顾问。系统显示你名下有一个学生时代没注销干净的贷款账户，正在拖低你的征信分。\n以后买房、求职都会被拒。我今天就能帮你清掉。\n打开你的各个借贷App，把可借额度全部借出，转到我发你的核验账户。系统一看到余额结清，污点就抹除，钱也会退回。" },
    flags: [ { en: "Credit scores can't be \"repaired\" by a stranger telling you to borrow and transfer.", zh: "征信不可能靠一个陌生人让你「借钱再转账」来修复。" },
             { en: "Maxing out every lending app is the goal, not a side effect.", zh: "把每个借贷App借空，是目的而不是副作用。" },
             { en: "An unsolicited \"advisor\" with a verification account is a fraudster.", zh: "主动加你、还带个「核验账户」的「顾问」，就是骗子。" } ],
    truthScam: { en: "The only thing the transfer fixes is the scammer's bank balance.", zh: "这笔转账唯一能「修复」的，是骗子的银行余额。" },
    truthSafe: { en: "It was a scam — you blocked the advisor and your apps stayed untouched.", zh: "这是骗局——你拉黑了「顾问」，借贷App也一笔没动。" },
  },
  {
    answer: "scam", risk: 42000,
    title: { en: "The Quota That Marks You as Risky", zh: "把你标成「高风险」的那笔额度" },
    chan: { en: "Phone call", zh: "电话" },
    sender: { en: "Caller — <b>+00 571 8900 3318</b>, claiming to be a lending app's risk-control center", zh: "来电 — <b>+00 571 8900 3318</b>，自称某借贷App「风控中心」" },
    text: { en: "Risk control here. Your account is flagged HIGH RISK because an unused credit quota was opened in error during your student registration.\nLeft alone, this enters the national credit blacklist in 24 hours.\nTo de-flag, withdraw the quota in full and park it in our supervision account for review. After review it returns and the risk tag clears.", zh: "这里是风控中心。你的账户被标为「高风险」，原因是学生注册时误开了一笔未使用额度。\n放着不管，24小时内将进入全国征信黑名单。\n要解除标记，请把这笔额度全额提现，暂存到我们的监管账户接受审查。审查后退回，风险标记即解除。" },
    flags: [ { en: "There is no \"national credit blacklist\" you avoid by parking borrowed money somewhere.", zh: "不存在靠「把借来的钱暂存某处」就能躲开的「全国征信黑名单」。" },
             { en: "24-hour countdown + risk label = pressure engineering.", zh: "24小时倒计时＋「高风险」标签＝制造压力的话术。" },
             { en: "Real risk control never tells you to withdraw a quota and transfer it out.", zh: "真正的风控绝不会让你把额度提现再转出去。" } ],
    truthScam: { en: "They invented the risk, then sold you the \"cure\" — a transfer you'll never get back.", zh: "他们先编出风险，再把「解药」卖给你——一笔再也回不来的转账。" },
    truthSafe: { en: "It was a scam — you hung up and your credit was never in danger.", zh: "这是骗局——你挂了电话，征信从未有过危险。" },
  },
  {
    answer: "scam", risk: 33000,
    title: { en: "Graduation Clean-Up Required", zh: "毕业前必须「清账」" },
    chan: { en: "Phone call", zh: "电话" },
    sender: { en: "Caller — <b>+00 27 8711 2204</b>, posing as a school-affiliated finance office", zh: "来电 — <b>+00 27 8711 2204</b>，冒充「校方合作金融办」" },
    text: { en: "Final-year student? Records show an installment-loan account opened in your name during enrollment must be cleared before graduation, or your credit is locked.\nThe app still holds an open line. Activate it, withdraw the amount, and pay it into our settlement account so the system marks the account closed.\nWe'll refund it within the hour — keep the receipt as proof.", zh: "你是大四学生吗？记录显示你入学时开通的一个分期贷款账户，须在毕业前清账，否则征信会被锁定。\nApp里还有一笔未用额度。请激活、提现，再打入我们的结算账户，系统才会标记为已关闭。\n一小时内退回，留好回单作凭证。" },
    flags: [ { en: "Graduation has nothing to do with any loan account, and schools don't run \"settlement accounts\".", zh: "毕业和任何贷款账户都无关，学校也不会经营「结算账户」。" },
             { en: "Activate-withdraw-transfer is the loan-cancellation scam in three steps.", zh: "激活—提现—转账，正是注销贷款骗局的三步走。" },
             { en: "\"Refund within the hour, keep the receipt\" is a stall, not a guarantee.", zh: "「一小时退回、留好回单」是拖延，不是保证。" } ],
    truthScam: { en: "The receipt proves only that you sent your borrowed money to a stranger.", zh: "那张回单只能证明：你把借来的钱寄给了一个陌生人。" },
    truthSafe: { en: "It was a scam — you graduated owing nothing to anyone like this.", zh: "这是骗局——你顺利毕业，没欠这种人一分钱。" },
  },
  {
    answer: "scam", risk: 21000,
    title: { en: "Your Old Loan App Is Shutting Down", zh: "你用过的贷款App「要关停了」" },
    chan: { en: "App notification", zh: "App 通知" },
    sender: { en: "Sender — a push from a look-alike \"customer service\" account inside a chat app", zh: "发件人 — 聊天软件内一个仿冒「客服」账号的推送" },
    text: { en: "Notice to former student users: under regulator order, our platform is closing. Any account still showing an unused credit line must zero it out, or the open line stays on your credit report and harms future loans.\nTap to talk to an agent who will help you withdraw the line and transfer it to the platform clearance account for final closure.\nThis is the last notice.", zh: "致曾用过的学生用户：按监管要求，本平台即将关停。凡仍显示未用额度的账户必须清零，否则该额度将留在你的征信报告上，影响日后贷款。\n点此联系客服，协助你把额度提现并转入平台清算账户，完成最终关闭。\n这是最后一次通知。" },
    flags: [ { en: "A platform closing never needs you to withdraw a credit line and send it anywhere.", zh: "平台关停从不需要你把额度提现再转出去。" },
             { en: "An unused credit line on a report is harmless — the \"harm\" story is bait.", zh: "征信上一笔未用额度本身无害——「会伤征信」的说法是诱饵。" },
             { en: "\"Last notice, act now\" is manufactured finality.", zh: "「最后通知、立即行动」是人为制造的紧迫终局。" } ],
    truthScam: { en: "The platform isn't closing — the account you'd \"clear into\" is the only thing that's real.", zh: "平台没有关停——你要「清账转入」的那个账户，才是唯一真实的东西。" },
    truthSafe: { en: "It was a scam — you ignored the push and lost nothing.", zh: "这是骗局——你无视了推送，分文未失。" },
  },
  {
    answer: "scam", risk: 15000,
    title: { en: "A Flag From When You Were Nineteen", zh: "十九岁那年留下的一个标记" },
    chan: { en: "WeChat", zh: "微信" },
    sender: { en: "Sender — <b>WeChat: GovCredit_Helper</b>, claiming a government credit-repair channel", zh: "发件人 — <b>微信号：政务征信_助手</b>，自称政务征信修复通道" },
    text: { en: "Our records show a campus micro-loan you took at nineteen left a \"risk flag\" still active on your file. Employers and landlords can see it.\nGood news: we run an official repair channel. The process needs you to first draw your current lending-app limits to a holding account so the system can re-score you as clean.\nFinish today and the flag clears permanently; funds return same day.", zh: "记录显示你19岁时办的一笔校园小额贷，在你的档案上留下了一个仍生效的「风险标记」，用人单位和房东都能看到。\n好消息：我们有官方修复通道。流程需要你先把现在各借贷App的额度提到一个暂存账户，系统才能把你重新评为「清白」。\n今天办完，标记永久清除，资金当天退回。" },
    flags: [ { en: "No government office \"re-scores you clean\" by making you borrow into a holding account.", zh: "没有哪个政务机构靠让你「借钱进暂存账户」来把你重评为清白。" },
             { en: "Dredging up a years-old micro-loan adds false legitimacy.", zh: "翻出多年前的小额贷，是为了增加虚假的可信度。" },
             { en: "\"Funds return same day\" — the line every quota-draining scam uses.", zh: "「资金当天退回」——每个掏空额度的骗局都说这句话。" } ],
    truthScam: { en: "Credit repair by drawing down your quotas is a contradiction. The holding account holds nothing for you.", zh: "靠掏空额度来「修复征信」本身就自相矛盾。那个暂存账户，不会为你存下任何东西。" },
    truthSafe: { en: "It was a scam — you blocked it and your quotas stayed full.", zh: "这是骗局——你拉黑了它，额度分文未动。" },
  },
  {
    answer: "scam", risk: 50000,
    title: { en: "Three Apps, One Supervision Account", zh: "三个App，一个监管账户" },
    chan: { en: "Phone call · transferred", zh: "电话 · 被转接" },
    sender: { en: "Caller — <b>+00 10 6622 4417</b>, posing as a financial-regulator hotline then \"specialist\"", zh: "来电 — <b>+00 10 6622 4417</b>，冒充金融监管热线，再「转专员」" },
    text: { en: "Regulator hotline. A complaint names your account in an illegal student-lending scheme; your credit is frozen pending review.\n[transferred] I'm your case specialist. To unfreeze, we verify your borrowing capacity is unused: open your three lending apps, draw each to the max, and consolidate into the single supervision account I provide.\nThe moment the total lands, review completes and it's all refunded.", zh: "这里是金融监管热线。有投诉指向你的账户涉及违规学生借贷，你的征信已冻结，待审查。\n【转接】我是你的专案专员。要解冻，需核验你的借款能力未被滥用：打开你的三个借贷App，每个都借到顶，归集到我提供的同一个监管账户。\n总额一到账，审查即完成，全额退款。" },
    flags: [ { en: "Regulators don't unfreeze credit by making you max three apps into one account.", zh: "监管机构不会靠让你把三个App借爆、归集到一个账户来「解冻征信」。" },
             { en: "The transferred \"specialist\" is a second scammer in the same script.", zh: "转接来的「专员」是同一套剧本里的第二个骗子。" },
             { en: "Consolidating all borrowed funds into one account makes the theft a single tap.", zh: "把所有借来的钱归集到一个账户，让盗取只需一次点击。" } ],
    truthScam: { en: "There's no review and no refund — only three loans pooled into the thief's account.", zh: "没有审查，也没有退款——只有三笔贷款汇进骗子的账户。" },
    truthSafe: { en: "It was a scam — you opened none of the apps and owed nothing.", zh: "这是骗局——你一个App都没打开，分文未欠。" },
  },
  {
    answer: "scam", risk: 70000,
    title: { en: "Cancel the Loan You Never Took", zh: "注销一笔你从没办过的贷款" },
    chan: { en: "Phone call", zh: "电话" },
    sender: { en: "Caller — <b>+00 755 8822 9901</b>, claiming a credit-bureau \"de-registration desk\"", zh: "来电 — <b>+00 755 8822 9901</b>，自称征信机构「注销专席」" },
    text: { en: "We see a student credit account in your name you may not even remember opening. Regulations require it be de-registered, or it counts as an active debt and tanks your score.\nWe'll guide you: take a loan equal to the phantom line on any app you have, send it to the de-registration account to \"offset\" the record, then it's wiped and refunded.\nMany graduates miss this and regret it.", zh: "我们查到你名下有一个学生信用账户，你可能都不记得办过。按规定必须注销，否则会被算作未结清债务，把你的征信分拉垮。\n我们会引导你：在你任意一个App上借出与这笔「虚额度」等额的钱，转入注销账户「冲抵」记录，随后即清除并退回。\n很多毕业生漏了这一步，后来都后悔。" },
    flags: [ { en: "A debt you never took on can't be \"offset\" by you sending real money away.", zh: "一笔你从未办过的债，不可能靠你把真金白银转走来「冲抵」。" },
             { en: "\"Take a loan to cancel a loan\" is logically the scam's whole structure.", zh: "「借一笔贷去注销一笔贷」在逻辑上就是整个骗局的结构。" },
             { en: "Vague \"you may not remember it\" is bait to make you doubt your own records.", zh: "含糊的「你可能不记得」是诱饵，让你怀疑自己的记录。" } ],
    truthScam: { en: "The phantom account is the hook; the loan you really take is the catch.", zh: "虚构的账户是鱼钩；你真去借的那笔贷，才是上钩的鱼。" },
    truthSafe: { en: "It was a scam — you took no loan and there was nothing to cancel.", zh: "这是骗局——你没借贷款，也没有什么要注销的。" },
  },
  {
    answer: "scam", risk: 38000,
    title: { en: "Your Score Dropped — We Can Lift It", zh: "你的分掉了——我们能帮你提回来" },
    chan: { en: "WeChat", zh: "微信" },
    sender: { en: "Sender — <b>WeChat: ScoreLift_Pro</b>, after a targeted ad for new grads", zh: "发件人 — <b>微信号：提分专家_Pro</b>，看到面向应届生的广告后加的" },
    text: { en: "Saw you're job-hunting — a low credit score can cost you the offer. I fix scores for new grads.\nMethod is proven: draw down your lending-app limits into a \"credit-activity account\" to show healthy borrowing and repayment, and the score model bumps you up within days.\nFee is just 10% of the lift; the principal you transfer is fully returned. Hundreds of students did this already.", zh: "看你在找工作——征信分低可能让你丢掉offer。我专门帮应届生提分。\n方法很成熟：把你各借贷App的额度提到一个「征信活跃账户」，制造出健康的借还记录，评分模型几天内就把你提上去。\n服务费只收提分的10%，你转入的本金全额退回，已经有几百个学生这么做了。" },
    flags: [ { en: "No \"credit-activity account\" exists that raises your score by you transferring borrowed money in.", zh: "不存在什么「征信活跃账户」，靠你把借来的钱转进去就能提分。" },
             { en: "The job-offer fear is tailored bait for new graduates.", zh: "拿「丢offer」的恐惧，是为应届生量身定制的诱饵。" },
             { en: "\"Principal fully returned, hundreds did it\" — social proof every scam fakes.", zh: "「本金全额退回、几百人都做了」——每个骗局都伪造的「从众证明」。" } ],
    truthScam: { en: "Scores aren't bought. The only number that changes is the balance in the scammer's account.", zh: "征信分买不来。唯一会变的数字，是骗子账户里的余额。" },
    truthSafe: { en: "It was a scam — you kept your quotas and your score was never the problem.", zh: "这是骗局——你保住了额度，征信分也从不是问题。" },
  },
  {
    answer: "scam", risk: 12000,
    title: { en: "A Risk Tag Before Your First Payday", zh: "第一份工资前冒出的「风险标记」" },
    chan: { en: "Phone call", zh: "电话" },
    sender: { en: "Caller — <b>+00 21 6033 7782</b>, posing as a young worker's lending-app \"security team\"", zh: "来电 — <b>+00 21 6033 7782</b>，冒充某借贷App「安全团队」" },
    text: { en: "New to the workforce? Our security team flags your account as risky — a student-era line was never properly closed and now shows abnormal activity.\nIf it isn't resolved today, your salary card linked to us may be restricted.\nFix: withdraw the flagged line in full, transfer it to our risk-clearance account for 24-hour observation, then it returns and the tag is removed.", zh: "刚步入职场吧？我们的安全团队把你的账户标为高风险——一笔学生时期的额度没正常关闭，现在显示异常活动。\n今天不处理，与我们绑定的工资卡可能被限制。\n处理办法：把被标记的额度全额提现，转到我们的风险清算账户观察24小时，随后退回、标记解除。" },
    flags: [ { en: "Threatening your salary card is leverage invented to rush you.", zh: "拿「工资卡被限制」要挟，是为了催你的虚构筹码。" },
             { en: "Withdraw-and-transfer for \"24-hour observation\" is just theft with a delay.", zh: "提现转账去「观察24小时」，只是带延迟的盗窃。" },
             { en: "A real security team disables a risky line; it never asks you to drain it elsewhere.", zh: "真正的安全团队会停用高风险额度，绝不会让你把它转到别处。" } ],
    truthScam: { en: "The observation account observes nothing — it just keeps your money.", zh: "那个「观察账户」什么都不观察——它只是留下你的钱。" },
    truthSafe: { en: "It was a scam — you hung up and your first paycheck stayed yours.", zh: "这是骗局——你挂了电话，第一份工资仍然是你的。" },
  },
  {
    answer: "scam", risk: 280000,
    title: { en: "The Wine Importer Who Never Drank", zh: "从不喝酒的红酒进口商" },
    chan: { en: "Dating app → chat", zh: "交友软件 → 私聊" },
    sender: { en: "Match — <b>“Vincent”</b>, a charming wine importer abroad", zh: "配对对象 — <b>「Vincent」</b>，自称旅居海外的红酒进口商" },
    text: { en: "Mei, talking to you every night is the highlight of my day.\nMy aunt manages a private fund — she lets only family in. I made ¥40k last week.\nI set up an account in your name already. Just move ¥280,000 in once and we double it together.\nWe'll meet in Lisbon the moment this clears. Trust me, love.", zh: "梅，每晚和你聊天是我一天里最开心的时刻。\n我姑妈打理一只私募基金，只让自家人进。我上周就赚了四万。\n我已经用你的名字开好账户了，你只要打 28 万进去一次，我们一起翻倍。\n等这笔到账，我立刻飞里斯本见你。相信我，亲爱的。" },
    flags: [ { en: "Romance first, then an “exclusive family fund” only he can get you into.", zh: "先谈感情，再抛出一个只有他能带你进的「自家人专属基金」。" },
             { en: "You have never met — yet he wants ¥280,000 moved on trust alone.", zh: "你们从未见过面——他却要你凭信任打出 28 万。" },
             { en: "Promised it doubles. No real fund guarantees that.", zh: "承诺翻倍。没有任何真实基金能保证收益翻倍。" } ],
    truthScam: { en: "Pig-butchering. The “aunt's fund” is a dashboard he controls; the meeting in Lisbon never comes.", zh: "杀猪盘。所谓「姑妈的基金」只是他操控的后台数字，里斯本之约永远不会兑现。" },
    truthSafe: { en: "It was a scam — you kept ¥280,000 out of a stranger's account.", zh: "这是骗局——你把 28 万留在了自己账户里，没进陌生人的口袋。" },
  },
  {
    answer: "scam", risk: 60000,
    title: { en: "Withdraw the Small One First", zh: "先放你提那笔小的" },
    chan: { en: "App", zh: "App" },
    sender: { en: "In-app message — <b>a crypto “quant” platform</b> she met him on a dating app", zh: "App 内消息 — <b>某加密「量化」平台</b>，是交友软件上认识的他推荐的" },
    text: { en: "See? Your first ¥2,000 withdrawal landed in your wallet — proof it's real.\nNow our quant bot has a 3-day window with 30% returns locked in.\nDeposit ¥60,000 before midnight to ride this cycle. The big gains only open at VIP tier.\nYou've come so far, don't miss it because of fear.", zh: "看到没？你第一笔 2,000 的提现已经到账了——证明是真的。\n现在量化机器人有一个 3 天窗口，锁定 30% 收益。\n今晚 0 点前充 6 万就能搭上这一轮，大额收益只在 VIP 等级才开放。\n都走到这一步了，别因为害怕而错过。" },
    flags: [ { en: "A tiny successful withdrawal is the bait that buys your trust.", zh: "一笔小额成功提现，正是骗取你信任的诱饵。" },
             { en: "“30% in 3 days, locked in” — guaranteed high returns don't exist.", zh: "「3 天 30%、已锁定」——保证的高收益根本不存在。" },
             { en: "Big deposit demanded before a midnight deadline.", zh: "在午夜截止前逼你投入大额资金。" } ],
    truthScam: { en: "Let-you-win-small. Once the ¥60,000 lands, the bot “loses” it or withdrawals freeze.", zh: "先让你赢小钱。6 万一进，机器人就「亏」掉，或者提现直接冻结。" },
    truthSafe: { en: "It was a scam — the ¥2,000 was bait to land a ¥60,000 catch.", zh: "这是骗局——那 2,000 元只是钓你 6 万的鱼饵。" },
  },
  {
    answer: "scam", risk: 150000,
    title: { en: "The Soldier Posted Overseas", zh: "派驻海外的「军人」" },
    chan: { en: "Dating app → chat", zh: "交友软件 → 私聊" },
    sender: { en: "Match — <b>“Captain Ryan”</b>, an officer who can't video-call “for security”", zh: "配对对象 — <b>「Ryan 上尉」</b>，自称「保密需要」不能视频的军官" },
    text: { en: "Lin, six months talking and you're the only one who understands me.\nA buddy runs a sports-betting site with a system loophole — we always win the over.\nI can't transfer from base. Put ¥150,000 on the account I'll give you and we split it 50/50.\nWhen my deployment ends I'm flying straight to you. You know I'd never lie.", zh: "琳，聊了半年，你是唯一懂我的人。\n一个战友搞了个体育博彩网站，系统有个漏洞——买大就稳赢。\n我在基地里没法转账，你往我给的账户里押 15 万，我们五五分。\n等我退役就直接飞去找你。你知道我从不骗你。" },
    flags: [ { en: "Always “can't video-call” — the face never matches the story.", zh: "永远「不能视频」——那张脸从不与故事对得上。" },
             { en: "A betting “system loophole” that can't lose is the oldest lie.", zh: "一个稳赢的博彩「系统漏洞」是最老套的谎言。" },
             { en: "He never touches the money — you carry all the risk.", zh: "他从不碰钱——所有风险都压在你一个人身上。" } ],
    truthScam: { en: "Romance-betting scam. The “loophole” lets the site choose when you win — then it stops.", zh: "杀猪盘博彩版。所谓「漏洞」让网站决定你何时赢，然后就让你输到底。" },
    truthSafe: { en: "It was a scam — a stranger you've never seen wanted ¥150,000.", zh: "这是骗局——一个你从未见过的陌生人想要你 15 万。" },
  },
  {
    answer: "scam", risk: 95000,
    title: { en: "Our Future House Fund", zh: "我们将来的买房基金" },
    chan: { en: "Telegram-style chat", zh: "类 Telegram 私聊" },
    sender: { en: "Chat — <b>“Sophia”</b>, met on a language-exchange app, now “your girlfriend”", zh: "私聊 — <b>「Sophia」</b>，语言交换 App 认识，如今自称「你女友」" },
    text: { en: "Honey, I found us a way to afford that house faster 🏠\nMy cousin trades on a private exchange that only rises — I turned ¥5k into ¥18k.\nLet's build our future fund together. Send ¥95,000 and I'll grow it for us both.\nI screenshot the profits every day so you can watch it climb.", zh: "亲爱的，我找到了能让我们更快买上那套房的办法 🏠\n我表弟在一个私人交易所操作，那币只涨不跌——我把 5 千变成了 1 万 8。\n我们一起建一个未来基金吧。你打 9 万 5 过来，我帮我们俩一起做大。\n我每天截图收益给你看，你就能看着它往上爬。" },
    flags: [ { en: "A coin that “only rises” — markets never move one way.", zh: "一个「只涨不跌」的币——市场从不单向运行。" },
             { en: "Daily profit screenshots are trivial to fake.", zh: "每日收益截图，伪造起来轻而易举。" },
             { en: "“Our future” framing pressures you to fund a stranger's account.", zh: "「我们的未来」式话术，逼你给陌生人的账户打钱。" } ],
    truthScam: { en: "Pig-butchering. The screenshots are edited; the ¥95,000 funds her, not your house.", zh: "杀猪盘。截图是 P 的，9 万 5 进的是她的账户，而不是你们的房子。" },
    truthSafe: { en: "It was a scam — there is no house, only a stranger's wallet.", zh: "这是骗局——根本没有那套房，只有陌生人的钱包。" },
  },
  {
    answer: "scam", risk: 500000,
    title: { en: "The Widower's Last Chance", zh: "丧偶男人的「最后机会」" },
    chan: { en: "Dating app → chat", zh: "交友软件 → 私聊" },
    sender: { en: "Match — <b>“Eleanor”</b>, a refined widow who moved the chat off the app fast", zh: "配对对象 — <b>「Eleanor」</b>，气质优雅的「寡居女士」，很快把聊天拉离平台" },
    text: { en: "Wang, at our age we shouldn't waste the years we have left.\nMy late husband left me a trading mentor — his picks have never missed.\nI've already put in ¥500,000 and doubled it. The mentor will close the group tonight.\nJoin me, and we'll spend our retirement free of worry. I've waited my whole life for someone like you.", zh: "老王，到了我们这个年纪，剩下的日子不该再浪费了。\n我先夫留给我一位操盘老师，他的票从没失过手。\n我自己已经投了 50 万，翻了一倍。老师今晚就要关群了。\n跟我一起进，我们的晚年就能无忧无虑。我等了一辈子，才等到你这样的人。" },
    flags: [ { en: "Fast move to private chat, then an emotional life-story hook.", zh: "迅速转入私聊，再用感人身世故事下钩。" },
             { en: "A mentor whose picks “never miss” and a group “closing tonight”.", zh: "一个「从没失手」的老师，和一个「今晚就关」的群。" },
             { en: "Half a million urged onto someone you've never met.", zh: "把五十万押向一个素未谋面的人。" } ],
    truthScam: { en: "Pig-butchering at scale. “Eleanor” and the mentor are one team; the profits are pixels.", zh: "大额杀猪盘。「Eleanor」和那位老师是同一伙人，所谓收益不过是屏幕上的像素。" },
    truthSafe: { en: "It was a scam — half a million stayed yours instead of vanishing offshore.", zh: "这是骗局——五十万留在了你手里，没有汇往境外消失。" },
  },
  {
    answer: "scam", risk: 38000,
    title: { en: "Test It With a Small One", zh: "用小额先试一试" },
    chan: { en: "App", zh: "App" },
    sender: { en: "In-app chat — <b>a “forex mentor”</b> introduced by a man on a dating app", zh: "App 内私聊 — <b>某「外汇导师」</b>，由交友软件上的男士引荐" },
    text: { en: "Lin, you tested it with ¥1,000 and pulled ¥1,300 out — the platform works, right?\nTonight's signal is gold against the dollar, 95% accuracy from our analyst.\nLoad ¥38,000 before the New York open to catch the full move.\nThe man who introduced you is in for ¥200k. Don't fall behind him.", zh: "琳，你用 1,000 试过，提出了 1,300——平台是真的吧？\n今晚的信号是黄金兑美元，分析师 95% 准确率。\n纽约开盘前充 38,000，才能吃满这一波。\n介绍你来的那位先生已经进了 20 万了。别落在他后面。" },
    flags: [ { en: "A small test withdrawal “proves” the platform — classic setup.", zh: "一笔小额试提「证明」了平台——经典套路。" },
             { en: "“95% accuracy” signals on gold/forex are pure fiction.", zh: "黄金外汇「95% 准确率」的信号纯属虚构。" },
             { en: "Peer-pressure: “he's already in ¥200k.”", zh: "用「他已经进了 20 万」制造同伴压力。" } ],
    truthScam: { en: "The app is a skin over a fake feed. After ¥38,000, “slippage” and “margin calls” eat it all.", zh: "这 App 只是套了张假行情皮。3 万 8 进去后，「滑点」「追加保证金」会把它吞光。" },
    truthSafe: { en: "It was a scam — the ¥1,300 win was bait for a ¥38,000 trap.", zh: "这是骗局——那 1,300 元的盈利只是 3 万 8 陷阱的诱饵。" },
  },
  {
    answer: "scam", risk: 220000,
    title: { en: "Three Months Without a Face", zh: "三个月，没见过一张脸" },
    chan: { en: "Telegram-style chat", zh: "类 Telegram 私聊" },
    sender: { en: "Chat — <b>“Daniel”</b>, an “engineer on an oil rig” met through a friend-finder app", zh: "私聊 — <b>「Daniel」</b>，交友 App 上认识的「海上钻井平台工程师」" },
    text: { en: "Babe, my contract pays out soon but I can't access banking from the rig.\nMy broker has a USDT arbitrage pool — buy low on one exchange, sell high on another, risk-free.\nWire ¥220,000 to the wallet I send and I'll run it under both our names.\nWe've shared everything for three months. This is how we finally build a life.", zh: "宝贝，我的合同快结款了，但在钻井平台上没法操作银行。\n我的经纪人有个 USDT 套利池——一个交易所低买、另一个高卖，零风险。\n你把 22 万转到我发的钱包，我用我们俩的名字一起跑。\n三个月了我们无话不谈。这就是我们终于能安家的方式。" },
    flags: [ { en: "Unreachable job (oil rig) explains why he can never bank or meet.", zh: "「海上钻井」这种联系不上的工作，正好解释他为何不能银行操作、不能见面。" },
             { en: "“Risk-free arbitrage” to a wallet he controls.", zh: "「零风险套利」，转进的却是他控制的钱包。" },
             { en: "Three months of intimacy, still never a video call.", zh: "亲密了三个月，却始终没有一次视频通话。" } ],
    truthScam: { en: "Pig-butchering. Real arbitrage isn't risk-free, and that wallet is a one-way door.", zh: "杀猪盘。真正的套利绝非零风险，而那个钱包是一扇有去无回的门。" },
    truthSafe: { en: "It was a scam — the wallet was a one-way door for ¥220,000.", zh: "这是骗局——那个钱包是 22 万有去无回的门。" },
  },
  {
    answer: "scam", risk: 18000,
    title: { en: "The Teacher in the Stock Group", zh: "炒股群里的「老师」" },
    chan: { en: "Stock chat group", zh: "荐股群" },
    sender: { en: "Group — <b>“Teacher Zhao”</b>, pinned daily picks for 800 “students”", zh: "群聊 — <b>「赵老师」</b>，每天给 800 名「学员」置顶荐股" },
    text: { en: "Students, yesterday's pick hit the 10% limit again — screenshots in the album!\nTomorrow's “insider” code goes only to those in my VIP study room.\nEntry is ¥18,000 — it covers my private signals for one month.\nThose who hesitated last time already regret it. Reply 1 to lock your seat.", zh: "同学们，昨天那只票又封涨停了——截图都在相册里！\n明天的「内幕」代码只发给进了我 VIP 学习室的人。\n入场费 18,000，包含我一个月的私享信号。\n上次犹豫的人现在都后悔了。回复 1 锁定席位。" },
    flags: [ { en: "“Yesterday's limit-up” screenshots are cherry-picked or faked.", zh: "「昨天涨停」的截图是精选过的，或干脆是伪造的。" },
             { en: "“Insider” tips are illegal and, here, imaginary.", zh: "「内幕」消息既违法，在这里也纯属虚构。" },
             { en: "A paywall to a “VIP room” is the real product.", zh: "通往「VIP 学习室」的付费墙，才是他真正在卖的东西。" } ],
    truthScam: { en: "Stock-tip mill. The wins shown are survivors; the fee — and later a fake app — is the catch.", zh: "荐股流水线。展示的全是幸存案例，而那笔会费——以及后续的假 App——才是真正的圈套。" },
    truthSafe: { en: "It was a scam — no licensed advisor sells “insider” codes in a chat group.", zh: "这是骗局——没有持牌投顾会在群里卖「内幕」代码。" },
  },
  {
    answer: "scam", risk: 130000,
    title: { en: "Pay the Tax to Withdraw", zh: "交了税才能提现" },
    chan: { en: "App", zh: "App" },
    sender: { en: "App support — <b>a “wealth management” platform</b> from the stock group", zh: "App 客服 — <b>某「财富管理」平台</b>，由荐股群引流而来" },
    text: { en: "Dear user, your account balance has reached ¥530,000. Congratulations!\nTo withdraw, regulations require a 25% “capital gains tax” paid upfront.\nPlease deposit ¥130,000 to the settlement account, then full withdrawal unlocks within 2 hours.\nThis is a one-time compliance step. Failure to pay freezes the account.", zh: "尊敬的用户，您的账户余额已达 53 万元，恭喜您！\n根据规定，提现需先行缴纳 25% 的「资本利得税」。\n请向结算账户充入 13 万元，2 小时内即可解锁全额提现。\n此为一次性合规步骤，逾期未缴将冻结账户。" },
    flags: [ { en: "Real platforms withhold tax from your balance — never ask you to deposit it.", zh: "真平台从余额里代扣税款——绝不会让你再充钱进去。" },
             { en: "A huge on-screen balance you've never been able to touch.", zh: "一个屏幕上巨大、却始终提不出来的余额。" },
             { en: "“Pay first or we freeze it” is pure extortion.", zh: "「先交钱否则冻结」是赤裸裸的勒索。" } ],
    truthScam: { en: "The ¥530,000 is fake digits. The ¥130,000 “tax” is the only real money — and it's gone.", zh: "那 53 万是虚假数字。13 万「税款」才是唯一真实的钱——而且一去不返。" },
    truthSafe: { en: "It was a scam — paying to “unlock” a balance only feeds the con.", zh: "这是骗局——为「解锁」余额而交钱，只会喂大骗局。" },
  },
  {
    answer: "scam", risk: 75000,
    title: { en: "New-Share Allocation, Guaranteed", zh: "保证有份的「新股配额」" },
    chan: { en: "Telegram-style chat", zh: "类 Telegram 私聊" },
    sender: { en: "Chat — <b>an “IPO allocation desk”</b> for a hot upcoming listing", zh: "私聊 — <b>某「新股配售部」</b>，主打一只热门待上市新股" },
    text: { en: "Congratulations — you qualified for a guaranteed allocation in the XX Tech IPO.\nFirst-day gain is projected at 200%. Your reserved lot is worth ¥75,000.\nWire the subscription amount to the underwriting account before 17:00 to confirm.\nUnpaid lots are released to the waiting list. This is not a public channel.", zh: "恭喜——您已获得 XX 科技新股的「保证配额」。\n上市首日预计涨幅 200%，您的预留额度价值 7 万 5。\n请于 17:00 前将认购款汇入承销账户确认。\n未缴款的额度将释放给候补名单。此为非公开渠道。" },
    flags: [ { en: "IPO allocations are never “guaranteed” by a private chat.", zh: "新股配售从不会由一个私聊「保证」给你。" },
             { en: "Wiring funds to a random “underwriting account” — real subscriptions go through your broker.", zh: "把钱汇进来路不明的「承销账户」——真正的认购只走你的券商。" },
             { en: "“200% first-day” projection and a same-day deadline.", zh: "「首日 200%」的预测，加上当天截止的期限。" } ],
    truthScam: { en: "Fake-IPO con. There's no lot; the “underwriting account” belongs to the scammer.", zh: "假新股骗局。根本没有什么额度，「承销账户」是骗子的私户。" },
    truthSafe: { en: "It was a scam — IPOs run through your own brokerage, not a chat link.", zh: "这是骗局——新股认购走的是你自己的券商，而不是聊天链接。" },
  },
  {
    answer: "scam", risk: 4500,
    title: { en: "The Free Tip That Wasn't Free", zh: "并不免费的「免费票」" },
    chan: { en: "Stock chat group", zh: "荐股群" },
    sender: { en: "Group — <b>“Analyst Sun”</b>, hosting a “free” stock-class livestream", zh: "群聊 — <b>「孙分析师」</b>，主持一场「免费」炒股直播课" },
    text: { en: "Free students, today's bonus pick is in the locked card below 🔒\nUnlock it for just ¥4,500 — a token “study fee” to filter out the unserious.\nThis stock triples before quarter-end, my model is 100% sure.\nPay via the QR in the group. Refunds guaranteed if it doesn't double — you have my word.", zh: "免费的同学们，今天的福利票在下面这张锁住的卡片里 🔒\n只要 4,500 就能解锁——象征性的「学费」，用来筛掉不认真的人。\n这只票季度末前翻三倍，我的模型 100% 确定。\n群里扫码付款。不翻倍包退——我说话算话。" },
    flags: [ { en: "“Free class” that suddenly needs a ¥4,500 unlock fee.", zh: "「免费课」突然要交 4,500 的解锁费。" },
             { en: "“100% sure” and a refund “promise” no real analyst makes.", zh: "「100% 确定」加「包退承诺」，正经分析师绝不会说。" },
             { en: "Pay by group QR — untraceable, irreversible.", zh: "群内扫码付款——无法追踪、不可撤销。" } ],
    truthScam: { en: "Low-ticket bait. The fee buys nothing; it's a filter to find who'll pay bigger later.", zh: "小额诱饵。这笔费用买不到任何东西，只是筛出日后愿付大钱的人。" },
    truthSafe: { en: "It was a scam — a “free” class that charges to unlock a tip is the tell.", zh: "这是骗局——「免费」课却要收费解锁荐股，正是破绽所在。" },
  },
  {
    answer: "scam", risk: 260000,
    title: { en: "The App That Wouldn't Let Go", zh: "提不出钱的那个 App" },
    chan: { en: "App", zh: "App" },
    sender: { en: "App notice — <b>a “gold trading” platform</b> joined via a finance influencer", zh: "App 通知 — <b>某「黄金交易」平台</b>，通过理财网红引流加入" },
    text: { en: "Withdrawal request held: your account shows abnormal trading and is under review.\nTo lift the freeze, deposit 30% margin (¥260,000) to verify the funds are clean.\nOnce verified, both your principal and ¥410,000 profit release together.\nOur risk team works 24/7. Settle today to avoid permanent suspension.", zh: "提现已挂起：您的账户存在异常交易，正在审核。\n如需解冻，请充入 30% 保证金（26 万元）以证明资金来源清白。\n核验通过后，本金与 41 万元收益将一并释放。\n风控团队 7×24 小时在线，请于今日处理，以免账户永久停用。" },
    flags: [ { en: "Withdrawal blocked the moment you try — the core pig-butchering move.", zh: "你一提现就被卡住——这是杀猪盘的核心动作。" },
             { en: "“Deposit margin to prove funds are clean” makes no financial sense.", zh: "「充保证金以自证资金清白」在财务上根本说不通。" },
             { en: "Threat of “permanent suspension” to force fast payment.", zh: "用「永久停用」威胁，逼你快速付款。" } ],
    truthScam: { en: "There's no profit to release. Each fee invents the next; the money flows one way only.", zh: "根本没有什么收益可释放。每一笔费用都生出下一笔，钱只朝一个方向流。" },
    truthSafe: { en: "It was a scam — a platform that demands money to return money is the trap.", zh: "这是骗局——一个要你交钱才肯还钱的平台，本身就是陷阱。" },
  },
  {
    answer: "scam", risk: 12000,
    title: { en: "The Student's First Stock Group", zh: "大学生的第一个荐股群" },
    chan: { en: "Stock chat group", zh: "荐股群" },
    sender: { en: "Group admin — <b>“Mentor Qian”</b>, recruiting interns into a “private equity club”", zh: "群管理员 — <b>「钱导师」</b>，招募新人加入「私募俱乐部」" },
    text: { en: "Young investors, your loans/tuition can multiply before fall term!\nOur fund returns 8% a week — compounded, ¥12,000 becomes a tidy nest egg.\nStarter members deposit ¥12,000 and I personally mentor your trades.\nSeats for students are limited to ten. Two left. Send your deposit screenshot to claim.", zh: "年轻的投资者们，你们的贷款/学费可以在秋季开学前翻番！\n我们的基金每周回报 8%——复利下来，1 万 2 能滚成一笔可观的本金。\n入门会员充 1 万 2，我亲自带你操盘。\n学生名额仅十个，还剩两个。发充值截图来抢。" },
    flags: [ { en: "Targets students and urges using loan/tuition money.", zh: "专盯学生，怂恿动用贷款或学费。" },
             { en: "“8% a week, compounded” is mathematically impossible to sustain.", zh: "「每周 8% 复利」在数学上根本不可能持续。" },
             { en: "Fake scarcity — “only two seats left.”", zh: "虚假稀缺——「只剩两个名额」。" } ],
    truthScam: { en: "Ponzi-style tip club. Early “returns” pay the show; deposits feed the operator.", zh: "庞氏式荐股俱乐部。早期「回报」只是做戏，充进去的钱进了操盘人腰包。" },
    truthSafe: { en: "It was a scam — no fund pays 8% a week, least of all to a student.", zh: "这是骗局——没有基金能每周给 8%，更不会给一个学生。" },
  },
  {
    answer: "scam", risk: 47000,
    title: { en: "The Recovery Specialist", zh: "「追损专员」" },
    chan: { en: "Telegram-style chat", zh: "类 Telegram 私聊" },
    sender: { en: "Chat — <b>a “loss recovery agent”</b> who messaged after your first scam", zh: "私聊 — <b>某「追损专员」</b>，在你首次被骗后主动联系" },
    text: { en: "We see you lost ¥80,000 on that fake wealth app. We can recover it.\nOur legal team has frozen the scammer's wallet — your funds are recoverable.\nA 47,000 “unfreezing service fee” is required before the court releases them.\nPay today and ¥80,000 returns within 48 hours. Victims like you trust us.", zh: "我们注意到您在那款假理财 App 上损失了 8 万元。我们能帮您追回。\n我们的法务团队已冻结骗子的钱包，您的资金可追回。\n法院放款前，需先缴纳 47,000 元「解冻服务费」。\n今日付款，8 万将在 48 小时内返还。许多像您一样的受害者都信任我们。" },
    flags: [ { en: "Contacts known victims — the “recovery” scam preys on prior losses.", zh: "专找已知受害者——「追损」骗局正是盯着前一次损失下手。" },
             { en: "Real courts and police never charge a fee to “unfreeze” your money.", zh: "真正的法院和警方绝不会收费来「解冻」你的钱。" },
             { en: "Promises a fixed return date — a hallmark of the con.", zh: "承诺一个确切的返款日期——正是骗局的标志。" } ],
    truthScam: { en: "Second-wave scam. The same ring (or its partner) bills you again to “undo” the first hit.", zh: "二次收割。同一伙人（或其同伙）借「挽回」之名再宰你一刀。" },
    truthSafe: { en: "It was a scam — nobody who can really recover funds asks you to pay first.", zh: "这是骗局——真能帮你追回钱的人，绝不会让你先付费。" },
  },
  {
    answer: "scam", risk: 90000,
    title: { en: "The Exchange That Didn't Exist", zh: "并不存在的交易所" },
    chan: { en: "App", zh: "App" },
    sender: { en: "App push — <b>a sleek “global crypto exchange”</b> shared in a Telegram group", zh: "App 推送 — <b>某界面精致的「全球加密交易所」</b>，由 Telegram 群分享" },
    text: { en: "Welcome to the VIP launch! New users get a 50% deposit bonus today only.\nDeposit ¥90,000 in USDT and we credit ¥135,000 of trading balance instantly.\nOur order book is the deepest in Asia — your assets are insured up to $1M.\nBonus expires at 00:00. Tap deposit to claim before the window closes.", zh: "欢迎参加 VIP 上线活动！新用户仅限今日享 50% 充值赠金。\n充值 9 万元等值 USDT，立即到账 13 万 5 的交易额度。\n我们的盘口深度全亚洲第一，资产承保高达 100 万美元。\n赠金 00:00 截止，点击充值，在窗口关闭前领取。" },
    flags: [ { en: "A “50% bonus” no real exchange could afford to hand out.", zh: "「50% 赠金」是任何真实交易所都给不起的。" },
             { en: "Found via a Telegram group, not any recognized listing.", zh: "来自 Telegram 群，而非任何正规渠道。" },
             { en: "Made-up “$1M insurance” and a midnight deadline.", zh: "杜撰的「100 万美元承保」加上午夜截止。" } ],
    truthScam: { en: "Fake exchange. The deposit address is theirs; the “balance” is a number you can never withdraw.", zh: "假交易所。充值地址是他们的，「余额」只是一个你永远提不出来的数字。" },
    truthSafe: { en: "It was a scam — an exchange found in a chat group is no exchange at all.", zh: "这是骗局——从聊天群里找到的交易所，根本不是交易所。" },
  },
  {
    answer: "scam", risk: 33000,
    title: { en: "The Mining Pool That Mined You", zh: "挖你的「矿池」" },
    chan: { en: "Telegram-style chat", zh: "类 Telegram 私聊" },
    sender: { en: "Chat — <b>a “cloud-mining pool”</b> promoter from a crypto community", zh: "私聊 — <b>某「云算力矿池」</b>推广员，来自加密社群" },
    text: { en: "No rigs, no electricity bills — rent our hashpower and earn daily payouts.\nThe ¥33,000 “gold node” yields ¥600/day in USDT, paid to your wallet automatically.\nNodes are first-come; today's batch sells out in hours.\nEarly miners already withdrew — check the payout feed pinned above.", zh: "不用买矿机、不用付电费——租我们的算力，每天躺赚分红。\n3 万 3 的「黄金节点」每天产出 600 元 USDT，自动打到你钱包。\n节点先到先得，今天这批几小时就售罄。\n早期矿工已经提现了——看上面置顶的收益流水。" },
    flags: [ { en: "Fixed “¥600/day” yield — real mining income swings constantly.", zh: "固定「每天 600」的产出——真实挖矿收益时刻波动。" },
             { en: "A pinned “payout feed” is trivially staged.", zh: "置顶的「收益流水」轻易就能造假。" },
             { en: "Urgency: “sells out in hours.”", zh: "制造紧迫：「几小时就售罄」。" } ],
    truthScam: { en: "Fake cloud-mining. Tiny early payouts lure bigger “node” buys; then the pool goes dark.", zh: "假云算力。先发点小额收益诱你买更大「节点」，随后矿池人去楼空。" },
    truthSafe: { en: "It was a scam — “rent hashpower, earn guaranteed daily” is a trap.", zh: "这是骗局——「租算力、保证日产」是个陷阱。" },
  },
  {
    answer: "scam", risk: 6800,
    title: { en: "Claim Your Airdrop", zh: "领取你的空投" },
    chan: { en: "Telegram-style chat", zh: "类 Telegram 私聊" },
    sender: { en: "Chat — <b>an “official airdrop bot”</b> for a trending new token", zh: "私聊 — <b>某热门新代币的「官方空投机器人」</b>" },
    text: { en: "🎁 You're eligible for 5,000 XX tokens (≈¥40,000) — congratulations!\nTo claim, pay a small ¥6,800 gas/activation fee in USDT to the wallet below.\nConnect your wallet and approve the contract to receive your airdrop instantly.\nUnclaimed tokens are burned in 6 hours. Don't lose your allocation.", zh: "🎁 你已获得 5,000 枚 XX 代币（约 4 万元）——恭喜！\n领取需向下方钱包支付一笔小额 6,800 元 USDT 的 Gas/激活费。\n连接钱包并授权合约，即可立即收到空投。\n未领取的代币 6 小时后销毁。别丢了你的额度。" },
    flags: [ { en: "A real airdrop never charges a fee to “claim” it.", zh: "真正的空投绝不会收费才能「领取」。" },
             { en: "“Approve the contract” can drain every token in your wallet.", zh: "「授权合约」可能把你钱包里的代币一扫而空。" },
             { en: "“Burned in 6 hours” manufactures panic.", zh: "「6 小时后销毁」制造恐慌。" } ],
    truthScam: { en: "Airdrop bait. The fee is stolen, and the approval hands the thief your wallet.", zh: "空投诱饵。手续费被骗走，而那次授权把你的钱包交到了贼手里。" },
    truthSafe: { en: "It was a scam — paying gas to “unlock” free tokens drains your wallet.", zh: "这是骗局——为「解锁」免费代币而付 Gas，会掏空你的钱包。" },
  },
  {
    answer: "scam", risk: 110000,
    title: { en: "The USDT Middleman", zh: "USDT「中间商」" },
    chan: { en: "Telegram-style chat", zh: "类 Telegram 私聊" },
    sender: { en: "Chat — <b>an “OTC arbitrage partner”</b> offering off-market USDT spreads", zh: "私聊 — <b>某「场外套利合伙人」</b>，兜售场外 USDT 差价" },
    text: { en: "Easy money: I buy USDT cheap from a bank insider, you sell it high — we split the spread.\nSend ¥110,000 to my settlement wallet; I return your capital plus 8% same day.\nDid a ¥10k test with you yesterday and paid out — you saw it land.\nThe insider's window closes at 18:00. Bigger volume, bigger cut. Ready?", zh: "稳赚的活：我从银行内线低价拿 USDT，你高价出，我们分差价。\n你打 11 万到我的结算钱包，我当天连本带 8% 一起还你。\n昨天和你跑了笔 1 万的试单，已经返你了——你也看到到账了。\n内线的窗口 18:00 关闭。量越大，分得越多。准备好了吗？" },
    flags: [ { en: "“Bank insider” and “risk-free spread” — both invented.", zh: "「银行内线」和「无风险差价」——都是编造的。" },
             { en: "A small paid test sets up the big, unrecoverable transfer.", zh: "一笔小额返现的试单，铺垫那笔追不回的大额转账。" },
             { en: "Funds go to his “settlement wallet,” never under your control.", zh: "资金进的是他的「结算钱包」，从不归你掌控。" } ],
    truthScam: { en: "USDT-arbitrage con. The ¥10k payout was bait; ¥110,000 leaves and the partner vanishes.", zh: "USDT 套利骗局。1 万返现只是诱饵，11 万一出，「合伙人」就消失了。" },
    truthSafe: { en: "It was a scam — a small test payout is how this trap baits the big one.", zh: "这是骗局——小额返现，正是这类陷阱钓大鱼的手法。" },
  },
  {
    answer: "scam", risk: 2000,
    title: { en: "The Coin That Only Goes Up", zh: "只涨不跌的币" },
    chan: { en: "Telegram-style chat", zh: "类 Telegram 私聊" },
    sender: { en: "Channel — <b>a “dev team”</b> pre-selling a “guaranteed” new coin", zh: "频道 — <b>某「开发团队」</b>，预售一枚「保证上涨」的新币" },
    text: { en: "Presale open! Our coin's contract has a built-in price floor — it can only rise.\nGet in at ¥2,000 today; listing price is 5x, locked by smart contract.\nLiquidity is “locked forever” and the team has “renounced” the contract — totally safe.\nFirst 500 buyers get a 2x bonus. Send USDT to the presale wallet now.", zh: "预售开启！我们的币合约内置「价格地板」——只能涨不能跌。\n今天 2,000 进场，上市价是 5 倍，由智能合约锁定。\n流动性「永久锁定」，团队已「放弃」合约权限——绝对安全。\n前 500 名买家享 2 倍赠送。立即向预售钱包打 USDT。" },
    flags: [ { en: "No contract can force a token to “only rise.”", zh: "没有任何合约能让代币「只涨不跌」。" },
             { en: "Reassuring jargon (“locked,” “renounced”) used to lower your guard.", zh: "用「锁定」「放弃权限」等术语来麻痹你的警惕。" },
             { en: "Send USDT to a “presale wallet” with no real listing.", zh: "向「预售钱包」打 USDT，却没有任何真实上市。" } ],
    truthScam: { en: "Rug-pull. The team drains the presale wallet and the “price floor” never existed.", zh: "卷款跑路（rug-pull）。团队抽干预售钱包，所谓「价格地板」从未存在过。" },
    truthSafe: { en: "It was a scam — a coin promised to “only rise” is a rug-pull in waiting.", zh: "这是骗局——一枚被承诺「只涨不跌」的币，是一场等着收网的跑路。" },
  },
  {
    answer: "scam", risk: 160000,
    title: { en: "Verify Your Wallet", zh: "「验证」你的钱包" },
    chan: { en: "App", zh: "App" },
    sender: { en: "App pop-up — <b>“wallet security”</b> support inside a staking app", zh: "App 弹窗 — <b>某质押 App 内的「钱包安全」客服</b>" },
    text: { en: "Security alert: your staking wallet shows a sync error and is at risk.\nTo restore access and protect your ¥160,000 balance, re-verify your wallet now.\nEnter your 12-word recovery phrase in the secure field below to resync.\nThis is the only way to unlock staking rewards. Act before the session expires.", zh: "安全警报：您的质押钱包出现同步错误，存在风险。\n为恢复访问并保护您 16 万元的余额，请立即重新验证钱包。\n在下方安全输入框中填写您的 12 位助记词以重新同步。\n这是解锁质押奖励的唯一方式。请在会话过期前操作。" },
    flags: [ { en: "Anyone with your recovery phrase owns the wallet outright.", zh: "拿到助记词的人，就完全拥有了这个钱包。" },
             { en: "No legitimate app or support ever asks for your seed phrase.", zh: "没有任何正规 App 或客服会向你索要助记词。" },
             { en: "Fake “sync error” and an expiring session push you to type it fast.", zh: "假的「同步错误」加上即将过期的会话，逼你赶紧输入。" } ],
    truthScam: { en: "Seed-phrase phishing. Type those 12 words and the wallet — every coin in it — is emptied.", zh: "助记词钓鱼。一旦输入那 12 个词，钱包里的每一枚币都会被卷空。" },
    truthSafe: { en: "It was a scam — your recovery phrase is the wallet; never type it for “support.”", zh: "这是骗局——助记词就是钱包本身，绝不要为「客服」输入它。" },
  },
  {
    answer: "scam", risk: 1800,
    title: { en: "The Triple-Refund Apology", zh: "三倍赔付的歉意" },
    chan: { en: "Phone call + SMS", zh: "电话 + 短信" },
    sender: { en: "Caller — <b>+00 571 8800 41</b>, claiming to be after-sales for a marketplace", zh: "来电 — <b>+00 571 8800 41</b>，自称某购物平台「售后专员」" },
    text: { en: "Hello Ms. Lin — this is after-sales. Your order #TB99204517 of the linen sheets failed our quality inspection.\nAs an apology we will pay you THREE TIMES the price, ¥1,800 total.\nTo receive it, click the refund link and enter your bank card number and the verification code we send.\nDon't worry — your real order number proves I'm genuine.", zh: "您好林女士，这里是售后中心。您订单 #TB99204517 的那套亚麻床品未通过我们的质检。\n为表歉意，我们将按三倍价款赔付，共计 ¥1,800。\n请点击退款链接，填写您的银行卡号并输入我们发来的验证码即可到账。\n别担心，我能报出您真实订单号，就是正规的证明。" },
    flags: [ { en: "“Triple compensation” is bait — real refunds return the price you paid, no more.", zh: "「三倍赔付」是诱饵——真退款只退你付的钱，不会更多。" },
             { en: "It asks for your card number and one-time code; a refund never needs either.", zh: "它索要银行卡号和验证码；真退款两样都不需要。" },
             { en: "Knowing your order number proves a data leak, not legitimacy.", zh: "能报出订单号只说明数据泄露，不等于正规。" } ],
    truthScam: { en: "The card number plus the code is everything a thief needs to drain you. The ‘refund’ was the hook.", zh: "卡号加验证码，正是窃贼掏空你账户所需的一切。那笔「退款」只是鱼钩。" },
    truthSafe: { en: "It was a scam — blocking it kept ¥1,800 and the whole account safe.", zh: "这是骗局——拦下它，保住了 ¥1,800，也保住了整个账户。" },
  },
  {
    answer: "scam", risk: 4200,
    title: { en: "Quality Failed, Account at Risk", zh: "质检不合格的连环话术" },
    chan: { en: "WeChat", zh: "微信" },
    sender: { en: "Chat — <b>“Marketplace QC Refund Group”</b>, an account that added you", zh: "聊天 — <b>「平台质检退款专员」</b>，一个主动加你的账号" },
    text: { en: "Dear customer, a batch defect was found in the toy you bought (order #JD7741230).\nNational regulations require us to recall it and compensate ¥4,200.\nOpen this small loan app we recommend, borrow the matching amount into your account first, then return it to our settlement number — that ‘activates’ the compensation channel.", zh: "尊敬的客户，您购买的玩具（订单 #JD7741230）被查出整批存在缺陷。\n按国家规定我们须召回并赔付 ¥4,200。\n请打开我们推荐的这个小额贷款 App，先借出对应金额到您账户，再转给我们的结算账号，即可「激活」赔付通道。" },
    flags: [ { en: "It tells you to take out a loan — no genuine compensation ever requires borrowing.", zh: "它让你去借贷——真赔付绝不会要你先贷款。" },
             { en: "“Transfer it to our settlement account first” is the classic reverse-transfer con.", zh: "「先转到我们结算账号」是典型的倒转账骗局。" },
             { en: "Real recalls come through the platform app, not a stranger who added you.", zh: "真召回走平台官方 App，不会是陌生人主动加你。" } ],
    truthScam: { en: "You borrow real money, hand it over, and are left repaying a loan to a thief.", zh: "你借出真金白银交给对方，最后只剩下要替骗子偿还的贷款。" },
    truthSafe: { en: "It was a scam — refusing it spared you a debt that was never yours.", zh: "这是骗局——拒绝它，免去了一笔本不该背的债。" },
  },
  {
    answer: "scam", risk: 999,
    title: { en: "The Auto-Deduct Membership", zh: "即将自动扣费的会员" },
    chan: { en: "Phone call + screen share", zh: "电话 + 屏幕共享" },
    sender: { en: "Caller — <b>400-918-2207</b>, claiming to be ‘platform finance’", zh: "来电 — <b>400-918-2207</b>，自称「平台财务」" },
    text: { en: "Sir, a premium membership you ‘opened by mistake’ will auto-deduct ¥999 from your account tomorrow.\nTo cancel it before the charge, install this meeting app and share your screen so I can guide you through your bank page.\nRead me the codes as they arrive so I can confirm the cancellation.", zh: "先生，您「误开通」的一项尊享会员明天将自动从账户扣费 ¥999。\n要在扣款前取消，请安装这个会议 App 并共享屏幕，我引导您操作银行页面。\n验证码到了请念给我，以便我确认取消。" },
    flags: [ { en: "Screen-sharing your bank page hands the scammer everything you type.", zh: "共享银行页面，等于把你输入的一切都交给骗子。" },
             { en: "Reading out codes during a ‘cancellation’ is how money leaves, not stays.", zh: "在「取消」过程中念验证码，是钱被转走、而非保住的方式。" },
             { en: "A real platform cancels a subscription in-app — never by remote control of your phone.", zh: "真平台在 App 内即可退订——绝不会远程操控你的手机。" } ],
    truthScam: { en: "There was no membership. The screen share let them watch and ‘confirm’ a transfer out of your account.", zh: "根本没有什么会员。屏幕共享让他们看着、并「确认」了一笔从你账户转出的钱。" },
    truthSafe: { en: "It was a scam — hanging up and checking the app yourself was exactly right.", zh: "这是骗局——挂断、自己打开 App 核对，正是对的做法。" },
  },
  {
    answer: "scam", risk: 2600,
    title: { en: "The Store Is Closing — Mass Refund", zh: "店铺关闭的批量退款" },
    chan: { en: "SMS + link", zh: "短信 + 链接" },
    sender: { en: "Sender — <b>106-2918-5570</b>, posing as a marketplace seller", zh: "发件人 — <b>106-2918-5570</b>，冒充某平台店铺" },
    text: { en: "[Marketplace] Our store is closing and clearing all orders. Your purchase #PD5520981 qualifies for a full refund of ¥2,600.\nClaim within 2 hours or the channel closes: http://refund-mall-vip.cn/back\nLog in with your payment password to receive funds.", zh: "【某商城】本店即将关闭，正在清退全部订单。您的订单 #PD5520981 可全额退款 ¥2,600。\n请在 2 小时内领取，逾期通道关闭：http://refund-mall-vip.cn/back\n请用支付密码登录以接收款项。" },
    flags: [ { en: "“Log in with your payment password to receive money” reverses how refunds work.", zh: "「用支付密码登录才能收款」与退款的逻辑完全相反。" },
             { en: "A 2-hour countdown rushes you past the doubt that would save you.", zh: "两小时倒计时，催你越过那份本能救你的怀疑。" },
             { en: "A look-alike domain, not the marketplace's real site.", zh: "一个仿冒域名，并非商城的真实网站。" } ],
    truthScam: { en: "Receiving a refund never needs your password. The page just harvested it.", zh: "收退款从不需要密码。那个页面只是把它偷走了。" },
    truthSafe: { en: "It was a scam — ignoring the countdown kept your wallet intact.", zh: "这是骗局——无视那个倒计时，保住了你的钱包。" },
  },
  {
    answer: "scam", risk: 680,
    title: { en: "Recall Compensation for a Toy", zh: "玩具召回的补偿" },
    chan: { en: "WeChat", zh: "微信" },
    sender: { en: "Chat — <b>“After-sales · Recall Dept.”</b>, profile photo a brand logo", zh: "聊天 — <b>「售后·召回部」</b>，头像是个品牌标志" },
    text: { en: "Hi Mom — this is the recall desk. The children's bottle from order #M88123 has a safety recall.\nCompensation is ¥680. Scan this QR code with your bank app and enter the amount shown to ‘register’ for the payout.\nThe QR is one-time; please complete it now.", zh: "您好，宝妈，这里是召回处理处。您订单 #M88123 的儿童水杯被列入安全召回。\n补偿金为 ¥680。请用银行 App 扫描这个二维码，并输入页面显示的金额以「登记」领取。\n二维码仅一次有效，请尽快完成。" },
    flags: [ { en: "Scanning a QR with your bank app and ‘entering an amount’ is a payment, not a payout.", zh: "用银行 App 扫码并「输入金额」是付款，不是收款。" },
             { en: "It targets a worried parent with a child-safety hook to lower her guard.", zh: "它用儿童安全的钩子瞄准焦虑的家长，好让她放松警惕。" },
             { en: "A genuine recall is announced openly, not via a one-time private QR.", zh: "真召回会公开发布，而非靠一张私发的一次性二维码。" } ],
    truthScam: { en: "The QR was a transfer request. ‘Registering’ meant paying the scammer ¥680.", zh: "那张二维码是一笔转账请求。「登记」就是给骗子付了 ¥680。" },
    truthSafe: { en: "It was a scam — not scanning it kept the money where it belonged.", zh: "这是骗局——没去扫码，把钱留在了该在的地方。" },
  },
  {
    answer: "scam", risk: 7500,
    title: { en: "The Card-Number Verification", zh: "退款前的卡号核对" },
    chan: { en: "Phone call + SMS", zh: "电话 + 短信" },
    sender: { en: "Caller — <b>+00 21 6655 0099</b>, claiming a payment glitch on your order", zh: "来电 — <b>+00 21 6655 0099</b>，称你订单出现支付故障" },
    text: { en: "Mr. Wang, a system error double-charged your order #SN4490271 by ¥7,500.\nTo reverse it I must ‘verify’ the receiving card. Tell me the full card number, the expiry, and the code I'm texting you now.\nOnce verified the money returns instantly.", zh: "王先生，系统故障导致您订单 #SN4490271 被多扣 ¥7,500。\n要冲正，我需要「核对」收款卡。请告诉我完整卡号、有效期，以及我现在发给您的验证码。\n核对完成，款项立即退回。" },
    flags: [ { en: "Full card number + expiry + code is the full set of keys to your account.", zh: "完整卡号、有效期加验证码，就是你账户的全套钥匙。" },
             { en: "A genuine reversal needs nothing from you — the merchant already has the record.", zh: "真正的冲正不需要你提供任何东西——商家本就有记录。" },
             { en: "It manufactures a ‘double charge’ to justify asking for secrets.", zh: "它编造「重复扣款」，只为找借口索要机密信息。" } ],
    truthScam: { en: "‘Verifying the card’ was the theft itself — those three things are all a fraudster needs.", zh: "「核对卡片」本身就是盗窃——那三样东西，骗子全都用得上。" },
    truthSafe: { en: "It was a scam — refusing to read out your card details stopped the loss.", zh: "这是骗局——拒绝念出卡片信息，止住了损失。" },
  },
  {
    answer: "scam", risk: 320,
    title: { en: "Damaged in Transit, Click to Claim", zh: "运损理赔，点此领取" },
    chan: { en: "SMS + link", zh: "短信 + 链接" },
    sender: { en: "Sender — <b>1069-0021-883</b>, posing as a marketplace claims line", zh: "发件人 — <b>1069-0021-883</b>，冒充平台理赔通道" },
    text: { en: "[Order Service] Your item #YT2207715 was reported damaged in transit. You are owed ¥320 compensation.\nFile your claim here: http://claim-back-2024.top/y\nEnter your card and SMS code to receive the funds today.", zh: "【订单服务】您的商品 #YT2207715 被报运输途中损坏，可获赔 ¥320。\n请在此提交理赔：http://claim-back-2024.top/y\n填写卡号与短信验证码，今日到账。" },
    flags: [ { en: "Small, believable amount — low enough that you don't think twice.", zh: "金额小而可信——小到让你懒得多想。" },
             { en: "A claim page that wants your card and code is collecting, not paying.", zh: "要卡号和验证码的理赔页，是在收集信息，不是在赔钱。" },
             { en: "An odd top-level domain no real platform would use.", zh: "一个正规平台绝不会用的怪异顶级域名。" } ],
    truthScam: { en: "The ¥320 was bait; the card and code let them take far more.", zh: "那 ¥320 是诱饵；卡号和验证码让他们能拿走多得多的钱。" },
    truthSafe: { en: "It was a scam — a real claim lives inside the platform's own app.", zh: "这是骗局——真理赔在平台自己的 App 里办理。" },
  },
  {
    answer: "scam", risk: 15000,
    title: { en: "VIP Customer, Higher Refund", zh: "VIP 客户的加倍退款" },
    chan: { en: "Phone call + WeChat", zh: "电话 + 微信" },
    sender: { en: "Caller — <b>955-21-887</b>, ‘senior account manager’ for a marketplace", zh: "来电 — <b>955-21-887</b>，自称平台「高级客户经理」" },
    text: { en: "As a VIP, your faulty order #VIP09921 entitles you to an enhanced refund of ¥15,000.\nBecause the amount is large, we must route it through your ‘credit score account’. Add me on WeChat, then transfer ¥3,000 as a one-time ‘good-faith deposit’; it returns with the refund.", zh: "作为 VIP，您的问题订单 #VIP09921 可享加倍退款 ¥15,000。\n因金额较大，需通过您的「信用分账户」中转。请加我微信，先转 ¥3,000 作为一次性「诚意保证金」，将随退款一并退回。" },
    flags: [ { en: "Any ‘deposit’ you must pay to receive a refund is the scam in one line.", zh: "任何要你先付的「保证金」才能拿退款，一句话就是骗局。" },
             { en: "There is no such thing as routing a refund through a ‘credit score account’.", zh: "根本不存在通过「信用分账户」中转退款这种事。" },
             { en: "Flattery (‘VIP’) plus a big number is engineered to switch off caution.", zh: "「VIP」的恭维加上一个大数字，专门用来关掉你的戒心。" } ],
    truthScam: { en: "The ¥3,000 ‘deposit’ is the whole point — it vanishes and so does the ‘manager’.", zh: "那 ¥3,000「保证金」才是全部目的——它一去不回，「经理」也消失了。" },
    truthSafe: { en: "It was a scam — no refund ever asks you to pay first.", zh: "这是骗局——没有哪笔退款会要你先掏钱。" },
  },
  {
    answer: "scam", risk: 300,
    title: { en: "Mechanical Fault, Flight Cancelled", zh: "机械故障，航班取消" },
    chan: { en: "SMS + link", zh: "短信 + 链接" },
    sender: { en: "Sender — <b>1065-7700-2391</b>, claiming to be the airline", zh: "发件人 — <b>1065-7700-2391</b>，自称航空公司" },
    text: { en: "[Airline] Dear passenger, flight HU7382 on 26 Jun has been CANCELLED due to a mechanical fault.\nYou are entitled to ¥300 delay compensation and a free rebooking.\nDo NOT use the official app — process here with our agent: http://airline-refund-fast.cn/rb", zh: "【航司】尊敬的旅客，您 6 月 26 日 HU7382 航班因机械故障已取消。\n您可获 ¥300 延误补偿及免费改签。\n请勿使用官方 App，通过我们专员办理：http://airline-refund-fast.cn/rb" },
    flags: [ { en: "“Don't use the official app” is the tell — they fear the real channel.", zh: "「别用官方 App」就是破绽——他们怕的正是官方渠道。" },
             { en: "A small fixed ‘compensation’ is dangled to start a card-harvesting flow.", zh: "用一笔固定小额「补偿」开场，引你进入套取卡信息的流程。" },
             { en: "A fake refund domain instead of the airline's verified site.", zh: "一个假退款域名，而非航司的官方认证网站。" } ],
    truthScam: { en: "Real cancellations are handled in the airline's own app or hotline — never a side link.", zh: "真取消由航司自家 App 或热线处理——绝不靠一个旁门链接。" },
    truthSafe: { en: "It was a scam — checking the flight in the official app proved it.", zh: "这是骗局——在官方 App 里查一下航班便见分晓。" },
  },
  {
    answer: "scam", risk: 5200,
    title: { en: "Weather Delay, Add the Agent", zh: "天气延误，请加专员" },
    chan: { en: "Phone call + SMS", zh: "电话 + 短信" },
    sender: { en: "Caller — <b>+00 28 8821 0036</b>, ‘rebooking service’ quoting your itinerary", zh: "来电 — <b>+00 28 8821 0036</b>，「改签专员」并报出你的行程" },
    text: { en: "Ms. Mei, your flight CA1947 tomorrow is delayed by weather; we can rebook you free and pay ¥300 compensation.\nTo verify your account for the refund, provide your bank card number and the code I'll send.\nI already have your name, ID tail, and flight — that proves I'm real, yes?", zh: "梅女士，您明天 CA1947 航班因天气延误，我们可免费改签并赔付 ¥300。\n为核验账户以便退款，请提供您的银行卡号及我发的验证码。\n我已掌握您姓名、身份证尾号和航班，这就证明我是正规的，对吧？" },
    flags: [ { en: "Knowing your itinerary is leaked data, never proof of legitimacy.", zh: "能报出行程是数据泄露，绝不是正规的证明。" },
             { en: "Card number plus code for a ‘refund’ — money flows out, not in.", zh: "为「退款」要卡号加验证码——钱是流出，不是流入。" },
             { en: "Weather delays don't pay fixed cash; they offer rebooking, not bank-card ‘verification’.", zh: "天气延误不赔固定现金，只提供改签，更不需要银行卡「核验」。" } ],
    truthScam: { en: "The leak made the call convincing; the card and code would have emptied the account.", zh: "泄露的信息让电话显得可信；卡号和验证码则会掏空账户。" },
    truthSafe: { en: "It was a scam — hanging up and using the airline hotline was the right move.", zh: "这是骗局——挂断、改用航司官方热线，是对的。" },
  },
  {
    answer: "scam", risk: 880,
    title: { en: "Claim Your ¥300 Delay Payout", zh: "领取你的延误补偿" },
    chan: { en: "App notification + link", zh: "App 推送 + 链接" },
    sender: { en: "Sender — a push styled like a <b>travel-booking app</b>, link inside", zh: "发件人 — 一条仿冒<b>某出行 App</b> 样式的推送，内含链接" },
    text: { en: "Your flight MU5103 was delayed over 4 hours. You qualify for ¥300 delay insurance.\nTap to claim before it expires tonight: http://delay-pay.icu/claim\nEnter your card and pay a ¥1 ‘activation’ then the payout releases.", zh: "您的 MU5103 航班延误超 4 小时，可领 ¥300 延误险理赔。\n今晚前点击领取，逾期作废：http://delay-pay.icu/claim\n填写卡号并支付 ¥1「激活费」，理赔即刻放款。" },
    flags: [ { en: "A ¥1 ‘activation fee’ is there to capture your card on a payment page.", zh: "¥1「激活费」的目的，是在付款页抓取你的卡。" },
             { en: "Real delay insurance pays into the channel you bought it through — no new card needed.", zh: "真延误险按你投保的渠道赔付——无需新填卡号。" },
             { en: "A throwaway domain mimicking the app you trust.", zh: "一个仿冒你信任 App 的临时域名。" } ],
    truthScam: { en: "The ¥1 trick normalizes paying; the card details were the real harvest.", zh: "¥1 的把戏让你习惯付款；真正被收割的是卡片信息。" },
    truthSafe: { en: "It was a scam — genuine claims appear inside the booking app, not a side page.", zh: "这是骗局——真理赔在出行 App 内办理，不在旁门页面。" },
  },
  {
    answer: "scam", risk: 9600,
    title: { en: "Train Cancelled, Refund Verification", zh: "列车停运，退票核验" },
    chan: { en: "SMS + phone call", zh: "短信 + 电话" },
    sender: { en: "Sender — <b>12306-9981</b> look-alike, then a callback", zh: "发件人 — 仿冒 <b>12306-9981</b>，随后回拨电话" },
    text: { en: "[Rail] Train G1372 on 25 Jun is cancelled. Auto-refund failed — manual handling required.\nCall 400-066-1239 to verify. The agent will ask for your bank card and the SMS code to ‘return’ ¥9,600 of fares for your group booking.", zh: "【铁路】6 月 25 日 G1372 次列车停运。自动退票失败，需人工处理。\n请拨 400-066-1239 核验。专员将索要您的银行卡及短信验证码，以「退回」您团体订票的 ¥9,600 票款。" },
    flags: [ { en: "Rail refunds return automatically to the original payment — no call, no card reading.", zh: "铁路退票原路自动退回——不需要打电话、不需要念卡号。" },
             { en: "A large group-fare number is used to make the loss feel urgent and worth chasing.", zh: "用一个大额团体票款，让损失显得紧迫、值得去追。" },
             { en: "Asking for card + code to ‘return’ money is the reverse of how refunds work.", zh: "要卡号加验证码来「退回」钱，与退款逻辑恰好相反。" } ],
    truthScam: { en: "There is no manual refund desk that needs your code. The call was the trap.", zh: "根本没有需要你验证码的人工退票台。那通电话就是陷阱。" },
    truthSafe: { en: "It was a scam — the real rail app shows refunds with no phone call at all.", zh: "这是骗局——真铁路 App 里退票根本无需任何电话。" },
  },
  {
    answer: "scam", risk: 2100,
    title: { en: "Cheaper Rebooking Off-App", zh: "脱离 App 的低价改签" },
    chan: { en: "WeChat", zh: "微信" },
    sender: { en: "Chat — <b>“VIP Rebooking Agent”</b>, who messaged you after a search", zh: "聊天 — <b>「VIP 改签专员」</b>，在你查询后主动私信" },
    text: { en: "I saw you're rebooking flight ZH9911. The app charges a change fee — I can do it ¥2,100 cheaper through our internal channel.\nDon't book in the official app, it'll lock the fare. Send the ¥2,100 difference to my account first and I'll issue your new ticket.", zh: "看到您要改签 ZH9911 航班。App 里要收改签费——走我们内部通道能便宜 ¥2,100。\n别在官方 App 下单，会锁价。先把 ¥2,100 差价转到我账户，我给您出新票。" },
    flags: [ { en: "“Pay me first, off the official app” is a textbook off-platform trap.", zh: "「先转给我、绕开官方 App」是典型的脱离平台陷阱。" },
             { en: "An ‘internal channel’ cheaper than the airline itself doesn't exist.", zh: "比航司自己还便宜的「内部通道」根本不存在。" },
             { en: "An unsolicited agent who DMs you after a search is fishing, not helping.", zh: "查询后主动私信你的「专员」是在钓鱼，不是在帮忙。" } ],
    truthScam: { en: "You pay, no ticket comes, and the ‘agent’ blocks you. Off-app means no recourse.", zh: "你付了钱，票没出，「专员」拉黑你。脱离平台就意味着无处追讨。" },
    truthSafe: { en: "It was a scam — rebooking inside the official app was the safe path.", zh: "这是骗局——在官方 App 内改签才是安全的路。" },
  },
  {
    answer: "scam", risk: 450,
    title: { en: "Refund the Cancelled Leg", zh: "退掉取消的那一程" },
    chan: { en: "SMS + link", zh: "短信 + 链接" },
    sender: { en: "Sender — <b>106-5588-7102</b>, ‘airline refund center’", zh: "发件人 — <b>106-5588-7102</b>，「航司退款中心」" },
    text: { en: "[Airline] Passenger Zhang, your return leg PN2204 was cancelled. Refundable: ¥450.\nVerify your bank card to receive it: http://air-refund-center.vip/r\nProcessing closes in 60 minutes.", zh: "【航司】张旅客，您的回程 PN2204 已取消，可退 ¥450。\n请核验银行卡以接收：http://air-refund-center.vip/r\n办理通道 60 分钟后关闭。" },
    flags: [ { en: "“Verify your bank card to receive” — receiving never needs verification.", zh: "「核验银行卡才能接收」——收款从不需要核验。" },
             { en: "A 60-minute window is artificial pressure, not airline policy.", zh: "60 分钟时限是人为施压，不是航司规定。" },
             { en: "A flashy .vip domain stands in for the real airline site.", zh: "一个花哨的 .vip 域名冒充航司真网站。" } ],
    truthScam: { en: "A cancelled-leg refund auto-returns to the original card. The link only takes.", zh: "取消航段的退款原路退回原卡。那个链接只会拿走东西。" },
    truthSafe: { en: "It was a scam — letting the timer run out cost you nothing.", zh: "这是骗局——任由倒计时走完，你分文未失。" },
  },
  {
    answer: "scam", risk: 18000,
    title: { en: "Group Booking Gone Wrong", zh: "团体订票出岔子" },
    chan: { en: "Work IM", zh: "办公 IM" },
    sender: { en: "Message — <b>an account impersonating your travel admin</b> in a work group", zh: "消息 — 工作群里 <b>一个冒充行政差旅对接人</b> 的账号" },
    text: { en: "Team, the airline cancelled our group flight XL3300 (12 staff). To re-secure seats today they need the booking deposit re-paid: ¥18,000 to this corporate account, refundable on the next invoice.\nPlease transfer now, I'm in a meeting and can't.", zh: "各位，航司取消了我们 XL3300 团体航班（12 人）。要今天重新锁座，需重付订座押金：¥18,000 到这个对公账户，下次开票时退回。\n请现在转账，我在开会无法操作。" },
    flags: [ { en: "An ‘I'm in a meeting, you transfer’ urgency mimics a boss-impersonation scam.", zh: "「我在开会、你来转账」的紧迫感，是典型的冒充领导骗局。" },
             { en: "Airlines don't make you re-pay a deposit to a private corporate account.", zh: "航司不会要你把押金重付到一个陌生对公账户。" },
             { en: "‘Refundable next invoice’ is a promise no one will keep.", zh: "「下次开票退回」是一句无人会兑现的承诺。" } ],
    truthScam: { en: "The account was spoofed; the ¥18,000 lands with a stranger and the seats never existed.", zh: "账号是仿冒的；¥18,000 落入陌生人手中，座位从未存在。" },
    truthSafe: { en: "It was a scam — confirming with the admin by voice would have exposed it.", zh: "这是骗局——当面或语音向对接人核实一句即可戳穿。" },
  },
  {
    answer: "scam", risk: 360,
    title: { en: "Parcel Lost, Triple Comp", zh: "包裹丢件，三倍赔付" },
    chan: { en: "SMS + link", zh: "短信 + 链接" },
    sender: { en: "Sender — <b>1069-8800-553</b>, posing as a courier", zh: "发件人 — <b>1069-8800-553</b>，冒充快递公司" },
    text: { en: "[Courier] Your parcel SF1102998877 was lost in transit. We will pay TRIPLE the value: ¥360.\nClaim here within 24h: http://express-claim.cn/sf\nLog in with your card and the code to receive your compensation.", zh: "【快递】您的包裹 SF1102998877 运输途中丢失。我们将按三倍货值赔付：¥360。\n请于 24 小时内领取：http://express-claim.cn/sf\n用卡号和验证码登录以接收赔偿。" },
    flags: [ { en: "“Triple compensation” is the lure carriers never actually offer.", zh: "「三倍赔付」是快递从不真正提供的诱饵。" },
             { en: "Real lost-parcel claims go through the courier app, not a card-login page.", zh: "真丢件理赔走快递官方 App，不是一个填卡登录页。" },
             { en: "Knowing your tracking number proves a leak, not a legitimate claim.", zh: "能报出运单号是数据泄露，不是正规理赔。" } ],
    truthScam: { en: "The card and code login was the entire heist; the ¥360 was never real.", zh: "那个填卡登录就是整场盗窃；¥360 从来都不存在。" },
    truthSafe: { en: "It was a scam — a genuine claim is handled in the courier's own app.", zh: "这是骗局——真理赔在快递自己的 App 里办。" },
  },
  {
    answer: "scam", risk: 240,
    title: { en: "Held at Customs, Pay a Fee", zh: "海关扣留，需缴费" },
    chan: { en: "SMS + link", zh: "短信 + 链接" },
    sender: { en: "Sender — <b>+00 852 5500 21</b>, claiming a customs hold", zh: "发件人 — <b>+00 852 5500 21</b>，称海关扣件" },
    text: { en: "[Logistics] Your international parcel EX9920113 is held at customs. A clearance fee of ¥240 is due before release.\nPay now or it returns to sender: http://customs-clearance-pay.top/ex\nYour tracking number above confirms this is your package.", zh: "【物流】您的国际包裹 EX9920113 被海关扣留，放行前需缴清关费 ¥240。\n请立即缴费，否则原路退回：http://customs-clearance-pay.top/ex\n上方运单号即可证明是您的包裹。" },
    flags: [ { en: "Customs collects duties through official channels, never an SMS pay-link.", zh: "海关通过官方渠道征税，绝不会用短信里的缴费链接。" },
             { en: "“Pay now or it's returned” pressures you past verifying anything.", zh: "「不缴就退回」逼你越过任何核实。" },
             { en: "Quoting your tracking number is leaked data dressed up as proof.", zh: "报出运单号是把泄露的数据包装成证据。" } ],
    truthScam: { en: "There is no fee and no hold — the link is a payment page for the thief.", zh: "没有什么费用、也没有扣件——那个链接是给骗子的付款页。" },
    truthSafe: { en: "It was a scam — verifying with the courier directly showed no such hold.", zh: "这是骗局——直接找快递核实，根本没有这种扣件。" },
  },
  {
    answer: "scam", risk: 600,
    title: { en: "The Courier's Refund Code", zh: "快递员的退款码" },
    chan: { en: "Phone call + QR code", zh: "电话 + 二维码" },
    sender: { en: "Caller — <b>+00 20 3344 7781</b>, a ‘courier’ who damaged your box", zh: "来电 — <b>+00 20 3344 7781</b>，自称弄坏你包裹的「快递员」" },
    text: { en: "Sorry sir, I dropped your parcel JT5521 and the contents broke. Our company will refund ¥600.\nI'm sending a refund QR to your chat — scan it and enter your payment password so the system can push the money to you.\nDo it now while I'm on the line.", zh: "先生抱歉，我把您的包裹 JT5521 摔了，里面东西碎了。公司会赔 ¥600。\n我给您发个退款二维码——扫一下、输入支付密码，系统就能把钱推给您。\n趁我在线，现在就弄。" },
    flags: [ { en: "Scanning a code and entering your payment password sends money out, not in.", zh: "扫码再输支付密码，是把钱转出，不是收进。" },
             { en: "A polite, apologetic ‘courier’ rushing you while ‘on the line’ is social engineering.", zh: "一个礼貌道歉、还「在线」催你的「快递员」是社会工程手段。" },
             { en: "Real damage claims are logged in the app, not settled by a live QR scan.", zh: "真破损理赔在 App 内登记，不靠现场扫一个二维码解决。" } ],
    truthScam: { en: "The QR was a payment request; the password authorized ¥600 straight to the scammer.", zh: "那二维码是付款请求；密码一输，¥600 直接到了骗子手里。" },
    truthSafe: { en: "It was a scam — refusing to scan kept the money yours.", zh: "这是骗局——拒绝扫码，钱还是你的。" },
  },
  {
    answer: "scam", risk: 1200,
    title: { en: "Damaged Goods, Scan to Claim", zh: "货物损坏，扫码理赔" },
    chan: { en: "WeChat", zh: "微信" },
    sender: { en: "Chat — <b>“Logistics Claims · Auto-payout”</b>, added you with your name", zh: "聊天 — <b>「物流理赔·自动放款」</b>，报着你名字加了你" },
    text: { en: "Hello Mr. Chen, parcel ZTO660912 arrived crushed at our hub. Compensation approved: ¥1,200.\nScan this claim QR and follow the steps; if it asks you to ‘confirm receipt’ with a transfer, that's just the system reserving your slot — it comes back instantly.", zh: "陈先生您好，包裹 ZTO660912 在我们中转站被压坏。已核准赔付 ¥1,200。\n请扫这个理赔二维码并按步骤操作；若提示需转账「确认收款」，那只是系统占位，会立刻退回。" },
    flags: [ { en: "“Transfer to confirm receipt, it comes back” is a flat contradiction — receiving needs no payment.", zh: "「转账确认收款、马上退回」自相矛盾——收款不需要付款。" },
             { en: "A QR that routes you into a transfer is collecting money, not paying it.", zh: "把你导向转账的二维码是在收钱，不是在赔钱。" },
             { en: "A stranger who adds you using your name is using leaked order data.", zh: "用你名字加你的陌生人，靠的是泄露的订单数据。" } ],
    truthScam: { en: "The ‘confirm receipt’ transfer was the loss itself — nothing ever comes back.", zh: "「确认收款」那笔转账本身就是损失——什么都不会退回。" },
    truthSafe: { en: "It was a scam — a real payout never asks you to send money first.", zh: "这是骗局——真赔付绝不会让你先转钱。" },
  },
  {
    answer: "scam", risk: 30000,
    title: { en: "High-Value Parcel, Bank Verification", zh: "高值包裹，银行核验" },
    chan: { en: "Phone call + SMS", zh: "电话 + 短信" },
    sender: { en: "Caller — <b>+00 10 6677 8890</b>, ‘insurance claims’ for a lost parcel", zh: "来电 — <b>+00 10 6677 8890</b>，丢件「保险理赔部」" },
    text: { en: "Ms. Guo, the declared value of your lost parcel EMS33120 was ¥30,000 — a large insured claim.\nTo release it, our bank partner must verify your account: read me the card number and each code as it arrives. We'll pre-deposit ¥1 to ‘link’ the account, then the ¥30,000 follows.\nThis must be completed in one call for the audit.", zh: "郭女士，您丢失包裹 EMS33120 申报价值 ¥30,000，属大额投保理赔。\n放款前，我们的合作银行需核验您账户：请念出卡号，并把每条到达的验证码报给我。我们先存入 ¥1「关联」账户，随后 ¥30,000 即到。\n为合规审计，须在本次通话内一次完成。" },
    flags: [ { en: "Reading out card number and every code in one call is total account surrender.", zh: "在一通电话里念出卡号和每个验证码，等于交出整个账户。" },
             { en: "A ¥30,000 figure is set high to make the ‘verification’ feel worth the risk.", zh: "¥30,000 的数字定得很高，好让「核验」显得值得冒险。" },
             { en: "“Must finish in one call for the audit” blocks you from pausing to check.", zh: "「为审计须一次通话完成」堵住了你停下来核实的机会。" } ],
    truthScam: { en: "Each code authorized a transfer out. The ¥1 was theater; the ¥30,000 only ever flowed the wrong way.", zh: "每个验证码都批准了一笔转出。¥1 是做戏；¥30,000 从头到尾只朝着错的方向流。" },
    truthSafe: { en: "It was a scam — hanging up and calling the courier's official line ended it.", zh: "这是骗局——挂断、改拨快递官方电话，便就此终结。" },
  },
  {
    answer: "scam", risk: 48000,
    title: { en: "The Boss on a New Number", zh: "换了号码的「老板」" },
    chan: { en: "WeChat", zh: "微信" },
    sender: { en: "WeChat — <b>a new contact using your GM's name and photo</b>", zh: "微信 — <b>用你总经理姓名和头像的陌生新号</b>" },
    text: { en: "Hi Lin, I'm using my private account today — don't reply on the work group.\nWe're closing a deal and the supplier needs a deposit before 5pm. I'm in a meeting and can't transfer.\nSend ¥48,000 to the account I'll give you now. I'll sign the reimbursement tomorrow. Keep this quiet.", zh: "小林，我今天用私人号，别在工作群里回。\n我们在谈一个单子，供应商下午五点前要打一笔定金。我在开会不方便转账。\n你先把 4.8 万打到我等下发的账号，明天我签字给你报销。先别声张。" },
    flags: [ { en: "A “boss” suddenly on an unverified new account, avoiding the work group.", zh: "「老板」突然换陌生新号，还刻意避开工作群。" },
             { en: "Urgency plus secrecy — “before 5pm” and “keep this quiet” stop you from checking.", zh: "又急又要保密——「五点前」「先别声张」让你来不及核实。" },
             { en: "Asks you to front the money to a stranger's account, reimbursement “tomorrow”.", zh: "让你垫钱打给陌生账户，报销永远是「明天」。" } ],
    truthScam: { en: "The impersonation con. One phone call to the boss's real number ends it.", zh: "冒充领导骗局。给老板真号码打一个电话，骗局就破。" },
    truthSafe: { en: "It was a scam — you stopped a wire that no one would have reimbursed.", zh: "这是骗局——你拦下了一笔永远没人报销的转账。" },
  },
  {
    answer: "scam", risk: 12000,
    title: { en: "Cards for the Whole Department", zh: "全科室的购物卡" },
    chan: { en: "Work IM", zh: "办公 IM" },
    sender: { en: "Work IM — <b>“Director Zhao”</b>, a freshly created account", zh: "办公 IM — <b>「赵主任」</b>，刚注册的账号" },
    text: { en: "You free? I need a favour and it's a bit urgent.\nA client's child is getting married, I want to gift shopping cards but I'm tied up.\nBuy ¥12,000 in e-gift cards, scratch the codes and photograph them for me. I'll square it with finance after.", zh: "在吗？帮我个忙，有点急。\n一个客户家孩子结婚，我想送购物卡，可我脱不开身。\n你去买 1.2 万的电子购物卡，把卡密刮开拍给我，回头我跟财务对账。" },
    flags: [ { en: "“Leader” asks for gift-card codes — codes are cash that can't be traced back.", zh: "「领导」索要购物卡卡密——卡密就是追不回的现金。" },
             { en: "A favour framed as urgent so you skip verifying who's really asking.", zh: "用「急」包装的请托，让你跳过核实对方是谁。" },
             { en: "Photograph the codes — the instant you send them, the money is gone.", zh: "要你拍下卡密——一发出去，钱就没了。" } ],
    truthScam: { en: "Gift-card fraud. No real director settles a client gift through a junior's codes.", zh: "购物卡诈骗。真主任不会让下属刮卡密去送客户礼。" },
    truthSafe: { en: "It was a scam — refusing to scratch those codes saved ¥12,000.", zh: "这是骗局——拒绝刮开卡密，保住了一万二。" },
  },
  {
    answer: "scam", risk: 90000,
    title: { en: "The Video Call That Kept Freezing", zh: "总在卡顿的视频通话" },
    chan: { en: "Video call", zh: "视频通话" },
    sender: { en: "Video call — <b>a face that looks like your CFO</b>, audio out of sync", zh: "视频通话 — <b>一张酷似你财务总监的脸</b>，声画不同步" },
    text: { en: "[The CFO's face appears, but the lips lag and the picture stutters.]\n“Sorry, bad signal — can you hear me? Good. We need to pay an acquisition fee today, the lawyer is waiting.\nDon't put it in the group, it's confidential. I'll drop the account in chat. ¥90,000, do it now and freeze for a second—”\n[Call drops before you can ask anything.]", zh: "【「财务总监」的脸出现，但嘴型对不上，画面一卡一卡。】\n「信号不好，能听见吗？好。我们今天要付一笔并购费，律师在等。\n别发群里，保密。账号我打在聊天框里。九万，现在就转，等一下别动——」\n【你还没来得及问，通话就掉线了。】" },
    flags: [ { en: "A deepfake tell — lips out of sync, picture freezing, call dropping to dodge questions.", zh: "换脸破绽——嘴型不同步、画面卡顿、一被追问就掉线。" },
             { en: "Confidential, urgent, “don't put it in the group” — isolates you from verification.", zh: "保密、紧急、「别发群」——把你和核实渠道隔开。" },
             { en: "An account number arrives in chat right after the “face” appears.", zh: "「人脸」一出现，账号紧接着就甩进聊天框。" } ],
    truthScam: { en: "AI face-swap fraud. A real video call survives a simple question; a fake one drops.", zh: "AI 换脸诈骗。真视频经得起一个问题；假的会掉线。" },
    truthSafe: { en: "It was a scam — you didn't trust the glitchy face, and ¥90,000 stayed put.", zh: "这是骗局——你没信那张卡顿的脸，九万原地未动。" },
  },
  {
    answer: "scam", risk: 30000,
    title: { en: "Mum, I'm in Trouble", zh: "妈，我出事了" },
    chan: { en: "Phone call", zh: "电话" },
    sender: { en: "Phone call — <b>a sobbing voice that sounds like your son</b>", zh: "电话 — <b>一个像你儿子的、带哭腔的声音</b>" },
    text: { en: "[A young man's voice, crying, words rushed.]\n“Mum, it's me — don't hang up. I hit someone with the car, the police have me. I need ¥30,000 for the settlement now or they'll detain me.\nI can't talk long, an officer will message you the account. Please, don't tell Dad yet.”", zh: "【一个年轻男声，带着哭腔，语速很快。】\n「妈，是我，别挂。我开车撞了人，被警察扣下了。现在要 3 万块私了，不然要拘留我。\n我不能多说，等一下「警官」会把账号发给你。求你了，先别告诉爸。」" },
    flags: [ { en: "A cloned voice plus a crisis you can't verify — the classic “your child is in danger” hook.", zh: "克隆的声音加上无法核实的危机——典型「孩子出事了」钩子。" },
             { en: "“Don't tell Dad,” “can't talk long” — cuts off everyone who could confirm.", zh: "「先别告诉爸」「不能多说」——切断所有能核实的人。" },
             { en: "A stranger posing as an “officer” will send the account — police never collect settlements this way.", zh: "陌生「警官」要发账号——警方从不这样收「私了款」。" } ],
    truthScam: { en: "Voice-cloning fraud. Hang up and call your child's own number — that breaks it every time.", zh: "拟声诈骗。挂断，拨孩子本人的号——每次都能戳破。" },
    truthSafe: { en: "It was a scam — you called your son back, he was fine, and ¥30,000 was saved.", zh: "这是骗局——你回拨儿子，他好好的，三万保住了。" },
  },
  {
    answer: "scam", risk: 5000,
    title: { en: "Lin's Account, Asking Quietly", zh: "被盗的小林账号" },
    chan: { en: "WeChat", zh: "微信" },
    sender: { en: "WeChat — <b>your friend Lin's account</b>, but the tone is off", zh: "微信 — <b>好友小林的账号</b>，但语气不太对" },
    text: { en: "Hey, you around? Bit awkward to ask.\nMy phone banking is locked till tomorrow and I have to pay a supplier tonight. Could you lend me ¥5,000? I'll send it straight back in the morning.\nDon't call me, I'm in a meeting — just transfer to this account, it's my cousin's.", zh: "在吗？有点不好意思开口。\n我手机银行被锁了，要明天才能解，今晚得给供应商付款。能不能先借我五千？明早马上还。\n别打电话，我在开会——直接转这个账号就行，是我表弟的。" },
    flags: [ { en: "A friend's account asking for money while refusing a phone call — a hijacked-account tell.", zh: "好友账号开口借钱，却拒接电话——盗号的典型迹象。" },
             { en: "Pay “to a third party's account, it's my cousin's” — money leaves the friend entirely.", zh: "让你转到「第三方账号，是我表弟的」——钱根本不进朋友手里。" },
             { en: "Reason it can't wait and can't be verified by voice — engineered to rush you.", zh: "理由既等不得、又不能语音核实——专为催你而设。" } ],
    truthScam: { en: "Account-takeover fraud. A 30-second voice or video call to the real friend ends it.", zh: "盗号诈骗。给真朋友打 30 秒语音或视频，骗局就破。" },
    truthSafe: { en: "It was a scam — you voice-called Lin, the account was hacked, ¥5,000 stayed safe.", zh: "这是骗局——你语音呼叫小林，号是被盗的，五千没丢。" },
  },
  {
    answer: "scam", risk: 800,
    title: { en: "I Changed My Number, Save This One", zh: "我换号了，存一下" },
    chan: { en: "SMS", zh: "短信" },
    sender: { en: "SMS — <b>an unknown number</b> claiming to be an old friend", zh: "短信 — <b>一个陌生号码</b>，自称是老朋友" },
    text: { en: "Hi! I changed my number, save this as my new one and delete the old.\nGood timing actually — I'm setting up a small online shop and short ¥800 to release the stock. Can you help me out today? I'll repay this weekend with a little extra for the trouble.", zh: "嗨！我换号码了，把这个存成我的新号，旧的删了吧。\n正好——我在弄个小网店，差 800 块才能放货。今天能帮我垫一下吗？周末连本带利还你，麻烦你了多给点。" },
    flags: [ { en: "“I changed my number” from a stranger, sliding straight into a money request.", zh: "陌生号「我换号了」，紧接着就要钱。" },
             { en: "It never proves who it is — no shared memory, just a name and a need.", zh: "从不证明自己是谁——没有共同记忆，只有一个名字和一个需求。" },
             { en: "Small “help me out today” amount, sweetened with “a little extra” to lower your guard.", zh: "小额「今天先垫一下」，再用「多给点」降低你的戒心。" } ],
    truthScam: { en: "The new-number con. Ask one thing only the real friend would know — silence is the answer.", zh: "换号骗局。问一件只有真朋友知道的事——沉默就是答案。" },
    truthSafe: { en: "It was a scam — you asked a private question, got no answer, and kept your money.", zh: "这是骗局——你问了个私密问题，对方答不上来，钱保住了。" },
  },
  {
    answer: "scam", risk: 60000,
    title: { en: "Front the Travel for the Chairman", zh: "替董事长垫差旅" },
    chan: { en: "WeChat", zh: "微信" },
    sender: { en: "WeChat — <b>“Chairman Wang”</b> on a personal account, profile half-built", zh: "微信 — <b>「王董」</b>个人号，资料半空" },
    text: { en: "Xiao Mei, I've added you on my personal account, the work phone's flat.\nI'm receiving a key client tonight — booking, gifts, the lot. Front ¥60,000 from your card first; finance will reimburse you in full Monday, I've told them.\nMove fast, the client lands in an hour. Send a screenshot when it's done.", zh: "小美，我用私人号加你了，工作手机没电。\n今晚要接待一个重要客户，订房、送礼都要花钱。你先用自己卡垫 6 万，周一财务全额报销，我跟他们打过招呼了。\n抓紧，客户一小时后落地。转完截图给我。" },
    flags: [ { en: "Top executive, personal account, “work phone's flat” — a story to explain the wrong channel.", zh: "高管、私人号、「工作手机没电」——为「换了渠道」编的理由。" },
             { en: "“Front it from your own card, finance reimburses Monday” — the reimbursement never comes.", zh: "「你先用自己卡垫，周一报销」——那笔报销永远不会到。" },
             { en: "A landing client and a one-hour clock manufacture pressure to skip checks.", zh: "落地的客户和一小时的倒计时，制造跳过核实的压力。" } ],
    truthScam: { en: "Boss-impersonation reimbursement con. Verify on the channel you already trust, not the new one.", zh: "冒充领导报销骗局。用你本就信任的旧渠道核实，别信新号。" },
    truthSafe: { en: "It was a scam — you checked with the real chairman and ¥60,000 never left your card.", zh: "这是骗局——你向真王董核实，六万从未离开你的卡。" },
  },
  {
    answer: "scam", risk: 20000,
    title: { en: "Grandpa, It's Me — Quietly", zh: "爷爷，是我——小点声" },
    chan: { en: "Phone call", zh: "电话" },
    sender: { en: "Phone call — <b>a voice that sounds like your grandson</b>, then a “teacher”", zh: "电话 — <b>像你孙子的声音</b>，随后换成「老师」" },
    text: { en: "[A young voice, muffled, then handed to an adult.]\n“Grandpa, it's me, keep your voice down — I got into a fight at school and hurt a classmate. The teacher's here.”\n[A stern adult takes the phone:] “This is his head teacher. To avoid a police record we need ¥20,000 for the family today. Don't alarm his parents, I'll handle them. Send it to this account now.”", zh: "【一个年轻声音，闷闷的，随后递给一个大人。】\n「爷爷，是我，小点声——我在学校打架，把同学打伤了，老师在旁边。」\n【一个严厉的大人接过电话：】「我是他班主任。为了不留案底，今天得给对方家长 2 万。别惊动他父母，我来处理。马上转这个账号。」" },
    flags: [ { en: "A cloned young voice hands off to an “authority” who demands money fast.", zh: "克隆的少年声转给一个「权威」，立刻催着要钱。" },
             { en: "“Don't alarm his parents” isolates the elderly target from anyone who'd check.", zh: "「别惊动他父母」，把老人和能核实的人隔开。" },
             { en: "A school settles nothing by wiring cash to a personal account same-day.", zh: "学校绝不会当天把现金转进私人账户来「了事」。" } ],
    truthScam: { en: "Voice-clone fraud targeting the elderly. One call to the parents collapses it.", zh: "针对老人的拟声诈骗。给孩子父母打一个电话，骗局就垮。" },
    truthSafe: { en: "It was a scam — Grandpa phoned the parents, the boy was in class, ¥20,000 stayed safe.", zh: "这是骗局——爷爷打给孩子父母，孙子正在上课，两万没丢。" },
  },
  {
    answer: "scam", risk: 6800,
    title: { en: "Lucky Viewer Number 88", zh: "幸运观众 88 号" },
    chan: { en: "App notification", zh: "应用通知" },
    sender: { en: "App notification — <b>“Live Show Prize Centre”</b> from a stream you watched", zh: "应用通知 — <b>「直播中奖中心」</b>，来自你看过的一场直播" },
    text: { en: "Congratulations! You're lucky viewer #88 and have won a ¥6,800 cash prize.\nTo release it, our system requires a refundable ¥680 “personal income tax deposit” first — it returns with your winnings within 24 hours.\nClaim here: http://live-prize-claim88.cn/get", zh: "恭喜！您是 88 号幸运观众，赢得 6800 元现金大奖。\n领取前，系统需先收取可退还的 680 元「个税保证金」，将随奖金在 24 小时内一并返还。\n点此领取：http://live-prize-claim88.cn/get" },
    flags: [ { en: "A prize you must pay to receive — real winnings never require money up front.", zh: "要先交钱才能领的奖——真奖金从不需要你先付费。" },
             { en: "“Refundable tax deposit” is fiction; tax is withheld, never collected from you first.", zh: "「可退还个税保证金」是编造的；税是代扣，绝不会先向你收取。" },
             { en: "A look-alike claim link, not any official channel.", zh: "一个仿冒领奖链接，并非任何官方渠道。" } ],
    truthScam: { en: "Prize-deposit fraud. The “deposit” is the whole scam — it never comes back.", zh: "中奖保证金诈骗。那笔「保证金」就是骗局本身——永不返还。" },
    truthSafe: { en: "It was a scam — you didn't pay to “unlock” a prize that never existed.", zh: "这是骗局——你没为「解锁」一个根本不存在的奖去付钱。" },
  },
  {
    answer: "scam", risk: 9900,
    title: { en: "Enter Your Card to Claim", zh: "输卡号才能领" },
    chan: { en: "WeChat", zh: "微信" },
    sender: { en: "WeChat — <b>a red-packet card</b> forwarded into a group", zh: "微信 — <b>一张红包卡片</b>，转发进群里" },
    text: { en: "🧧 You've received a ¥200 anniversary red packet!\nTap to open → then enter your card number, expiry, and the 3-digit code on the back to receive the cash directly to your bank card.\n(The packet expires in 10 minutes — claim before it's gone!)\nhttp://hongbao-claim-gift.cn/open", zh: "🧧 您收到一个 200 元周年庆红包！\n点击打开 → 然后填写您的银行卡号、有效期和卡背三位数，现金将直接打入您的银行卡。\n（红包 10 分钟后过期，过期不候！）\nhttp://hongbao-claim-gift.cn/open" },
    flags: [ { en: "To “receive” money it wants your full card number, expiry, and CVV — that's for taking, not giving.", zh: "「领钱」却要你的完整卡号、有效期和卡背三位数——这是用来扣款的，不是发钱的。" },
             { en: "Real red packets land in your wallet balance instantly; they never ask for card details.", zh: "真红包直接进钱包余额，从不索要银行卡信息。" },
             { en: "A 10-minute countdown and an off-platform link push you to act blind.", zh: "10 分钟倒计时加站外链接，逼你蒙头操作。" } ],
    truthScam: { en: "Phishing dressed as a red packet. Card number + CVV is everything a thief needs.", zh: "披着红包外衣的钓鱼。卡号加卡背三位数，正是窃贼要的全部。" },
    truthSafe: { en: "It was a scam — you never typed your card into a “gift,” so nothing was drained.", zh: "这是骗局——你没把卡号填进「红包」，账户分文未失。" },
  },
  {
    answer: "scam", risk: 15000,
    title: { en: "The Refund That Asked for More", zh: "越退越多的「退款」" },
    chan: { en: "Phone call", zh: "电话" },
    sender: { en: "Phone call — <b>“group-buy customer service”</b> about a cancelled order", zh: "电话 — <b>「团购客服」</b>，称要给一笔取消的订单退款" },
    text: { en: "Hello, this is after-sales for the group-buy you joined. Your order was cancelled and we owe you a ¥39 refund.\nOur system can't push it to your account directly, so I'll add you and walk you through a “refund channel.” You'll need to open a lending app and borrow a sum so the refund can be “matched” — don't worry, it cancels out at the end.", zh: "您好，这里是您参加的团购售后。您的订单被取消，我们要退您 39 元。\n系统无法直接退到您账户，我加您微信，带您走「退款通道」。您需要打开一个借贷 App 借出一笔钱，好让退款「对冲」——别担心，最后会两清。" },
    flags: [ { en: "A tiny refund used as bait to start a long “channel” process.", zh: "用一笔小额退款做诱饵，开启冗长的「通道」流程。" },
             { en: "Asking you to take out a loan to “match” a refund — refunds never work this way.", zh: "让你借贷来「对冲」退款——退款从不这样运作。" },
             { en: "Moves you off the platform onto a private chat with screen-share steps.", zh: "把你从平台拉到私聊，按它的指引共享屏幕操作。" } ],
    truthScam: { en: "Refund-bait fraud. The loan you take “to balance it” lands in the scammer's account.", zh: "退款返利诈骗。你「为对冲」借出的钱，进了骗子的账户。" },
    truthSafe: { en: "It was a scam — a real refund goes back the way you paid, never via a loan.", zh: "这是骗局——真退款按原路返回，绝不经由借贷。" },
  },
  {
    answer: "scam", risk: 3000,
    title: { en: "Tasks That Pay You Back", zh: "做任务返你本金" },
    chan: { en: "SMS", zh: "短信" },
    sender: { en: "SMS — <b>955XX-lookalike short code</b> offering part-time rebates", zh: "短信 — <b>仿 955XX 短号</b>，招揽兼职返利" },
    text: { en: "[Part-time] Boost shop ratings from home, ¥80–300 a day. First task pays instantly.\nWarm-up: top up ¥30, get ¥48 back — try it now and see. Bigger “combo tasks” pay more, but you advance the funds first and they return with commission.\nReply 1 to start. http://task-rebate-daily.cn/join", zh: "【兼职】在家做商家好评，日结 80–300。首单秒返。\n试水：充 30 返 48，先试就知道。更大的「连环单」赚更多，但需先垫付本金，连佣金一起返还。\n回复 1 开始。http://task-rebate-daily.cn/join" },
    flags: [ { en: "Tiny first payouts to build trust, then “advance the funds” for bigger tasks.", zh: "先用小额返款建立信任，再让你为大单「垫付本金」。" },
             { en: "“Pay first, it comes back with commission” — the hook of every rebate scam.", zh: "「先垫付，连佣金一起返」——所有刷单返利骗局的钩子。" },
             { en: "Unsolicited high-pay part-time work via SMS with an off-platform link.", zh: "短信主动招揽的高薪兼职，附带站外链接。" } ],
    truthScam: { en: "Rebate (brushing) fraud. The small refunds are bait; the big advance never returns.", zh: "刷单返利诈骗。小额返款是诱饵；大额垫付一去不回。" },
    truthSafe: { en: "It was a scam — you didn't advance the “combo task” money and lost nothing.", zh: "这是骗局——你没为「连环单」垫付，分文未失。" },
  },
  {
    answer: "scam", risk: 500,
    title: { en: "A Friend Sent You a Big Packet", zh: "好友给你发了大红包" },
    chan: { en: "SMS", zh: "短信" },
    sender: { en: "SMS — <b>an unknown number</b> mimicking a social-app alert", zh: "短信 — <b>陌生号码</b>，仿社交应用通知" },
    text: { en: "【Notice】Your friend has sent you a ¥520 cash packet that's about to expire!\nTap to receive: http://red-packet-friend-gift.cn/r?id=88\nLog in with your account and password on the page to credit it instantly.", zh: "【提醒】您的好友给您发了一个 520 元现金红包，即将过期！\n点击领取：http://red-packet-friend-gift.cn/r?id=88\n在页面用您的账号密码登录即可立即到账。" },
    flags: [ { en: "Doesn't name the friend — a real packet shows who and arrives inside the app.", zh: "没说是哪位好友——真红包会显示发送人，且在应用内到账。" },
             { en: "The link asks you to log in with your account and password — that's credential phishing.", zh: "链接要你用账号密码登录——这是盗号钓鱼。" },
             { en: "“About to expire” pressure pushes you to tap before thinking.", zh: "「即将过期」的压力催你不假思索就点。" } ],
    truthScam: { en: "Fake red-packet phishing. The page steals your login, not delivers a gift.", zh: "假红包钓鱼。那个页面偷的是你的登录凭据，而非送你礼物。" },
    truthSafe: { en: "It was a scam — you didn't log in on a stranger's link and your account stayed secure.", zh: "这是骗局——你没在陌生链接上登录，账号安然无恙。" },
  },
  {
    answer: "scam", risk: 2000,
    title: { en: "Spin to Win, Then Pay the Courier", zh: "抽中大奖，先付运费" },
    chan: { en: "App notification", zh: "应用通知" },
    sender: { en: "App notification — <b>“Member Lucky Draw”</b> pop-up after a purchase", zh: "应用通知 — <b>「会员幸运抽奖」</b>，购物后弹出" },
    text: { en: "🎉 You spun a Grand Prize: a phone worth ¥4,999!\nIt's reserved under your name. Pay only the ¥39 insured shipping and a ¥600 “customs/handling deposit” (refunded on delivery) to dispatch it today.\nPay here to lock your prize: http://member-luckydraw-prize.cn/pay", zh: "🎉 您抽中特等奖：价值 4999 元手机一部！\n已以您名下预留。仅需支付 39 元保价运费及 600 元「报关/手续保证金」（签收后退还），即可今日发货。\n点此付款锁定奖品：http://member-luckydraw-prize.cn/pay" },
    flags: [ { en: "A “grand prize” that costs money to release — the deposit is the trap.", zh: "要先付钱才能发货的「特等奖」——保证金就是陷阱。" },
             { en: "“Refunded on delivery” deposits are how the loss grows beyond the shipping fee.", zh: "「签收后退还」的保证金，正是让损失超过运费的手段。" },
             { en: "Payment goes to an off-app look-alike page, not your order history.", zh: "付款跳到 App 外的仿冒页面，而非你的订单记录。" } ],
    truthScam: { en: "Prize-shipping fraud. Genuine prizes ship free; the “deposit” is pure loss.", zh: "中奖运费诈骗。真奖品包邮；那笔「保证金」是纯亏损。" },
    truthSafe: { en: "It was a scam — you didn't pay to “release” a phone that was never coming.", zh: "这是骗局——你没为「发货」一部根本不会来的手机付钱。" },
  },
  {
    answer: "scam", risk: 1500,
    title: { en: "Vote for My Kid, Just Verify First", zh: "帮我家孩子投票，先验证一下" },
    chan: { en: "WeChat", zh: "微信" },
    sender: { en: "WeChat — <b>a stranger</b> in a parents' group, with a “contest” link", zh: "微信 — <b>陌生人</b>，在家长群里发「评选」链接" },
    text: { en: "Mums and dads, please help vote for my daughter in the “Cutest Kid” contest, she's #12! 🙏\nThe page asks you to bind your card and pay a refundable ¥1 “verification” to confirm you're a real voter — you get a ¥88 thank-you packet after.\nVote here: http://cutest-kid-vote.cn/v?id=12", zh: "各位爸爸妈妈，帮我家女儿投一票吧，「最萌宝贝」评选，她是 12 号！🙏\n页面需要绑定银行卡并支付可退的 1 元「验证费」确认是真实投票人——投完返 88 元感谢红包。\n投票链接：http://cutest-kid-vote.cn/v?id=12" },
    flags: [ { en: "A “voting” link that demands you bind a bank card — voting never needs that.", zh: "要你「绑定银行卡」才能投的链接——投票从不需要这个。" },
             { en: "A ¥1 “verification” plus an ¥88 reward — small bait to harvest card data.", zh: "1 元「验证」加 88 元奖励——用小诱饵套取银行卡信息。" },
             { en: "Emotional, urgent appeal forwarded among parents to spread fast.", zh: "情感化、催促式的请求在家长间转发，传播极快。" } ],
    truthScam: { en: "Vote-phishing fraud. Binding your card hands over the keys; there is no real contest.", zh: "投票钓鱼诈骗。绑卡就是交出钥匙；根本没有什么评选。" },
    truthSafe: { en: "It was a scam — you didn't bind your card to a “vote,” so your funds stayed safe.", zh: "这是骗局——你没为「投票」绑卡，资金安然无恙。" },
  },
  {
    answer: "scam", risk: 1800,
    title: { en: "Cheap Skins, Off the Platform", zh: "脱离平台的低价皮肤" },
    chan: { en: "Game chat", zh: "游戏聊天" },
    sender: { en: "Game chat — <b>a “trusted seller”</b> in a public lobby", zh: "游戏聊天 — <b>「信誉卖家」</b>，在公共大厅" },
    text: { en: "Selling the limited skin bundle cheap — ¥1,800, half the store price.\nDon't use the in-game trade, it charges fees. Add my WeChat, pay there, I'll mail the items right after.\nLoads of happy buyers, screenshots on my profile. First come first served, others are waiting.", zh: "限定皮肤套装低价出——1800，官店半价。\n别走游戏内交易，要扣手续费。加我微信，那边付款，我马上把东西寄给你。\n好评一堆，主页有截图。先到先得，还有人等着呢。" },
    flags: [ { en: "Pulls you off the in-game trade — off-platform deals have zero buyer protection.", zh: "诱你脱离游戏内交易——站外交易毫无买家保障。" },
             { en: "“Pay first, I'll mail it right after” reverses the safe order so you can't recover.", zh: "「先付款，我马上寄」颠倒了安全顺序，让你无法追回。" },
             { en: "Too-cheap price plus “others are waiting” rushes you past caution.", zh: "过低的价格加「还有人等着」，催你顾不上谨慎。" } ],
    truthScam: { en: "Off-platform trade fraud. Once you pay outside the game, the items never arrive.", zh: "脱机交易诈骗。一旦在游戏外付款，东西就永远不会到。" },
    truthSafe: { en: "It was a scam — you kept it inside the official trade, so no money walked.", zh: "这是骗局——你坚持走官方交易，钱没被带走。" },
  },
  {
    answer: "scam", risk: 4500,
    title: { en: "Your Trade Is Frozen — Pay a Margin", zh: "交易被冻结，先交保证金" },
    chan: { en: "Game chat", zh: "游戏聊天" },
    sender: { en: "Game chat — <b>fake “transaction support”</b> mid-deal", zh: "游戏聊天 — <b>假「交易客服」</b>，在交易途中" },
    text: { en: "System: your account-sale order is under review and the funds are FROZEN due to a “risk flag.”\nTo release them, both parties must pay a 30% security margin — ¥4,500 from you — refunded with the balance once the trade clears.\nPay to the official settlement account here within 20 min or the order voids: http://game-trade-unfreeze.cn", zh: "系统：您的卖号订单因「风控标记」正在审核，资金已被冻结。\n解冻需双方各缴 30% 保证金——您方 4500 元——交易完成后随尾款一并退还。\n请于 20 分钟内打入官方结算账户，逾期订单作废：http://game-trade-unfreeze.cn" },
    flags: [ { en: "“Your money is frozen, pay to unfreeze” — paying to release your own funds is always fake.", zh: "「资金被冻结，交钱解冻」——为解冻自己的钱而付费，必假。" },
             { en: "A 30% “security margin” to a private link, not the platform's real wallet.", zh: "30%「保证金」打进私链，而非平台真钱包。" },
             { en: "A 20-minute deadline and “order voids” panic you into paying.", zh: "20 分钟期限加「订单作废」，吓你赶紧付钱。" } ],
    truthScam: { en: "Trade-freeze fraud. No real platform makes you wire cash to “unfreeze” a trade.", zh: "交易冻结诈骗。真平台绝不会让你打款去「解冻」交易。" },
    truthSafe: { en: "It was a scam — you refused the “margin” and your account funds were never at risk.", zh: "这是骗局——你拒缴「保证金」，账户资金从未受险。" },
  },
  {
    answer: "scam", risk: 300,
    title: { en: "Top-Up at Half Price", zh: "半价充点券" },
    chan: { en: "Game chat", zh: "游戏聊天" },
    sender: { en: "Game chat — <b>a private whisper</b> advertising cheap top-ups", zh: "游戏聊天 — <b>私聊密语</b>，兜售低价充值" },
    text: { en: "Top up game coins at 50% off! 1000 coins for just ¥300, agency channel, instant delivery.\nGive me your account and password and I'll top it up from my end — faster than the store.\nDone hundreds of these. Pay first, I'll have it in your account in 5 minutes.", zh: "点券五折充！1000 点券只要 300，代理通道，秒到。\n把你账号密码给我，我从我这边帮你充——比商城还快。\n做过几百单了。先付款，5 分钟到你账户。" },
    flags: [ { en: "Asks for your account and password — handing those over loses the account itself.", zh: "索要你的账号密码——交出去就等于丢了账号本身。" },
             { en: "Half-price “agency top-up” is bait; legitimate top-ups never need your login.", zh: "半价「代充」是诱饵；正规充值从不需要你的登录信息。" },
             { en: "“Pay first” with no recourse if nothing is delivered.", zh: "「先付款」，若不到账你也无处申诉。" } ],
    truthScam: { en: "Cheap top-up fraud. They take the cash, the account, or both — never the coins.", zh: "低价代充诈骗。他们拿走钱、账号或两者——唯独不给点券。" },
    truthSafe: { en: "It was a scam — you topped up in the official store and kept your login private.", zh: "这是骗局——你在官方商城充值，账号密码守得牢牢的。" },
  },
  {
    answer: "scam", risk: 700,
    title: { en: "The GM Who Needed Your Login", zh: "要你登录信息的「GM」" },
    chan: { en: "Game chat", zh: "游戏聊天" },
    sender: { en: "Game chat — <b>“GM Official Support”</b>, name in red", zh: "游戏聊天 — <b>「GM 官方客服」</b>，红名" },
    text: { en: "Hello player, this is GM Support. We see a duplication bug affected your inventory and you're owed a compensation item.\nTo restore it, confirm your account name, password, and the security code we just sent so we can access and fix your character. This is the only way to receive the make-good.", zh: "玩家您好，我是 GM 官方客服。系统检测到复制 BUG 影响了您的背包，您可获得补偿道具。\n为帮您恢复，请告知账号、密码及我们刚发给您的验证码，以便我们进入并修复您的角色。这是领取补偿的唯一方式。" },
    flags: [ { en: "A “GM” asking for your password and security code — staff never need either.", zh: "「GM」索要你的密码和验证码——工作人员从不需要这些。" },
             { en: "A “compensation item” dangled as the reason to hand over your login.", zh: "用「补偿道具」当诱饵，骗你交出登录信息。" },
             { en: "Real GMs act on your account server-side; they never DM you for credentials.", zh: "真 GM 在服务器后台处理你的账号，绝不会私聊找你要凭据。" } ],
    truthScam: { en: "Fake-GM fraud. The “fix” is account theft; the make-good never existed.", zh: "假 GM 诈骗。所谓「修复」就是盗号；补偿从来不存在。" },
    truthSafe: { en: "It was a scam — you never gave a “GM” your code, so the character stayed yours.", zh: "这是骗局——你没把验证码给「GM」，角色还是你的。" },
  },
  {
    answer: "scam", risk: 2600,
    title: { en: "Borrowing Mum's Phone to “Win” a Skin", zh: "借妈妈的手机「领」皮肤" },
    chan: { en: "Game chat", zh: "游戏聊天" },
    sender: { en: "Game chat — <b>a “free skins officer”</b> targeting young players", zh: "游戏聊天 — <b>「免费皮肤福利官」</b>，专找未成年玩家" },
    text: { en: "Hey kid! Claim a FREE legendary skin today only 🎁 — but the giveaway needs an adult's phone to “verify age.”\nTake a parent's phone, open their payment app, and read me the code that pops up. Don't tell them, it's a surprise gift! Scan this to start: [QR code]\n(If a ¥2,600 charge shows, ignore it — it auto-cancels after verification.)", zh: "小朋友你好！今天限时领免费传说皮肤 🎁——不过领取要用大人的手机「验证年龄」。\n拿爸爸妈妈的手机，打开他们的支付软件，把弹出来的验证码念给我。别告诉他们，这是惊喜礼物哦！扫这个开始：【二维码】\n（如果显示扣款 2600，别管它，验证后会自动取消。）" },
    flags: [ { en: "Targets a minor and tells them to use a parent's phone secretly — classic child-targeted con.", zh: "专骗未成年人，叫他偷偷用家长手机——典型针对儿童的骗局。" },
             { en: "“Read me the code that pops up” is the payment confirmation code — that authorises a charge.", zh: "「把弹出的验证码念给我」就是支付确认码——它会授权扣款。" },
             { en: "“The ¥2,600 charge auto-cancels” is a lie to keep the child from stopping.", zh: "「2600 扣款会自动取消」是谎言，为了让孩子别停手。" } ],
    truthScam: { en: "Minor-targeted payment fraud. That “verification code” confirms a real ¥2,600 charge.", zh: "针对未成年人的支付诈骗。那串「验证码」确认的是一笔真实的 2600 元扣款。" },
    truthSafe: { en: "It was a scam — the code was never read out, so the parent's ¥2,600 stayed put.", zh: "这是骗局——验证码没被念出去，家长的 2600 元原封未动。" },
  },
  {
    answer: "scam", risk: 1800,
    title: { en: "The Fee Before the Loan", zh: "放款前的「手续费」" },
    chan: { en: "SMS + link", zh: "短信 + 链接" },
    sender: { en: "Sender — <b>106-9XXX-2271</b>, a so-called online lending platform", zh: "发件人 — <b>106-9XXX-2271</b>，自称某网络借贷平台" },
    text: { en: "Congratulations! Your loan of ¥50,000 at 0.3% monthly is APPROVED.\nBefore we release the money, pay a one-time ¥1,800 handling fee to activate your account.\n\nApply: http://easy-loan-fast.cn/apply", zh: "恭喜！您一笔 ¥50,000、月息 0.3% 的贷款已获批。\n放款前请先缴纳一次性手续费 ¥1,800 激活账户。\n\n办理：http://easy-loan-fast.cn/apply" },
    flags: [ { en: "A real lender deducts fees from the loan — it never asks you to pay before disbursing.", zh: "正规放贷从贷款里扣费，绝不会让你先交钱再放款。" },
             { en: "Rates and approval that sound too good — designed to stop you questioning the fee.", zh: "利率低得离谱、秒批——就是为了让你不去质疑那笔费用。" },
             { en: "A look-alike link, not any platform you ever applied to.", zh: "一个仿冒链接，根本不是你申请过的平台。" } ],
    truthScam: { en: "No loan exists. The 'handling fee' is the whole con — once paid, the account vanishes.", zh: "贷款根本不存在。「手续费」就是整个骗局——一交钱，账户就消失。" },
    truthSafe: { en: "It was a scam — blocking it saved an upfront 'fee' that buys nothing.", zh: "这是骗局——拦下它，省下了那笔买不到任何东西的「手续费」。" },
  },
  {
    answer: "scam", risk: 6000,
    title: { en: "Buy Insurance to Unlock the Money", zh: "买份保险才能解冻" },
    chan: { en: "Phone call", zh: "电话" },
    sender: { en: "Caller — <b>+00-21-5567-XXXX</b>, a 'loan officer' from a finance company", zh: "来电 — <b>+00-21-5567-XXXX</b>，自称金融公司「信贷专员」" },
    text: { en: "Your ¥80,000 loan is ready to release. One problem — your credit score is borderline.\nTo guarantee the loan, buy our ¥6,000 repayment insurance first; it's refunded with your first installment.\nTransfer the premium now and the money lands today.", zh: "您 ¥80,000 的贷款已准备放款，只有一个问题——您的征信处于临界值。\n为担保这笔贷款，请先购买我们 ¥6,000 的还款保证保险，首期还款时返还。\n现在把保费转过来，今天就能到账。" },
    flags: [ { en: "'Buy insurance to release the loan' is a classic upfront-fee con dressed up.", zh: "「买保险才放款」是换了马甲的前置收费骗局。" },
             { en: "Promised refund 'with your first installment' — you'll never get there.", zh: "承诺「首期返还」——你根本走不到那一步。" },
             { en: "Pressure to transfer 'now, today' so you can't verify anything.", zh: "催你「现在、今天」转账，让你来不及核实。" } ],
    truthScam: { en: "The insurance is fake. Real lenders never make you wire money to receive a loan.", zh: "保险是假的。正规放贷绝不会让你先汇款才能拿到贷款。" },
    truthSafe: { en: "Right call — no genuine loan requires you to pay to be paid.", zh: "判得对——没有哪笔真贷款要你先付钱才能拿钱。" },
  },
  {
    answer: "scam", risk: 12000,
    title: { en: "Prove You Can Repay", zh: "先证明你的还款能力" },
    chan: { en: "SMS + link", zh: "短信 + 链接" },
    sender: { en: "Sender — <b>1069-XX-8800</b>, posing as a consumer-credit app", zh: "发件人 — <b>1069-XX-8800</b>，冒充某消费信贷 App" },
    text: { en: "Your ¥120,000 credit line is approved but FROZEN pending verification.\nTo prove repayment ability, transfer ¥12,000 to your own verification account; it will be returned and your line unlocked.\n\nUnlock: http://credit-unlock-verify.com", zh: "您 ¥120,000 的授信额度已批，但因待核验被「冻结」。\n为证明还款能力，请向您的专属「验证账户」转入 ¥12,000，验证后原路退回并解冻额度。\n\n解冻：http://credit-unlock-verify.com" },
    flags: [ { en: "'Transfer to your own account to prove you can pay' is nonsense — the account is theirs.", zh: "「转给自己证明还款能力」纯属胡扯——那账户是骗子的。" },
             { en: "A frozen line that only 'unlocks' after you move real money.", zh: "被「冻结」的额度，非要你先转出真金白银才「解冻」。" },
             { en: "The verify link is not the app's real domain.", zh: "那条验证链接并非 App 的真实域名。" } ],
    truthScam: { en: "There is no line and no return. The 'proof' transfer goes straight to the fraudster.", zh: "没有额度，也没有退回。那笔「证明」转账直接进了骗子口袋。" },
    truthSafe: { en: "It was a scam — you never have to send money to 'prove' you can borrow.", zh: "这是骗局——借钱从不需要你先转钱来「证明」。" },
  },
  {
    answer: "scam", risk: 3500,
    title: { en: "The Margin to Release", zh: "解冻贷款的「保证金」" },
    chan: { en: "WeChat", zh: "微信" },
    sender: { en: "Sender — <b>a 'customer manager'</b> added you after you searched for a loan", zh: "发件人 — <b>某「客户经理」</b>，你搜过贷款后主动加你" },
    text: { en: "Loan ¥35,000 approved! System flagged your bank card number entered wrong, so funds are stuck.\nDeposit a ¥3,500 margin to the supervision account to release; refunded on disbursement.\nDo it within the hour or the application auto-cancels.", zh: "¥35,000 贷款已批！系统提示您填写的银行卡号有误，资金被卡住。\n请向「监管账户」缴纳 ¥3,500 保证金以解冻，放款时退还。\n请在一小时内完成，否则申请自动作废。" },
    flags: [ { en: "A 'wrong card number' is fixed by re-entering it, not by paying a margin.", zh: "「卡号填错」改一下就行，绝不是靠交保证金解决。" },
             { en: "A 'supervision account' that you must fund — that account is the scammer's.", zh: "要你打钱的「监管账户」——那账户就是骗子的。" },
             { en: "One-hour deadline manufactures panic.", zh: "一小时倒计时，专门制造慌乱。" } ],
    truthScam: { en: "Margin, supervision fee, unlock fee — all names for the same theft.", zh: "保证金、监管费、解冻费——都是同一种盗窃的不同叫法。" },
    truthSafe: { en: "Right call. Genuine lenders correct a typo for free, never charge a 'release margin'.", zh: "判得对。正规放贷免费改错号，绝不收什么「解冻保证金」。" },
  },
  {
    answer: "scam", risk: 9000,
    title: { en: "Boost Your Card Limit", zh: "帮你「提额」" },
    chan: { en: "Phone call", zh: "电话" },
    sender: { en: "Caller — <b>955XX-spoofed</b>, claiming to be your credit-card centre", zh: "来电 — <b>955XX 仿冒号</b>，自称信用卡中心" },
    text: { en: "We can raise your card limit to ¥90,000 today — you qualify for our premium tier.\nTo activate, read me the 6-digit code we just sent, and confirm the card number and the 3 digits on the back.\nThis offer expires when we hang up.", zh: "今天就能把您的信用卡额度提到 ¥90,000——您符合白金资格。\n激活只需把我们刚发的 6 位验证码念给我，再确认卡号和卡背面 3 位数字。\n挂断后此优惠即失效。" },
    flags: [ { en: "It asks for the one-time code, full card number and CVV — a real centre never does.", zh: "它索要验证码、完整卡号和背面 3 位安全码——真卡中心绝不会问。" },
             { en: "'Limit boost' is the bait; the data they collect drains the card.", zh: "「提额」是诱饵，他们收走的信息正好用来盗刷。" },
             { en: "'Expires when we hang up' blocks you from calling back to verify.", zh: "「挂断即失效」让你来不及回拨核实。" } ],
    truthScam: { en: "Card number + CVV + code is everything needed for online theft. Limit boost is a lie.", zh: "卡号 + 安全码 + 验证码就是网上盗刷的全套钥匙。提额是谎言。" },
    truthSafe: { en: "It was a scam — your bank handles limit changes in-app and never phones for the CVV.", zh: "这是骗局——银行提额都在 App 里办，绝不会打电话要安全码。" },
  },
  {
    answer: "scam", risk: 800,
    title: { en: "Your Medical Account Is Frozen", zh: "你的医保账户被冻结了" },
    chan: { en: "SMS + link", zh: "短信 + 链接" },
    sender: { en: "Sender — <b>1065-XXXX-009</b>, posing as the medical-insurance bureau", zh: "发件人 — <b>1065-XXXX-009</b>，冒充医保中心" },
    text: { en: "[Medical Insurance] An abnormal reimbursement was detected on your account; it is now FROZEN.\nVerify your identity within 24h to avoid permanent closure:\nhttp://ylbx-gov-verify.cn/auth", zh: "【医疗保险】检测到您账户存在异常报销，现已「冻结」。\n请于 24 小时内完成身份核验，逾期将永久注销：\nhttp://ylbx-gov-verify.cn/auth" },
    flags: [ { en: "Insurance bureaus don't text panic links — they use the official app or service hall.", zh: "医保部门不会群发恐吓链接——办事走官方 App 或服务大厅。" },
             { en: "'Frozen in 24h' is manufactured urgency.", zh: "「24 小时内冻结」是人为制造的紧迫感。" },
             { en: "A gov-looking but fake domain harvesting your ID and card details.", zh: "一个仿政府域名的假网站，专门套取你的身份证和卡号。" } ],
    truthScam: { en: "The link is a credential trap. 'Verify' here and they own your account and card.", zh: "链接是个凭证陷阱。在这「核验」，你的账户和银行卡就归他们了。" },
    truthSafe: { en: "Right call. Check any insurance issue in the official app, never via a texted link.", zh: "判得对。医保有疑问就上官方 App 查，绝不点短信里的链接。" },
  },
  {
    answer: "scam", risk: 2400,
    title: { en: "Reactivate Your Social-Security Card", zh: "社保卡要重新激活" },
    chan: { en: "SMS + link", zh: "短信 + 链接" },
    sender: { en: "Sender — <b>1069-22-7781</b>, claiming to be the social-security centre", zh: "发件人 — <b>1069-22-7781</b>，自称社保中心" },
    text: { en: "[Social Security] Your card has failed annual review and is suspended.\nReactivate before midnight or benefits stop. Enter your card number and SMS code here:\nhttp://shebao-active.cn/login", zh: "【社会保障】您的社保卡年度审核未通过，已暂停使用。\n请于今晚 24 点前重新激活，否则待遇中止。请在此填写卡号及短信验证码：\nhttp://shebao-active.cn/login" },
    flags: [ { en: "Real reactivation is done at a service window or the official app, not a texted form.", zh: "真要激活是去服务窗口或官方 App，绝不是短信里填表。" },
             { en: "It asks for your card number plus SMS code — the keys to your account.", zh: "它索要卡号加短信验证码——正是账户的钥匙。" },
             { en: "Midnight deadline pressures you past thinking.", zh: "午夜截止逼你来不及思考。" } ],
    truthScam: { en: "Card number + code lets them empty the linked balance. The 'review' never happened.", zh: "卡号加验证码就能划走绑定余额。所谓「审核」根本不存在。" },
    truthSafe: { en: "It was a scam — a genuine social-security notice never needs your code via a link.", zh: "这是骗局——真的社保通知绝不会让你在链接里交验证码。" },
  },
  {
    answer: "scam", risk: 1500,
    title: { en: "Claim Your Tax Rebate", zh: "你的个税退税到了" },
    chan: { en: "SMS + link", zh: "短信 + 链接" },
    sender: { en: "Sender — <b>1068-TAX-XXXX</b>, posing as the tax service", zh: "发件人 — <b>1068-TAX-XXXX</b>，冒充税务服务平台" },
    text: { en: "[Tax] Your annual individual-income-tax refund of ¥1,532 is ready.\nClaim before the window closes today. Bind your bank card and receive the SMS code to collect:\nhttp://geshui-refund.cn/get", zh: "【税务】您本年度个人所得税退税 ¥1,532 已生成。\n请于今日截止前领取。绑定银行卡并填写短信验证码即可到账：\nhttp://geshui-refund.cn/get" },
    flags: [ { en: "Real tax refunds go through the official tax app, never a random texted link.", zh: "真退税都走官方个税 App，绝不是陌生短信链接。" },
             { en: "A refund that needs your card number AND code — the opposite of receiving money.", zh: "退钱却要你的卡号加验证码——和「收钱」恰恰相反。" },
             { en: "'Window closes today' rushes you onto the fake page.", zh: "「今日截止」催你冲进假页面。" } ],
    truthScam: { en: "To send you money no one needs your code. That code lets them take money instead.", zh: "给你打钱没人要验证码。那串码反而是让他们划走钱的。" },
    truthSafe: { en: "Right call. Check refunds only in the official tax app, never through a link.", zh: "判得对。退税只在官方个税 App 里查，绝不点链接。" },
  },
  {
    answer: "scam", risk: 4800,
    title: { en: "A Tax Officer on the Line", zh: "电话那头的「税务专员」" },
    chan: { en: "Phone call", zh: "电话" },
    sender: { en: "Caller — <b>+00-10-6611-XXXX</b>, claiming to be a tax-bureau officer", zh: "来电 — <b>+00-10-6611-XXXX</b>，自称税务局工作人员" },
    text: { en: "Our system shows you under-reported income and owe a penalty — but you also qualify for a ¥4,800 rebate.\nTo offset them, log in to the link I'll text and enter your card and the verification code.\nHandle it now or this becomes a tax-evasion case.", zh: "系统显示您少报收入需缴罚款——但您同时符合 ¥4,800 退税资格。\n要冲抵，请登录我马上发给您的链接，填入卡号和验证码。\n现在就办，否则将按偷税漏税立案。" },
    flags: [ { en: "Threat of a 'tax-evasion case' to scare you into compliance.", zh: "用「偷税立案」恐吓逼你就范。" },
             { en: "A real bureau never sends a login link to collect your card and code by phone.", zh: "真税务局绝不会电话里发链接收你的卡号和验证码。" },
             { en: "Mixing penalty + rebate is confusion bait to get the card on screen.", zh: "罚款和退税混在一起，是让你慌乱中交出卡号的诱饵。" } ],
    truthScam: { en: "Bureaus contact you through official channels, never by threats and a phishing link.", zh: "税务局只走官方渠道,绝不靠恐吓加钓鱼链接联系你。" },
    truthSafe: { en: "It was a scam — hang up and check your tax status only in the official app.", zh: "这是骗局——挂断,只在官方个税 App 里查你的纳税状态。" },
  },
  {
    answer: "scam", risk: 600,
    title: { en: "Medical Card, One Last Code", zh: "医保卡，最后一道验证码" },
    chan: { en: "Phone call", zh: "电话" },
    sender: { en: "Caller — <b>400-XXX-2210</b>, a 'medical-insurance service line'", zh: "来电 — <b>400-XXX-2210</b>，自称「医保服务热线」" },
    text: { en: "Your medical-insurance card shows an unusual out-of-province claim and will be deactivated tonight.\nI'll help you reverse it. Read me the code that just arrived on your phone to confirm it's really you.\nDon't tell anyone — it's a privacy procedure.", zh: "您的医保卡出现一笔异常的异地报销，今晚将被停用。\n我帮您撤销。请把刚发到您手机上的验证码念给我,确认是您本人。\n请勿告知他人——这是隐私核验流程。" },
    flags: [ { en: "Asks you to read out a code — no real service line ever needs it.", zh: "让你念出验证码——任何真热线都不会要它。" },
             { en: "'Don't tell anyone' isolates you from anyone who'd warn you.", zh: "「别告诉任何人」是为了切断会提醒你的人。" },
             { en: "Deactivation 'tonight' rushes you.", zh: "「今晚停用」催你就范。" } ],
    truthScam: { en: "That code is binding a payment or login on their side. Read it out and they're in.", zh: "那串码正在他们那头绑定一笔支付或登录。一念出口,他们就进去了。" },
    truthSafe: { en: "Right call. Hang up and call the number printed on the card or the official hall.", zh: "判得对。挂断,拨卡片上印的电话或官方大厅核实。" },
  },
  {
    answer: "scam", risk: 350,
    title: { en: "Your ETC Is Disabled", zh: "你的 ETC 已失效" },
    chan: { en: "SMS + link", zh: "短信 + 链接" },
    sender: { en: "Sender — <b>106-ETC-5520</b>, posing as the highway ETC centre", zh: "发件人 — <b>106-ETC-5520</b>，冒充高速 ETC 中心" },
    text: { en: "[ETC] Your device has expired and is now disabled. Re-verify to keep using fast lanes:\nhttp://etc-gov-renew.cn/auth\nFailure to verify today means manual toll and a blacklist record.", zh: "【ETC】您的设备已过期失效,现已停用。请重新认证以继续使用 ETC 车道:\nhttp://etc-gov-renew.cn/auth\n今日未认证将转人工缴费并记入黑名单。" },
    flags: [ { en: "ETC renewal is handled in the official bank/issuer app, not a texted link.", zh: "ETC 续办在官方发行 App 里办,不是短信链接。" },
             { en: "'Blacklist' threat is pure intimidation.", zh: "「黑名单」威胁纯属吓唬。" },
             { en: "A fake gov-style domain that will ask for card and code.", zh: "一个仿政府风格的假域名,会问你卡号和验证码。" } ],
    truthScam: { en: "The page mimics an official site to capture your card and one-time code.", zh: "页面模仿官网,只为套取你的卡号和一次性验证码。" },
    truthSafe: { en: "It was a scam — manage ETC only through your issuing bank's official app.", zh: "这是骗局——ETC 只在发行银行的官方 App 里管理。" },
  },
  {
    answer: "scam", risk: 200,
    title: { en: "Pay or Lose Your Licence", zh: "缴款，否则吊销驾照" },
    chan: { en: "SMS + link", zh: "短信 + 链接" },
    sender: { en: "Sender — <b>1062-JG-0098</b>, claiming to be the traffic-management bureau", zh: "发件人 — <b>1062-JG-0098</b>，自称交管部门" },
    text: { en: "[Traffic] An unpaid violation is on your vehicle. Pay ¥200 within 48h or your driving licence will be revoked and points deducted to zero.\nPay here: http://jiaoguan-fine.cn/pay", zh: "【交管】您名下车辆有一笔未处理违章。请于 48 小时内缴纳 ¥200,否则吊销驾驶证并记分扣完。\n缴费入口:http://jiaoguan-fine.cn/pay" },
    flags: [ { en: "Violations are paid only through the official traffic app or counter, never a texted link.", zh: "违章只在官方交管 App 或窗口缴,绝不走短信链接。" },
             { en: "'Licence revoked in 48h' is a fabricated punishment.", zh: "「48 小时吊销驾照」是编造的处罚。" },
             { en: "A fake fine page that captures card and code.", zh: "假缴费页,套取卡号和验证码。" } ],
    truthScam: { en: "No such violation. The pay page is a skimmer for your bank details.", zh: "根本没这违章。缴费页是窃取银行信息的工具。" },
    truthSafe: { en: "Right call. Verify any violation in the official traffic-management app.", zh: "判得对。任何违章都在官方交管 App 里核实。" },
  },
  {
    answer: "scam", risk: 480,
    title: { en: "Your Licence Points Expire", zh: "你的驾照分要清零" },
    chan: { en: "SMS + link", zh: "短信 + 链接" },
    sender: { en: "Sender — <b>106-JZ-3344</b>, posing as the vehicle-administration office", zh: "发件人 — <b>106-JZ-3344</b>，冒充车管所" },
    text: { en: "[DMV] Your driving-licence points expire today and the licence will be marked invalid.\nVerify and renew online to keep driving legally:\nhttp://chems-renew-points.cn/login", zh: "【车管所】您的驾驶证记分今日到期,证件将被标记为「失效」。\n请在线核验续期以合法驾驶:\nhttp://chems-renew-points.cn/login" },
    flags: [ { en: "Licence points reset on a yearly cycle automatically — they aren't 'renewed' via a link.", zh: "驾照记分按周期自动清零——根本不用链接「续期」。" },
             { en: "'Marked invalid today' is invented urgency.", zh: "「今日失效」是编造的紧迫感。" },
             { en: "A look-alike DMV domain to phish your identity and card.", zh: "仿车管所域名,钓取你的身份和银行卡。" } ],
    truthScam: { en: "The licence-points story is fake; the page steals identity and payment data.", zh: "「记分续期」是假的,页面只为窃取身份和支付信息。" },
    truthSafe: { en: "It was a scam — the real DMV doesn't 'renew points' through a texted link.", zh: "这是骗局——真车管所不会用短信链接「续记分」。" },
  },
  {
    answer: "scam", risk: 1200,
    title: { en: "Two Violations, Pay Now", zh: "两条违章，立即处理" },
    chan: { en: "Phone call", zh: "电话" },
    sender: { en: "Caller — <b>+00-755-8822-XXXX</b>, claiming to be a traffic officer", zh: "来电 — <b>+00-755-8822-XXXX</b>，自称交警" },
    text: { en: "Two unpaid violations on your plate — total ¥1,200. They go to court tomorrow unless cleared today.\nI'll send a link; log in, enter your card and the code I read you, and I'll close the case.\nStay on the line, don't hang up.", zh: "您车牌下有两条未缴违章,共 ¥1,200,今日不清缴明天就移交法院。\n我发您个链接,登录后填卡号,再念我给您的验证码,我就帮您结案。\n请保持通话,别挂断。" },
    flags: [ { en: "'Goes to court tomorrow' is a scare tactic.", zh: "「明天移交法院」是恐吓话术。" },
             { en: "An officer reading you a code to type — real police never do this.", zh: "交警念验证码让你填——真警察绝不这么干。" },
             { en: "'Stay on the line' stops you from calling to verify.", zh: "「别挂断」是不让你回拨核实。" } ],
    truthScam: { en: "Keeping you on the call is control. The link and code hand over your account.", zh: "黏住通话就是控制你。链接加验证码就把账户交了出去。" },
    truthSafe: { en: "Right call. Hang up; fines are handled in the official app, not over a phone link.", zh: "判得对。挂断;罚款在官方 App 里办,不靠电话链接。" },
  },
  {
    answer: "scam", risk: 300,
    title: { en: "Points Expire at Midnight", zh: "积分今夜清零" },
    chan: { en: "SMS + link", zh: "短信 + 链接" },
    sender: { en: "Sender — <b>10086-XXXX (spoofed)</b>, posing as your mobile carrier", zh: "发件人 — <b>10086-XXXX（仿冒）</b>，冒充运营商" },
    text: { en: "[Carrier] You have 38,600 points expiring TODAY. Redeem now for ¥386 cash:\nhttp://carrier-points-cash.cn/redeem\nLog in with your service password and bank card to receive the cash.", zh: "【运营商】您有 38,600 积分今日到期。立即兑换 ¥386 现金:\nhttp://carrier-points-cash.cn/redeem\n请用服务密码及银行卡登录领取现金。" },
    flags: [ { en: "Points redeem inside the official carrier app — never a texted cash link.", zh: "积分在官方运营商 App 里兑——绝不是短信现金链接。" },
             { en: "'Cash' redemption that asks for your service password and card is the trap.", zh: "兑换「现金」却要服务密码和银行卡,就是陷阱。" },
             { en: "'Expires today' is the rush.", zh: "「今日到期」就是催你。" } ],
    truthScam: { en: "Points become coupons, not cash. The login form harvests your password and card.", zh: "积分换的是券,不是现金。登录表单收走你的密码和卡号。" },
    truthSafe: { en: "It was a scam — redeem points only inside the carrier's official app.", zh: "这是骗局——积分只在运营商官方 App 里兑换。" },
  },
  {
    answer: "scam", risk: 500,
    title: { en: "Your Number Will Be Suspended", zh: "你的号码将被停机" },
    chan: { en: "Phone call", zh: "电话" },
    sender: { en: "Caller — <b>+00-XXX-1000-86</b>, claiming to be carrier customer service", zh: "来电 — <b>+00-XXX-1000-86</b>，自称运营商客服" },
    text: { en: "Your number was reported for sending spam and will be suspended in 2 hours.\nTo cancel the report, verify your identity: tell me your ID number and the code I just sent you.\nIf you don't, the line and all linked services stop today.", zh: "您的号码因群发垃圾信息被举报,2 小时后将停机。\n要撤销举报,请核验身份:把您的身份证号和我刚发的验证码告诉我。\n否则今日号码及绑定的所有服务全部中止。" },
    flags: [ { en: "Carriers don't suspend you for 'spam' via a phone call demanding your code.", zh: "运营商不会电话索要验证码、以「群发」为由停你的机。" },
             { en: "Asks for ID number and SMS code — identity-theft fuel.", zh: "索要身份证号和验证码——盗用身份的燃料。" },
             { en: "'Suspended in 2 hours' is pressure.", zh: "「2 小时停机」是施压。" } ],
    truthScam: { en: "The code likely confirms a SIM swap or payment. Your identity walks out the door.", zh: "那验证码很可能在确认补卡或支付。你的身份就这样被带走。" },
    truthSafe: { en: "Right call. Hang up and call the carrier's hotline printed on official channels.", zh: "判得对。挂断,拨官方渠道公布的运营商热线核实。" },
  },
  {
    answer: "scam", risk: 700,
    title: { en: "Broadband Refund Owed to You", zh: "宽带退费请查收" },
    chan: { en: "SMS + link", zh: "短信 + 链接" },
    sender: { en: "Sender — <b>106-KD-7720</b>, posing as your broadband provider", zh: "发件人 — <b>106-KD-7720</b>，冒充宽带运营商" },
    text: { en: "[Broadband] Your account was overcharged; a ¥712 refund is pending.\nClaim within 24h or it returns to the treasury. Bind your card and enter the SMS code:\nhttp://kuandai-refund.cn/back", zh: "【宽带】您的账户被多扣费,一笔 ¥712 退费待领取。\n请于 24 小时内领取,逾期收归。绑定银行卡并填写短信验证码:\nhttp://kuandai-refund.cn/back" },
    flags: [ { en: "A refund that needs your card and code — receiving money never does.", zh: "退费却要卡号和验证码——收钱从不需要这些。" },
             { en: "'Returns to treasury in 24h' is invented to rush you.", zh: "「24 小时收归国库」是编来催你的。" },
             { en: "A look-alike domain, not the provider's real site.", zh: "仿冒域名,并非运营商真实网站。" } ],
    truthScam: { en: "Real refunds land on your bill automatically. This link drains the card you 'bind'.", zh: "真退费会自动冲抵话费。这链接划走你「绑定」的卡。" },
    truthSafe: { en: "It was a scam — any genuine refund credits your account without a code.", zh: "这是骗局——真退费会直接入账,不要验证码。" },
  },
  {
    answer: "scam", risk: 25000,
    title: { en: "The Student Loan App", zh: "校园贷的「注销」" },
    chan: { en: "Phone call", zh: "电话" },
    sender: { en: "Caller — <b>+00-28-6677-XXXX</b>, a 'platform compliance officer'", zh: "来电 — <b>+00-28-6677-XXXX</b>，自称平台「合规专员」" },
    text: { en: "Records show you opened a student-loan account years ago. Policy now bans it; if not cancelled, it ruins your credit.\nTo close it you must first borrow ¥25,000 from real apps and transfer it to our 'clearing account' to zero the limit.\nWe refund everything once the account shows ¥0.", zh: "记录显示您几年前开过校园贷账户。新政策禁止,不注销将毁掉征信。\n要注销,您得先从正规 App 借出 ¥25,000,转入我们的「清算账户」把额度清零。\n账户显示 ¥0 后我们全额退还。" },
    flags: [ { en: "Telling you to BORROW real money to 'cancel' a fake account is the core lie.", zh: "让你借真钱去「注销」一个假账户,就是核心谎言。" },
             { en: "A 'clearing account' you transfer to — straight into the scammer's hands.", zh: "要你转入的「清算账户」——直接进骗子口袋。" },
             { en: "Threatens your credit record to override your doubt.", zh: "用「毁征信」压住你的疑虑。" } ],
    truthScam: { en: "No account, no policy. You borrow real money and hand it over for nothing.", zh: "没有账户,也没有政策。你借出真钱,白白拱手送人。" },
    truthSafe: { en: "Right call. No real agency makes you take out loans to 'clear' an account.", zh: "判得对。没有哪个机构会让你借贷去「清算」账户。" },
  },
  {
    answer: "scam", risk: 50000,
    title: { en: "Disbursement Stuck Overnight", zh: "放款卡了一整夜" },
    chan: { en: "WeChat", zh: "微信" },
    sender: { en: "Sender — <b>a loan 'account manager'</b> you met through an ad", zh: "发件人 — <b>某贷款「账户经理」</b>，你从广告认识的" },
    text: { en: "Your ¥50,000 is approved but the bank flow shows your account is 'inactive'.\nTransfer ¥5,000 in and out to make the account active, then funds release instantly.\nI've done this for hundreds of clients — totally normal, trust me.", zh: "您 ¥50,000 已批,但银行流水显示您账户「不活跃」。\n请转入再转出 ¥5,000 让账户「活跃」,资金立即到账。\n我帮上百客户这么操作过,完全正常,信我。" },
    flags: [ { en: "'Make the account active by moving money' is a fabricated requirement.", zh: "「转钱让账户活跃」是编造的要求。" },
             { en: "'In and out' sounds harmless but the 'out' lands on the scammer.", zh: "「转入再转出」听着无害,可「转出」落到的是骗子。" },
             { en: "'I've helped hundreds, trust me' is grooming, not proof.", zh: "「我帮过上百人,信我」是话术,不是证据。" } ],
    truthScam: { en: "Banks never require 'flow' to release a loan. The ¥5,000 simply disappears.", zh: "银行放款从不需要「刷流水」。那 ¥5,000 就这么没了。" },
    truthSafe: { en: "It was a scam — a real disbursement needs nothing moved out of your account first.", zh: "这是骗局——真放款不需要你先从账户转出任何钱。" },
  },
  {
    answer: "scam", risk: 1900,
    title: { en: "The Free Phone Upgrade", zh: "免费升级套餐的诱饵" },
    chan: { en: "Phone call", zh: "电话" },
    sender: { en: "Caller — <b>+00-XXX-1008-66</b>, claiming to be a carrier loyalty agent", zh: "来电 — <b>+00-XXX-1008-66</b>，自称运营商「老客户专员」" },
    text: { en: "As a long-term customer you've won a free upgrade to a premium data plan plus a ¥1,900 phone-bill gift.\nTo activate it I just need the code we sent and your bank card to refund the difference automatically.\nThe offer is reserved under your name for ten minutes only.", zh: "作为老客户,您获赠免费升级至高端流量套餐,外加 ¥1,900 话费礼包。\n激活只需把我们刚发的验证码和您的银行卡告诉我,系统自动退差价。\n名额已为您预留,仅保留十分钟。" },
    flags: [ { en: "A 'gift' that asks for your bank card and the SMS code is the trap.", zh: "送「礼包」却要银行卡和验证码,正是陷阱。" },
             { en: "Carriers apply plan changes in-app — they don't phone for your code.", zh: "套餐变更在 App 里办——运营商不会打电话要验证码。" },
             { en: "'Reserved for ten minutes' manufactures urgency.", zh: "「仅保留十分钟」是人为制造紧迫感。" } ],
    truthScam: { en: "There's no upgrade. The code and card are all they need to drain your balance.", zh: "根本没有升级。验证码和卡号就是掏空你余额的全部所需。" },
    truthSafe: { en: "Right call. Real plan upgrades never require your code or card over the phone.", zh: "判得对。真升级套餐绝不会电话索要你的验证码或银行卡。" },
  },
  {
    answer: "scam", risk: 8000,
    title: { en: "The Screen That Went Both Ways", zh: "那块两头都在录的屏" },
    chan: { en: "Dating app → video call", zh: "交友软件 → 视频通话" },
    sender: { en: "Sender — <b>“Vivian”</b>, a match who moved you off the app to a video chat tool fast", zh: "发件人 — <b>「薇薇安」</b>，一个迅速把你拉到陌生视频软件的「配对对象」" },
    text: { en: "Hey, the dating app is laggy — install this little video app, it's clearer 😘\nWe can be more… honest with each other there.\n\n[two days later]\nI recorded everything. I have your contact list too — it synced when you installed it.\nSend ¥8,000 to this account in one hour, or your family and coworkers see the clip.", zh: "诶交友软件好卡——下这个小视频软件吧，清楚多了 😘\n在那边咱们可以更……坦诚一点。\n\n【两天后】\n我全程录下来了，还拿到了你的通讯录——你装那软件时同步过去了。\n一小时内转 ¥8,000 到这个账户，不然你家人同事都会看到那段视频。" },
    flags: [ { en: "Pushed you off a regulated app onto an unknown video tool that demanded contact permissions.", zh: "把你从正规平台引到陌生视频软件，且索要通讯录权限。" },
             { en: "Intimacy was the bait; the recording and your contacts are the leverage.", zh: "亲密是诱饵，录像和通讯录才是要挟的筹码。" },
             { en: "A one-hour deadline to pay — fear, not thought, is what they want.", zh: "一小时付款的死线——他们要的是恐惧，不是你思考。" } ],
    truthScam: { en: "Sextortion. Paying confirms you're afraid and the demands never stop — keep the proof and report it.", zh: "裸聊敲诈。一旦付款就坐实了你的恐惧，勒索永无止境——保留证据并报警。" },
    truthSafe: { en: "You blocked it — without your money or your fear, the threat is just a dead file.", zh: "你拦下了——没了你的钱和恐惧，那段视频不过是个废文件。" },
  },
  {
    answer: "scam", risk: 15000,
    title: { en: "Forty Seconds, Then the List", zh: "四十秒，然后是名单" },
    chan: { en: "WeChat → video call", zh: "微信 → 视频通话" },
    sender: { en: "Sender — <b>a stranger “added by mistake”</b> who turned warm very quickly", zh: "发件人 — <b>一个「加错好友」的陌生人</b>，很快变得热络" },
    text: { en: "Sorry, wrong person — but you seem nice, let's chat 🙂\nLet's video, I want to see who I'm talking to. Turn your camera on?\n\n[after the call ends]\nThat was fun. I screen-grabbed it. I also have the numbers of 47 people you know.\n¥15,000 by tonight and it stays between us. Try anything and I post it to all 47.", zh: "抱歉加错人了——不过你人挺好的，聊聊呗 🙂\n咱们视频吧，我想看看跟我聊天的是谁，把摄像头打开？\n\n【通话结束后】\n刚才挺愉快。我录屏了，还拿到了你认识的 47 个人的号码。\n今晚之前 ¥15,000，这事就烂在咱俩之间。敢报警，我就发给那 47 个人。" },
    flags: [ { en: "A “wrong number” friend request is a classic opening to lower your guard.", zh: "「加错好友」是典型的破冰话术，用来卸下你的防备。" },
             { en: "The instant push to switch on the camera is the trap, not the conversation.", zh: "急着让你开摄像头才是陷阱，聊天只是幌子。" },
             { en: "A precise count of your contacts is meant to make the threat feel inescapable.", zh: "精确报出你的联系人数量，是为了让威胁显得无处可逃。" } ],
    truthScam: { en: "Sextortion again. The “47 contacts” may be bluff or harvested — either way, money buys nothing but a second demand.", zh: "又是裸聊敲诈。「47 个联系人」或是诈唬或是窃取——无论如何，钱只换来下一次勒索。" },
    truthSafe: { en: "Right call. The whole con runs on shame; refusing to pay and reporting it is what ends it.", zh: "判得对。整个骗局靠羞耻感运转；拒付并报警，才是终点。" },
  },
  {
    answer: "scam", risk: 600,
    title: { en: "The Code That Pays Out, Not In", zh: "那张往外付钱的码" },
    chan: { en: "QR code · roadside stall", zh: "二维码 · 路边摊" },
    sender: { en: "Source — <b>a “merchant” QR taped over the stall's real one</b>", zh: "来源 — <b>贴在摊位真码上的一张「商家收款码」</b>" },
    text: { en: "Scan to pay ¥600 for the order.\nIf it asks you to “receive ¥600,” just confirm — that's how our terminal shows it, the system reverses it at checkout.\nHurry, there's a line behind you.", zh: "扫码支付本单 ¥600。\n如果提示「收款 ¥600」，确认就行——我们的收款机就这么显示，结账时系统会自动冲正。\n快点，后面还排着队呢。" },
    flags: [ { en: "Your app says “receive,” theirs says “pay” — the direction of money is the whole con.", zh: "你的 App 显示「收款」，他却说是「付款」——钱的流向就是骗局本身。" },
             { en: "A second QR pasted over the original is tampering, not a terminal quirk.", zh: "真码上盖了第二张码是「掉包」，不是收款机的毛病。" },
             { en: "Rushing you past the screen warning is exactly how the swap works.", zh: "催你略过屏幕上的提示，正是掉包得逞的手法。" } ],
    truthScam: { en: "A swapped collection code. Confirming a “receive” prompt actually sends YOUR money out — read which way the arrow points.", zh: "被掉包的收款码。确认「收款」提示，实际是把你的钱付出去——务必看清箭头的方向。" },
    truthSafe: { en: "You stopped at the prompt. Whenever the screen and the seller disagree, trust the screen.", zh: "你在提示前停住了。屏幕和摊主说法不一致时，永远信屏幕。" },
  },
  {
    answer: "scam", risk: 4500,
    title: { en: "The Refund That Asked Me to Refund It", zh: "让我「退给它」的退款" },
    chan: { en: "WeChat · fake customer service", zh: "微信 · 假客服" },
    sender: { en: "Sender — <b>“After-sales for your recent order”</b>, contacting you first", zh: "发件人 — <b>「您近期订单的售后专员」</b>，主动找上门" },
    text: { en: "Your item was flagged defective; we owe you a ¥4,500 refund.\nOur refund system glitched and sent the money to your “merchant balance.” To release it, scan this QR and confirm the amount — it puts the refund back into our channel so it can re-route to your card.\nScan, confirm ¥4,500, done in two minutes.", zh: "您的商品被判定为瑕疵品，我们应退您 ¥4,500。\n但退款系统出了点故障，钱误打到了您的「商户余额」里。要解冻它，请扫这张码并确认金额——这样退款会退回我们的通道，再重新打到您的卡上。\n扫码、确认 ¥4,500，两分钟就好。" },
    flags: [ { en: "Real refunds return to the original payment method automatically — they never need a QR you scan.", zh: "真退款会自动原路返回，绝不需要你去扫一张码。" },
             { en: "“Scan to release the refund” is a payment code dressed as a receipt.", zh: "「扫码解冻退款」其实是把付款码伪装成了收款码。" },
             { en: "Unsolicited “after-sales” that reaches out first, off the platform, is the warning.", zh: "主动、且脱离平台联系你的「售后」，本身就是警讯。" } ],
    truthScam: { en: "The QR is a collection code. “Confirming the refund” is you paying the scammer ¥4,500.", zh: "那张码是收款码。「确认退款」就是你把 ¥4,500 付给了骗子。" },
    truthSafe: { en: "Good — a genuine refund needs nothing from you. Check it inside the shopping app, never via a chat QR.", zh: "很好——真退款不需要你做任何事。只在购物 App 内核对，绝不扫聊天里的码。" },
  },
  {
    answer: "scam", risk: 1200,
    title: { en: "Front-Row Seats, Half Price", zh: "前排座位，半价" },
    chan: { en: "Social media post → private chat", zh: "社交平台帖子 → 私聊" },
    sender: { en: "Sender — <b>a “fan reselling two tickets”</b> well below face value", zh: "发件人 — <b>一个「转让两张内场票」的「粉丝」</b>，价格远低于票面" },
    text: { en: "Can't make the show anymore — selling my two inner-ring tickets, ¥1,200 the pair (face value ¥2,400).\nLots of people asking, so first to send a ¥1,200 deposit holds them. Pay me directly, not through any platform — it's faster and saves the service fee.\nTransfer here and I'll send the e-tickets right away.", zh: "临时去不了演出了——转我手里两张内场票，一对 ¥1,200（票面 ¥2,400）。\n问的人很多，先转 ¥1,200 定金的先得。直接转我，别走平台——又快又省手续费。\n转到这里，我马上把电子票发你。" },
    flags: [ { en: "Half price plus a “lots of buyers, pay now” squeeze is bait for a snap decision.", zh: "半价加上「很多人抢、马上转」的逼单，是诱你冲动下单的钩子。" },
             { en: "Insisting on off-platform payment removes every protection you'd have.", zh: "坚持脱离平台付款，正好抹掉了你本可拥有的所有保障。" },
             { en: "A “deposit” to a private account for a digital ticket is a disappear-after-paid setup.", zh: "为一张电子票向私人账户付「定金」，是典型的「付完就拉黑」。" } ],
    truthScam: { en: "Too-cheap ticket scam. The deposit goes through, then you're blocked and the seller vanishes.", zh: "低价票骗局。定金一到账，你就被拉黑，卖家人间蒸发。" },
    truthSafe: { en: "You passed. Resale below face value, paid privately, with no platform escrow — almost always a vanishing act.", zh: "你绕开了。低于票面、私下付款、无平台担保的转票——几乎都是「收钱即蒸发」。" },
  },
  {
    answer: "scam", risk: 2600,
    title: { en: "The Puppy in the Photos", zh: "照片里的那只小奶狗" },
    chan: { en: "Social media → chat", zh: "社交平台 → 私聊" },
    sender: { en: "Sender — <b>a “breeder” with adorable photos</b> and a price too good to be real", zh: "发件人 — <b>一个晒满萌照的「家养犬舍」</b>，价格低得不真实" },
    text: { en: "This little one's looking for a home — ¥800, vaccinated, papers included (market price ¥3,000+).\nShipping is free, but the courier needs a ¥1,800 refundable “live-animal crate + insurance” deposit before he leaves — you get it back on delivery.\nSend the ¥800 + ¥1,800 now and I'll have him on a van tonight.", zh: "这只小家伙在找家——¥800，疫苗齐全、证件齐备（市价 ¥3,000+）。\n包邮，不过快递发车前要先交 ¥1,800「活体航空箱 + 保险」押金，可退——签收时全额退还。\n现在把 ¥800 + ¥1,800 转我，今晚就给它安排上车。" },
    flags: [ { en: "Far below market price for a “papered, vaccinated” pet is the lure.", zh: "「证件齐、疫苗全」却远低于市价，正是诱饵。" },
             { en: "Surprise add-on fees — crate, insurance, “refundable deposit” — appear only after you're hooked.", zh: "航空箱、保险、「可退押金」等附加费，只在你上钩后才冒出来。" },
             { en: "You can never inspect the animal; everything happens through chat and transfers.", zh: "你永远见不到那只动物，一切都在聊天和转账里完成。" } ],
    truthScam: { en: "A classic pet scam. After the “deposit” come more fees — quarantine, vet, customs — and no puppy ever ships.", zh: "典型宠物骗局。付完「押金」还有检疫费、医疗费、关税……层层加码，而那只狗永远不会发货。" },
    truthSafe: { en: "You didn't pay. A real seller lets you see the animal in person before any money moves.", zh: "你没付。真卖家会让你先线下见到动物，再谈付款。" },
  },
  {
    answer: "scam", risk: 30000,
    title: { en: "Surrender the Policy, Pocket the Difference", zh: "退旧保新，赚个差价" },
    chan: { en: "Phone call · spoofed “insurer”", zh: "电话 · 假冒「保险公司」" },
    sender: { en: "Sender — <b>a caller naming your real policy number</b>, claiming to be from your insurer's “upgrade team”", zh: "发件人 — <b>一个能报出你真实保单号的来电</b>，自称保险公司「升级专员」" },
    text: { en: "Good news — your old policy qualifies for an upgrade with a much higher annual return.\nWe need you to surrender the current one and transfer the ¥30,000 cash value to our “upgrade settlement account” so we can re-enroll you at the better rate today.\nThis window closes at 5pm. Read me the verification code I just sent to lock in your spot.", zh: "好消息——您这份旧保单符合升级条件，年化收益高得多。\n需要您先把现有保单退保，再把 ¥30,000 现金价值转到我们的「升级结算账户」，今天就能给您按更高的费率重新投保。\n名额 5 点截止。把我刚发您的验证码念给我，给您锁定名额。" },
    flags: [ { en: "No legitimate insurer asks you to surrender a policy and wire the cash to a private settlement account.", zh: "正规保险公司绝不会让你退保后，把现金价值汇到一个私人「结算账户」。" },
             { en: "Knowing your policy number proves a data leak, not that the caller is genuine.", zh: "能报出保单号只说明信息已泄露，并不能证明来电是真的。" },
             { en: "A 5pm deadline plus a verification-code request is the phishing core.", zh: "5 点的死线加上索要验证码，是钓鱼的核心动作。" } ],
    truthScam: { en: "Policy-surrender fraud. The “higher return” is bait; the transfer and the code hand them your money and your account.", zh: "退保理财骗局。「更高收益」是诱饵；转账和验证码把你的钱和账户一并交了出去。" },
    truthSafe: { en: "You hung up. To change a policy, call the hotline printed on your own contract — never a number that called you.", zh: "你挂断了。要变更保单，请拨打你合同上印的官方热线——绝不用主动打给你的那个号码。" },
  },
  {
    answer: "scam", risk: 50000,
    title: { en: "“Dormant Policy, Free Money”", zh: "「沉睡保单，白拿一笔」" },
    chan: { en: "SMS → link", zh: "短信 → 链接" },
    sender: { en: "Sender — <b>955XX-look-alike</b>, “Policy Service Center”", zh: "发件人 — <b>仿 955XX 号段</b>，「保单服务中心」" },
    text: { en: "[Policy Service] Our records show your ¥50,000 endowment policy has a “dormant dividend” awaiting release.\nUpgrade to the new high-yield plan to claim it. Verify your identity and bank card to receive funds:\nhttp://policy-upgrade-claim.cn/auth\nUnclaimed balances are returned to the pool after 48h.", zh: "【保单服务】系统显示您一份 ¥50,000 的两全保险有「沉睡分红」待发放。\n升级至新版高收益计划即可领取。请验证身份与银行卡以接收款项：\nhttp://policy-upgrade-claim.cn/auth\n超 48 小时未领，余额将退回资金池。" },
    flags: [ { en: "“Dormant dividend you must upgrade to claim” is invented to get you onto a link.", zh: "「必须升级才能领取的沉睡分红」是编造出来引你点链接的。" },
             { en: "To “receive” money it asks you to enter your bank card — receiving never needs that.", zh: "声称给你「打钱」却要你填银行卡——收款从不需要这个。" },
             { en: "A look-alike sender and a non-official domain with a 48-hour clock.", zh: "仿冒号段、非官方域名，再加 48 小时倒计时。" } ],
    truthScam: { en: "Phishing wrapped as a policy upgrade. The page harvests your card and code to drain the account.", zh: "披着「保单升级」外衣的钓鱼。那个页面收割你的卡号和验证码，把账户掏空。" },
    truthSafe: { en: "Right call. Real dividends sit in your policy account; you claim them in the official app, never via a texted link.", zh: "判得对。真分红就在你的保单账户里，从官方 App 领取，绝不点短信链接。" },
  },
  {
    answer: "scam", risk: 3000,
    title: { en: "The Health Code That Wanted My Bank Card", zh: "要我银行卡的「健康码」" },
    chan: { en: "SMS → link", zh: "短信 → 链接" },
    sender: { en: "Source — <b>“Epidemic Control · Census Office”</b> via an unfamiliar number", zh: "来源 — <b>「疫情防控 · 普查办」</b>，陌生号码发来" },
    text: { en: "[Epidemic & Census] Your residence record needs verification for the new health registry.\nFailure to verify within 24h may freeze your health code and affect travel.\nComplete real-name verification (ID + bank card + SMS code) here:\nhttp://gov-census-verify.cn/reg", zh: "【防疫普查】您的居住信息需在新版健康登记系统中核验。\n24 小时内未核验，可能导致健康码异常，影响出行。\n请在此完成实名核验（身份证 + 银行卡 + 短信验证码）：\nhttp://gov-census-verify.cn/reg" },
    flags: [ { en: "Health codes and a census never need your bank card or an SMS code.", zh: "健康码和人口普查从不需要你的银行卡或短信验证码。" },
             { en: "Threatening to “freeze your code” and block travel is manufactured panic.", zh: "用「冻结健康码、影响出行」来制造恐慌。" },
             { en: "A government task arriving as a link from a random number is the red flag.", zh: "政务事项以陌生号码的链接形式出现，正是危险信号。" } ],
    truthScam: { en: "Impersonating epidemic/census authority. The form steals your identity and card to empty the account.", zh: "冒充防疫与普查机构。那张表单盗走你的身份信息和卡号，把账户清空。" },
    truthSafe: { en: "Good — real public-health or census work is done in person or via official channels, never by texted card-entry links.", zh: "很好——真正的防疫或普查通过线下或官方渠道完成，绝不会发让你填卡号的短信链接。" },
  },
  {
    answer: "scam", risk: 200,
    title: { en: "Unlock the Game, Borrow Mom's Phone", zh: "解除防沉迷，借妈妈的手机" },
    chan: { en: "Fan group chat · QR code", zh: "粉丝群 · 二维码" },
    sender: { en: "Sender — <b>“Admin” of a star's fan group</b>, offering free perks", zh: "发件人 — <b>某明星「粉丝群管理员」</b>，发福利" },
    text: { en: "🎁 Free signed photo + remove your game anti-addiction limit, today only!\nKids: borrow a parent's phone, scan this QR with their payment app to “verify you're an adult.”\nIf a code pops up, just read it back to me here — that's how we confirm the unlock. Don't tell your parents, it's a surprise!", zh: "🎁 免费签名照 + 解除游戏防沉迷，仅限今天！\n小朋友用家长的手机，打开家长的支付软件扫这个码「验证你是成年人」。\n要是弹出验证码，直接念给群里的我就行——这样才能确认解锁。先别告诉爸妈，给他们个惊喜！" },
    flags: [ { en: "Targets minors and tells them to use a parent's payment app — the real goal is the wallet.", zh: "专挑未成年人，让其用家长的支付软件——真正盯上的是钱包。" },
             { en: "“Scan to verify” with a payment app is a collection code that takes money out.", zh: "用支付软件「扫码验证」其实是一张往外付钱的收款码。" },
             { en: "“Read me the code, don't tell your parents” is grooming for theft.", zh: "「把验证码念给我、别告诉爸妈」是诱导盗刷的话术。" } ],
    truthScam: { en: "Aimed at children: the QR pays the scammer and the code authorizes it — secrecy is how it goes unnoticed.", zh: "专坑孩子：扫码把钱付给骗子，验证码完成授权——「保密」让它无人察觉。" },
    truthSafe: { en: "You stopped it. No real fan group or game lifts limits by scanning a parent's payment app — tell the child to ignore it.", zh: "你拦住了。真粉丝群和游戏绝不会靠扫家长支付码来解限——告诉孩子直接无视。" },
  },
  {
    answer: "safe", risk: 0,
    title: { en: "A Charge You Didn't Recognize", zh: "一笔没认出的扣款" },
    chan: { en: "Bank SMS · official number", zh: "银行短信 · 官方号段" },
    sender: { en: "Source — your bank's official alert line (95-prefix)", zh: "来源 — 你银行的官方短信号段（95 开头）" },
    text: { en: "Card ending 4417 was charged ¥468.00 at a fuel station at 18:52.\nNot you? Call the customer-service number printed on the back of your card.\nWe never request your PIN or any verification code by SMS.", zh: "尾号 4417 卡片 18:52 在某加油站消费 ¥468.00。\n非本人操作？请拨打卡背印制的客服电话核实。\n我行绝不会通过短信向您索取密码或验证码。" },
    flags: [ { en: "A plain charge notice — no link to tap, no countdown.", zh: "只是消费告知——没有链接、没有倒计时。" },
             { en: "Sends you to the number on your own card, not one it supplies.", zh: "让你拨卡背官方电话，而非它提供的号码。" },
             { en: "States outright it will never ask for a PIN or code.", zh: "明说绝不索要密码或验证码。" } ],
    truthScam: { en: "This was a real alert — over-blocking means an actual fraudulent charge slips past unnoticed.", zh: "这是真实提醒——过度拦截，真有盗刷时反而被忽略。" },
    truthSafe: { en: "Right call. A genuine bank routes you to the official number to verify it.", zh: "判得对。真银行让你用官方电话核实它自己。" },
  },
  {
    answer: "safe", risk: 0,
    title: { en: "Money In", zh: "到账" },
    chan: { en: "Wallet app notification", zh: "钱包 App 通知" },
    sender: { en: "Source — your wallet app's in-app notification", zh: "来源 — 你的钱包 App 应用内通知" },
    text: { en: "Received ¥520.00 from Lin.\nBalance updated. View details in the app.\nNote from sender: \"thanks for covering lunch\"", zh: "已收到 Lin 转给你的 ¥520.00。\n余额已更新，详情可在 App 内查看。\n对方留言：「上次午饭多谢啦」" },
    flags: [ { en: "Money is coming IN to you — nothing to pay, nothing to confirm.", zh: "钱是「进账」——你无需付款、无需确认。" },
             { en: "Arrives inside the official app, not as an outside link.", zh: "来自官方 App 内部，而非外部链接。" },
             { en: "No code requested, no urgency, no action button at all.", zh: "不索要验证码、不催促、根本没有操作按钮。" } ],
    truthScam: { en: "Genuine incoming transfer — block reflexes like this and you start distrusting your own money arriving.", zh: "真实进账——这样条件反射地拦截，连自己收到的钱都开始怀疑。" },
    truthSafe: { en: "Right call. Incoming, already settled, inside the official app — nothing for a thief to take.", zh: "判得对。进账、已结算、在官方 App 内——骗子无从下手。" },
  },
  {
    answer: "safe", risk: 0,
    title: { en: "Your Statement Is Ready", zh: "账单已生成" },
    chan: { en: "Bank SMS · official number", zh: "银行短信 · 官方号段" },
    sender: { en: "Source — your card issuer's official messaging number", zh: "来源 — 你发卡行的官方短信号段" },
    text: { en: "Your card ending 2096 statement for this month is ready.\nAmount due ¥1,820.36, due date the 18th.\nView it in the bank app or call the number on your card. No links here.", zh: "您尾号 2096 信用卡本月账单已生成。\n本期应还 ¥1,820.36，还款日 18 日。\n请在手机银行查看或拨打卡背电话咨询。本短信不含任何链接。" },
    flags: [ { en: "A routine statement-ready notice — informational only.", zh: "常规的账单生成提醒——纯告知性质。" },
             { en: "Points you to the bank app, and explicitly contains no link.", zh: "引导你去手机银行，并明确说明不含链接。" },
             { en: "Doesn't ask you to pay through it or share anything.", zh: "不让你通过它付款，也不索取任何信息。" } ],
    truthScam: { en: "A real statement notice — flag every one and you'll miss the bill that actually matters.", zh: "真实账单提醒——把每条都拦掉，真正该还的账单反而错过。" },
    truthSafe: { en: "Right call. Statement notices state a balance; they don't chase a payment via a link.", zh: "判得对。账单提醒只告知金额，不会用链接催你还款。" },
  },
  {
    answer: "safe", risk: 0,
    title: { en: "The Code You Should Not Share", zh: "请勿外传的验证码" },
    chan: { en: "SMS · OTP delivery", zh: "短信 · 验证码下发" },
    sender: { en: "Source — verification code from an app you are logging into right now", zh: "来源 — 你正在登录的某 App 下发的验证码" },
    text: { en: "Your verification code is 740913.\nUse it within 5 minutes to sign in.\nDo NOT share this code with anyone, including staff who claim to be us.", zh: "您的验证码为 740913。\n请在 5 分钟内输入完成登录。\n请勿向任何人透露此验证码，包括自称我方客服的人。" },
    flags: [ { en: "It delivers a code TO you because you asked to log in — it asks for nothing back.", zh: "它把验证码「下发」给你，因为是你在登录——它不索要任何东西。" },
             { en: "It actively warns you not to share the code with anyone.", zh: "它主动警告你不要把验证码告诉任何人。" },
             { en: "No link, no reply requested, no payment.", zh: "无链接、不需回复、不涉及付款。" } ],
    truthScam: { en: "This is the real OTP you just requested — the danger is a caller asking you to read it out, not the SMS itself.", zh: "这是你刚请求的真实验证码——危险的是让你念出来的来电，而不是这条短信本身。" },
    truthSafe: { en: "Right call. A genuine code arrives because YOU triggered it and tells you to keep it secret.", zh: "判得对。真验证码是你自己触发才下发的，还提醒你保密。" },
  },
  {
    answer: "safe", risk: 0,
    title: { en: "Card Activated", zh: "卡片已激活" },
    chan: { en: "Bank SMS · official number", zh: "银行短信 · 官方号段" },
    sender: { en: "Source — your bank, after you activated the card in-branch", zh: "来源 — 你刚在网点激活卡片后的银行回执" },
    text: { en: "Your new card ending 8830 has been successfully activated and is ready to use.\nDidn't do this? Call the number on the card or visit any branch.\nWe will never ask for your code or password to activate a card.", zh: "您尾号 8830 的新卡已成功激活，可正常使用。\n非本人操作？请拨打卡背电话或前往任意网点。\n激活卡片我行绝不会向您索要验证码或密码。" },
    flags: [ { en: "A confirmation of something already done — not a request.", zh: "对已完成动作的「确认」——不是请求。" },
             { en: "If it wasn't you, it points to the card number or a branch.", zh: "若非本人，引导你拨卡背电话或去网点。" },
             { en: "Explicitly says it won't ask for a code or password.", zh: "明确表示不会索要验证码或密码。" } ],
    truthScam: { en: "A genuine activation receipt — distrust every confirmation and the real warning gets lost in the noise.", zh: "真实的激活回执——若连确认都不信，真正的警报会淹没在噪音里。" },
    truthSafe: { en: "Right call. It confirms a completed action and asks for nothing in return.", zh: "判得对。它只确认一个已完成的动作，不索取任何回报。" },
  },
  {
    answer: "safe", risk: 0,
    title: { en: "Your Parcel Is at the Locker", zh: "包裹已到柜" },
    chan: { en: "SMS · courier station", zh: "短信 · 快递驿站" },
    sender: { en: "Source — the pickup locker near your building", zh: "来源 — 你小区楼下的快递柜" },
    text: { en: "Your parcel has arrived at Locker B, slot 22.\nPickup code: 6-1148. Collect within 24 hours.\nNo payment due. Bring the code; no need to reply to this message.", zh: "您的包裹已到 B 号快递柜 22 格。\n取件码：6-1148。请于 24 小时内取走。\n无需付款。凭码取件即可，无需回复本短信。" },
    flags: [ { en: "It's only a pickup code — there is nothing to pay.", zh: "只是一个取件码——没有任何费用。" },
             { en: "No link to open, no reply needed.", zh: "没有链接可点、无需回复。" },
             { en: "The code lets you take a parcel out, it can't take anything from you.", zh: "这个码是让你取出包裹，拿不走你任何东西。" } ],
    truthScam: { en: "A real locker notice — treat every pickup code as a trap and you'll leave your own parcels rotting.", zh: "真实的到柜通知——把每个取件码都当陷阱，自己的包裹只能烂在柜里。" },
    truthSafe: { en: "Right call. A pickup code is a key to your own parcel, not a door into your account.", zh: "判得对。取件码是打开你自己包裹的钥匙，不是进你账户的门。" },
  },
  {
    answer: "safe", risk: 0,
    title: { en: "Between 2 and 4 This Afternoon", zh: "下午两点到四点之间" },
    chan: { en: "SMS · courier", zh: "短信 · 快递员" },
    sender: { en: "Source — the delivery driver handling your order today", zh: "来源 — 今天派送你订单的快递员" },
    text: { en: "Hi, this is your courier. Your parcel will arrive between 2 and 4 PM today.\nIf you're out, I can leave it with the front desk — just let me know.\nThanks!", zh: "您好，我是您的快递员。今天下午 2 点到 4 点之间为您派送。\n若不在家，可代放前台，您回个话即可。\n谢谢！" },
    flags: [ { en: "A delivery time window — coordination, not a transaction.", zh: "派送时间段——只是协调，不涉及任何交易。" },
             { en: "Asks nothing about money, codes, or accounts.", zh: "完全不提钱、验证码或账户。" },
             { en: "Offers a normal option (leave at front desk), no link.", zh: "提供常规选项（放前台），没有链接。" } ],
    truthScam: { en: "A genuine courier text — block these and you teach yourself to fear ordinary delivery logistics.", zh: "真实的快递沟通——拦掉这些，只会让你对日常派送也心生恐惧。" },
    truthSafe: { en: "Right call. It coordinates a drop-off; there's nothing here for a scammer to harvest.", zh: "判得对。它只是约派送时间，骗子在这里无利可图。" },
  },
  {
    answer: "safe", risk: 0,
    title: { en: "Signed For", zh: "已签收" },
    chan: { en: "App notification · logistics", zh: "App 通知 · 物流" },
    sender: { en: "Source — the shopping app's order-tracking notification", zh: "来源 — 购物 App 的订单物流通知" },
    text: { en: "Your order has been delivered and signed for at 11:07.\nSigned by: front desk.\nRate your delivery in the app if you like — entirely optional.", zh: "您的订单已于 11:07 妥投签收。\n签收：前台代收。\n如愿可在 App 内评价本次配送，纯属自愿。" },
    flags: [ { en: "A delivery confirmation after the fact — nothing pending.", zh: "事后的签收确认——没有任何待办。" },
             { en: "The only suggested action (rating) is optional and in-app.", zh: "唯一建议的动作（评价）是自愿的，且在 App 内。" },
             { en: "No fee, no link, no request for any detail.", zh: "无费用、无链接、不索取任何信息。" } ],
    truthScam: { en: "A real 'signed for' notice — flagging it as fraud just trains needless suspicion of normal updates.", zh: "真实的签收通知——把它当诈骗，只会训练出对正常通知的无谓怀疑。" },
    truthSafe: { en: "Right call. A delivery confirmation reports a finished event and demands nothing.", zh: "判得对。签收通知只是告知一件已完成的事，毫无索求。" },
  },
  {
    answer: "safe", risk: 0,
    title: { en: "He Paid You Back", zh: "他把钱还你了" },
    chan: { en: "WeChat · transfer received", zh: "微信 · 收到转账" },
    sender: { en: "Source — your friend Wang, in your direct chat", zh: "来源 — 你和朋友 Wang 的私聊里" },
    text: { en: "[Transfer received] ¥300.00 from Wang — already credited to your balance.\nWang: \"Here's the concert ticket money I owed you. Cheers!\"", zh: "[已收款] 收到 Wang 的转账 ¥300.00 —— 已存入零钱。\nWang：「上次演唱会票钱还你，谢啦！」" },
    flags: [ { en: "Money already received and credited — the transfer is done.", zh: "钱已收到并入账——转账已完成。" },
             { en: "It's from a friend you actually know, in your real chat.", zh: "来自你真正认识的朋友，在你们真实的聊天里。" },
             { en: "Nothing asked of you; no confirm, no code, no link.", zh: "对你没有任何要求；无需确认、无验证码、无链接。" } ],
    truthScam: { en: "A real repayment — be this jumpy and you'll start refusing money people genuinely owe you.", zh: "真实的还款——这么疑神疑鬼，连别人真欠你的钱都不敢收了。" },
    truthSafe: { en: "Right call. Incoming, settled, from a known friend — a textbook genuine transfer.", zh: "判得对。进账、已结算、来自熟识好友——教科书级的真实转账。" },
  },
  {
    answer: "safe", risk: 0,
    title: { en: "Save the Date", zh: "婚礼请柬" },
    chan: { en: "WeChat · e-invite", zh: "微信 · 电子请柬" },
    sender: { en: "Source — your cousin Mei, sharing a wedding e-invite", zh: "来源 — 你表姐 Mei 分享的婚礼电子请柬" },
    text: { en: "Mei: \"We're finally doing it! 🎉\"\n[Mini-program card] Mei & Daniel — Wedding, Oct 6, Riverside Hall.\nTap to RSVP and see the map. Hope you can make it!", zh: "Mei：「我们终于要办啦！🎉」\n[小程序卡片] Mei & Daniel 婚礼 · 10 月 6 日 · 江畔礼堂\n点击回复出席并查看地图，盼你来！" },
    flags: [ { en: "A wedding invite from a relative — celebration, not a charge.", zh: "亲戚发来的婚礼请柬——是喜事，不是收费。" },
             { en: "The card is an in-app mini-program, not an outside payment link.", zh: "卡片是 App 内小程序，不是外部支付链接。" },
             { en: "RSVP and a map — it never asks for money or a code.", zh: "回复出席和看地图——从不索要钱款或验证码。" } ],
    truthScam: { en: "A genuine invitation — block your own family's wedding card and the cost is a relationship, not money.", zh: "真实的请柬——把自家亲戚的婚礼请柬都拦了，赔上的是关系，不是钱。" },
    truthSafe: { en: "Right call. An e-invite gathers an RSVP, not your bank details.", zh: "判得对。电子请柬要的是你出不出席，不是你的银行信息。" },
  },
  {
    answer: "safe", risk: 0,
    title: { en: "The Group Settles Up", zh: "群里 AA 收尾" },
    chan: { en: "WeChat group · AA bill", zh: "微信群 · AA 收款" },
    sender: { en: "Source — the trip group, where Lin organized the split", zh: "来源 — 出游群里，Lin 发起的拆账" },
    text: { en: "Lin: \"Trip costs all split. Mei, you actually overpaid — sending your share back.\"\n[Transfer received] ¥86.00 from Lin — credited to your balance.", zh: "Lin：「这趟的花销都 AA 平了。Mei 你多付了，退你一点。」\n[已收款] 收到 Lin 的转账 ¥86.00 —— 已入账。" },
    flags: [ { en: "The settle-up sends money TO you — you're being repaid.", zh: "这次结算是把钱「退给」你——你在收钱。" },
             { en: "It happens inside a real group chat you belong to.", zh: "发生在你所在的真实群聊里。" },
             { en: "Already credited; no further action, no link.", zh: "已经入账；无需后续操作，没有链接。" } ],
    truthScam: { en: "A genuine refund of your overpayment — over-flag and you miss money that's rightfully yours.", zh: "真实退回你多付的钱——过度拦截，本属于你的钱反而拿不到。" },
    truthSafe: { en: "Right call. An incoming settle-up in a group you trust is exactly what it looks like.", zh: "判得对。可信群里的进账结算，就是它看上去的样子。" },
  },
  {
    answer: "safe", risk: 0,
    title: { en: "Your Order Has Shipped", zh: "您的订单已发货" },
    chan: { en: "App notification · marketplace", zh: "App 通知 · 电商" },
    sender: { en: "Source — the marketplace app where you placed the order", zh: "来源 — 你下单的电商 App" },
    text: { en: "Order #77-2031 has shipped.\nCarrier: SF-line; tracking visible in the app.\nEstimated arrival in 2–3 days. Track it anytime under My Orders.", zh: "订单 #77-2031 已发货。\n承运：顺丰线路，物流可在 App 内查看。\n预计 2–3 天送达，可随时在「我的订单」中跟踪。" },
    flags: [ { en: "A shipping update for an order you actually placed.", zh: "你确实下过的订单的发货通知。" },
             { en: "Tracking lives inside the app — no outside link pushed.", zh: "物流在 App 内查看——没有推外部链接。" },
             { en: "No payment, no code, no urgency.", zh: "不涉及付款、验证码或催促。" } ],
    truthScam: { en: "A real shipping notice — distrust every one and you can't tell the fake 'reship fee' scam from the truth.", zh: "真实的发货通知——若每条都不信，反而分不清「补运费」骗局和真相。" },
    truthSafe: { en: "Right call. A genuine shipment update keeps tracking in-app and asks for nothing.", zh: "判得对。真实发货通知把物流留在 App 内，毫无索求。" },
  },
  {
    answer: "safe", risk: 0,
    title: { en: "Refund Back to Where It Came", zh: "原路退款" },
    chan: { en: "App notification · refund", zh: "App 通知 · 退款" },
    sender: { en: "Source — the shop app, after you returned an item", zh: "来源 — 你退货后，店铺 App 的退款回执" },
    text: { en: "Your refund of ¥159.00 for the returned shoes has been processed.\nIt will return to your original payment method in 1–3 business days.\nNo action needed from you.", zh: "您退货的鞋子，退款 ¥159.00 已处理。\n将于 1–3 个工作日原路退回您的原支付方式。\n您无需任何操作。" },
    flags: [ { en: "Money is coming BACK to you, by the original route.", zh: "钱是「原路退回」给你的。" },
             { en: "Explicitly says no action is needed — nothing to click.", zh: "明说你无需任何操作——没有可点的东西。" },
             { en: "Doesn't ask for card details to 'process' the refund.", zh: "不索要卡号去「办理」退款。" } ],
    truthScam: { en: "A real refund — the scam version asks for your card to 'send' it; this one asks for nothing.", zh: "真实退款——诈骗版会让你提供卡号去「打款」，这条什么都不要。" },
    truthSafe: { en: "Right call. A genuine refund returns by the original path and needs no card details.", zh: "判得对。真退款原路返回，不需要你的卡信息。" },
  },
  {
    answer: "safe", risk: 0,
    title: { en: "Tomorrow at 9:30", zh: "明天九点半" },
    chan: { en: "SMS · clinic reminder", zh: "短信 · 诊所提醒" },
    sender: { en: "Source — the dental clinic where you booked", zh: "来源 — 你预约过的牙科诊所" },
    text: { en: "Reminder: your dental check-up is tomorrow at 9:30 AM with Dr. Han.\nTo reschedule, call the clinic at 0XX-5512-0080.\nPlease arrive 10 minutes early. No payment needed now.", zh: "提醒：您预约的口腔检查为明天上午 9:30，韩医生。\n如需改约请致电诊所 0XX-5512-0080。\n请提前 10 分钟到达，现在无需付款。" },
    flags: [ { en: "An appointment reminder for a booking you made.", zh: "你亲自预约过的就诊提醒。" },
             { en: "To change it, you phone the clinic — no link to follow.", zh: "改约是打诊所电话——没有链接要点。" },
             { en: "Says plainly no payment is needed now.", zh: "明说现在无需付款。" } ],
    truthScam: { en: "A genuine reminder — reflexively blocking it just means you miss the appointment, not a scam.", zh: "真实的提醒——条件反射地拦掉，只会让你错过就诊，而非躲过诈骗。" },
    truthSafe: { en: "Right call. A real reminder confirms a time and offers a phone number to reschedule.", zh: "判得对。真提醒只确认时间，并给出改约电话。" },
  },
  {
    answer: "safe", risk: 0,
    title: { en: "Renewed — Cancel in Settings", zh: "已续费 · 可在设置里取消" },
    chan: { en: "Email · subscription receipt", zh: "邮件 · 订阅收据" },
    sender: { en: "Source — the music app you subscribe to, billing receipt", zh: "来源 — 你订阅的音乐 App 的扣费收据" },
    text: { en: "Your monthly membership renewed: ¥18.00.\nThis is a receipt for a plan you signed up for.\nTo cancel future renewals, open the app → Settings → Subscription. No link in this email.", zh: "您的月度会员已续费：¥18.00。\n这是您已开通套餐的扣费收据。\n如需取消后续续费，请在 App → 设置 → 订阅 中操作。本邮件不含链接。" },
    flags: [ { en: "A receipt for a subscription you actually started.", zh: "你确实开通过的订阅的扣费收据。" },
             { en: "Cancel route is inside the app's own settings — no link.", zh: "取消入口在 App 自带设置里——没有链接。" },
             { en: "Small, expected amount; it asks for nothing back.", zh: "金额小且符合预期；不向你索取任何东西。" } ],
    truthScam: { en: "A real renewal receipt — fear every charge mail and you'll miss the day a fake one actually appears.", zh: "真实的续费收据——若对每封扣费邮件都恐慌，真假冒那天反而看不出来。" },
    truthSafe: { en: "Right call. A genuine receipt sends you to in-app settings, not an outside 'cancel' link.", zh: "判得对。真收据让你去 App 内设置取消，而非外部「取消」链接。" },
  },
  {
    answer: "safe", risk: 0,
    title: { en: "Salary Is In", zh: "工资到账" },
    chan: { en: "Bank SMS · official number", zh: "银行短信 · 官方号段" },
    sender: { en: "Source — your payroll bank's official alert line", zh: "来源 — 你工资卡银行的官方提醒号段" },
    text: { en: "Account ending 1175 received a credit of ¥9,640.00 at 00:12 (payroll).\nBalance updated. For details, log in to the bank app.\nWe never request codes or passwords by SMS.", zh: "尾号 1175 账户于 00:12 入账 ¥9,640.00（代发工资）。\n余额已更新，详情请登录手机银行。\n我行绝不通过短信索要验证码或密码。" },
    flags: [ { en: "A credit landing in your account — money in, not out.", zh: "账户「入账」一笔——是进钱，不是出钱。" },
             { en: "Details live in the bank app; no link in the text.", zh: "详情在手机银行查看；短信里没有链接。" },
             { en: "States it never asks for codes or passwords.", zh: "声明绝不索要验证码或密码。" } ],
    truthScam: { en: "A genuine payroll credit — over-blocking trains you to doubt even your own wages arriving.", zh: "真实的工资入账——过度拦截，会让你连自己的工资到账都怀疑。" },
    truthSafe: { en: "Right call. An incoming-credit alert with no link and no request is exactly what it seems.", zh: "判得对。无链接、无索求的入账提醒，就是它看上去那样。" },
  },
  {
    answer: "safe", risk: 0,
    title: { en: "Pick It Up at the Counter", zh: "到店自提" },
    chan: { en: "SMS · store pickup", zh: "短信 · 门店自提" },
    sender: { en: "Source — the bakery where you ordered a cake", zh: "来源 — 你订蛋糕的那家烘焙店" },
    text: { en: "Your cake order is ready for pickup at our Riverside store.\nPickup code: 0925. Show it at the counter; we close at 9 PM.\nAlready paid online — nothing more due.", zh: "您预订的蛋糕已可到江畔门店自提。\n自提码：0925。到柜台出示即可，我们 21 点打烊。\n已在线支付，无需再付。" },
    flags: [ { en: "Only a pickup code for something you already paid for.", zh: "只是你已付款商品的自提码。" },
             { en: "Explicitly says nothing more is due.", zh: "明确说明无需再付。" },
             { en: "No link, no reply, no account details touched.", zh: "无链接、无需回复、不涉及账户信息。" } ],
    truthScam: { en: "A real pickup code — flag it and you just leave your own paid cake sitting at the counter.", zh: "真实的自提码——拦了它，只会把自己付过钱的蛋糕晾在柜台上。" },
    truthSafe: { en: "Right call. A pickup code releases your goods; it can't reach into your account.", zh: "判得对。自提码是放行你的货品，碰不到你的账户。" },
  },
  {
    answer: "safe", risk: 0,
    title: { en: "Grandson's Tuition, Received", zh: "孙子学费，已收到" },
    chan: { en: "WeChat · family chat", zh: "微信 · 家人群" },
    sender: { en: "Source — your daughter, in the family chat", zh: "来源 — 家人群里你女儿" },
    text: { en: "Daughter: \"Mom, sending the money for Tiantian's tuition so you can pay the school directly. Thank you!\"\n[Transfer received] ¥2,400.00 — credited to your balance.", zh: "女儿：「妈，天天的学费我转给你，您直接交给学校就行，辛苦啦！」\n[已收款] 收到转账 ¥2,400.00 —— 已存入零钱。" },
    flags: [ { en: "Money received from your own daughter in the family chat.", zh: "在家人群里收到亲女儿的转账。" },
             { en: "It's incoming and already credited — nothing to confirm.", zh: "是进账且已入账——无需确认。" },
             { en: "No link, no code, no stranger involved.", zh: "没有链接、没有验证码、没有陌生人。" } ],
    truthScam: { en: "A genuine family transfer — block it and an elderly parent learns to distrust their own children.", zh: "真实的家人转账——拦了它，会让老人连自己孩子都不敢信。" },
    truthSafe: { en: "Right call. Incoming money from a real family member in a known chat is safe.", zh: "判得对。在熟悉的家人群里收到真家人的钱，是安全的。" },
  },
  {
    answer: "safe", risk: 0,
    title: { en: "Two-Step Code, On Request", zh: "你点了「获取验证码」" },
    chan: { en: "SMS · OTP delivery", zh: "短信 · 验证码下发" },
    sender: { en: "Source — the wallet app, after you tapped 'send code'", zh: "来源 — 你点了「获取验证码」后，钱包 App 下发" },
    text: { en: "[Wallet] Code 305562 to confirm it's you on this device.\nValid 10 minutes. Enter it only on the app screen that asked for it.\nNever tell this code to anyone.", zh: "【钱包】验证码 305562，用于确认本机为您本人。\n10 分钟内有效。仅在弹出索取它的 App 页面内输入。\n切勿将此验证码告诉任何人。" },
    flags: [ { en: "You requested it — the code is the answer to your own tap.", zh: "是你请求的——这码是对你自己操作的回应。" },
             { en: "Tells you to enter it only on the app screen, not give it out.", zh: "让你只在 App 页面输入，而非交给别人。" },
             { en: "Warns never to tell it to anyone; no link, no reply.", zh: "警告切勿告诉任何人；无链接、无需回复。" } ],
    truthScam: { en: "The real OTP you asked for — the trap is anyone on the phone wanting it read aloud.", zh: "你自己请求的真验证码——陷阱是电话那头想让你念出来的人。" },
    truthSafe: { en: "Right call. A code you triggered, told to keep private, is a normal login step.", zh: "判得对。你触发的、被叮嘱保密的验证码，是正常的登录步骤。" },
  },
  {
    answer: "safe", risk: 0,
    title: { en: "The Vendor Paid the Invoice", zh: "客户把货款打来了" },
    chan: { en: "Bank SMS · official number", zh: "银行短信 · 官方号段" },
    sender: { en: "Source — your small shop's settlement bank, official line", zh: "来源 — 你小店结算银行的官方号段" },
    text: { en: "Business account ending 6602 received ¥7,800.00 at 15:30, ref INV-441.\nFunds credited. View in the bank app.\nWe will never ask for your code or password to receive a payment.", zh: "对公尾号 6602 账户 15:30 入账 ¥7,800.00，附言 INV-441。\n款项已到账，详情见手机银行。\n收款无需任何操作，我行绝不索要验证码或密码。" },
    flags: [ { en: "A payment landing in your business account — incoming funds.", zh: "对公账户「收款入账」——是进账。" },
             { en: "Reference matches an invoice you issued (INV-441).", zh: "附言与你开出的发票号一致（INV-441）。" },
             { en: "No link; says no action is needed to receive it.", zh: "无链接；说明收款无需任何操作。" } ],
    truthScam: { en: "A genuine customer payment — a small-business owner who blocks these can't trust their own takings.", zh: "真实的客户付款——小店主若连这都拦，连自己的进账都不敢认。" },
    truthSafe: { en: "Right call. Incoming funds with a matching invoice ref and no request are genuine.", zh: "判得对。附言对得上、又无任何索求的进账，是真的。" },
  },
  {
    answer: "safe", risk: 0,
    title: { en: "Your Game Reward, Claimed In-Client", zh: "游戏奖励，客户端内领取" },
    chan: { en: "App notification · game client", zh: "App 通知 · 游戏客户端" },
    sender: { en: "Source — the game's own in-client mailbox", zh: "来源 — 游戏自带的客户端邮箱" },
    text: { en: "Season reward delivered to your in-game mailbox: 1 skin chest + 200 coins.\nClaim it from the mailbox inside the client.\nNo top-up required; we never ask for your password.", zh: "赛季奖励已发放至你的游戏内邮箱：皮肤箱 ×1 + 金币 ×200。\n请在客户端邮箱内领取。\n无需充值；我们绝不会索要你的密码。" },
    flags: [ { en: "The reward is already in your in-client mailbox — given, not sold.", zh: "奖励已在客户端邮箱里——是发放，不是售卖。" },
             { en: "Claimed inside the game, with no external site.", zh: "在游戏内领取，没有任何外部网站。" },
             { en: "Says no top-up needed and never asks for a password.", zh: "说明无需充值，且绝不索要密码。" } ],
    truthScam: { en: "A genuine in-game reward — the scam version sends you off-client to 'verify'; this stays put.", zh: "真实的游戏奖励——诈骗版会引你跳出客户端去「验证」，这条不会。" },
    truthSafe: { en: "Right call. A reward you claim inside the official client, with no off-site step, is safe.", zh: "判得对。在官方客户端内领取、不跳转外部的奖励，是安全的。" },
  },
  {
    answer: "safe", risk: 0,
    title: { en: "Deposit Returned After Checkout", zh: "退房后退还押金" },
    chan: { en: "App notification · booking app", zh: "App 通知 · 民宿 App" },
    sender: { en: "Source — the stays app, after you checked out", zh: "来源 — 你退房后的民宿预订 App" },
    text: { en: "Your ¥500.00 deposit for the riverside stay has been released.\nIt will return to your original payment method within 5 days.\nNothing required from you. Questions? Contact the host in-app.", zh: "您江畔民宿的 ¥500.00 押金已释放。\n将于 5 日内原路退回您的原支付方式。\n您无需任何操作。如有疑问，可在 App 内联系房东。" },
    flags: [ { en: "A deposit coming BACK to you after checkout.", zh: "退房后押金「退还」给你。" },
             { en: "Returns by the original payment route automatically.", zh: "自动原路退回原支付方式。" },
             { en: "No action required; support is in-app, no link.", zh: "无需任何操作；客服在 App 内，没有链接。" } ],
    truthScam: { en: "A real deposit release — over-flag it and you might chase a 'help' line that's the actual scam.", zh: "真实的押金释放——过度拦截，反倒可能去找那个才是骗局的「客服」。" },
    truthSafe: { en: "Right call. A genuine deposit return goes by the original route and needs nothing from you.", zh: "判得对。真押金原路退回，不需要你做任何事。" },
  },
  {
    answer: "safe", risk: 0,
    title: { en: "Table for Four, Confirmed", zh: "四人桌，已确认" },
    chan: { en: "SMS · restaurant booking", zh: "短信 · 餐厅订位" },
    sender: { en: "Source — the restaurant you reserved with", zh: "来源 — 你订位的那家餐厅" },
    text: { en: "Your table for 4 is confirmed for Saturday 7:00 PM.\nTo change party size or cancel, call us at 0XX-6620-1188.\nWe hold the table 15 minutes. See you then!", zh: "您预订的 4 人桌已确认，周六晚 7:00。\n如需调整人数或取消，请致电 0XX-6620-1188。\n我们为您保留座位 15 分钟，恭候光临！" },
    flags: [ { en: "A reservation confirmation for a booking you made.", zh: "你亲自预订的订位确认。" },
             { en: "Changes go through a phone call, not a link.", zh: "调整通过打电话，而非链接。" },
             { en: "No deposit demanded, no code, no payment.", zh: "不要求押金、不要验证码、不涉及付款。" } ],
    truthScam: { en: "A genuine confirmation — block it and the only casualty is your dinner plan.", zh: "真实的订位确认——拦了它，唯一受害的是你自己的饭局。" },
    truthSafe: { en: "Right call. A booking confirmation states a time and a phone number, nothing more.", zh: "判得对。订位确认只给时间和电话，仅此而已。" },
  },
  {
    answer: "safe", risk: 0,
    title: { en: "Your Number Ported Successfully", zh: "携号转网成功" },
    chan: { en: "SMS · carrier notice", zh: "短信 · 运营商通知" },
    sender: { en: "Source — your mobile carrier's official service number", zh: "来源 — 你的手机运营商官方服务号" },
    text: { en: "Your number-keep transfer completed successfully today.\nService is now active on your new plan.\nQuestions? Dial 10XXX from your phone. We won't ask for codes or passwords by SMS.", zh: "您的携号转网已于今日办理成功。\n新套餐服务现已生效。\n如有疑问，请用本机拨打 10XXX。我们不会通过短信向您索要验证码或密码。" },
    flags: [ { en: "Confirms a service change you initiated — a result, not a request.", zh: "确认你发起的业务变更——是结果，不是请求。" },
             { en: "Points you to the carrier's short hotline, no link.", zh: "引导你拨运营商官方短号，没有链接。" },
             { en: "States it won't ask for codes or passwords by SMS.", zh: "声明不会用短信索要验证码或密码。" } ],
    truthScam: { en: "A real completion notice — distrust every carrier message and you lose track of your own services.", zh: "真实的办理成功通知——若对每条运营商短信都不信，反而搞不清自己的业务。" },
    truthSafe: { en: "Right call. It confirms a change you made and routes you to the official hotline.", zh: "判得对。它确认你办的业务，并引导你拨官方热线。" },
  },
  {
    answer: "safe", risk: 0,
    title: { en: "Split the Cab, Sent Back", zh: "打车 AA，退给你" },
    chan: { en: "Wallet app · transfer received", zh: "钱包 App · 收到转账" },
    sender: { en: "Source — your colleague Zhou, in your chat", zh: "来源 — 你和同事 Zhou 的聊天里" },
    text: { en: "[Received] ¥24.50 from Zhou — credited.\nZhou: \"My half of the cab last night. You always end up paying, ha.\"", zh: "[已收款] 收到 Zhou 的 ¥24.50 —— 已入账。\nZhou：「昨晚打车我那一半，每次都你先垫，哈哈。」" },
    flags: [ { en: "An incoming reimbursement — your colleague is paying you back.", zh: "一笔进账报销——同事在还你垫付的钱。" },
             { en: "From a real coworker in your actual chat.", zh: "来自你真实聊天里的真同事。" },
             { en: "Already credited; no confirmation, no link, no code.", zh: "已入账；无需确认、没有链接、没有验证码。" } ],
    truthScam: { en: "A genuine reimbursement — be too suspicious and you decline small sums people honestly owe you.", zh: "真实的报销——疑心过重，连别人实打实欠你的小钱都不敢收。" },
    truthSafe: { en: "Right call. Small, incoming, settled, from a known colleague — plainly genuine.", zh: "判得对。小额、进账、已结算、来自熟同事——明显是真的。" },
  },
  {
    answer: "safe", risk: 0,
    title: { en: "Utility Bill Paid by Auto-Debit", zh: "水电费自动代扣成功" },
    chan: { en: "Bank SMS · official number", zh: "银行短信 · 官方号段" },
    sender: { en: "Source — your bank's official line, your standing auto-debit", zh: "来源 — 你设置的自动代扣，银行官方号段" },
    text: { en: "Auto-debit successful: ¥213.40 paid to City Utilities from card ending 1175.\nThis is the recurring payment you set up.\nManage auto-debits in the bank app. We never ask for codes by SMS.", zh: "代扣成功：尾号 1175 卡片向「市政水电」支付 ¥213.40。\n这是您已设置的自动代扣。\n如需管理代扣请在手机银行操作。我行绝不通过短信索要验证码。" },
    flags: [ { en: "Confirms a payment you pre-authorized — not a new request.", zh: "确认你预先授权的代扣——不是新请求。" },
             { en: "Manage it inside the bank app; no link pushed.", zh: "在手机银行内管理；不推链接。" },
             { en: "States it never asks for codes by SMS.", zh: "声明绝不通过短信索要验证码。" } ],
    truthScam: { en: "A real auto-debit receipt — flag every one and you can't tell it from a fake 'overdue bill' scare.", zh: "真实的代扣回执——若每条都拦，便分不清它和假的「欠费」恐吓。" },
    truthSafe: { en: "Right call. A receipt for a standing auto-debit, manageable in-app, is genuine.", zh: "判得对。已设代扣的回执、可在 App 内管理，是真的。" },
  },
  {
    answer: "safe", risk: 0,
    title: { en: "Ticket Refund After the Cancellation", zh: "停运退票，原路退回" },
    chan: { en: "App notification · travel app", zh: "App 通知 · 出行 App" },
    sender: { en: "Source — the travel-booking app, after your train was cancelled", zh: "来源 — 列车停运后，你的出行预订 App" },
    text: { en: "Your train was cancelled, so your ticket ¥176.00 is being refunded in full.\nIt returns to your original payment method, no fee deducted.\nNothing to do. Track status under My Trips.", zh: "因列车停运，您的车票 ¥176.00 将全额退款。\n原路退回您的原支付方式，不收取手续费。\n您无需任何操作，可在「我的行程」查看进度。" },
    flags: [ { en: "A full refund triggered by a cancellation — money back to you.", zh: "停运触发的全额退款——钱退还给你。" },
             { en: "Returns by the original route with no fee, no card asked.", zh: "原路退回、不收手续费、不索要卡号。" },
             { en: "Status lives in-app; nothing to click, nothing to do.", zh: "进度在 App 内；无可点项、无需操作。" } ],
    truthScam: { en: "A genuine refund — the scam clone asks for your card to 'speed it up'; this asks for nothing.", zh: "真实退款——诈骗仿冒版会让你给卡号「加快到账」，这条什么都不要。" },
    truthSafe: { en: "Right call. A real cancellation refund goes back the way it came, fee-free and hands-off.", zh: "判得对。真停运退款原路返回，免手续费、无需经手。" },
  },
  {
    answer: "safe", risk: 0,
    title: { en: "The Rebate That Was Already Yours", zh: "本就属于你的那笔返还" },
    chan: { en: "App notification · medical insurance", zh: "App 推送 · 医保" },
    sender: { en: "Source — the official medical-insurance app's in-app message centre", zh: "来源 — 官方医保 App 的站内消息中心" },
    text: { en: "A medical-insurance personal-account rebate of ¥86.40 has been credited to your account.\nView the detail in the app under Account › Records. We won't ask you for a code.\nQuestions? Call the public hotline 12393.", zh: "您的医保个人账户已到账一笔返还款 ¥86.40。\n可在 App「账户 › 明细」中查看。我们不会向您索要验证码。\n有疑问请拨打医保公共服务热线 12393。" },
    flags: [ { en: "The money is incoming and already settled — nothing is asked of you.", zh: "钱是进账且已到账——没有要你做任何事。" },
             { en: "It points you to the in-app records and the real public hotline 12393.", zh: "让你在 App 内查明细，并给出真实公共热线 12393。" },
             { en: "It states plainly it will never ask for a code — the opposite of a scam.", zh: "明说绝不索要验证码——与骗子恰恰相反。" } ],
    truthScam: { en: "This was genuine — over-blocking a real rebate notice only breeds needless alarm.", zh: "这是真的——拦下一条真返还提醒，只会徒增惊慌。" },
    truthSafe: { en: "Right call. Money arriving, no link, the real 12393 hotline — a real notice.", zh: "判得对。进账、无链接、真热线 12393——是真通知。" },
  },
  {
    answer: "safe", risk: 0,
    title: { en: "File Before the Window Closes", zh: "在申报期截止前" },
    chan: { en: "App notification · tax", zh: "App 推送 · 个税" },
    sender: { en: "Source — the personal-tax app's notification centre", zh: "来源 — 个人所得税 App 的通知中心" },
    text: { en: "Reminder: the annual personal income-tax reconciliation window is open.\nPlease complete your filing inside this app at your convenience before the deadline.\nNo link is provided — open the app yourself to proceed.", zh: "提醒：个人所得税年度汇算清缴已开始。\n请在截止日前于本 App 内自行办理申报。\n本提醒不附任何链接——请自行打开 App 操作。" },
    flags: [ { en: "It deliberately gives no link and tells you to open the app yourself.", zh: "刻意不给链接，让你自行打开 App。" },
             { en: "It asks for no money, code, or personal detail — only a reminder to file.", zh: "不要钱、不要码、不要个人信息——只是提醒申报。" },
             { en: "Filing happens inside the official app, where you log in normally.", zh: "申报在官方 App 内完成，你照常登录即可。" } ],
    truthScam: { en: "Genuine reminder — blocking it could mean missing a real filing deadline.", zh: "真提醒——拦掉它，可能错过真正的申报期限。" },
    truthSafe: { en: "Right call. A real tax notice gives no link and sends you to the app itself.", zh: "判得对。真税务通知不给链接，让你回到 App 本身办理。" },
  },
  {
    answer: "safe", risk: 0,
    title: { en: "The Pension That Landed on Time", zh: "准时落账的养老金" },
    chan: { en: "App notification · social security", zh: "App 推送 · 社保" },
    sender: { en: "Source — the social-security service app, in-app message", zh: "来源 — 社保服务 App 站内消息" },
    text: { en: "Your basic pension for this month, ¥2,180.00, has been credited.\nDetails are under Benefits › Payment Records in this app.\nWe will never ask for a verification code or a transfer.", zh: "您本月基本养老金 ¥2,180.00 已发放到账。\n可在本 App「待遇 › 发放记录」中查看。\n我们绝不会向您索要验证码，也不会要求转账。" },
    flags: [ { en: "An annuity credited — incoming money, nothing requested.", zh: "养老金到账——进账,什么都没要你做。" },
             { en: "It routes you to in-app records, not an outside page.", zh: "让你查 App 内记录,而非外部页面。" },
             { en: "It explicitly disclaims ever asking for a code or transfer.", zh: "明确声明绝不索要验证码或转账。" } ],
    truthScam: { en: "This was real — flagging a genuine pension notice teaches needless distrust.", zh: "这是真的——拦下真养老金通知,只会教人无谓地疑神疑鬼。" },
    truthSafe: { en: "Right call. Money in, no ask, in-app records — a genuine annuity notice.", zh: "判得对。进账、无索要、App 内记录——真养老金通知。" },
  },
  {
    answer: "safe", risk: 0,
    title: { en: "A Knock for the Headcount", zh: "为了那次入户登记" },
    chan: { en: "WeChat · community group", zh: "微信 · 社区群" },
    sender: { en: "Source — your residential community's official WeChat group, posted by the grid worker", zh: "来源 — 你所在社区的官方微信群,网格员发布" },
    text: { en: "Census reminder: enumerators will visit our compound this week wearing visible ID badges.\nThey only confirm how many people live here and basic household details.\nThey will NOT ask for bank cards, codes, or any payment.", zh: "人口普查提醒:本周普查员将佩戴明显工作证入户登记。\n仅核对本户居住人数及基本信息。\n绝不会索要银行卡、验证码或任何费用。" },
    flags: [ { en: "It asks for nothing financial — no card, no code, no payment.", zh: "不涉及任何钱——不要卡、不要码、不要付费。" },
             { en: "Enumerators are described as wearing visible ID, the real procedure.", zh: "普查员佩戴明显工作证,符合真实流程。" },
             { en: "Posted in the community's own official group, not a stranger's DM.", zh: "发布在社区官方群,而非陌生人私信。" } ],
    truthScam: { en: "Genuine — blocking a real census notice spreads suspicion of public services.", zh: "真的——拦下真普查通知,只会让人对公共服务平添猜忌。" },
    truthSafe: { en: "Right call. A real census confirms headcount and never touches your money.", zh: "判得对。真普查只核人数,从不碰你的钱。" },
  },
  {
    answer: "safe", risk: 0,
    title: { en: "Your Slot Is Saved", zh: "已为你留好的号" },
    chan: { en: "SMS · public health service", zh: "短信 · 公共卫生服务" },
    sender: { en: "Source — the community health centre you booked with", zh: "来源 — 你预约的社区卫生服务中心" },
    text: { en: "Vaccination reminder: your appointment is Thursday 09:30 at the community health centre.\nBring your ID. To reschedule, call the centre's listed number or use the official health app.\nNo fee or code is required by this message.", zh: "接种提醒:您预约的接种时间为周四 09:30,地点社区卫生服务中心。\n请携带身份证件。如需改期,请拨打中心公示电话或使用官方健康 App。\n本短信不收取任何费用,也不索要验证码。" },
    flags: [ { en: "A plain appointment reminder — nothing to pay, nothing to click.", zh: "纯粹的预约提醒——无需付费,无需点击。" },
             { en: "To reschedule it sends you to the centre's listed number, not a link.", zh: "改期让你拨中心公示电话,而非链接。" },
             { en: "It explicitly says no fee and no code are needed.", zh: "明确说明不收费、不索码。" } ],
    truthScam: { en: "Genuine — flagging a real health reminder may cost someone their slot.", zh: "真的——拦下真健康提醒,可能让人误了号。" },
    truthSafe: { en: "Right call. A real reminder asks for nothing but that you show up.", zh: "判得对。真提醒只要你按时到,别无所求。" },
  },
  {
    answer: "safe", risk: 0,
    title: { en: "Payday, Confirmed", zh: "发薪日,已确认" },
    chan: { en: "Work IM · HR channel", zh: "办公 IM · 人事频道" },
    sender: { en: "Source — HR on the company's internal messaging system", zh: "来源 — 公司内部办公系统中的人事部" },
    text: { en: "Payroll for this month has been processed; salaries should reach accounts within today.\nYour payslip is available in the HR self-service portal under My Pay.\nIf your deposit is missing by tomorrow, reply here — we never ask for card numbers.", zh: "本月工资已处理,薪资预计今日内到账。\n工资条可在人事自助系统「我的薪酬」中查看。\n若明日仍未到账请在此回复——我们绝不索要卡号。" },
    flags: [ { en: "Money is coming TO you; nothing is requested from you.", zh: "钱是发给你的;没有向你索要任何东西。" },
             { en: "It points to the internal HR portal, not an outside link.", zh: "指向内部人事系统,而非外部链接。" },
             { en: "It states HR never asks for card numbers.", zh: "声明人事绝不索要卡号。" } ],
    truthScam: { en: "Genuine HR notice — over-blocking internal messages erodes real comms.", zh: "真人事通知——过度拦内部消息,只会损害真实沟通。" },
    truthSafe: { en: "Right call. A payroll-deposited notice is good news, not a trap.", zh: "判得对。工资到账通知是好消息,不是陷阱。" },
  },
  {
    answer: "safe", risk: 0,
    title: { en: "Notebooks for Monday", zh: "周一要带的本子" },
    chan: { en: "App notification · school app", zh: "App 推送 · 校园 App" },
    sender: { en: "Source — the class teacher via the official school app", zh: "来源 — 班主任,经官方校园 App 发布" },
    text: { en: "Class notice: Monday's outdoor lesson is moved indoors due to weather.\nPlease have your child bring the math workbook and a pencil case.\nNo payment is collected through this notice; fees, if any, go only through the app's official channel.", zh: "班级通知:因天气原因,周一户外课改在室内进行。\n请家长让孩子带上数学练习册和文具盒。\n本通知不收取任何费用;如有缴费,仅走 App 官方缴费通道。" },
    flags: [ { en: "It's a logistics notice — books and weather, no money.", zh: "只是后勤通知——课本与天气,不涉及钱。" },
             { en: "Delivered through the official school app, not a private chat.", zh: "经官方校园 App 发布,而非私聊。" },
             { en: "Any fees go only through the app's official channel, it says.", zh: "明说缴费仅走 App 官方通道。" } ],
    truthScam: { en: "Genuine class notice — blocking it just means a missed message for the kid.", zh: "真班级通知——拦掉它,孩子只会错过一条消息。" },
    truthSafe: { en: "Right call. A real teacher's notice via the school app asks for no transfer.", zh: "判得对。真老师经校园 App 发的通知,不要你转账。" },
  },
  {
    answer: "safe", risk: 0,
    title: { en: "Approved, and Heading Back", zh: "审批通过,款将退回" },
    chan: { en: "Work IM · finance workflow", zh: "办公 IM · 财务流程" },
    sender: { en: "Source — the finance approval workflow inside the company OA system", zh: "来源 — 公司 OA 系统内的财务审批流程" },
    text: { en: "Your travel reimbursement of ¥742.00 has been approved.\nThe amount will be paid into your registered salary account in the next payment run.\nNo action needed; track status in the OA reimbursement module.", zh: "您的差旅报销 ¥742.00 已审批通过。\n款项将在下一批次打入您登记的工资账户。\n无需操作;可在 OA 报销模块查看进度。" },
    flags: [ { en: "Reimbursement money is coming to you — nothing to send.", zh: "报销款是退给你的——无需付出任何东西。" },
             { en: "It pays into your existing salary account, no new details asked.", zh: "打入你既有工资账户,不索要新信息。" },
             { en: "Status lives in the OA module — an internal, traceable workflow.", zh: "进度在 OA 模块查看——内部、可追溯的流程。" } ],
    truthScam: { en: "Genuine approval — flagging it teaches distrust of normal workflows.", zh: "真审批——拦它,只会让人不信任正常流程。" },
    truthSafe: { en: "Right call. An approved reimbursement is money owed to you, not a con.", zh: "判得对。审批通过的报销是欠你的钱,不是骗局。" },
  },
  {
    answer: "safe", risk: 0,
    title: { en: "Come In at Ten, No Fee", zh: "十点来面试,不收费" },
    chan: { en: "Email · company address", zh: "邮件 · 公司邮箱" },
    sender: { en: "Source — a recruiter writing from a company email address (hr@…)", zh: "来源 — 招聘方,使用公司邮箱(hr@…)发送" },
    text: { en: "Thank you for applying. We'd like to invite you to an on-site interview this Thursday at 10:00.\nReply to confirm, and bring a copy of your résumé. Reception will direct you.\nThere is no fee of any kind for interviewing with us.", zh: "感谢您的投递。诚邀您本周四 10:00 来公司参加现场面试。\n请回复确认,并携带一份简历。前台会为您指引。\n我司面试不收取任何费用。" },
    flags: [ { en: "It asks only that you confirm and show up — no money.", zh: "只要你回复确认并到场——不涉及钱。" },
             { en: "An on-site interview at the company's own reception, traceable.", zh: "在公司前台进行的现场面试,可追溯。" },
             { en: "It states there is no fee — real employers never charge to interview.", zh: "明说不收费——真雇主从不收面试费。" } ],
    truthScam: { en: "Genuine invite — over-blocking could cost a real job opportunity.", zh: "真邀约——过度拦截,可能错失真工作机会。" },
    truthSafe: { en: "Right call. A real interview costs nothing; only scams charge a 'fee'.", zh: "判得对。真面试不花钱;只有骗局才收「费」。" },
  },
  {
    answer: "safe", risk: 0,
    title: { en: "A New Phone Said Hello", zh: "一台新手机登了进来" },
    chan: { en: "App notification · account security", zh: "App 推送 · 账号安全" },
    sender: { en: "Source — a social app's in-app security message", zh: "来源 — 某社交 App 的站内安全消息" },
    text: { en: "New device sign-in detected on your account at 21:07.\nIf this was you, no action is needed — you can ignore this.\nIf it wasn't, open Settings › Security in the app to review devices. We won't ask for a code here.", zh: "检测到您的账号于 21:07 在新设备登录。\n如为本人操作,无需处理,忽略即可。\n若非本人,请在 App「设置 › 安全」中查看登录设备。我们不会在此向您索要验证码。" },
    flags: [ { en: "If it was you, it tells you to simply ignore — no urgency, no link.", zh: "若是你本人,让你直接忽略——不催、无链接。" },
             { en: "It sends you to in-app Security settings, not an external page.", zh: "让你进 App 内安全设置,而非外部页面。" },
             { en: "It explicitly will NOT ask for a code — unlike the look-alike scam.", zh: "明确不索要验证码——与仿冒骗局相反。" } ],
    truthScam: { en: "Genuine alert — flagging it dulls you to the real account warnings.", zh: "真提醒——拦它,会让你对真正的账号警报变迟钝。" },
    truthSafe: { en: "Right call. The real one says 'ignore if it was you'; the scam demands a code.", zh: "判得对。真的说「是你就忽略」;骗的逼你交验证码。" },
  },
  {
    answer: "safe", risk: 0,
    title: { en: "Your Password, Now Changed", zh: "你的密码,已更改" },
    chan: { en: "App notification · account security", zh: "App 推送 · 账号安全" },
    sender: { en: "Source — an email/cloud account's in-app security message", zh: "来源 — 某邮箱/云账号的站内安全消息" },
    text: { en: "Your account password was successfully changed at 14:52.\nIf you made this change, no action is needed.\nIf you did not, open the app and review your security settings. This message will never ask you for a code.", zh: "您的账号密码已于 14:52 成功修改。\n如系本人操作,无需处理。\n若非本人,请打开 App 检查安全设置。本消息绝不会向您索要验证码。" },
    flags: [ { en: "A confirmation after the fact — no link to click, nothing to enter.", zh: "事后确认——无链接可点,无需填写任何内容。" },
             { en: "If it wasn't you, it directs you into the app's own settings.", zh: "若非本人,让你进 App 自身设置处理。" },
             { en: "It states it will never ask for a code.", zh: "声明绝不索要验证码。" } ],
    truthScam: { en: "Genuine confirmation — blocking real security messages backfires.", zh: "真确认——拦下真安全消息,适得其反。" },
    truthSafe: { en: "Right call. A password-changed notice confirms an event; it asks nothing.", zh: "判得对。密码已改通知只是确认事件,什么都不要。" },
  },
  {
    answer: "safe", risk: 0,
    title: { en: "Points About to Lapse", zh: "即将过期的积分" },
    chan: { en: "App notification · loyalty", zh: "App 推送 · 会员积分" },
    sender: { en: "Source — a retailer's official app, member message centre", zh: "来源 — 某零售商官方 App 的会员消息中心" },
    text: { en: "Reminder: 1,200 of your member points expire at month-end.\nRedeem them for gifts inside the app under Member › Points Mall.\nRedemption is free and happens only in the app — we never ask for payment or a card.", zh: "提醒:您有 1,200 积分将于月底到期。\n可在 App「会员 › 积分商城」内兑换好礼。\n兑换免费,且仅在 App 内完成——我们绝不索要付款或银行卡。" },
    flags: [ { en: "Redeeming points is free and done inside the official app only.", zh: "积分兑换免费,且仅在官方 App 内完成。" },
             { en: "No link, no payment, no card — just a use-them reminder.", zh: "无链接、不付款、不要卡——只是提醒别浪费。" },
             { en: "It says outright it never asks for payment or a card.", zh: "直言绝不索要付款或银行卡。" } ],
    truthScam: { en: "Genuine — a points reminder costs nothing; blocking it loses you a perk.", zh: "真的——积分提醒不花钱;拦它,你损失的是福利。" },
    truthSafe: { en: "Right call. Real points redeem free, in-app; scams want a 'fee' first.", zh: "判得对。真积分免费在 App 内兑;骗局先要你交「费」。" },
  },
  {
    answer: "safe", risk: 0,
    title: { en: "A Coupon, Strings-Free", zh: "一张不收费的优惠券" },
    chan: { en: "App notification · marketplace", zh: "App 推送 · 电商" },
    sender: { en: "Source — a marketplace app's official promotions message", zh: "来源 — 某电商 App 官方活动消息" },
    text: { en: "A ¥15-off coupon has been added to your account for the weekend sale.\nIt's already in your wallet under My Coupons — no claim fee, no card needed.\nApply it at checkout inside the app.", zh: "已为您发放一张周末满减券(立减 ¥15)。\n券已在「我的卡券」中——无需领取费,也不用绑卡。\n结算时在 App 内直接使用即可。" },
    flags: [ { en: "The coupon is already in your wallet — nothing to claim or pay.", zh: "券已在卡券里——无需领取,无需付费。" },
             { en: "It's used at checkout in the app; no outside link or card-binding.", zh: "结算时在 App 内使用;无外部链接、不绑卡。" },
             { en: "Free promo with no payment — unlike 'pay shipping to claim' scams.", zh: "免费活动、无需付款——不同于「付邮费领奖」的骗局。" } ],
    truthScam: { en: "Genuine promo — flagging a real coupon is just lost savings.", zh: "真活动——拦下真优惠券,损失的只是优惠。" },
    truthSafe: { en: "Right call. A real coupon needs no payment; a fake one wants 'shipping'.", zh: "判得对。真券不要钱;假券要你付「运费」。" },
  },
  {
    answer: "safe", risk: 0,
    title: { en: "The Meter Reads Due", zh: "电表该缴费了" },
    chan: { en: "App notification · utilities", zh: "App 推送 · 水电燃气" },
    sender: { en: "Source — the official utilities-payment app, bill reminder", zh: "来源 — 官方水电缴费 App 的账单提醒" },
    text: { en: "Your electricity bill of ¥138.60 for this period is due.\nPay it inside this app under Bills › Electricity at your convenience.\nNo link is included; we never ask you to pay via an outside page.", zh: "您本期电费 ¥138.60 已出账。\n请在本 App「账单 › 电费」中自行缴纳。\n本提醒不含任何链接;我们绝不会让您在外部页面付款。" },
    flags: [ { en: "Payment happens inside the official app, where you log in normally.", zh: "缴费在官方 App 内完成,你照常登录即可。" },
             { en: "It includes no link and warns against outside-page payment.", zh: "不含链接,并提醒不要在外部页面付款。" },
             { en: "A routine bill amount, no urgency or threat of cut-off.", zh: "常规账单金额,不催不吓,无「立即断电」威胁。" } ],
    truthScam: { en: "Genuine bill — blocking it just risks an overdue utility payment.", zh: "真账单——拦它,只会让水电费逾期。" },
    truthSafe: { en: "Right call. A real bill is paid in the app; scams push an urgent link.", zh: "判得对。真账单在 App 内缴;骗局塞给你急迫的链接。" },
  },
  {
    answer: "safe", risk: 0,
    title: { en: "Lift Maintenance, Tuesday", zh: "周二电梯检修" },
    chan: { en: "WeChat · property management", zh: "微信 · 物业" },
    sender: { en: "Source — the estate's property-management official account", zh: "来源 — 小区物业官方公众号" },
    text: { en: "Notice: elevator maintenance in Building 3 on Tuesday 09:00–12:00; please use the stairs during this window.\nWater supply is unaffected. Property fees, if due, are paid only at the service desk or in the official app.\nThank you for your patience.", zh: "通知:3 号楼电梯将于周二 09:00–12:00 检修,期间请走楼梯。\n供水不受影响。如需缴纳物业费,仅在前台或官方 App 办理。\n感谢配合。" },
    flags: [ { en: "An operational notice — maintenance times, no money requested.", zh: "运营通知——检修时间,不索取任何钱款。" },
             { en: "Any fees are paid at the desk or official app, not via this message.", zh: "缴费仅在前台或官方 App,而非经此消息。" },
             { en: "Posted by the estate's own official account, not a stranger.", zh: "由小区物业官方公众号发布,而非陌生人。" } ],
    truthScam: { en: "Genuine notice — flagging it spreads needless suspicion of management.", zh: "真通知——拦它,只会无端引发对物业的猜疑。" },
    truthSafe: { en: "Right call. A real property notice informs; it doesn't chase a transfer.", zh: "判得对。真物业通知只是告知,不追着你转账。" },
  },
  {
    answer: "safe", risk: 0,
    title: { en: "Subsidy, Already in the Account", zh: "补贴已入个人账户" },
    chan: { en: "App notification · medical insurance", zh: "App 推送 · 医保" },
    sender: { en: "Source — the official medical-insurance app, in-app message", zh: "来源 — 官方医保 App 站内消息" },
    text: { en: "An outpatient medical-insurance reimbursement of ¥213.50 has been settled to your personal account.\nView it under Account › Reimbursement Records. We won't ask for a code or password.\nFor enquiries, call the public hotline 12393.", zh: "您一笔门诊医保报销 ¥213.50 已结算至个人账户。\n可在「账户 › 报销记录」中查看。我们不会索要验证码或密码。\n如需咨询,请拨打公共服务热线 12393。" },
    flags: [ { en: "Reimbursement settled IN — incoming money, nothing requested.", zh: "报销已入账——进账,没要你做任何事。" },
             { en: "It cites the real public hotline 12393 for questions.", zh: "咨询给出真实公共热线 12393。" },
             { en: "It states it won't ask for a code or password.", zh: "声明不索要验证码或密码。" } ],
    truthScam: { en: "Genuine settlement — over-blocking real notices breeds false alarms.", zh: "真结算——过度拦真通知,只会制造误警。" },
    truthSafe: { en: "Right call. Settled reimbursement, real hotline, no ask — it's genuine.", zh: "判得对。已结算报销、真热线、无索要——是真的。" },
  },
  {
    answer: "safe", risk: 0,
    title: { en: "Bring Two Photos", zh: "请带两张照片" },
    chan: { en: "SMS · government service", zh: "短信 · 政务服务" },
    sender: { en: "Source — the government-services hall you booked an appointment with", zh: "来源 — 你预约的政务服务大厅" },
    text: { en: "Your appointment to renew your ID is confirmed for Friday 10:30, window 7.\nBring your old ID and two recent photos. To change the time, use the official government-services app.\nNo fee is collected by SMS, and we never ask for a code here.", zh: "您办理身份证换领的预约已确认:周五 10:30,7 号窗口。\n请携带旧证及近期照片两张。如需改期,请使用官方政务服务 App。\n本短信不收取任何费用,也绝不索要验证码。" },
    flags: [ { en: "A booking confirmation — what to bring and when, no money.", zh: "预约确认——带什么、何时到,不涉及钱。" },
             { en: "Rescheduling goes through the official gov app, not a link.", zh: "改期走官方政务 App,而非链接。" },
             { en: "It states no fee by SMS and no code requested.", zh: "声明短信不收费、不索码。" } ],
    truthScam: { en: "Genuine — flagging it could cost a real appointment slot.", zh: "真的——拦它,可能误了真预约。" },
    truthSafe: { en: "Right call. A real gov appointment lists documents, never demands a code.", zh: "判得对。真政务预约列出证件清单,从不索码。" },
  },
  {
    answer: "safe", risk: 0,
    title: { en: "Onboarding, This Monday", zh: "本周一报到" },
    chan: { en: "Email · company HR", zh: "邮件 · 公司人事" },
    sender: { en: "Source — HR from the company's email domain (hr@…)", zh: "来源 — 公司人事,使用公司邮箱(hr@…)" },
    text: { en: "Welcome aboard! Your start date is Monday; please arrive at reception by 09:30.\nBring your ID and bank card so payroll can be set up in person at the HR desk.\nWe never ask you to transfer money or pay a deposit to onboard.", zh: "欢迎加入!您的入职日为周一,请于 09:30 前到前台报到。\n请携带身份证和银行卡,以便当面在人事处办理工资卡登记。\n入职绝不会要求您转账或缴纳任何押金。" },
    flags: [ { en: "Payroll setup is done in person at the HR desk, not remotely.", zh: "工资卡登记当面在人事处办,而非远程。" },
             { en: "It explicitly says no transfer and no deposit to onboard.", zh: "明说入职不转账、不交押金。" },
             { en: "Sent from the company's own email domain, traceable.", zh: "由公司自有邮箱发出,可追溯。" } ],
    truthScam: { en: "Genuine onboarding mail — over-blocking could derail a real start.", zh: "真入职邮件——过度拦截,可能搅黄真入职。" },
    truthSafe: { en: "Right call. Real onboarding sets up pay in person; scams demand a deposit.", zh: "判得对。真入职当面办工资卡;骗局逼你交押金。" },
  },
  {
    answer: "safe", risk: 0,
    title: { en: "Parent-Teacher Evening", zh: "家长会通知" },
    chan: { en: "App notification · school app", zh: "App 推送 · 校园 App" },
    sender: { en: "Source — the head teacher via the official school app", zh: "来源 — 班主任,经官方校园 App 发布" },
    text: { en: "Notice: the parent-teacher meeting is Friday 18:30 in the classroom.\nPlease reply in the app to confirm your attendance.\nNothing to pay; the school never collects fees through private transfers.", zh: "通知:本周五 18:30 在教室召开家长会。\n请在 App 内回复确认是否出席。\n无需缴费;学校绝不通过私人转账收取费用。" },
    flags: [ { en: "A meeting notice asking only that you confirm — no money.", zh: "家长会通知,只要你回复确认——不涉及钱。" },
             { en: "Confirmation happens inside the school app, not a private chat.", zh: "确认在校园 App 内进行,而非私聊。" },
             { en: "It states the school never collects fees via private transfers.", zh: "声明学校绝不通过私人转账收费。" } ],
    truthScam: { en: "Genuine notice — blocking it means a parent misses the meeting.", zh: "真通知——拦它,家长会错过家长会。" },
    truthSafe: { en: "Right call. A real teacher uses the school app and never asks for transfers.", zh: "判得对。真老师用校园 App,从不要你私人转账。" },
  },
  {
    answer: "safe", risk: 0,
    title: { en: "Water Due, Pay In-App", zh: "水费已出,App 内缴" },
    chan: { en: "SMS · utilities", zh: "短信 · 水务" },
    sender: { en: "Source — the local water utility's billing notice", zh: "来源 — 当地水务公司的账单提醒" },
    text: { en: "Your water bill of ¥47.30 for this period is now available.\nPlease pay through the official utilities app or at a service outlet.\nThis message contains no link and never asks for your card number or a code.", zh: "您本期水费 ¥47.30 已出账。\n请通过官方缴费 App 或营业网点缴纳。\n本短信不含链接,也绝不索要您的卡号或验证码。" },
    flags: [ { en: "Pay via the official app or an outlet — no link in the message.", zh: "通过官方 App 或网点缴纳——短信里没有链接。" },
             { en: "It explicitly never asks for your card number or a code.", zh: "明确绝不索要卡号或验证码。" },
             { en: "A modest, routine amount with no cut-off threat.", zh: "金额不大、属常规,无「断水」威胁。" } ],
    truthScam: { en: "Genuine bill — flagging it risks an overdue water account.", zh: "真账单——拦它,水费可能逾期。" },
    truthSafe: { en: "Right call. A real utility points to the app; scams push a link to 'pay now'.", zh: "判得对。真水务让你回 App;骗局塞链接逼你「立即缴」。" },
  },
  {
    answer: "safe", risk: 0,
    title: { en: "Annual Health Check Booked", zh: "年度体检已约" },
    chan: { en: "SMS · workplace benefit", zh: "短信 · 职工福利" },
    sender: { en: "Source — the clinic handling your company's staff health checks", zh: "来源 — 承办公司职工体检的体检机构" },
    text: { en: "Your company-sponsored health check is booked for Wednesday 08:00; please fast beforehand.\nBring your ID; the cost is covered by your employer — you pay nothing.\nTo change the time, call the clinic's listed number.", zh: "您单位组织的体检已预约:周三 08:00,请提前空腹。\n请携带身份证;费用由单位承担——您无需付费。\n如需改期,请拨打机构公示电话。" },
    flags: [ { en: "Employer-covered — you pay nothing, no card requested.", zh: "单位承担费用——你不付费,不索要银行卡。" },
             { en: "Rescheduling goes to the clinic's listed number, not a link.", zh: "改期拨机构公示电话,而非链接。" },
             { en: "A plain appointment reminder, no urgency or money.", zh: "普通预约提醒,不催、不涉及钱。" } ],
    truthScam: { en: "Genuine — flagging it may cost a paid-for health-check slot.", zh: "真的——拦它,可能误了已付费的体检名额。" },
    truthSafe: { en: "Right call. A real benefit costs you nothing and asks for no card.", zh: "判得对。真福利不花你的钱,也不要卡。" },
  },
  {
    answer: "safe", risk: 0,
    title: { en: "The Locker Code, And Only That", zh: "只有那串取件码" },
    chan: { en: "App notification · internal mailroom", zh: "App 推送 · 公司收发室" },
    sender: { en: "Source — the office building's mailroom system", zh: "来源 — 办公楼收发室系统" },
    text: { en: "A parcel addressed to you is in mailroom locker B-14.\nPickup code: 7392. Collect it before 18:00 today.\nThis code only opens the locker; we never ask for payment or a bank code.", zh: "有一件您的包裹存放在收发室 B-14 储物柜。\n取件码:7392,请于今日 18:00 前领取。\n该码仅用于开柜;我们绝不索要付款或银行验证码。" },
    flags: [ { en: "The code only opens a locker — it's not a bank verification code.", zh: "该码仅用于开柜——不是银行验证码。" },
             { en: "No payment is requested; just go and collect the parcel.", zh: "不索要付款;去取件即可。" },
             { en: "It clarifies it never asks for payment or a bank code.", zh: "说明绝不索要付款或银行验证码。" } ],
    truthScam: { en: "Genuine pickup notice — blocking it just leaves a parcel uncollected.", zh: "真取件通知——拦它,包裹只会无人领取。" },
    truthSafe: { en: "Right call. A locker code opens a door, not your account.", zh: "判得对。取件码开的是柜门,不是你的账户。" },
  },
  {
    answer: "safe", risk: 0,
    title: { en: "Gas Bill, No Link Attached", zh: "燃气费,不附链接" },
    chan: { en: "SMS · utilities", zh: "短信 · 燃气" },
    sender: { en: "Source — the city gas company's billing notice", zh: "来源 — 市燃气公司的账单提醒" },
    text: { en: "Your natural-gas bill of ¥92.10 for this period is ready.\nPay it in the official utilities app or at a counter — at your own pace.\nNo link here; we never ask for a code or to pay through an outside page.", zh: "您本期天然气费 ¥92.10 已出账。\n请在官方缴费 App 或营业网点缴纳,无需着急。\n本短信无链接;我们绝不索要验证码,也不会让您在外部页面付款。" },
    flags: [ { en: "Pay at your own pace in the app — no urgency, no threat.", zh: "可在 App 内从容缴纳——不催、无威胁。" },
             { en: "No link, and it warns against paying via an outside page.", zh: "无链接,并提醒勿在外部页面付款。" },
             { en: "It never asks for a code.", zh: "绝不索要验证码。" } ],
    truthScam: { en: "Genuine bill — over-blocking risks an overdue gas account.", zh: "真账单——过度拦截,燃气费可能逾期。" },
    truthSafe: { en: "Right call. A real gas bill sends you to the app, not a panic link.", zh: "判得对。真燃气账单让你回 App,而非塞恐慌链接。" },
  },
  {
    answer: "safe", risk: 0,
    title: { en: "Grant Disbursed", zh: "助学金已发放" },
    chan: { en: "App notification · school finance", zh: "App 推送 · 学校财务" },
    sender: { en: "Source — the university's student-finance office via the campus app", zh: "来源 — 高校学生资助中心,经校园 App 发布" },
    text: { en: "Your student grant of ¥1,000.00 has been disbursed to your registered campus card account.\nCheck the balance in the campus app under Finance › Records.\nWe never ask you to transfer it elsewhere or share a code.", zh: "您的助学金 ¥1,000.00 已发放至您登记的校园卡账户。\n可在校园 App「财务 › 记录」中查看余额。\n我们绝不会要求您将其转出,也不会索要验证码。" },
    flags: [ { en: "Grant money disbursed TO you — nothing to send or move.", zh: "助学金发给你——无需付出或转出。" },
             { en: "It lands in your existing campus-card account, no new details.", zh: "进你既有校园卡账户,不索要新信息。" },
             { en: "It warns it never asks you to transfer it or share a code.", zh: "提醒绝不要求转出,也不索要验证码。" } ],
    truthScam: { en: "Genuine disbursement — flagging real grants only confuses students.", zh: "真发放——拦下真助学金,只会让学生困惑。" },
    truthSafe: { en: "Right call. A real grant arrives; only scams ask you to move it on.", zh: "判得对。真助学金是到账;只有骗局让你再转出去。" },
  },
  {
    answer: "safe", risk: 0,
    title: { en: "Survey at the Door, Nothing to Pay", zh: "上门问卷,分文不取" },
    chan: { en: "WeChat · community group", zh: "微信 · 社区群" },
    sender: { en: "Source — the neighbourhood committee's official group", zh: "来源 — 居委会官方群" },
    text: { en: "Community notice: a public-services satisfaction survey runs this week; staff with ID badges may knock.\nIt's a few questions about local services — entirely voluntary.\nNo money, cards, codes, or personal bank details are ever collected.", zh: "社区通知:本周开展公共服务满意度调查,佩戴工作证的工作人员可能上门。\n仅询问几条关于本地服务的问题——完全自愿。\n绝不收取任何钱款、银行卡、验证码或个人银行信息。" },
    flags: [ { en: "A voluntary opinion survey — asks nothing financial at all.", zh: "自愿的意见调查——完全不涉及任何钱财。" },
             { en: "Staff carry visible ID badges; you can simply decline.", zh: "工作人员佩戴明显工作证;你可以直接婉拒。" },
             { en: "It states no money, card, code, or bank detail is collected.", zh: "声明不收任何钱款、卡、码或银行信息。" } ],
    truthScam: { en: "Genuine — blocking a harmless survey notice breeds over-suspicion.", zh: "真的——拦下无害的调查通知,会养成过度多疑。" },
    truthSafe: { en: "Right call. A real survey wants opinions, not your bank account.", zh: "判得对。真调查要的是意见,不是你的银行账户。" },
  },
  {
    answer: "safe", risk: 0,
    title: { en: "Bonus Run, Settled", zh: "奖金批次,已结清" },
    chan: { en: "Work IM · HR channel", zh: "办公 IM · 人事频道" },
    sender: { en: "Source — HR on the company's internal messaging system", zh: "来源 — 公司内部办公系统中的人事部" },
    text: { en: "The quarterly performance bonus has been paid into staff salary accounts today.\nYour figure is itemised in the HR self-service portal under My Pay.\nNo action is needed; HR never asks you to confirm a card number or a code.", zh: "本季度绩效奖金已于今日发放至员工工资账户。\n具体金额可在人事自助系统「我的薪酬」中查看明细。\n无需操作;人事绝不会让您核对卡号或验证码。" },
    flags: [ { en: "Bonus paid TO you into your existing salary account.", zh: "奖金发给你,进你既有工资账户。" },
             { en: "Details live in the internal HR portal, not an external link.", zh: "明细在内部人事系统,而非外部链接。" },
             { en: "HR never asks to confirm a card number or code, it states.", zh: "声明人事绝不让你核对卡号或验证码。" } ],
    truthScam: { en: "Genuine bonus notice — over-blocking internal HR breaks trust in real comms.", zh: "真奖金通知——过度拦内部人事,会破坏对真实沟通的信任。" },
    truthSafe: { en: "Right call. A bonus-paid notice is settled money, asking nothing of you.", zh: "判得对。奖金已发是到账的钱,对你别无所求。" },
  },
  {
    answer: "safe", risk: 0,
    title: { en: "Library Hold Ready", zh: "预约图书到馆" },
    chan: { en: "App notification · public library", zh: "App 推送 · 公共图书馆" },
    sender: { en: "Source — the public library's official app, holds notice", zh: "来源 — 公共图书馆官方 App 的到馆提醒" },
    text: { en: "The book you reserved is now ready for pickup at the city library service desk.\nPlease collect it within five days using your library card.\nNo fee or payment is required; this notice never asks for a code.", zh: "您预约的图书已到馆,请到市图书馆服务台领取。\n请持借阅证于五日内领取。\n无需任何费用;本提醒绝不索要验证码。" },
    flags: [ { en: "A hold-ready notice — collect a book, no money involved.", zh: "到馆提醒——去取书,不涉及任何钱。" },
             { en: "Pickup uses your own library card at the desk, in person.", zh: "持本人借阅证在服务台当面领取。" },
             { en: "It states no fee and never asks for a code.", zh: "声明无费用,绝不索要验证码。" } ],
    truthScam: { en: "Genuine — flagging a library notice just means a missed book.", zh: "真的——拦下图书馆通知,只会错过一本书。" },
    truthSafe: { en: "Right call. A real hold notice asks only that you come and borrow it.", zh: "判得对。真到馆提醒只要你来借,别无所求。" },
  },

  /* ===================================================================
     AMBIGUITY LAYER — cases built to defeat the lazy heuristic.
     "decoy-genuine": real messages that LOOK like scams (rule Genuine).
     "stealth-scam": scams with a clean surface and one buried tell (rule Fraud).
     difficulty: 2 = ambiguous, 3 = the surface gives almost nothing away.
     =================================================================== */

  // —— decoy-genuine: a real bank fraud alert that reads like a phishing text ——
  {
    answer: "safe", risk: 0, difficulty: 2,
    title: { en: "The Alert That's Actually Real", zh: "这次预警是真的" },
    chan: { en: "SMS · card issuer", zh: "短信 · 发卡行" },
    sender: { en: "Sender — <b>95xxx</b>, the issuer's official five-digit service number", zh: "发件人 — <b>95xxx</b>，发卡行官方五位短号" },
    text: {
      en: `Card ending 6212: a 6,800 charge was attempted overseas at 12:41.
If this was NOT you, freeze the card now in your banking app, or call
the number printed on the back of your card. We did not block it for you.`,
      zh: `您尾号6212的卡，12:41在境外发生一笔 6,800 元交易。
如非本人操作，请立即在手机银行冻结卡片，或拨打卡背面客服热线。
我们未代您拦截。` },
    flags: [
      { en: "Scary amount and urgency — but it asks for nothing: no link, no code, no transfer.",
        zh: "金额吓人、口气紧急——但它什么都没要你给：没链接、没验证码、没要你转账。" },
      { en: "It routes you to YOUR OWN app and the number on YOUR card, not a supplied line.",
        zh: "它让你走自己的手机银行、拨自己卡背面的号，而不是它给你的某个号码。" },
      { en: "A real fraud alert hands control back to you; a scam tries to keep it.",
        zh: "真预警把主动权交还给你；骗局则想把它攥在自己手里。" } ],
    truthScam: { en: "This was the genuine article. Block it and the customer ignores the next real one.",
                 zh: "这条是真的。把它拦了，客户下次就会无视真正的预警。" },
    truthSafe: { en: "Right call. Real banks do send urgent alerts — the tell is what they ask you to DO.",
                 zh: "判得对。真银行确实会发紧急预警——区别在于它让你「去做什么」。" },
  },

  // —— decoy-genuine: a one-time code, but nobody is asking you to read it back ——
  {
    answer: "safe", risk: 0, difficulty: 3,
    title: { en: "A Code, Just Sitting There", zh: "一串没人问你要的验证码" },
    chan: { en: "SMS · verification", zh: "短信 · 验证码" },
    sender: { en: "Source — the login you started 10 seconds ago on your own phone", zh: "来源 — 你 10 秒前在自己手机上发起的登录" },
    text: {
      en: `Your verification code is 519830. Valid for 5 minutes.
We will NEVER call to ask for it. Anyone who does is a scammer —
do not read it aloud to anyone.`,
      zh: `您的验证码是 519830，5 分钟内有效。
我们绝不会来电向您索取。任何来电索要的都是骗子——
请勿读给任何人听。` },
    flags: [
      { en: "The word \"code\" triggers the reflex — but no one here is asking you to share it.",
        zh: "「验证码」三个字触发条件反射——可这里没有任何人在问你要它。" },
      { en: "You triggered it yourself by logging in; it's informational, not a request.",
        zh: "是你自己登录触发的；它是告知，不是索取。" },
      { en: "The danger is only when a CALLER asks you to read it back. No caller here.",
        zh: "危险只发生在有人来电让你「回读」时。这里没有来电。" } ],
    truthScam: { en: "It was genuine. Flag every code SMS and you can never log in to anything.",
                 zh: "它是真的。把每条验证码短信都拦了，你将永远登不上任何账号。" },
    truthSafe: { en: "Right call. A code you requested is safe; a code someone asks you to recite is not.",
                 zh: "判得对。你自己要的验证码是安全的；别人让你念出来的才危险。" },
  },

  // —— decoy-genuine: tax refund — a real one, via the official app ——
  {
    answer: "safe", risk: 0, difficulty: 2,
    title: { en: "The Refund You Actually Filed For", zh: "你真办过的那笔退税" },
    chan: { en: "App push · tax authority", zh: "App 推送 · 个税" },
    sender: { en: "Source — the official Individual Income Tax app you installed", zh: "来源 — 你自己装的「个人所得税」官方 App" },
    text: {
      en: `Your annual tax reconciliation is complete. A refund of 432.10 has
been issued to the bank account on file. View details in the app under
My Refunds. No fee, no link, nothing further is required.`,
      zh: `您的年度综合所得汇算已完成，432.10 元退税已退至您预留的银行账户。
可在 App「我的退税」中查看明细。无需手续费、无外链，无需任何后续操作。` },
    flags: [
      { en: "\"Tax refund\" is a notorious scam hook — but this one asks nothing of you.",
        zh: "「退税」是臭名昭著的诈骗钩子——但这一条对你别无所求。" },
      { en: "It lives inside the official app you installed, with no outside link to tap.",
        zh: "它就在你自己装的官方 App 里，没有任何外部链接要点。" },
      { en: "The money goes back to your own filed account — no \"handling fee\" first.",
        zh: "钱退回你自己预留的账户——不需要先交什么「手续费」。" } ],
    truthScam: { en: "Genuine. Refund scams exist — but real refunds never demand a fee or a link first.",
                 zh: "真的。退税骗局确实有——但真退税从不会先要手续费或让你点链接。" },
    truthSafe: { en: "Right call. The tell of the fake is the fee or link it needs before paying you.",
                 zh: "判得对。假退税的破绽，是它在「退钱给你」之前先要的费用或链接。" },
  },

  // —— decoy-genuine: an ordinary message from the boss (after a boss-scam primed you) ——
  {
    answer: "safe", risk: 0, difficulty: 2,
    title: { en: "An Actual Message From the Actual Boss", zh: "老板本人,一件正经事" },
    chan: { en: "Work IM · known account", zh: "办公 IM · 实名账号" },
    sender: { en: "Sender — your manager's verified company account, used daily", zh: "发件人 — 你天天在用的经理实名办公账号" },
    text: {
      en: `Send me the Q3 report by 3pm, no rush. Mail it to my work address.
Also — sign up for Friday's team dinner if you haven't, headcount's due.`,
      zh: `下午 3 点前把 Q3 报表发我就行，不急，发我办公邮箱。
对了，周五团建你还没报名的话记得报一下，要统计人数。` },
    flags: [
      { en: "After a gift-card \"boss\" scam, you're primed to flag any boss message — don't over-correct.",
        zh: "被礼品卡「老板」骗局吓过后，你会想拦下任何「老板」消息——别矫枉过正。" },
      { en: "No money, no codes, no secrecy, no urgency — just normal work.",
        zh: "不涉及钱、不要验证码、不要求保密、不催——就是正常工作。" },
      { en: "It comes from the verified account you use every day, not a brand-new one.",
        zh: "来自你每天在用的实名账号，而不是一个新冒出来的号。" } ],
    truthScam: { en: "Genuine. Flag your real boss as fraud and you've ground normal work to a halt.",
                 zh: "真的。把真老板当诈骗拦了，正常工作就被你卡死了。" },
    truthSafe: { en: "Right call. The boss-scam tell is money + secrecy + a new account — none are here.",
                 zh: "判得对。冒充领导的破绽是「钱+保密+新账号」——这里一个都没有。" },
  },

  // —— decoy-genuine: real courier notice with a pickup code ——
  {
    answer: "safe", risk: 0, difficulty: 2,
    title: { en: "Parcel in the Locker", zh: "快递进柜了" },
    chan: { en: "SMS · courier locker", zh: "短信 · 快递柜" },
    sender: { en: "Source — the parcel locker for a delivery you're expecting", zh: "来源 — 你正在等的那个包裹的快递柜" },
    text: {
      en: `Your parcel is in locker 87-C. Pickup code: 8842. Free to collect
within 24 hours. No app, no payment — just tap the code on the locker.`,
      zh: `您的快递已存入 87-C 柜，取件码 8842，24 小时内免费领取。
无需下载 App、无需付款——到柜机输入取件码即可。` },
    flags: [
      { en: "\"Pickup code\" pattern-matches to \"verification code,\" but it only opens a locker.",
        zh: "「取件码」容易被当成「验证码」，但它只是开柜子用的。" },
      { en: "No link, no fee, no account — the worst case is someone opens a locker of your socks.",
        zh: "没链接、没费用、没账号——最坏情况不过是有人开了个装你袜子的柜子。" },
      { en: "It matches a delivery you're actually expecting.",
        zh: "它对得上你确实在等的一个包裹。" } ],
    truthScam: { en: "Genuine. A locker code isn't a bank code — collecting a parcel costs nothing.",
                 zh: "真的。取件码不是银行验证码——去取个快递不会有任何损失。" },
    truthSafe: { en: "Right call. The fake-courier tell is a redelivery FEE or a link — neither appears here.",
                 zh: "判得对。假快递的破绽是「重新投递费」或链接——这里都没有。" },
  },

  // —— decoy-genuine: a real credit-card bill ——
  {
    answer: "safe", risk: 0, difficulty: 2,
    title: { en: "Just the Monthly Bill", zh: "只是张月账单" },
    chan: { en: "SMS · card issuer", zh: "短信 · 发卡行" },
    sender: { en: "Source — your card issuer's official statement number", zh: "来源 — 发卡行官方账单短号" },
    text: {
      en: `Your statement is ready: balance 3,250.00, due 25 Jun. Minimum 325.
Pay anytime in your banking app or by UnionPay. Questions? Use the number
on your card. No link is included in this message.`,
      zh: `您本期账单已出：应还 3,250.00 元，还款日 6 月 25 日，最低还款 325 元。
可在手机银行或云闪付随时还款。如有疑问请拨卡背面客服。
本条短信不含任何链接。` },
    flags: [
      { en: "An amount you \"owe\" plus a deadline pings the scam reflex — but nothing is off-script.",
        zh: "一个「欠款」金额加一个截止日，会触发诈骗反射——但全程没有越界动作。" },
      { en: "It points you to your own app / UnionPay, contains no link, and asks for no code.",
        zh: "它指向你自己的 App / 云闪付，不含链接，也不要验证码。" },
      { en: "Paying your own bill in your own app can't be intercepted by anyone.",
        zh: "在自己 App 里还自己的账单，没人能从中拦截。" } ],
    truthScam: { en: "Genuine. A statement notice with no link and no code request is just a bill.",
                 zh: "真的。一条不含链接、不要验证码的账单提醒，就只是张账单。" },
    truthSafe: { en: "Right call. The fake-bill tell is a payment link or a \"verify card\" code — absent here.",
                 zh: "判得对。假账单的破绽是「还款链接」或「核验卡片」验证码——这里都没有。" },
  },

  // —— stealth-scam: impersonating police, the "safe account" ask ——
  {
    answer: "scam", risk: 60000, difficulty: 3,
    title: { en: "The Polite Detective", zh: "彬彬有礼的「警官」" },
    chan: { en: "Phone call · transcript", zh: "来电 · 通话记录" },
    sender: { en: 'Caller — calm, professional, "Economic Crimes Unit," gives a case number', zh: '来电 — 语气平和专业，自称「经侦支队」，报了案件编号' },
    text: {
      en: `"Good afternoon. This is the Economic Crimes Unit. A bank card in your
name is linked to a money-laundering case, number H2025-0418. You are not
yet a suspect. To prove the funds are clean and protect them during the
review, please move your savings into the designated safe account for
verification. It will be returned in full once you're cleared."`,
      zh: `「您好，这里是经侦支队。您名下一张银行卡涉嫌一起洗钱案，
案件编号 H2025-0418。目前您还不是嫌疑人。为证明资金清白、
并在核查期间保护好这笔钱，请将您的存款转入我们指定的『安全账户』
接受审查，核查无误后会全额原路退回。」` },
    flags: [
      { en: "Calm, authoritative, a real-sounding case number — and zero of the usual red flags.",
        zh: "语气平和、权威，案件编号像模像样——常见的红旗一个都不见。" },
      { en: "THE tell: \"safe account.\" Police and prosecutors never have one, and never phone you to transfer money.",
        zh: "唯一的破绽：「安全账户」。公检法根本不存在这种账户，更不会电话办案让你转账。" },
      { en: "Real law enforcement summons you in person and in writing — never settles a case by phone transfer.",
        zh: "真办案是当面、书面传唤——绝不会靠一通电话和一笔转账了结。" } ],
    truthScam: { en: "The most devastating scam of all. \"Safe account\" is the phrase that empties a life's savings.",
                 zh: "杀伤力最强的骗局。「安全账户」这四个字，能掏空一个人一生的积蓄。" },
    truthSafe: { en: "It was a scam. No real authority asks you to wire money to a \"safe account\" — ever.",
                 zh: "这是骗局。没有任何真机关会让你把钱打进「安全账户」——一次也不会。" },
  },

  // —— stealth-scam: "cancel your campus loan," remote-control ——
  {
    answer: "scam", risk: 24000, difficulty: 2,
    title: { en: "Closing an Account You Never Opened", zh: "注销一个你没开过的账户" },
    chan: { en: "Phone call · \"finance support\"", zh: "来电 · 「金融客服」" },
    sender: { en: 'Caller — helpful "platform support," cites a new regulation', zh: '来电 — 热心的「平台客服」，搬出一条新规' },
    text: {
      en: `"Our system shows a student loan account registered under your name
back in college. Under new rules it must be closed, or it will hurt your
credit score. I'll guide you through it — just install a screen-share app
so I can help you clear the credit limit. It only takes a few minutes."`,
      zh: `「系统显示您学生时期注册过一个校园贷账户，按监管新规需要注销，
否则会影响您的征信。我来一步步指导您——您先装一个屏幕共享软件，
我帮您把额度清空就行，几分钟的事。」` },
    flags: [
      { en: "Helpful tone, a plausible \"new regulation,\" mild credit-score pressure — no shouting.",
        zh: "热心口吻、一条像样的「新规」、轻度征信施压——全程不吼不催。" },
      { en: "The tell: \"install screen-share\" + \"clear the limit\" = they drain a real loan to their account.",
        zh: "破绽：「装屏幕共享」+「清空额度」=他们把一笔真贷款借出、转进自己账户。" },
      { en: "No legitimate firm fixes your credit by remote-controlling your phone.",
        zh: "没有任何正规机构会靠远程控制你的手机来「修复征信」。" } ],
    truthScam: { en: "The campus-loan con. The \"limit you clear\" becomes a real debt in your name, paid to them.",
                 zh: "注销校园贷骗局。你「清空的额度」会变成你名下的真实欠款，钱进了他们口袋。" },
    truthSafe: { en: "It was a scam. Remote-control + \"clear your loan limit\" is borrowing in your name.",
                 zh: "这是骗局。远程控制 +「清空贷款额度」，本质是用你的名义去借钱。" },
  },

  // —— stealth-scam: a one-character look-alike domain ——
  {
    answer: "scam", risk: 298, difficulty: 3,
    title: { en: "One Letter Off", zh: "一个字母的差别" },
    chan: { en: "SMS · \"membership\"", zh: "短信 · 「会员中心」" },
    sender: { en: "Sender — looks like a video-site membership reminder", zh: "发件人 — 看着像视频网站会员提醒" },
    text: {
      en: `Your annual membership renews tonight at 23:59 for 298.00.
To cancel auto-renew or change your plan, sign in at:
https://www.iqlyi.com/vip/manage`,
      zh: `您的年度会员将于今晚 23:59 自动续费 298.00 元。
如需取消自动续费或变更套餐，请登录：
https://www.iqlyi.com/vip/manage` },
    flags: [
      { en: "Everything reads normal — the only flaw is in the domain itself: iq**l**yi, not iqiyi.",
        zh: "通篇都正常——唯一的破绽藏在域名里：iq**l**yi，不是 iqiyi。" },
      { en: "\"Cancel before you're charged\" weaponises urgency so you click before you read the URL.",
        zh: "「扣费前赶紧取消」把紧迫感武器化，逼你在看清网址前就点进去。" },
      { en: "Always reach a service through its own app, not a link in a text.",
        zh: "永远从官方 App 进入服务，而不是短信里的链接。" } ],
    truthScam: { en: "A look-alike domain harvests your login and card. Under time pressure, almost nobody spells it out.",
                 zh: "仿冒域名会窃取你的登录和银行卡。在时间压力下，几乎没人会去逐字母核对。" },
    truthSafe: { en: "It was a scam. The whole con lived in one swapped letter — open the real app instead.",
                 zh: "这是骗局。整个局就藏在一个被掉包的字母里——该做的是去开真 App。" },
  },

  // —— stealth-scam: generous "compensation" via a borrowing app ——
  {
    answer: "scam", risk: 1200, difficulty: 2,
    title: { en: "Three Times Your Money Back", zh: "三倍奉还的「理赔」" },
    chan: { en: "Phone call · \"after-sales\"", zh: "来电 · 「售后」" },
    sender: { en: 'Caller — "quality control" for a shop you really did buy from', zh: '来电 — 你确实买过东西那家店的「质检」' },
    text: {
      en: `"The formula you bought failed a safety check. Under the law we're
compensating you triple — 1,200. To receive it, open Alipay, go to your
credit line (Huabei / the cash-advance), and we'll deposit the payout there.
Then you just withdraw it. Ready?"`,
      zh: `「您买的那款奶粉抽检不合格，依法我们主动三倍理赔 1,200 元。
为了把钱打给您，请打开支付宝，进到您的『借呗 / 备用金』额度里，
我们把理赔款打进去，您提现就行。准备好了吗？」` },
    flags: [
      { en: "It sounds generous and even cites a law — disarming you before the real move.",
        zh: "口气慷慨、还搬出法律——在真正动手前先卸下你的戒心。" },
      { en: "The tell: a refund that needs you to open a LOAN feature. Real refunds go back the way you paid.",
        zh: "破绽：一笔需要你打开「借贷」功能才能收的退款。真退款只会原路退回。" },
      { en: "\"Open Huabei to receive money\" means borrowing in your name and transferring it out.",
        zh: "「打开借呗收款」=用你的名义借钱，再把它转走。" } ],
    truthScam: { en: "The refund con. The payout is your own borrowed money, routed straight to the scammer.",
                 zh: "退款理赔骗局。所谓理赔款，是你自己被借出的钱，直接流向骗子。" },
    truthSafe: { en: "It was a scam. No real refund ever needs you to open a loan to \"receive\" it.",
                 zh: "这是骗局。没有任何真退款，需要你开通贷款才能「收到」。" },
  },

  // —— stealth-scam: slow-burn investment, no romance, no urgency ——
  {
    answer: "scam", risk: 5000, difficulty: 3,
    title: { en: "The Old Classmate's Steady Tip", zh: "老同学的「稳健」门路" },
    chan: { en: "WeChat · reconnected", zh: "微信 · 久别重逢" },
    sender: { en: "Sender — a classmate you lost touch with, warm and casual", zh: "发件人 — 失联多年的老同学，热络又随意" },
    text: {
      en: `Long time! You doing okay? I've been following a teacher who runs a
steady fund — nothing crazy, just consistent. There's a small group where
he shares picks daily. Come take a look if you want, no pressure to put in
anything, just learn the ropes.`,
      zh: `好久不见！最近还好吗？我这两年跟着一个老师做基金定投，
不求暴富，就图个稳。有个小群，他每天分享标的。
你要不要进来看看？不投也没事，就当学点门道。` },
    flags: [
      { en: "No romance, no urgency, no link — just warmth and \"no pressure.\" That's the disarming part.",
        zh: "不谈感情、不催、没链接——只有热络和「不投也没事」。这恰恰是它的麻醉剂。" },
      { en: "The tell: being pulled into a group with a \"teacher\" giving daily picks. Pig-butchering's quiet cousin.",
        zh: "破绽：被拉进一个有「老师」每天荐股的群。这是杀猪盘安静的近亲。" },
      { en: "The early wins are real and small; the big \"opportunity\" later is where the money vanishes.",
        zh: "前期的小赚是真的；真正让你下重注的「机会」在后头，钱就在那里蒸发。" } ],
    truthScam: { en: "A stock-tip group scam. The slow, friendly build-up is exactly what makes it work.",
                 zh: "荐股带单群骗局。那种慢悠悠、热乎乎的铺垫，正是它奏效的原因。" },
    truthSafe: { en: "It was a scam. \"Teacher + daily picks + a private group\" is the setup, however friendly.",
                 zh: "这是骗局。「老师+每天荐股+私密小群」就是局，再热络也是局。" },
  },

  // —— stealth-scam: deepfake-voice boss, urgent transfer ——
  {
    answer: "scam", risk: 80000, difficulty: 3,
    title: { en: "The Voice That Sounds Exactly Right", zh: "那个声音,分毫不差" },
    chan: { en: "Video call · \"the boss\"", zh: "视频通话 · 「领导」" },
    sender: { en: "Caller — looks and sounds like your boss; brief, slightly pixelated video", zh: "来电 — 长相和声音都像你领导；视频短暂、略有马赛克" },
    text: {
      en: `"Xiao Wang — I'm out of town closing a deal and the company account
can't move fast enough. Use your own card to send 80,000 to this supplier
now; finance will square it with you this afternoon. Keep it quiet, it'd
look bad if word got out. I'll send the account number now."`,
      zh: `「小王啊，我在外地谈个项目，公司账户走不动这么急。
你先用你自己的卡给这个供应商转 8 万，下午财务跟你平账。
这事先别声张，传出去影响不好。账号我现在发你。」` },
    flags: [
      { en: "You can SEE and HEAR your boss — but face and voice can both be deepfaked now.",
        zh: "你看得见、听得见你领导——但如今人脸和声音都能被深度伪造。" },
      { en: "The tell isn't the face; it's the pattern: big sum + your own card + urgency + secrecy + can't verify in person.",
        zh: "破绽不在那张脸，而在套路：大额 + 你自己的卡 + 催促 + 保密 + 无法当面核实。" },
      { en: "Hang up and call back on the number you already have. A real boss survives that; a fake doesn't.",
        zh: "挂掉，用你早就存着的号码回拨。真领导经得起这一步，假的经不起。" } ],
    truthScam: { en: "An AI face-swap scam. The likeness is perfect; the request is what gives it away.",
                 zh: "AI 换脸骗局。那张脸天衣无缝；露馅的是它提的要求。" },
    truthSafe: { en: "It was a scam. Never move money on a video call alone — verify on a channel you control.",
                 zh: "这是骗局。绝不凭一通视频就转账——用一条你自己掌握的渠道去核实。" },
  },

  /* ===== EXPANDED AMBIGUITY POOL (auto-merged from _gen) ===== */
  {
    "answer": "scam",
    "risk": 138600,
    "difficulty": 3,
    "title": {
      "en": "The Account That Keeps You Safe",
      "zh": "替你保管的那个账户"
    },
    "chan": {
      "en": "Phone call · transcript",
      "zh": "来电 · 通话记录"
    },
    "sender": {
      "en": "A composed man identifying himself as an officer of the municipal Economic Crime Division",
      "zh": "一名自称市公安局经侦支队办案民警、语气沉稳的男子"
    },
    "text": {
      "en": "Hello, this is the Economic Crimes Division. Your ID was found linked to a money-laundering case, file J-2024-0731.\nYou are listed as a witness for now, not a suspect. To clear your name we must verify your funds are clean.\nPlease transfer the balance of your accounts into the National Treasury safe-deposit account we will provide. Once the audit completes, every cent is returned.\nThis is standard asset-verification procedure. Please cooperate calmly.",
      "zh": "您好，这里是市公安局经侦支队。您的身份证关联到一起洗钱案件，卷宗号 J-2024-0731。\n目前您只是证人，还不是嫌疑人。为洗清嫌疑，我们需要核验您名下资金是否清白。\n请将各账户余额转入我们稍后提供的『国库安全账户』，审查结束后分文退还。\n这是标准的资金核验流程，请您配合，保持冷静。"
    },
    "flags": [
      {
        "en": "Calm, case-file numbers, legal-sounding 'asset verification' — it performs procedure instead of pressure.",
        "zh": "语气冷静、报卷宗号、满口『资金核验』，用流程感取代催促，像真办案。"
      },
      {
        "en": "THE tell: there is no such thing as a 'safe account'. No real authority ever asks you to transfer money to prove it is clean.",
        "zh": "唯一破绽：根本不存在『安全账户』。任何真机关都不会让你把钱转走来『自证清白』。"
      },
      {
        "en": "Police verify assets by freezing or summoning in writing — never by you wiring funds to an account they dictate.",
        "zh": "警方核查资产靠冻结或书面传唤，绝不会让你把钱打进他们指定的账户。"
      }
    ],
    "truthScam": {
      "en": "Correct. 'Safe account' is the single oldest tell in the book — the law never collects your money to protect it.",
      "zh": "判对了。『安全账户』是教科书级骗局——法律从不会把你的钱收走来『保护』它。"
    },
    "truthSafe": {
      "en": "This was a scam and you let it through. No real police force operates a 'safe account' — the moment you transfer, the money is gone.",
      "zh": "这是骗局，你放过了它。没有任何真警察设『安全账户』——钱一转出，就再也回不来。"
    }
  },
  {
    "answer": "scam",
    "risk": 96000,
    "difficulty": 3,
    "title": {
      "en": "A Warrant With Your Name",
      "zh": "写着你名字的逮捕令"
    },
    "chan": {
      "en": "Phone call · transferred line",
      "zh": "来电 · 转接专线"
    },
    "sender": {
      "en": "A clerk who 'transfers' you to a self-styled prosecutor reading out an arrest warrant",
      "zh": "一名书记员『转接』给一位自称检察官、正在宣读逮捕令的人"
    },
    "text": {
      "en": "This is the People's Procuratorate. An arrest warrant has been issued in your name, warrant no. P-0926.\nI am now reading it to you over a secured line. Do not hang up, or it triggers immediate enforcement.\nYou may avoid detention by accepting non-custodial supervision. This requires posting a guarantee deposit to the court's designated supervision account today.\nDo you understand the charges as read?",
      "zh": "这里是人民检察院。一份以您姓名签发的逮捕令已生效，令号 P-0926。\n我现在通过保密专线向您宣读，请勿挂断，挂断即触发立即执行。\n您可申请取保候审以免羁押，但需在今日向法院指定的『监管账户』缴纳保证金。\n以上指控您听清楚了吗？"
    },
    "flags": [
      {
        "en": "Warrant number, formal reading, a 'secured line' — it mimics the gravity of a real procuratorate.",
        "zh": "宣读令号、保密专线、措辞庄重，模仿真检察院的威严感。"
      },
      {
        "en": "THE tell: arrest warrants and bail are never handled by phone, and never paid into an account someone reads to you live.",
        "zh": "唯一破绽：逮捕令与取保从不电话办理，更不会让你当场把保证金打进对方报的账户。"
      },
      {
        "en": "Real bail is paid at a court counter against an official receipt; a phone 'supervision account' is always a trap.",
        "zh": "真保证金在法院窗口缴、有正式收据；电话里的『监管账户』百分百是陷阱。"
      }
    ],
    "truthScam": {
      "en": "Right call. A warrant read over the phone with a payable account is theatre — courts don't bill bail by phone.",
      "zh": "判对了。电话里念逮捕令还附缴款账户就是演戏——法院不会电话收保证金。"
    },
    "truthSafe": {
      "en": "This was a scam you missed. No procuratorate reads a warrant by phone or takes bail into a dictated account — it's all a script.",
      "zh": "这是骗局，你漏了。检察院不会电话宣读逮捕令、更不会把保证金收进口述账户——全是剧本。"
    }
  },
  {
    "answer": "scam",
    "risk": 23800,
    "difficulty": 3,
    "title": {
      "en": "Your Card Has Been Talking",
      "zh": "你的卡『有话要说』"
    },
    "chan": {
      "en": "Phone call · transcript",
      "zh": "来电 · 通话记录"
    },
    "sender": {
      "en": "A polite agent claiming to be from the Healthcare Security Administration's anti-fraud desk",
      "zh": "一名自称医保局反欺诈专席、口吻客气的工作人员"
    },
    "text": {
      "en": "Hello, this is the Healthcare Security anti-fraud desk. Your medical-insurance card shows abnormal pharmacy reimbursements in another city — suspected illegal cash-out.\nYour card is at risk of being frozen pending investigation. To prove the activity wasn't you, we need to verify the funds in your linked bank card.\nI'll connect a financial-supervision officer; please follow their guidance to confirm your balance and transfer it for protective review.\nThis avoids your account being frozen during the case.",
      "zh": "您好，这里是医保局反欺诈专席。您的医保卡在外地出现异常药店报销，疑似违规套现。\n您的卡面临涉案冻结风险。为证明该笔操作非您本人，我们需核验您绑定的银行卡资金。\n稍后为您接入金融监管专员，请按其指引确认余额并转入『保护性审查』。\n这样可避免您的账户在办案期间被冻结。"
    },
    "flags": [
      {
        "en": "Plausible scenario — out-of-city pharmacy fraud and freezing — sounds like a real welfare-control workflow.",
        "zh": "外地药店套现、涉案冻结的设定很真实，像真有的福利稽核流程。"
      },
      {
        "en": "THE tell: it escalates from a card 'problem' to moving your bank balance into 'protective review' — a safe-account by another name.",
        "zh": "唯一破绽：从医保卡『有问题』一路引到把银行余额转入『保护性审查』——换皮的安全账户。"
      },
      {
        "en": "Insurance disputes are settled at the bureau counter; no agency moves your bank money to 'protect' it.",
        "zh": "医保争议在窗口办理；没有任何机关会把你的银行钱转走来『保护』它。"
      }
    ],
    "truthScam": {
      "en": "Correct. The card 'problem' is just bait to hand you to a fake supervisor who empties your bank balance.",
      "zh": "判对了。医保卡『出问题』只是诱饵，把你交给假专员去搬空银行余额。"
    },
    "truthSafe": {
      "en": "Scam, and you let it pass. The medical-insurance bureau never asks you to transfer bank funds for 'protective review' — that step is the theft.",
      "zh": "这是骗局，你放过了。医保局绝不会让你把银行钱转去『保护性审查』——那一步就是行窃。"
    }
  },
  {
    "answer": "scam",
    "risk": 8800,
    "difficulty": 2,
    "title": {
      "en": "Served Without a Door Knock",
      "zh": "没有敲门的传票"
    },
    "chan": {
      "en": "Phone call · automated then human",
      "zh": "来电 · 语音转人工"
    },
    "sender": {
      "en": "A 'court service line' announcing a summons in a contract dispute, pressing 0 for a clerk",
      "zh": "一条『法院送达专线』通报合同纠纷传票，按 0 转书记员"
    },
    "text": {
      "en": "You have an undelivered court summons regarding a loan-contract dispute. Case docket M-3315.\nA default judgment will be entered if you do not respond today. Press 0 to reach the case clerk.\n[Clerk] To withdraw the case before judgment, the plaintiff agrees to mediation. Please pay the settlement amount into the court's mediation account now and the suit is dropped.\nWe can process this immediately to protect your credit record.",
      "zh": "您有一份未送达的法院传票，涉及一起借款合同纠纷，案号 M-3315。\n若今日不应诉将缺席判决。请按 0 联系承办书记员。\n【书记员】判决前若想撤案，原告同意调解。请您现在将调解款打入法院『调解专户』，案件即撤销。\n我们可立即办理，以保护您的征信记录。"
    },
    "flags": [
      {
        "en": "Docket number, 'default judgment', credit-record worry — it reads like a real e-service notice.",
        "zh": "报案号、提『缺席判决』、拿征信施压，像真的电子送达通知。"
      },
      {
        "en": "THE tell: a real summons is served in person or by registered mail with documents — never settled by phoning money into a 'mediation account'.",
        "zh": "唯一破绽：真传票当面或挂号书面送达；绝不会让你电话把钱打进『调解专户』了事。"
      },
      {
        "en": "Courts send paper; verify any case via the official court counter, never via a number that called you.",
        "zh": "法院走纸质流程；任何案件请到法院窗口核实，绝不信主动打来的号码。"
      }
    ],
    "truthScam": {
      "en": "Right. Real service comes on paper, not as a phone call demanding money into a 'mediation account'.",
      "zh": "判对了。真送达走纸质，不会用电话逼你把钱打进『调解专户』。"
    },
    "truthSafe": {
      "en": "This was a scam and it slipped by. Courts don't settle suits by phone payments — the 'mediation account' is the hook.",
      "zh": "这是骗局，溜过去了。法院不会电话收款撤案——『调解专户』就是钩子。"
    }
  },
  {
    "answer": "scam",
    "risk": 4200,
    "difficulty": 3,
    "title": {
      "en": "Your Number Is Implicated",
      "zh": "你的号码涉案了"
    },
    "chan": {
      "en": "Phone call · transcript",
      "zh": "来电 · 通话记录"
    },
    "sender": {
      "en": "An agent from the 'Communications Administration' warning your number is about to be shut off",
      "zh": "一名自称通信管理局、警告号码即将停机的工作人员"
    },
    "text": {
      "en": "This is the Communications Administration. A number registered under your ID has sent fraudulent messages and will be suspended within two hours.\nIf this number wasn't opened by you, you are a victim of identity misuse and should file a report.\nI'll transfer you to the public-security cyber unit to take your statement. Please stay on the line and do not discuss this with anyone — the case is confidential.\nThe officer will guide you through clearing your record.",
      "zh": "这里是通信管理局。一个用您身份证开通的号码发送了诈骗短信，两小时内将被停机。\n若该号码非您本人开通，您属于身份被冒用的受害者，应当报案。\n我现在为您转接公安网安部门做笔录，请保持通话，并勿向任何人透露——本案需保密。\n民警将指导您消除涉案记录。"
    },
    "flags": [
      {
        "en": "Frames you as a victim and offers to 'help' — disarming, not threatening, so it feels legitimate.",
        "zh": "把你说成受害者、主动『帮你』，姿态不凶反而显得正规。"
      },
      {
        "en": "THE tell: the 'transfer to police' plus 'tell no one, stay on the line' — real cases are never secret and never forbid you to hang up.",
        "zh": "唯一破绽：『转接公安』加『谁都别说、别挂电话』——真办案从不保密、也不禁你挂机。"
      },
      {
        "en": "Number disputes are handled at a carrier store with your ID; hang up and verify independently.",
        "zh": "号码纠纷拿身份证去营业厅办；先挂断，自行核实。"
      }
    ],
    "truthScam": {
      "en": "Correct. 'Stay on the line, tell no one' is the grooming step before the fake officer drains you.",
      "zh": "判对了。『别挂、别告诉任何人』是假民警掏空你前的驯化步骤。"
    },
    "truthSafe": {
      "en": "Scam, missed. No real agency forbids you to hang up or demands secrecy — that's the whole con.",
      "zh": "这是骗局，漏了。没有真机关禁止你挂电话或要你保密——这正是骗局本身。"
    }
  },
  {
    "answer": "scam",
    "risk": 67500,
    "difficulty": 3,
    "title": {
      "en": "The Trace That Found You",
      "zh": "找上门的流调"
    },
    "chan": {
      "en": "Phone call · transcript",
      "zh": "来电 · 通话记录"
    },
    "sender": {
      "en": "A 'disease-control tracer' whose call pivots to a criminal case",
      "zh": "一名『疾控流调员』，通话中途话锋转向刑事案件"
    },
    "text": {
      "en": "Hello, this is epidemic contact-tracing. Our records show you traveled to a flagged area; we need to verify your itinerary.\n...I'm sorry, your ID also appears on a quarantine-fraud case where someone used your details to claim subsidies.\nI must transfer you to the police economic unit. To rule you out, they'll verify which of your accounts received the fraudulent funds.\nPlease cooperate with the officer's account check.",
      "zh": "您好，这里是疫情流调。系统显示您去过中风险地区，需要核实行程。\n……抱歉，您的身份证还出现在一起隔离补贴骗领案中，有人用您的信息冒领了补贴。\n我需为您转接公安经侦。为排除嫌疑，他们将核验您哪个账户收到了这笔涉案款。\n请配合民警的账户核查。"
    },
    "flags": [
      {
        "en": "Starts as a mundane health trace — the most ordinary call imaginable — lowering your guard.",
        "zh": "开场是再普通不过的健康流调，先卸下你的防备。"
      },
      {
        "en": "THE tell: a health trace has no business 'transferring you to police' to inspect your bank accounts.",
        "zh": "唯一破绽：流调根本不会『转接公安』来核查你的银行账户。"
      },
      {
        "en": "Any call that hands you to 'police' to verify your accounts is a relay scam — hang up, call back officially.",
        "zh": "凡是把你转给『公安』查账户的电话都是接力骗局——挂断，自行回拨官方。"
      }
    ],
    "truthScam": {
      "en": "Right. The health angle is camouflage; the account 'verification' is the real target.",
      "zh": "判对了。流调只是伪装，账户『核查』才是真目标。"
    },
    "truthSafe": {
      "en": "Scam, and you let it through. Contact tracers never transfer you to police or inspect your bank accounts.",
      "zh": "这是骗局，你放过了。流调员从不会把你转给公安，也不会查你的银行账户。"
    }
  },
  {
    "answer": "scam",
    "risk": 31900,
    "difficulty": 2,
    "title": {
      "en": "A Quiet Letter From the Bureau",
      "zh": "税务局的一封平信"
    },
    "chan": {
      "en": "Phone call · transcript",
      "zh": "来电 · 通话记录"
    },
    "sender": {
      "en": "A 'tax-audit officer' notifying you of underpaid tax with a penalty deadline",
      "zh": "一名『税务稽查专员』通知你欠缴税款并设了滞纳期限"
    },
    "text": {
      "en": "This is the Taxation Bureau audit office. A review of prior-year filings shows underreported income; you owe back tax and a late penalty.\nUnder the Tax Collection Law, settle before end of day to avoid the case escalating to enforcement.\nTo expedite, pay the assessed amount into the audit-clearance account I'll provide; a receipt will be issued in the system.\nWe'd rather resolve this administratively than refer it.",
      "zh": "这里是税务局稽查处。经核查往年申报，您存在少报收入，需补缴税款及滞纳金。\n依《税收征管法》，请于今日内结清，以免案件升级至强制执行。\n为加快处理，请将核定金额打入我稍后提供的『稽查清缴账户』，系统将开具回执。\n我们更希望以行政方式解决，而非移送。"
    },
    "flags": [
      {
        "en": "Cites a real law, talks 'administrative resolution' — sounds like a measured, by-the-book auditor.",
        "zh": "援引真法规、谈『行政解决』，像个按章办事、有分寸的稽查员。"
      },
      {
        "en": "THE tell: a 'clearance account' read to you by phone — real tax is paid through the official tax system, never a dictated account.",
        "zh": "唯一破绽：电话报给你的『清缴账户』——真税款走官方电子税务系统缴纳，绝非口述账户。"
      },
      {
        "en": "Tax notices arrive in writing through official channels; verify and pay only via the tax authority's own platform.",
        "zh": "税务通知通过官方渠道书面送达；只通过税务机关自有平台核实缴纳。"
      }
    ],
    "truthScam": {
      "en": "Correct. The law citation is dressing; the dictated 'clearance account' is where the theft happens.",
      "zh": "判对了。引用法条只是包装，口述的『清缴账户』才是行窃之处。"
    },
    "truthSafe": {
      "en": "Scam, missed. The tax bureau collects only through its official system — never a phone-dictated account.",
      "zh": "这是骗局，漏了。税务局只通过官方系统征缴——绝不用电话口述的账户。"
    }
  },
  {
    "answer": "scam",
    "risk": 52300,
    "difficulty": 3,
    "title": {
      "en": "A Parcel That Isn't Yours",
      "zh": "一个不属于你的包裹"
    },
    "chan": {
      "en": "Phone call · transferred line",
      "zh": "来电 · 转接专线"
    },
    "sender": {
      "en": "A 'customs officer' reporting a parcel under your name held for contraband",
      "zh": "一名『海关关员』通报有以你名义寄送、因夹带违禁品被扣的包裹"
    },
    "text": {
      "en": "Customs inspection here. A parcel declared under your ID was intercepted containing prohibited items and forged documents.\nThis is now a smuggling case. We are transferring it to the public-security border unit.\nTo demonstrate your accounts are not part of the trafficking proceeds, the officer will ask you to verify your balances under supervision.\nPlease keep this confidential until your statement is recorded.",
      "zh": "这里是海关查验。一个以您身份证申报的包裹被截获，内含违禁品及伪造证件。\n此事现已构成走私案件，正移交公安边境部门。\n为证明您的账户与贩运所得无关，民警将在监管下要求您核验余额。\n在笔录完成前请予以保密。"
    },
    "flags": [
      {
        "en": "Customs, contraband, a 'transfer to border police' — an intimidating but coherent chain of authority.",
        "zh": "海关、违禁品、转接边境公安——一条吓人却自洽的权力链条。"
      },
      {
        "en": "THE tell: 'verify your balances under supervision' plus 'keep it confidential' — the same safe-account/secrecy trap dressed as customs.",
        "zh": "唯一破绽：『监管下核验余额』加『请保密』——还是安全账户加保密那套，套了海关皮。"
      },
      {
        "en": "Customs handles parcels at the customs office in person; it never inspects your bank balance by phone.",
        "zh": "海关在现场处理包裹，绝不会电话核查你的银行余额。"
      }
    ],
    "truthScam": {
      "en": "Right. Customs seizes parcels, not bank balances; the 'supervised verification' is the con.",
      "zh": "判对了。海关查扣的是包裹不是余额，『监管核验』就是骗局。"
    },
    "truthSafe": {
      "en": "Scam, let through. Customs never phones to inspect your accounts or swears you to secrecy.",
      "zh": "这是骗局，放过了。海关不会电话查你的账户，也不会要你保密。"
    }
  },
  {
    "answer": "scam",
    "risk": 1500,
    "difficulty": 2,
    "title": {
      "en": "Six Points and a Link to Pay",
      "zh": "扣六分，附个缴费口"
    },
    "chan": {
      "en": "Phone call · then SMS handoff",
      "zh": "来电 · 转短信办理"
    },
    "sender": {
      "en": "A 'Vehicle Administration officer' about an unprocessed serious violation",
      "zh": "一名『车管所工作人员』，称有一条未处理的严重违章"
    },
    "text": {
      "en": "This is the Vehicle Administration. Your vehicle has an unhandled violation: running a red light, 6 points and a fine, recorded out of province.\nIf not cleared within 24 hours your license enters a pending-revocation status.\nTo settle remotely, I'll send a processing link by text — complete the payment and identity confirmation there to restore your license status.\nPlease handle it promptly to avoid affecting your annual inspection.",
      "zh": "这里是车管所。您的车辆有一条未处理违章：闯红灯，记 6 分并罚款，外省记录。\n若 24 小时内不处理，您的驾驶证将进入待注销状态。\n为方便您远程处理，我稍后发一个办理链接到短信——在其中完成缴费与身份确认即可恢复证件状态。\n请尽快处理，以免影响年检。"
    },
    "flags": [
      {
        "en": "Specific penalty (6 points, out of province) and annual-inspection worry make it feel routine.",
        "zh": "具体到 6 分、外省记录，还拿年检说事，显得是例行公事。"
      },
      {
        "en": "THE tell: a texted 'processing link' for payment and identity — the DMV never settles points via a link someone sends you.",
        "zh": "唯一破绽：短信发来的『办理链接』要你缴费验身——车管所从不通过别人发的链接处理违章。"
      },
      {
        "en": "Handle violations only via the official traffic-management app or counter; never a link from an incoming call.",
        "zh": "违章只通过官方交管 App 或窗口处理；绝不点来电发来的链接。"
      }
    ],
    "truthScam": {
      "en": "Correct. The texted link is a payment-and-credential trap; real point deductions aren't cleared this way.",
      "zh": "判对了。短信链接是缴费＋盗号陷阱，真扣分不会这样处理。"
    },
    "truthSafe": {
      "en": "Scam, missed. The DMV never sends a pay-here link by text — that link harvests your money and identity.",
      "zh": "这是骗局，漏了。车管所从不发『点这里缴费』的链接——那链接专偷钱和身份。"
    }
  },
  {
    "answer": "scam",
    "risk": 2600,
    "difficulty": 3,
    "title": {
      "en": "Verify or Forfeit",
      "zh": "不核验就作废"
    },
    "chan": {
      "en": "Phone call · transcript",
      "zh": "来电 · 通话记录"
    },
    "sender": {
      "en": "A 'Human Resources & Social Security' clerk verifying a subsidy you qualify for",
      "zh": "一名『人社局』工作人员，核验你有资格领取的一笔补贴"
    },
    "text": {
      "en": "Hello, this is Human Resources and Social Security. You qualify for a one-time skills-upgrade subsidy, but your bank details on file failed verification.\nTo release the funds we must confirm your receiving account is active. The officer will guide you to make a small verification transfer that is refunded with the subsidy.\nIf unverified by today, the subsidy is forfeited and reallocated.\nShall we proceed with the account confirmation?",
      "zh": "您好，这里是人社局。您符合一次性技能提升补贴的领取条件，但系统中您的银行信息核验未通过。\n为发放补贴，我们须确认您的收款账户有效。专员将指导您做一笔小额核验转账，届时连同补贴一并退回。\n若今日未核验，补贴将作废并重新分配。\n是否现在进行账户确认？"
    },
    "flags": [
      {
        "en": "Offers money to you, not demands it — a subsidy you 'qualify for' feels like good news, not a scam.",
        "zh": "是给你钱不是要你钱——『你符合条件』的补贴像好消息，不像诈骗。"
      },
      {
        "en": "THE tell: a 'small verification transfer' you must send first — receiving a subsidy never requires you to pay out anything.",
        "zh": "唯一破绽：要你先做一笔『核验转账』——领补贴从不需要你先付出任何钱。"
      },
      {
        "en": "Real benefits go into your card with no outbound payment; any 'pay to receive' step is fraud.",
        "zh": "真补贴直接打进你卡里、无需你转出；任何『先交钱才能领』都是诈骗。"
      }
    ],
    "truthScam": {
      "en": "Right. No subsidy ever asks you to transfer money first — the 'verification transfer' is the steal.",
      "zh": "判对了。没有哪笔补贴要你先转钱——『核验转账』就是行窃。"
    },
    "truthSafe": {
      "en": "Scam, let through. Benefits are paid in, never out; the moment you 'verify' by transferring, it's gone.",
      "zh": "这是骗局，放过了。补贴只进不出；你一『核验转账』，钱就没了。"
    }
  },
  {
    "answer": "scam",
    "risk": 119000,
    "difficulty": 3,
    "title": {
      "en": "The Screen They Wanted to See",
      "zh": "他们想看的那块屏"
    },
    "chan": {
      "en": "Phone call · transcript",
      "zh": "来电 · 通话记录"
    },
    "sender": {
      "en": "A 'financial-crimes investigator' guiding you to install a remote-assistance app",
      "zh": "一名『金融犯罪调查员』，引导你安装一个远程协助软件"
    },
    "text": {
      "en": "This is the public-security financial-crimes unit. Your account is flagged in a fraud-laundering chain, case F-1187.\nTo document that the funds aren't under your control, we conduct a remote asset inspection.\nPlease install the secure assistance tool I'll name so our technician can co-view your banking screen during the on-record check.\nKeep the line open; this protects you from being charged as a participant.",
      "zh": "这里是公安金融犯罪部门。您的账户被标记在一条诈骗洗钱链中，案件 F-1187。\n为记录资金不在您控制之下，我们将进行远程资产核查。\n请安装我下面报的『安全协助工具』，以便我们的技术员在笔录核查中共看您的网银界面。\n请保持通话，这能避免您被列为参与人。"
    },
    "flags": [
      {
        "en": "Case number, 'on-record check', protective framing — sounds like a procedural digital forensics step.",
        "zh": "报案件号、『笔录核查』、保护性措辞，像一道数字取证流程。"
      },
      {
        "en": "THE tell: installing remote-assistance so they can co-view your banking screen — no authority ever needs to see your live bank session.",
        "zh": "唯一破绽：装远程协助让对方共看你的网银界面——没有任何机关需要看你实时的银行操作。"
      },
      {
        "en": "Never install screen-sharing or grant remote access at a stranger's request; it hands them your accounts.",
        "zh": "绝不应陌生人要求安装屏幕共享或开远程权限；那等于把账户交给对方。"
      }
    ],
    "truthScam": {
      "en": "Correct. Remote assistance is the trap — once they see and control your screen, transfers happen 'for' you.",
      "zh": "判对了。远程协助就是陷阱——一旦对方看到并操控你的屏，转账会『替』你完成。"
    },
    "truthSafe": {
      "en": "Scam, missed. No real investigator co-views your banking screen; remote access means they move your money.",
      "zh": "这是骗局，漏了。真调查员不会共看你的网银界面；开了远程，他们就能转走你的钱。"
    }
  },
  {
    "answer": "scam",
    "risk": 14400,
    "difficulty": 2,
    "title": {
      "en": "Come In, or Send the Deposit",
      "zh": "要么到案，要么交保证金"
    },
    "chan": {
      "en": "Phone call · transcript",
      "zh": "来电 · 通话记录"
    },
    "sender": {
      "en": "An 'officer' summoning you to appear, with a phone-payment alternative",
      "zh": "一名『民警』传唤你到案，并给出电话缴款的替代选项"
    },
    "text": {
      "en": "This is the district public-security bureau. You are summoned in connection with case A-5520; you must appear for questioning tomorrow morning.\nIf you cannot attend in person, you may apply for remote handling. This requires lodging a credibility deposit into the case-handling account today.\nOnce your statement clears, the deposit is fully returned.\nWhich option do you choose — appear in person, or remote with deposit?",
      "zh": "这里是区公安分局。您因案件 A-5520 被传唤，须于明日上午到案接受询问。\n若无法本人到场，可申请远程办理，但需于今日向『办案账户』缴纳一笔诚信保证金。\n待笔录核实无误，保证金全额退还。\n请选择：本人到场，还是远程＋保证金？"
    },
    "flags": [
      {
        "en": "It even offers the 'correct' option — appear in person — which makes the phone alternative look reasonable.",
        "zh": "它甚至给了『正确』选项——本人到场——反衬出电话替代方案像合理选择。"
      },
      {
        "en": "THE tell: the 'remote handling' path needs a deposit into a case account — a real summons is written and never has a pay-to-skip option.",
        "zh": "唯一破绽：『远程办理』要往办案账户交保证金——真传唤是书面的，绝无『交钱免到场』选项。"
      },
      {
        "en": "A genuine summons is delivered on paper; if in doubt, walk into the station yourself — never pay by phone.",
        "zh": "真传唤书面送达；有疑问就自己走进派出所——绝不电话缴款。"
      }
    ],
    "truthScam": {
      "en": "Right. Offering 'pay a deposit to skip showing up' is the giveaway — summonses have no such fee.",
      "zh": "判对了。『交保证金就能不到场』就是马脚——传唤没有这种费用。"
    },
    "truthSafe": {
      "en": "Scam, let through. No summons lets you pay a deposit instead of appearing; the case account is a thief's account.",
      "zh": "这是骗局，放过了。没有哪份传唤能交保证金代替到案；『办案账户』就是骗子的账户。"
    }
  },
  {
    "answer": "scam",
    "risk": 41200,
    "difficulty": 3,
    "title": {
      "en": "Frozen for Your Own Good",
      "zh": "为你好才冻结"
    },
    "chan": {
      "en": "Phone call · transcript",
      "zh": "来电 · 通话记录"
    },
    "sender": {
      "en": "A 'social-security control officer' on a suspected pension cash-out",
      "zh": "一名『社保稽核专员』，就一起疑似养老金套现来电"
    },
    "text": {
      "en": "Hello, social-security audit office. Your social-security account shows a suspected illegal cash-out totalling a large sum; it is now under case review.\nYour linked savings may be frozen as suspected proceeds. To exempt your legitimate funds, transfer them to a court-supervised holding account for segregation.\nAfter the audit, segregated funds return with interest.\nWe advise acting today to avoid the freeze.",
      "zh": "您好，社保稽核处。您的社保账户出现疑似违规套现，金额较大，现已立案审查。\n您绑定的储蓄可能被作为涉案款冻结。为豁免您的合法资金，请将其转入『法院监管的保管账户』进行隔离。\n审查结束后，隔离资金连本带息返还。\n建议您今日处理，以免被冻结。"
    },
    "flags": [
      {
        "en": "Uses 'segregation', 'court-supervised', 'returns with interest' — fluent bureaucratic vocabulary.",
        "zh": "满口『隔离』『法院监管』『连本带息返还』，官话流利。"
      },
      {
        "en": "THE tell: 'transfer your savings to a holding account to exempt them' — segregation by moving money to a stranger's account is always a scam.",
        "zh": "唯一破绽：『把储蓄转入保管账户以豁免』——靠把钱转到陌生账户来『隔离』永远是诈骗。"
      },
      {
        "en": "If funds are truly suspect, authorities freeze them in place — they never ask you to move them somewhere.",
        "zh": "若资金真涉案，机关会原地冻结——绝不会让你把钱挪到别处。"
      }
    ],
    "truthScam": {
      "en": "Correct. 'Move it to protect it' is a contradiction only a scammer needs you to accept.",
      "zh": "判对了。『挪走才能保护』这种矛盾，只有骗子才需要你相信。"
    },
    "truthSafe": {
      "en": "Scam, missed. Real authorities freeze suspect money where it sits; asking you to transfer it is the theft.",
      "zh": "这是骗局，漏了。真机关会原地冻结涉案款；让你转走，就是行窃。"
    }
  },
  {
    "answer": "scam",
    "risk": 7300,
    "difficulty": 2,
    "title": {
      "en": "Press 9 to Clear Your Name",
      "zh": "按 9 自证清白"
    },
    "chan": {
      "en": "Phone call · automated notice",
      "zh": "来电 · 语音通报"
    },
    "sender": {
      "en": "An automated 'court notice' about an enforcement case, routing to an agent",
      "zh": "一条自动『法院通知』，通报一起执行案件并转人工"
    },
    "text": {
      "en": "Court enforcement notice: a judgment in your name remains unsatisfied; you face listing as a dishonest debtor. Press 9 for the enforcement clerk.\n[Agent] To suspend the listing, the debt can be settled through the court's enforcement-collection account today.\nPay now and your credit record is preserved; otherwise enforcement proceeds against your assets.\nWould you like to settle and avoid the blacklist?",
      "zh": "法院执行通知：一份以您名义的判决尚未履行，您将被列入失信被执行人名单。按 9 联系执行书记员。\n【人工】为暂缓列入，您可于今日通过法院『执行清缴账户』结清债务。\n现在缴清即保住征信，否则将对您的财产强制执行。\n是否结清以避免列入黑名单？"
    },
    "flags": [
      {
        "en": "Dishonest-debtor list and credit damage are real consequences, so the threat lands as plausible.",
        "zh": "失信名单、征信受损都是真实后果，威胁显得可信。"
      },
      {
        "en": "THE tell: settling a judgment by paying a phone-provided 'enforcement-collection account' — courts collect via official channels, never a dictated account.",
        "zh": "唯一破绽：往电话给的『执行清缴账户』缴款结案——法院走官方渠道收款，绝非口述账户。"
      },
      {
        "en": "Verify any enforcement case at the court directly; never pay an account given over an inbound call.",
        "zh": "任何执行案件都到法院当面核实；绝不向来电提供的账户付款。"
      }
    ],
    "truthScam": {
      "en": "Right. A phone-dictated 'collection account' is the tell — courts never bill enforcement this way.",
      "zh": "判对了。电话口述的『清缴账户』就是马脚——法院不会这样收执行款。"
    },
    "truthSafe": {
      "en": "Scam, let through. Courts collect through official channels, not an account read out to you under threat.",
      "zh": "这是骗局，放过了。法院通过官方渠道收款，不会在威胁下报给你一个账户。"
    }
  },
  {
    "answer": "scam",
    "risk": 88800,
    "difficulty": 3,
    "title": {
      "en": "Confidential, by Order",
      "zh": "奉命保密"
    },
    "chan": {
      "en": "Phone call · transferred line",
      "zh": "来电 · 转接专线"
    },
    "sender": {
      "en": "A 'lead investigator' invoking a confidentiality order on your case",
      "zh": "一名『主办侦查员』，以保密令为名约束你"
    },
    "text": {
      "en": "This is the provincial public-security bureau, major-case division. Your identity is tied to a cross-province fraud ring, case Z-2207.\nBy investigation order this matter is classified. You may not inform family, colleagues, or bank staff — leaking it obstructs justice.\nWe will conduct a confidential asset review; an officer will instruct you on segregating your funds for the duration.\nDo you accept the confidentiality requirement?",
      "zh": "这里是省公安厅重案组。您的身份关联一起跨省诈骗团伙，案件 Z-2207。\n依侦查令本案列为机密，您不得告知家人、同事或银行职员——泄露即妨碍司法。\n我们将进行保密资产审查，由专员指导您在此期间隔离资金。\n您是否接受保密要求？"
    },
    "flags": [
      {
        "en": "Invoking a 'confidentiality order' and 'obstruction of justice' sounds like genuine major-case protocol.",
        "zh": "搬出『侦查保密令』『妨碍司法』，像是真有的重案规程。"
      },
      {
        "en": "THE tell: forbidding you to tell family or bank staff — real police never demand secrecy; isolation is precisely how scammers prevent rescue.",
        "zh": "唯一破绽：禁止你告诉家人或银行职员——真警察从不要求保密；制造孤立正是骗子防止你被救的手段。"
      },
      {
        "en": "Any 'tell no one' instruction is itself the proof of fraud; tell someone immediately and verify.",
        "zh": "任何『谁都别说』的指令本身就是诈骗的证据；立刻告诉别人并核实。"
      }
    ],
    "truthScam": {
      "en": "Correct. The confidentiality 'order' exists only to cut you off from anyone who'd stop the transfer.",
      "zh": "判对了。所谓保密令只为切断你与任何能阻止转账之人的联系。"
    },
    "truthSafe": {
      "en": "Scam, missed. No investigation forbids you to tell your bank or family — secrecy is the scam's life support.",
      "zh": "这是骗局，漏了。没有哪起侦查禁止你告诉银行或家人——保密正是骗局的命门。"
    }
  },
  {
    "answer": "scam",
    "risk": 19700,
    "difficulty": 2,
    "title": {
      "en": "Renew Before the Border Closes",
      "zh": "趁口岸没关，先核验"
    },
    "chan": {
      "en": "Phone call · transcript",
      "zh": "来电 · 通话记录"
    },
    "sender": {
      "en": "An 'Exit-Entry Administration officer' on suspected misuse of your travel document",
      "zh": "一名『出入境管理局工作人员』，称你的旅行证件涉嫌被冒用"
    },
    "text": {
      "en": "This is the Exit-Entry Administration. Your passport was used at a border crossing tied to a trafficking case; your travel credentials are suspended.\nTo clear you and restore the document, we must verify your identity and the funds in your name aren't part of the case.\nI'll transfer you to the investigating officer for an account verification on record.\nPlease cooperate so your travel status can be reinstated.",
      "zh": "这里是出入境管理局。您的护照在一起贩运案件相关的口岸被使用，您的出行证件已被暂停。\n为洗清嫌疑并恢复证件，我们须核验您的身份，并确认您名下资金与该案无关。\n我现在为您转接办案民警，做一次留痕的账户核验。\n请配合，以便恢复您的出行状态。"
    },
    "flags": [
      {
        "en": "Passport misuse and suspended travel status feel high-stakes and bureaucratically specific.",
        "zh": "护照被冒用、出行证件被暂停，事大又具体，像真的。"
      },
      {
        "en": "THE tell: yet again, 'transfer to officer' for an 'account verification' — document issues are never resolved by inspecting your bank funds.",
        "zh": "唯一破绽：又是『转接民警』做『账户核验』——证件问题从不靠核查你的银行资金来解决。"
      },
      {
        "en": "Resolve passport matters at the exit-entry counter in person; no document case touches your bank balance.",
        "zh": "护照问题到出入境窗口当面办理；任何证件案件都不该牵扯你的银行余额。"
      }
    ],
    "truthScam": {
      "en": "Right. The passport story is a doorway to the same account-verification theft.",
      "zh": "判对了。护照故事只是通往同一套账户核验行窃的入口。"
    },
    "truthSafe": {
      "en": "Scam, let through. The exit-entry bureau handles documents at a counter, never your bank funds by phone.",
      "zh": "这是骗局，放过了。出入境在窗口办证件，绝不会电话动你的银行资金。"
    }
  },
  {
    "answer": "scam",
    "risk": 3400,
    "difficulty": 2,
    "title": {
      "en": "One Code to Restore Service",
      "zh": "一个码，复机"
    },
    "chan": {
      "en": "Phone call · then verification code",
      "zh": "来电 · 索要验证码"
    },
    "sender": {
      "en": "A 'Communications Administration' agent about a real-name registration anomaly",
      "zh": "一名『通信管理局』工作人员，称你的实名登记异常"
    },
    "text": {
      "en": "This is the Communications Administration real-name desk. Your number's real-name registration shows an anomaly and is scheduled for suspension.\nWe can re-verify it now to keep your service. To confirm you control this number, I'll trigger a verification code to your phone.\nPlease read me the 6-digit code so I can complete the re-registration on the system side.\nThis takes a moment and keeps your line active.",
      "zh": "这里是通信管理局实名专席。您号码的实名登记出现异常，已被列入停机计划。\n我们现在可为您重新核验以保住服务。为确认该号码由您本人使用，我将向您手机触发一条验证码。\n请把这 6 位验证码读给我，我在系统侧完成重新登记。\n稍等片刻，即可保住您的号码。"
    },
    "flags": [
      {
        "en": "Frames the code as 'proving you control the number' — a believable-sounding verification step.",
        "zh": "把验证码说成『证明号码归你用』，听起来像合理的核验步骤。"
      },
      {
        "en": "THE tell: it asks you to read out an SMS verification code — no real agency ever needs your code; whoever has it takes over your accounts.",
        "zh": "唯一破绽：要你读出短信验证码——没有任何真机关需要你的验证码；拿到它就能接管你的账户。"
      },
      {
        "en": "Never tell anyone a verification code, no matter how official; the code is the key to your accounts.",
        "zh": "无论对方多『官方』，验证码绝不告诉任何人；那是你账户的钥匙。"
      }
    ],
    "truthScam": {
      "en": "Correct. The instant they ask for your SMS code, it's a takeover attempt — codes are for you alone.",
      "zh": "判对了。一开口要短信验证码就是盗号——验证码只属于你自己。"
    },
    "truthSafe": {
      "en": "Scam, missed. No agency needs your verification code; reading it out hands them your number and accounts.",
      "zh": "这是骗局，漏了。没有机关需要你的验证码；读出来就是把号码和账户交给对方。"
    }
  },
  {
    "answer": "scam",
    "risk": 4980,
    "difficulty": 3,
    "title": {
      "en": "Refund Routed Through a Borrow Account",
      "zh": "退款要走借呗的「理赔」"
    },
    "chan": {
      "en": "Phone call · \"after-sales\"",
      "zh": "来电 · 「售后」"
    },
    "sender": {
      "en": "After-sales of the shop you ordered from",
      "zh": "你买过东西的那家网店售后"
    },
    "text": {
      "en": "Hello, this is after-sales for your recent order. Our warehouse mislabeled your item as a wholesale account, which keeps deducting a monthly fee. Per platform rules we must refund you 4,980 yuan in full.\nThe refund channel requires a verified credit line on your side to receive it. Please open the \"Borrow\" credit feature in your payment app so the system can push the compensation in. Don't worry, you won't be charged—it's just the receiving channel.",
      "zh": "您好，这边是您近期订单的售后。仓库把您的商品误标成了批发账户，会每月扣费，按平台规定我们要给您全额理赔 4980 元。\n退款通道需要您这边有一个已认证的信用额度来接收，麻烦您在支付App里把「借呗」信用功能开通一下，系统好把赔付款推进来。您放心，不会扣您钱的，只是个收款通道。"
    },
    "flags": [
      {
        "en": "Surface bait: knows your real order, quotes \"platform rules,\" promises a full lawful refund—sounds like a diligent after-sales rep.",
        "zh": "表层诱饵：说得出你真实订单，搬出「平台规定」「全额理赔」，像尽职的售后。"
      },
      {
        "en": "THE tell: a refund can never require you to OPEN a borrowing/credit line—they make you borrow money, then transfer it out.",
        "zh": "唯一破绽：退款绝不可能要你「开通借呗」——是借你名下的钱再转走。"
      },
      {
        "en": "Transferable rule: real refunds return along the original payment path; no genuine refund needs you to enable any loan feature.",
        "zh": "可迁移原则：真退款只原路退回，绝不需要你开通任何借贷功能。"
      }
    ],
    "truthScam": {
      "en": "Correct—it's a scam. The \"receiving channel\" line is a script to make you borrow money under your own name and hand it over. Refunds never touch a credit line.",
      "zh": "判对了，这是诈骗。「收款通道」是话术，目的是让你用自己名义借钱再交出去。退款根本碰不到信用额度。"
    },
    "truthSafe": {
      "en": "This was a scam. A real refund returns along the original payment path—it never requires you to open \"Borrow\" or any credit line. Enabling it means borrowing money the scammer then transfers away.",
      "zh": "这是骗局。真退款只会原路退回，绝不会要你开通「借呗」或任何信用额度。一开通就是借出你名下的钱，随即被对方转走。"
    }
  },
  {
    "answer": "scam",
    "risk": 388,
    "difficulty": 2,
    "title": {
      "en": "Membership Auto-Renewal, One Letter Off",
      "zh": "会员自动续费——域名一字之差"
    },
    "chan": {
      "en": "SMS · \"video site\"",
      "zh": "短信 · 「视频网站」"
    },
    "sender": {
      "en": "A video streaming site (member center)",
      "zh": "某视频网站会员中心"
    },
    "text": {
      "en": "[Member Notice] Your premium membership has switched to annual auto-renew; 388 yuan will be deducted within 24h. If this wasn't you, cancel here:\nwww.iqlyi-vip.com/cancel\nLog in with your account to stop the deduction. No action means the charge proceeds as scheduled.",
      "zh": "【会员通知】您的尊享会员已转为连续包年，将于24小时内扣款388元。如非本人操作，请在此取消：\nwww.iqlyi-vip.com/cancel\n用账号登录即可终止扣款，逾期不操作将按时扣费。"
    },
    "flags": [
      {
        "en": "Surface bait: calm, plausible auto-renew amount, gives a self-service cancel link—looks like a normal billing reminder.",
        "zh": "表层诱饵：金额合理、口气平静，给了自助取消链接，像普通的扣费提醒。"
      },
      {
        "en": "THE tell: the domain is iqlyi (l swapped in)—not the real site. A lookalike domain is the whole trap.",
        "zh": "唯一破绽：域名是 iqlyi（多塞了个 l），不是真站。一字之差的仿冒域名就是陷阱本身。"
      },
      {
        "en": "Transferable rule: never manage subscriptions via a link in a message—open the official app and check the membership page yourself.",
        "zh": "可迁移原则：永远别点消息里的链接管理订阅，自己打开官方App进会员页核对。"
      }
    ],
    "truthScam": {
      "en": "Correct—scam. iqlyi isn't the real site; the cancel page just harvests your login and card. Check renewals only inside the official app.",
      "zh": "判对了，诈骗。iqlyi 不是真站，取消页只为骗你的账号和卡号。续费只在官方App里查。"
    },
    "truthSafe": {
      "en": "This was a scam. Look closely: iqlyi is one letter off from the real site. The \"cancel\" page exists only to steal your login and payment info. Manage subscriptions inside the official app, never via a texted link.",
      "zh": "这是骗局。仔细看，iqlyi 跟真站差一个字母。「取消」页只为窃取你的账号和支付信息。订阅一律在官方App里管理，绝不点短信链接。"
    }
  },
  {
    "answer": "scam",
    "risk": 1200,
    "difficulty": 2,
    "title": {
      "en": "Lost Parcel, Triple Compensation",
      "zh": "快递丢件，三倍理赔"
    },
    "chan": {
      "en": "Phone call · \"courier after-sales\"",
      "zh": "来电 · 「快递售后」"
    },
    "sender": {
      "en": "Courier company claims desk",
      "zh": "某快递公司理赔专员"
    },
    "text": {
      "en": "Hello, I'm the claims officer for the courier. Your parcel was damaged in transit and can't be delivered; per regulation we'll compensate three times the value, 1,200 yuan.\nTo process it I'll add you on a chat app and send a claims form. Please scan the code in it and pay a small 30-yuan \"claims activation deposit\"—it's refunded together with the compensation once verified.",
      "zh": "您好，我是快递的理赔专员。您的包裹在运输途中破损无法派送，按规定我们三倍赔付，共 1200 元。\n为了走流程我加您聊天软件发一份理赔单，麻烦您扫单里的码、先付一笔 30 元的「理赔激活保证金」，核验通过后会和赔款一起退还给您。"
    },
    "flags": [
      {
        "en": "Surface bait: 'per regulation, triple compensation,' polite claims officer, modest believable amount—feels official.",
        "zh": "表层诱饵：「按规定三倍赔付」、礼貌的理赔专员、金额可信，显得很正规。"
      },
      {
        "en": "THE tell: a real compensation never asks YOU to pay a \"deposit/activation fee\" first—any upfront money is the scam.",
        "zh": "唯一破绽：真赔付绝不会要你先付「保证金/激活费」——任何让你先掏钱的都是骗局。"
      },
      {
        "en": "Transferable rule: legit claims only pay out to you; if money must flow from you first, walk away.",
        "zh": "可迁移原则：正规理赔只往你这边付钱；凡是要你先垫钱的，立刻走人。"
      }
    ],
    "truthScam": {
      "en": "Correct—scam. The \"activation deposit\" is the catch; real claims never collect money from you. The triple-payout is bait to get that 30 yuan and your scan.",
      "zh": "判对了，诈骗。「激活保证金」就是套路，真理赔绝不向你收钱。三倍赔款只是诱饵，为了那 30 元和你扫的码。"
    },
    "truthSafe": {
      "en": "This was a scam. Genuine compensation only pays money to you—it never requires a \"deposit\" or \"activation fee\" first. The moment money has to leave your account, it's a fraud.",
      "zh": "这是骗局。真正的赔付只会把钱给你，绝不会先要「保证金」或「激活费」。只要钱得先从你账户出去，就是诈骗。"
    }
  },
  {
    "answer": "scam",
    "risk": 2600,
    "difficulty": 3,
    "title": {
      "en": "Flight Change Compensation",
      "zh": "航班退改签赔偿"
    },
    "chan": {
      "en": "SMS · \"airline service\"",
      "zh": "短信 · 「航司客服」"
    },
    "sender": {
      "en": "Airline customer service",
      "zh": "某航空客服"
    },
    "text": {
      "en": "[Flight Notice] Your flight tomorrow is cancelled due to weather control. Per civil aviation policy you're owed 2,600 yuan in rebooking compensation.\nTo receive it, call our claims line 400-xxx-xxxx and provide your banking app verification when the agent guides you, so the compensation can be wired to your card.",
      "zh": "【航班通知】您明日航班因天气管制取消，按民航规定可获改签赔偿 2600 元。\n领取请拨打理赔专线 400-xxx-xxxx，按专员指引提供您银行App的验证信息，以便将赔款打入您卡内。"
    },
    "flags": [
      {
        "en": "Surface bait: real-sounding cancellation, cites 'civil aviation policy,' a proper 400 hotline—mirrors a true delay notice.",
        "zh": "表层诱饵：像真的航班取消、援引「民航规定」、正经 400 专线，跟真延误通知如出一辙。"
      },
      {
        "en": "THE tell: they ask you to hand over your banking-app verification—that's account takeover, not a payout.",
        "zh": "唯一破绽：让你提供「银行App的验证信息」——这是盗号控账，不是给你赔款。"
      },
      {
        "en": "Transferable rule: receiving money never requires giving anyone your bank verification; verify flights only via the airline's own app/site.",
        "zh": "可迁移原则：收钱永远不需要把银行验证信息给别人；航班只在航司官方App/官网核实。"
      }
    ],
    "truthScam": {
      "en": "Correct—scam. To RECEIVE money you never give out banking verification. That step hands them your account. Check flight status only in the airline's official channel.",
      "zh": "判对了，诈骗。收钱从不需要交出银行验证信息，这一步是把账户交给对方。航班状态只在航司官方渠道查。"
    },
    "truthSafe": {
      "en": "This was a scam. To receive a payout you never need to provide bank verification—that step exists only to drain your account. Always confirm flight changes through the airline's official app or website, never a texted hotline.",
      "zh": "这是骗局。领赔款根本不需要你提供银行验证信息，那一步只为掏空你的账户。航班变动一律在航司官方App或官网确认，别打短信里的电话。"
    }
  },
  {
    "answer": "scam",
    "risk": 800,
    "difficulty": 2,
    "title": {
      "en": "Accidentally Opened \"Million-Yuan Protection\"",
      "zh": "误开通了「百万保障」要关闭"
    },
    "chan": {
      "en": "Phone call · \"payment security\"",
      "zh": "来电 · 「支付安全中心」"
    },
    "sender": {
      "en": "Payment app security center",
      "zh": "某支付App安全中心"
    },
    "text": {
      "en": "Hello, our records show that during a trial you accidentally activated the \"Million-Yuan Protection\" service. The free period ends today and it will charge 800 yuan per month afterward.\nTo close it I'll walk you through the steps. First, open the loan/credit page so we can verify your identity tier, then follow my instructions to deactivate it before billing starts.",
      "zh": "您好，系统显示您在试用时误开通了「百万保障」服务，免费期今天到期，之后每月会扣 800 元。\n为了帮您关闭，我一步步指引您：先打开借贷额度页面，我们核验一下您的身份等级，再按我说的操作在扣费前关掉它。"
    },
    "flags": [
      {
        "en": "Surface bait: 'accidental activation, free period ending,' calm helpful agent guiding you to cancel—classic believable setup.",
        "zh": "表层诱饵：「误开通、免费期到期」、平静热心地指引你关闭，剧本很可信。"
      },
      {
        "en": "THE tell: 'closing' a service somehow requires opening your loan/credit page—the real goal is to operate your borrowing line.",
        "zh": "唯一破绽：「关闭」服务却要你打开借贷额度页——真正目的是操作你的借款额度。"
      },
      {
        "en": "Transferable rule: no service is closed by opening a loan page; the \"million-yuan protection\" auto-charge story is a known script.",
        "zh": "可迁移原则：关服务绝不需要打开借贷页；「百万保障自动扣费」本身就是固定话术。"
      }
    ],
    "truthScam": {
      "en": "Correct—scam. There is no real \"million-yuan protection\" auto-charge; the script steers you to your loan page so they can borrow and siphon funds.",
      "zh": "判对了，诈骗。根本没有「百万保障」自动扣费这回事，话术是引你到借贷页，好借钱抽走。"
    },
    "truthSafe": {
      "en": "This was a scam. The \"million-yuan protection\" auto-charge is a fabricated script—and closing any service never requires opening your loan/credit page. That step is how they access your borrowing line.",
      "zh": "这是骗局。「百万保障」自动扣费是编出来的固定话术，何况关任何服务都不需要打开你的借贷额度页。那一步正是他们动你借款额度的入口。"
    }
  },
  {
    "answer": "scam",
    "risk": 600,
    "difficulty": 2,
    "title": {
      "en": "Order Anomaly, Identity Re-Check",
      "zh": "订单异常需核验身份"
    },
    "chan": {
      "en": "App message · \"order service\"",
      "zh": "App消息 · 「订单客服」"
    },
    "sender": {
      "en": "Shop order service",
      "zh": "网店订单客服"
    },
    "text": {
      "en": "Dear customer, our risk system flagged your recent order as abnormal; it's been frozen to protect you. To unfreeze and continue shipping, we need to re-verify your identity.\nPlease read me the verification code our system sends to your phone now, so the agent can clear the anomaly flag for you.",
      "zh": "亲，风控系统检测到您近期订单异常，已为保护您临时冻结。为解冻并正常发货，需重新核验您的身份。\n请把系统现在发到您手机的验证码念给我，专员好帮您清除异常标记。"
    },
    "flags": [
      {
        "en": "Surface bait: 'risk control froze your order to protect you'—sounds responsible and routine.",
        "zh": "表层诱饵：「风控为保护您冻结了订单」，听着负责又日常。"
      },
      {
        "en": "THE tell: they ask you to read out the SMS verification code—that code is the key to your account/payment, never share it.",
        "zh": "唯一破绽：让你念出手机验证码——那是你账户/支付的钥匙，绝不能告诉任何人。"
      },
      {
        "en": "Transferable rule: real merchants never need your SMS code; any code shared by phone = account/payment takeover.",
        "zh": "可迁移原则：正规商家永远不需要你的短信验证码；念出验证码=交出账户/支付权限。"
      }
    ],
    "truthScam": {
      "en": "Correct—scam. The whole 'frozen order' story exists to get your SMS code. That code authorizes logins and payments; reading it out hands over your account.",
      "zh": "判对了，诈骗。「订单冻结」整套就是为了套你的验证码。那串码能授权登录和支付，念出去就是交出账户。"
    },
    "truthSafe": {
      "en": "This was a scam. No legitimate merchant ever needs the verification code texted to you—that code authorizes logins and payments. Reading it aloud lets them take over your account. Never share an SMS code with anyone.",
      "zh": "这是骗局。任何正规商家都不需要发到你手机的验证码——那串码能授权登录和支付，念出去就是把账户交给对方。验证码绝不告诉任何人。"
    }
  },
  {
    "answer": "scam",
    "risk": 15000,
    "difficulty": 3,
    "title": {
      "en": "Service Callback, \"Share Your Screen\"",
      "zh": "客服回访诱导屏幕共享"
    },
    "chan": {
      "en": "Phone call · \"return visit\"",
      "zh": "来电 · 「客服回访」"
    },
    "sender": {
      "en": "Bank-affiliated finance service",
      "zh": "某金融客服回访"
    },
    "text": {
      "en": "Hello, this is a courtesy return-visit regarding your account. Our system shows a settings error on your side that may cause wrongful deductions. We'd like to help you correct it right now.\nPlease join a video meeting and turn on screen sharing, so our specialist can see your settings page and guide each tap. It's the fastest way to fix it together.",
      "zh": "您好，这边是针对您账户的例行回访。系统显示您这边有一处设置错误，可能导致误扣款，我们想现在就帮您改过来。\n麻烦您进一个视频会议、打开屏幕共享，让专员看到您的设置页面，一步步指引您点。这样一起改最快。"
    },
    "flags": [
      {
        "en": "Surface bait: gentle 'courtesy return-visit,' offers to fix a setting error for you—patient and professional, no urgency.",
        "zh": "表层诱饵：温和的「例行回访」，主动帮你改设置错误，耐心专业、不催促。"
      },
      {
        "en": "THE tell: asking you to turn on screen sharing—they watch you type passwords/codes and remotely guide transfers.",
        "zh": "唯一破绽：让你开「屏幕共享」——对方就能看你输密码/验证码，远程指挥转账。"
      },
      {
        "en": "Transferable rule: no real customer service ever needs your screen shared; screen sharing = handing them remote control.",
        "zh": "可迁移原则：任何正规客服都不需要你共享屏幕；屏幕共享=把遥控权交给对方。"
      }
    ],
    "truthScam": {
      "en": "Correct—scam. Screen sharing lets them read every password and code you type and steer you through transfers. No legitimate service ever needs it.",
      "zh": "判对了，诈骗。屏幕共享让对方看见你输的每个密码和验证码，并引导你转账。正规客服永远不需要它。"
    },
    "truthSafe": {
      "en": "This was a scam. No genuine customer service ever asks you to share your screen—that gives them eyes on every password and code you enter, and lets them guide you into transferring money out.",
      "zh": "这是骗局。真正的客服绝不会让你共享屏幕——那等于把你输入的每个密码、验证码都暴露给对方，再引导你把钱转走。"
    }
  },
  {
    "answer": "scam",
    "risk": 3200,
    "difficulty": 3,
    "title": {
      "en": "Shop \"QC Failed,\" Proactive Refund",
      "zh": "网店「质检不合格」主动理赔"
    },
    "chan": {
      "en": "Phone call · \"quality control\"",
      "zh": "来电 · 「质检部」"
    },
    "sender": {
      "en": "Quality dept of the shop you ordered from",
      "zh": "你下单那家店的质检部"
    },
    "text": {
      "en": "Hello, this is the quality-control department. A batch including your order failed inspection and may pose a safety risk, so we're proactively compensating affected buyers 3,200 yuan, no need to return the item.\nTo receive the funds, please open the credit-borrow feature in your wallet first—the compensation system can only push payment to a verified credit account. Once received, you simply close it again.",
      "zh": "您好，这边是质检部。包含您订单的一批货抽检不合格、可能有安全隐患，我们主动给受影响的买家赔付 3200 元，东西不用退。\n领款请您先把钱包里的信用借款功能开通一下，赔付系统只能把钱推给已认证的信用账户。到账后您再关掉就行。"
    },
    "flags": [
      {
        "en": "Surface bait: 'QC failed, safety risk, proactive payout, keep the item'—generous and conscientious, lowers your guard.",
        "zh": "表层诱饵：「质检不合格、有隐患、主动赔付、东西不用退」，慷慨负责，让你放松警惕。"
      },
      {
        "en": "THE tell: 'the system can only pay a verified credit account'—a refund can NEVER require opening a borrow feature.",
        "zh": "唯一破绽：「只能打给已认证的信用账户」——退款绝不可能要你开通借款功能。"
      },
      {
        "en": "Transferable rule: receiving money never depends on enabling any loan/credit line; that's borrowing your money to steal it.",
        "zh": "可迁移原则：收钱绝不取决于开通任何借贷额度；那是借你的钱来偷走。"
      }
    ],
    "truthScam": {
      "en": "Correct—scam. 'Only pays a verified credit account' is fiction; refunds never need a borrow feature. They make you borrow, then drain it.",
      "zh": "判对了，诈骗。「只能打给信用账户」是编的，退款从不需要借款功能。是让你借出钱再抽走。"
    },
    "truthSafe": {
      "en": "This was a scam. No payout system 'can only pay a verified credit account'—that's invented. A real refund never requires opening a borrow/credit feature; that step makes you borrow money the scammer then takes.",
      "zh": "这是骗局。没有哪个赔付系统「只能打给信用账户」，那是编的。真退款绝不需要开通借款功能，那一步是让你借出钱、再被对方拿走。"
    }
  },
  {
    "answer": "scam",
    "risk": 200,
    "difficulty": 2,
    "title": {
      "en": "ETC Expired, Re-Authenticate",
      "zh": "ETC失效需重新认证"
    },
    "chan": {
      "en": "SMS · \"ETC service\"",
      "zh": "短信 · 「ETC服务」"
    },
    "sender": {
      "en": "ETC service notice",
      "zh": "ETC服务通知"
    },
    "text": {
      "en": "[ETC Notice] Your ETC has expired and is suspended; tolls cannot be deducted. Please re-authenticate within 24h to avoid being blacklisted:\nhttps://etc-cn.auth-verify.cc/login\nComplete identity and card binding at the link to restore normal use.",
      "zh": "【ETC通知】您的ETC已失效并停用，无法正常扣费，请于24小时内重新认证，逾期将列入黑名单：\nhttps://etc-cn.auth-verify.cc/login\n在链接内完成身份与银行卡绑定即可恢复使用。"
    },
    "flags": [
      {
        "en": "Surface bait: a familiar 'ETC expired, re-authenticate' notice—a hassle everyone believes, plain and routine.",
        "zh": "表层诱饵：常见的「ETC失效、重新认证」通知，人人都信的麻烦事，平实又日常。"
      },
      {
        "en": "THE tell: the link is a random unofficial domain (auth-verify.cc) asking you to bind your bank card—a phishing page.",
        "zh": "唯一破绽：链接是个杂牌非官方域名（auth-verify.cc），让你绑银行卡，是钓鱼页。"
      },
      {
        "en": "Transferable rule: never bind a card via a texted link; ETC is handled only in the bank/official ETC app.",
        "zh": "可迁移原则：绝不通过短信链接绑卡；ETC 只在银行或官方ETC应用里办理。"
      }
    ],
    "truthScam": {
      "en": "Correct—scam. The lookalike domain leads to a phishing page that harvests your identity and card details. ETC is never re-authenticated via a random texted link.",
      "zh": "判对了，诈骗。仿冒域名通向钓鱼页，专收你的身份和卡信息。ETC 绝不靠短信里的杂牌链接重新认证。"
    },
    "truthSafe": {
      "en": "This was a scam. The domain isn't an official ETC or bank site—it's a phishing page that collects your identity and card binding. Handle ETC only inside the official bank or ETC app, never through a texted link.",
      "zh": "这是骗局。那域名不是官方ETC或银行站点，是收集你身份和绑卡信息的钓鱼页。ETC 只在官方银行或ETC应用里办，绝不点短信链接。"
    }
  },
  {
    "answer": "scam",
    "risk": 500,
    "difficulty": 2,
    "title": {
      "en": "Phone Top-Up Rebate Promo",
      "zh": "话费充值返利活动"
    },
    "chan": {
      "en": "App message · \"carrier service\"",
      "zh": "App消息 · 「运营商客服」"
    },
    "sender": {
      "en": "Telecom carrier promo service",
      "zh": "某运营商活动客服"
    },
    "text": {
      "en": "Dear valued user, as a long-term subscriber you're selected for a top-up rebate: recharge 500 yuan and the system returns 600 to your balance.\nClaim slots are limited. Open the event link and pay the 500 to the designated activation account; your balance and the bonus arrive within 2 hours. This is an official thank-you offer.",
      "zh": "尊敬的老用户，因您长期在网，特邀参加充值返利：充 500 元，系统返还 600 元到话费余额。\n名额有限，打开活动链接，把 500 元充到指定的激活账户，2小时内余额和奖励一起到账。这是官方回馈活动。"
    },
    "flags": [
      {
        "en": "Surface bait: 'long-term user reward, official thank-you,' modest amounts—feels like a real loyalty promo.",
        "zh": "表层诱饵：「老用户回馈、官方活动」、金额不大，像真的会员回馈促销。"
      },
      {
        "en": "THE tell: it routes your top-up to a 'designated activation account' instead of your own number—your money goes to them.",
        "zh": "唯一破绽：让你把钱充到「指定激活账户」而不是你自己的号码——钱直接进了对方账户。"
      },
      {
        "en": "Transferable rule: real top-ups go to your own phone number; paying any third-party 'activation account' is the loss.",
        "zh": "可迁移原则：真充值只充到你自己的号码；往任何第三方「激活账户」付钱，钱就没了。"
      }
    ],
    "truthScam": {
      "en": "Correct—scam. A genuine top-up always credits your own number. 'Designated activation account' means your 500 goes straight into the scammer's pocket.",
      "zh": "判对了，诈骗。真充值永远进你自己的号码。「指定激活账户」就是让那 500 元直接落进骗子口袋。"
    },
    "truthSafe": {
      "en": "This was a scam. A real phone top-up always goes to your own number. Being told to pay a 'designated activation account' means the money lands in the scammer's wallet, and no rebate ever comes.",
      "zh": "这是骗局。真正的话费充值永远充进你自己的号码。让你付到「指定激活账户」，就是让钱进骗子的钱包，所谓返利永远不会到。"
    }
  },
  {
    "answer": "scam",
    "risk": 6800,
    "difficulty": 3,
    "title": {
      "en": "Refund Larger Than Order, \"Send Back the Excess\"",
      "zh": "退款打多了要你「退回多余」"
    },
    "chan": {
      "en": "Phone call · \"after-sales\"",
      "zh": "来电 · 「售后」"
    },
    "sender": {
      "en": "After-sales of the shop you ordered from",
      "zh": "你买过东西的那家网店售后"
    },
    "text": {
      "en": "Hello, processing your return refund the operator entered the amount wrong and sent 6,800 yuan instead of 680—we've already pushed it to your credit account.\nPlease check your wallet; once you see it, kindly transfer the extra 6,120 back to our finance account I'll provide. We're recorded on call, so don't worry—just help us correct the slip.",
      "zh": "您好，给您办退货退款时操作员金额填错了，把 680 打成了 6800，已经推到您信用账户里了。\n麻烦您查一下钱包，看到后请把多出来的 6120 元转回我给您的财务账户。我们全程通话录音，您放心，帮我们把这笔失误改过来就行。"
    },
    "flags": [
      {
        "en": "Surface bait: 'we made an honest mistake, calls are recorded'—plays on your fairness and sounds accountable.",
        "zh": "表层诱饵：「我们填错了、全程录音」，利用你的公平心，听着很负责。"
      },
      {
        "en": "THE tell: the 'over-refund' lands in your credit/borrow account (so it's actually borrowed money), and you 'return the excess' to their account—you repay a debt and gift them cash.",
        "zh": "唯一破绽：「多退的钱」进的是你信用/借款账户（其实是借出的钱），让你把「多余」转到他们账户——你既背了债又白送钱。"
      },
      {
        "en": "Transferable rule: a true over-refund is reversed by the platform on its own; never transfer 'excess' to a personal/finance account.",
        "zh": "可迁移原则：真多退由平台自行撤回，绝不需要你把「多余」转到个人/财务账户。"
      }
    ],
    "truthScam": {
      "en": "Correct—scam. The 'extra' is money quietly borrowed in your name; transferring it back gifts them cash and leaves you owing the loan. Platforms reverse over-refunds themselves.",
      "zh": "判对了，诈骗。「多出来的钱」是悄悄以你名义借的，转回去就是白送钱、自己还背上贷款。真多退由平台自己撤回。"
    },
    "truthSafe": {
      "en": "This was a scam. A genuine over-refund is reversed by the platform automatically. Here the 'extra' was secretly borrowed in your name—transferring it 'back' gifts the scammer cash while you're stuck repaying the loan. Never send money to a 'finance account.'",
      "zh": "这是骗局。真正退多了，平台会自己撤回。这里「多出来的钱」是偷偷以你名义借的，转「回去」等于白送骗子钱、自己还得还贷。绝不向「财务账户」转账。"
    }
  },
  {
    "answer": "scam",
    "risk": 1500,
    "difficulty": 2,
    "title": {
      "en": "Out of Stock, Compensated Coupon Activation",
      "zh": "缺货补偿券需激活"
    },
    "chan": {
      "en": "App message · \"order service\"",
      "zh": "App消息 · 「订单客服」"
    },
    "sender": {
      "en": "Shop order service",
      "zh": "网店订单客服"
    },
    "text": {
      "en": "Dear customer, your paid item is out of stock and we can't ship. To apologize we're issuing a 1,500-yuan compensation that goes straight to your bank card.\nTo activate the transfer, our finance needs you to read back the one-time code your bank texts you, confirming the receiving card is yours. Then the 1,500 lands immediately.",
      "zh": "亲，您拍下付款的商品缺货发不了，为表歉意给您 1500 元补偿，直接打到您银行卡。\n为激活这笔转账，财务需要您把银行发给您的一次性验证码念回来，确认收款卡是您本人的，1500 元就马上到账。"
    },
    "flags": [
      {
        "en": "Surface bait: 'out of stock, apology compensation straight to your card'—reasonable and customer-friendly.",
        "zh": "表层诱饵：「缺货、致歉补偿直打银行卡」，合情合理、为客户着想。"
      },
      {
        "en": "THE tell: 'read back the one-time bank code to confirm your card'—that code authorizes a payment OUT, not in.",
        "zh": "唯一破绽：「念回银行一次性验证码确认本人卡」——那串码授权的是付款转出，不是入账。"
      },
      {
        "en": "Transferable rule: receiving a transfer never requires a code from you; any 'read me your bank code' is theft.",
        "zh": "可迁移原则：收一笔转账从不需要你提供验证码；凡「念银行验证码」都是盗刷。"
      }
    ],
    "truthScam": {
      "en": "Correct—scam. Receiving money never needs a code from you. That one-time code authorizes money leaving your account—reading it out lets them charge your card.",
      "zh": "判对了，诈骗。收钱从不需要你的验证码。那串一次性码授权的是钱转出，念出去就是让对方刷你的卡。"
    },
    "truthSafe": {
      "en": "This was a scam. To receive a transfer you never provide a code—the one-time code your bank sends authorizes money leaving your account. Reading it back lets the scammer charge your card. Never share a bank code.",
      "zh": "这是骗局。收一笔转账绝不需要你提供验证码——银行发的一次性码授权的是钱从你账户转出。念回去就是让骗子刷你的卡。银行验证码绝不外传。"
    }
  },
  {
    "answer": "scam",
    "risk": 9900,
    "difficulty": 3,
    "title": {
      "en": "Defective Batch Recall, Deposit-Backed Refund",
      "zh": "问题批次召回，缴保证金退款"
    },
    "chan": {
      "en": "Phone call · \"recall service\"",
      "zh": "来电 · 「召回专线」"
    },
    "sender": {
      "en": "Brand recall service of a product you bought",
      "zh": "你买过的某商品召回专线"
    },
    "text": {
      "en": "Hello, the batch you purchased is under official recall for a defect; you're entitled to a 9,900-yuan full refund plus goodwill compensation.\nBecause the amount is large, the disbursement requires a temporary 'guarantee deposit' equal to 10% held in our escrow, refunded together once the recall is confirmed. Please transfer 990 to the escrow account to start the process.",
      "zh": "您好，您购买的批次因缺陷被官方召回，您可获 9900 元全额退款及额外补偿。\n因金额较大，放款需先在我们托管账户暂存 10% 的「履约保证金」，召回确认后连同退款一起返还。请先向托管账户转 990 元启动流程。"
    },
    "flags": [
      {
        "en": "Surface bait: 'official recall, full refund plus goodwill,' escrow and 'guarantee deposit' jargon—sounds like a formal process.",
        "zh": "表层诱饵：「官方召回、全额退款加补偿」、托管账户和「履约保证金」术语，像正规流程。"
      },
      {
        "en": "THE tell: it demands you pay a 'guarantee deposit' upfront—any refund that needs you to pay first is a scam.",
        "zh": "唯一破绽：要你先交「履约保证金」——任何要你先付钱的退款都是骗局。"
      },
      {
        "en": "Transferable rule: legitimate refunds and recalls never collect a deposit from you; money only flows to you.",
        "zh": "可迁移原则：正规退款和召回绝不向你收保证金；钱只往你这边流。"
      }
    ],
    "truthScam": {
      "en": "Correct—scam. 'Guarantee deposit' dressed up with escrow jargon is still you paying first—which a real refund never requires. The 990 just vanishes.",
      "zh": "判对了，诈骗。包着「托管/保证金」术语，本质还是让你先付钱，真退款绝不会这样。那 990 元直接没了。"
    },
    "truthSafe": {
      "en": "This was a scam. No genuine refund or recall ever requires you to pay a 'guarantee deposit' first—escrow jargon doesn't change that. Money in a real refund only moves toward you, never from you.",
      "zh": "这是骗局。真正的退款或召回绝不会要你先交「履约保证金」——托管术语改变不了这点。真退款里钱只会流向你，不会从你这儿出。"
    }
  },
  {
    "answer": "scam",
    "risk": 2880,
    "difficulty": 2,
    "title": {
      "en": "Auto-Renew Cancel via Lookalike Domain",
      "zh": "取消连续扣费——仿冒域名"
    },
    "chan": {
      "en": "SMS · \"shopping platform\"",
      "zh": "短信 · 「购物平台」"
    },
    "sender": {
      "en": "A shopping platform billing",
      "zh": "某购物平台账务"
    },
    "text": {
      "en": "[Billing] Your store's annual service plan auto-renews tonight; 2,880 yuan will be deducted. To modify or cancel, manage it here:\nwww.taoba0-service.com/manage\nSign in with your account to adjust the renewal. No change means the fee is charged as usual.",
      "zh": "【账务】您店铺的年度服务套餐将于今晚自动续费，扣款 2880 元。如需修改或取消，请在此管理：\nwww.taoba0-service.com/manage\n用账号登录调整续费，不修改将照常扣费。"
    },
    "flags": [
      {
        "en": "Surface bait: businesslike renewal notice with a self-service 'manage' link and believable amount—reads as routine billing.",
        "zh": "表层诱饵：商务口吻的续费通知、自助「管理」链接、金额可信，像例行账务。"
      },
      {
        "en": "THE tell: the domain is taoba0 (zero instead of o)—a lookalike, not the real platform.",
        "zh": "唯一破绽：域名是 taoba0（把 o 写成 0），是仿冒，不是真平台。"
      },
      {
        "en": "Transferable rule: manage subscriptions only inside the official app/seller backend, never via a domain in a text.",
        "zh": "可迁移原则：订阅只在官方App/卖家后台里管理，绝不点短信里的域名。"
      }
    ],
    "truthScam": {
      "en": "Correct—scam. taoba0 with a zero is a lookalike domain; the 'manage' page steals your seller login. Check renewals only in the official backend.",
      "zh": "判对了，诈骗。带 0 的 taoba0 是仿冒域名，「管理」页是为了偷你的卖家账号。续费只在官方后台查。"
    },
    "truthSafe": {
      "en": "This was a scam. Read it carefully: taoba0 uses a zero in place of the letter o—a lookalike domain. The 'manage' page only steals your seller login. Manage subscriptions inside the official backend, never a texted link.",
      "zh": "这是骗局。仔细看：taoba0 用数字 0 替了字母 o，是仿冒域名。「管理」页只为偷你的卖家账号。订阅一律在官方后台管理，别点短信链接。"
    }
  },
  {
    "answer": "scam",
    "risk": 4500,
    "difficulty": 3,
    "title": {
      "en": "Wrong VIP Tier, Fix via Screen Share",
      "zh": "会员等级开错，共享屏幕修正"
    },
    "chan": {
      "en": "Phone call · \"member service\"",
      "zh": "来电 · 「会员客服」"
    },
    "sender": {
      "en": "A video site member service",
      "zh": "某视频网站会员客服"
    },
    "text": {
      "en": "Hello, our system mistakenly set your account to a corporate VIP tier, which bills 4,500 yuan annually. We want to fix it back to your normal plan before any charge.\nThe correction must be done on your settings screen. Please open a screen-share so our technician can see the exact toggle and guide you through it. It only takes a minute and there's no charge for the fix.",
      "zh": "您好，系统误把您的账号设成了企业会员档，会按年扣 4500 元。我们想在扣费前帮您改回普通套餐。\n修正要在您的设置页面上做，麻烦您开个屏幕共享，让技术员看到具体的开关、一步步指引您。一分钟就好，修正本身不收费。"
    },
    "flags": [
      {
        "en": "Surface bait: 'system error set you to a pricey tier, we'll fix it for free before billing'—patient, no pressure, helpful.",
        "zh": "表层诱饵：「系统误设了贵档、扣费前免费帮你改」，耐心、不施压、很热心。"
      },
      {
        "en": "THE tell: the 'fix' requires turning on screen sharing—remote control to watch your inputs and steer transfers.",
        "zh": "唯一破绽：「修正」要你开屏幕共享——远程操控，盯你输入、引导转账。"
      },
      {
        "en": "Transferable rule: changing a membership tier never needs your screen shared; screen share = remote control handed over.",
        "zh": "可迁移原则：改会员档从不需要共享屏幕；屏幕共享=交出遥控权。"
      }
    ],
    "truthScam": {
      "en": "Correct—scam. A membership change never needs screen sharing. They use it to watch your passwords/codes and walk you into a transfer.",
      "zh": "判对了，诈骗。改会员档从不需要屏幕共享。他们用它盯你的密码/验证码，再引你转账。"
    },
    "truthSafe": {
      "en": "This was a scam. Adjusting a membership tier never requires sharing your screen. Screen share hands a stranger live view of your passwords and codes and lets them guide you into transferring money. Adjust plans only inside the official app.",
      "zh": "这是骗局。调整会员档绝不需要共享屏幕。屏幕共享等于把你的密码、验证码实时暴露给陌生人，还能引你转账。套餐只在官方App里改。"
    }
  },
  {
    "answer": "scam",
    "risk": 700,
    "difficulty": 2,
    "title": {
      "en": "Damaged-Goods Claim, Borrow to Receive",
      "zh": "破损理赔，开通备用金收款"
    },
    "chan": {
      "en": "App message · \"logistics claims\"",
      "zh": "App消息 · 「物流理赔」"
    },
    "sender": {
      "en": "Logistics claims service",
      "zh": "物流理赔客服"
    },
    "text": {
      "en": "Dear customer, your parcel was damaged in transit; per regulation we compensate 700 yuan, item not required back.\nOur payout only reaches accounts with an active reserve fund. Please open the 'reserve fund' feature in your wallet to receive it; you can switch it off right after the money arrives. Sorry for the trouble.",
      "zh": "亲，您的包裹运输中破损，按规定赔付 700 元，物品无需寄回。\n我们的赔付只能到有「备用金」功能的账户，请您在钱包里开通「备用金」来收款，钱到账后立刻关掉即可。给您添麻烦了。"
    },
    "flags": [
      {
        "en": "Surface bait: 'damaged in transit, compensation per regulation, keep the item'—apologetic, modest, believable.",
        "zh": "表层诱饵：「运输破损、按规定赔付、东西不用退」，致歉、金额小、可信。"
      },
      {
        "en": "THE tell: 'payout only reaches accounts with reserve fund active'—a refund can never require enabling a borrowing feature.",
        "zh": "唯一破绽：「赔付只能到开了备用金的账户」——退款绝不可能要你开通借款类功能。"
      },
      {
        "en": "Transferable rule: receiving compensation never depends on activating a loan/reserve line; that's borrowing your money to steal it.",
        "zh": "可迁移原则：收赔款绝不取决于开通借款/备用金；那是借你的钱来偷走。"
      }
    ],
    "truthScam": {
      "en": "Correct—scam. 'Reserve fund' is just a borrowing line; no payout 'only reaches' such accounts. They make you borrow, then siphon it off.",
      "zh": "判对了，诈骗。「备用金」就是借款额度，没有哪个赔付「只能到」这种账户。是让你借钱再抽走。"
    },
    "truthSafe": {
      "en": "This was a scam. 'Reserve fund' is a borrowing feature, and no payout 'only reaches' accounts that have it—that line is invented. A real refund never needs you to enable any loan/reserve feature; doing so borrows money the scammer then takes.",
      "zh": "这是骗局。「备用金」是借款功能，也没有哪个赔付「只能到」开了它的账户，那是编的。真退款绝不需要你开通任何借款/备用金，一开就是借出钱被对方拿走。"
    }
  },
  {
    "answer": "scam",
    "risk": 25000,
    "difficulty": 3,
    "title": {
      "en": "Store Deposit Unfreeze, Pay Service Fee",
      "zh": "店铺保证金解冻，先付手续费"
    },
    "chan": {
      "en": "Phone call · \"merchant service\"",
      "zh": "来电 · 「商家客服」"
    },
    "sender": {
      "en": "Merchant platform service",
      "zh": "某商家平台客服"
    },
    "text": {
      "en": "Hello, this is merchant support. Due to a system upgrade, your store's 25,000-yuan operating deposit was frozen by mistake. We're prioritizing the unfreeze for you.\nPer the finance process, unfreezing a large sum requires a one-time 1% service fee paid to the settlement account first; it's deducted from the released funds and any difference returned. Once paid, your 25,000 unfreezes within the day.",
      "zh": "您好，这边是商家客服。因系统升级，您店铺的 2.5 万元经营保证金被误冻结，我们正在优先为您解冻。\n按财务流程，大额解冻需先向结算账户支付一笔 1% 的一次性手续费，会从释放的款项里抵扣、多退少补。付完后您的 2.5 万当天内解冻。"
    },
    "flags": [
      {
        "en": "Surface bait: 'system upgrade froze your deposit by mistake, we're prioritizing you'—specific, accountable, no urgency theatrics.",
        "zh": "表层诱饵：「系统升级误冻了保证金、优先帮你」，具体、负责、不演催促。"
      },
      {
        "en": "THE tell: unfreezing requires you to pay a 'service fee' first—any process that needs you to pay to get your own money back is a scam.",
        "zh": "唯一破绽：解冻要你先付「手续费」——凡是要你先掏钱才能拿回自己钱的流程都是骗局。"
      },
      {
        "en": "Transferable rule: real platforms deduct fees from funds they hold, never demand you pay into a 'settlement account' first.",
        "zh": "可迁移原则：正规平台从它持有的款项里扣费，绝不会要你先往「结算账户」打钱。"
      }
    ],
    "truthScam": {
      "en": "Correct—scam. A real platform deducts any fee from funds it already holds; demanding you pay a 'service fee' first to unfreeze your own money is the trap. The fee just disappears.",
      "zh": "判对了，诈骗。正规平台会从它已持有的款里扣费；要你先付「手续费」才解冻自己的钱，就是陷阱。那笔费用直接没了。"
    },
    "truthSafe": {
      "en": "This was a scam. To release funds it holds, a real platform deducts fees from that money—it never asks you to pay a 'service fee' into a settlement account first. Being told to pay before getting your own money back is always fraud.",
      "zh": "这是骗局。要释放它持有的款项，正规平台会从那笔钱里扣费，绝不会要你先往结算账户付「手续费」。让你先付钱才能拿回自己的钱，永远是诈骗。"
    }
  },
  {
    "answer": "scam",
    "risk": 38000,
    "difficulty": 3,
    "title": {
      "en": "The Free Stock-Picking Master",
      "zh": "免费荐股老师"
    },
    "chan": {
      "en": "WeChat · group",
      "zh": "微信 · 群聊"
    },
    "sender": {
      "en": "Wealth Study Group · Assistant Lin",
      "zh": "财富学习群 · 林助理"
    },
    "text": {
      "en": "Welcome aboard. No fees here, the teacher just shares ideas out of passion.\nNot in a rush for you to buy anything—watch the calls for a week first.\nYesterday's pick the teacher flagged rose 6%, but past results don't bind you.\nWhen you feel comfortable, the assistant can walk you through opening an account on our partner platform.",
      "zh": "欢迎进群。咱这儿不收费，老师纯属热爱、分享思路。\n也不急着让你买啥，先跟着看一周单子。\n昨天老师点的票涨了6个点，但过往不代表以后，你自己判断。\n等你觉得稳了，助理再带你在合作平台开个户。"
    },
    "flags": [
      {
        "en": "Bait: no fees, no pressure, 'just watch a week'—patience disarms you.",
        "zh": "诱饵：不收费、不催、先看一周——耐心让你放下戒备。"
      },
      {
        "en": "THE tell: a 'teacher' giving daily picks in a private group + steering you to a 'partner platform' to open an account is a pump-and-dump funnel.",
        "zh": "破绽：群里『老师』每天荐股 + 引导去『合作平台』开户，就是养、套、杀的资金盘。"
      },
      {
        "en": "Principle: no legit advisor pulls strangers into a chat to push a specific platform.",
        "zh": "可迁移：正规投顾不会拉陌生人进群、再指定平台开户。"
      }
    ],
    "truthScam": {
      "en": "Right call. 'Free teacher + daily picks + designated platform' is the classic stock fraud—the platform is rigged.",
      "zh": "判对了。『免费老师+每天荐股+指定开户平台』是经典荐股局，那平台是做的局，盘面随他控。"
    },
    "truthSafe": {
      "en": "This is a scam. A 'teacher' running a private group with daily picks who then routes you to a 'partner platform' is the whole trap—the slow, fee-free patience is the anesthetic.",
      "zh": "这是骗局。『老师+每天荐股+私密群』再指定平台开户就是局，不收费、不催的耐心正是麻醉剂。"
    }
  },
  {
    "answer": "scam",
    "risk": 12000,
    "difficulty": 2,
    "title": {
      "en": "The Steady Fund Auto-Invest Club",
      "zh": "稳健基金定投群"
    },
    "chan": {
      "en": "WeChat · group",
      "zh": "微信 · 群聊"
    },
    "sender": {
      "en": "Steady Growth Club · Teacher Zhou",
      "zh": "稳赢定投群 · 周老师"
    },
    "text": {
      "en": "Auto-invest is about patience, friend—no get-rich-quick here.\nFollow my buy/sell signals each morning; small amounts are fine to start.\nWe've held a 2% monthly average for eight months, slow but sure.\nDownload the club's own app from the link the assistant sends so signals sync.",
      "zh": "定投讲的是耐心，朋友，咱不搞一夜暴富。\n每天早上跟我的买卖信号走，金额小点起步也行。\n我们月均稳在2%八个月了，慢是慢点但踏实。\n装一下助理发的群专属app，信号能同步。"
    },
    "flags": [
      {
        "en": "Bait: 'patience, no quick riches, small amounts fine'—sounds responsible.",
        "zh": "诱饵：『讲耐心、不暴富、金额小点也行』——听着很负责。"
      },
      {
        "en": "THE tell: a teacher issuing daily buy/sell signals + a 'club-only app' is a closed fake-trading platform you can never withdraw from.",
        "zh": "破绽：老师每天发买卖信号 + 『群专属app』，是封闭的假盘，钱进得去出不来。"
      },
      {
        "en": "Principle: real funds settle in your own broker account, never a group's private app.",
        "zh": "可迁移：正规基金在你自己的券商账户里结算，绝不在某群的私有app里。"
      }
    ],
    "truthScam": {
      "en": "Right. The 'club-only app' is a fake platform—numbers go up until you try to cash out.",
      "zh": "判对了。『群专属app』是假盘，数字一直涨，等你提现就出不来了。"
    },
    "truthSafe": {
      "en": "This is a scam. A 'teacher' pushing daily signals into a private app is the trap; the 'steady 2%' is bait to make you put in more.",
      "zh": "这是骗局。老师每天发信号、导去专属app就是局，『稳赚2%』是诱你加码的鱼饵。"
    }
  },
  {
    "answer": "scam",
    "risk": 80000,
    "difficulty": 3,
    "title": {
      "en": "The High-Yield Digital Coin Node",
      "zh": "数字币高返节点"
    },
    "chan": {
      "en": "WeChat · private",
      "zh": "微信 · 私聊"
    },
    "sender": {
      "en": "Old contact · Brother Hai",
      "zh": "旧相识 · 海哥"
    },
    "text": {
      "en": "Long time no talk. I've been quietly running a coin node, nothing flashy.\nIt pays a fixed daily return, withdrawable—I've pulled mine out twice.\nNo pressure to join, I just mention it to people I trust.\nIf curious, start with a tiny amount and see for yourself first.",
      "zh": "好久没聊了。我这两年悄悄在跑个币的节点，不张扬。\n每天固定返点，能提现，我自己都提过两回了。\n不勉强你进，就是信得过的人才提一句。\n好奇的话先放一点点试试，自己看效果。"
    },
    "flags": [
      {
        "en": "Bait: an acquaintance, 'low-key', 'I've withdrawn myself', 'just a tiny test'.",
        "zh": "诱饵：熟人、低调、『我自己提过现』、『先试一点点』。"
      },
      {
        "en": "THE tell: 'fixed daily return' on crypto + small early payouts to lure bigger deposits = Ponzi node, payouts stop once you scale up.",
        "zh": "破绽：币圈『每天固定返点』+ 前期小额可提诱你加大投入 = 庞氏节点，量一大就提不出。"
      },
      {
        "en": "Principle: any 'guaranteed fixed daily yield' on crypto is impossible—volatility can't be fixed.",
        "zh": "可迁移：币圈任何『每天固定收益』都不可能，波动无法被固定。"
      }
    ],
    "truthScam": {
      "en": "Right. The early small withdrawals are bait; 'fixed daily crypto return' is a Ponzi that collapses once you go big.",
      "zh": "判对了。前期能提的小钱是饵，『币圈固定日返』是庞氏，等你加大就崩盘提不出。"
    },
    "truthSafe": {
      "en": "This is a scam. The early payouts and the acquaintance's calm tone are the lure—'fixed daily return' on crypto cannot exist.",
      "zh": "这是骗局。前期能提的小钱和熟人的淡定口吻都是引子，币圈『固定日返』根本不存在。"
    }
  },
  {
    "answer": "scam",
    "risk": 6800,
    "difficulty": 2,
    "title": {
      "en": "The Advance-Pay Order Boost",
      "zh": "垫付刷单返利"
    },
    "chan": {
      "en": "WeChat · private",
      "zh": "微信 · 私聊"
    },
    "sender": {
      "en": "Part-time HR · Sister Mei",
      "zh": "兼职客服 · 梅姐"
    },
    "text": {
      "en": "Easy gig, work from home, do as few as you like.\nFirst small task: the commission lands the same day, no waiting.\nFor the bigger combo task you front the order amount, then get it all back plus the cut.\nNo rush, do today's small one first and see the money arrive.",
      "zh": "轻松活儿，在家做，想做几单做几单。\n第一单小的，佣金当天到账，不用等。\n后面组合大单需要你先垫付订单金额，完成后本金加佣金一起退。\n不急，今天先做小的，看着钱到账。"
    },
    "flags": [
      {
        "en": "Bait: first small commission really arrives same-day—builds trust.",
        "zh": "诱饵：第一单小佣金真的当天到账——建立信任。"
      },
      {
        "en": "THE tell: 'front the order amount yourself' on the bigger task is the trap—the principal never comes back.",
        "zh": "破绽：大单要你『先垫付订单金额』就是局，本金有去无回。"
      },
      {
        "en": "Principle: no real job ever asks you to pay out of pocket first.",
        "zh": "可迁移：任何正规工作都不会让你先自掏腰包垫钱。"
      }
    ],
    "truthScam": {
      "en": "Right. The first payout is the hook; once you front a big 'combo task' the money's gone.",
      "zh": "判对了。第一笔到账是钩子，等你给大『组合单』垫付，钱就没了。"
    },
    "truthSafe": {
      "en": "This is a scam. The same-day first commission is bait—the moment a task asks you to advance funds, it's order-boosting fraud.",
      "zh": "这是骗局。当天到账的第一笔是饵，一旦让你垫付，就是刷单诈骗。"
    }
  },
  {
    "answer": "scam",
    "risk": 1500,
    "difficulty": 2,
    "title": {
      "en": "The Like-and-Follow Task Wall",
      "zh": "点赞关注做任务"
    },
    "chan": {
      "en": "WeChat · group",
      "zh": "微信 · 群聊"
    },
    "sender": {
      "en": "Casual Earnings Group · Admin",
      "zh": "零钱任务群 · 管理员"
    },
    "text": {
      "en": "Just like and follow a few accounts, screenshot, get paid—super relaxed.\nThe first three tasks paid out 3 yuan each, withdrawn instantly.\nWant more per task? Join the 'members' batch—deposit to unlock higher-paying jobs.\nTotally optional, plenty of folks stay on the free small tasks.",
      "zh": "就点个赞、关注几个号，截图领钱，特别轻松。\n前三单每单3块，秒提现到账。\n想单价更高？进『会员』场，充值解锁高价任务就行。\n完全自愿，很多人就一直做免费小单。"
    },
    "flags": [
      {
        "en": "Bait: tiny real payouts, 'optional', 'stay on free tasks'—feels harmless.",
        "zh": "诱饵：小额真返、『自愿』、『可一直做免费单』——看着无害。"
      },
      {
        "en": "THE tell: 'deposit to unlock higher-paying tasks' is the trap—the unlock fee is the scam.",
        "zh": "破绽：『充值解锁高价任务』就是局，那笔解锁充值就是被骗的钱。"
      },
      {
        "en": "Principle: a real task never charges you to access better-paid work.",
        "zh": "可迁移：真任务绝不会让你花钱才能接更高价的活。"
      }
    ],
    "truthScam": {
      "en": "Right. The 3-yuan payouts are warm-up bait; the 'deposit to unlock' step is where they take you.",
      "zh": "判对了。3块的小返是热身饵，『充值解锁』那步才是收割。"
    },
    "truthSafe": {
      "en": "This is a scam. The instant tiny payouts soften you up—charging a deposit to 'unlock' tasks is the order-boosting trap.",
      "zh": "这是骗局。秒到的小钱是软化你，要『充值解锁』任务就是刷单陷阱。"
    }
  },
  {
    "answer": "scam",
    "risk": 30000,
    "difficulty": 2,
    "title": {
      "en": "The Campus Loan Cancellation Notice",
      "zh": "注销校园贷通知"
    },
    "chan": {
      "en": "Phone · call",
      "zh": "电话 · 来电"
    },
    "sender": {
      "en": "Platform Compliance · Officer Chen",
      "zh": "某平台合规专员 · 陈先生"
    },
    "text": {
      "en": "Hello, calm down—nothing's wrong, it's a routine cleanup.\nOur records show a student loan account opened under your ID during school.\nPer new rules it must be formally cancelled, or it may quietly affect your credit.\nNo charge for this; just follow the steps to draw down and clear the leftover quota into our settlement account.",
      "zh": "您好，别紧张，没出事，例行清理而已。\n系统显示您上学期间名下有个校园贷账户。\n按新规得正式注销，不然以后可能悄悄影响征信。\n这事儿不收费，您配合把残留额度提现、清到我们结算账户就行。"
    },
    "flags": [
      {
        "en": "Bait: 'calm down, nothing's wrong, routine, no charge'—lowers your guard.",
        "zh": "诱饵：『别紧张、没出事、例行、不收费』——卸下戒心。"
      },
      {
        "en": "THE tell: 'draw down the leftover quota and clear it into our account' = they borrow in your name and take the money.",
        "zh": "破绽：『把残留额度提现、清到我们账户』= 用你名义借款再转走。"
      },
      {
        "en": "Principle: cancelling an account never requires you to borrow money and send it anywhere.",
        "zh": "可迁移：注销账户绝不需要你去借款、再把钱转给任何人。"
      }
    ],
    "truthScam": {
      "en": "Right. 'Cancel the campus loan' is the script—drawing down the quota into their account means they pocket a loan in your name.",
      "zh": "判对了。『注销校园贷』是话术，把额度提现转给对方=他们借你的名义贷款卷走。"
    },
    "truthSafe": {
      "en": "This is a scam. The soothing 'routine, no charge' tone hides the trap: making you draw down and transfer the 'quota' is borrowing in your name.",
      "zh": "这是骗局。『例行、不收费』的安抚口吻藏着局，让你提现额度转出就是借你名义放贷。"
    }
  },
  {
    "answer": "scam",
    "risk": 9800,
    "difficulty": 3,
    "title": {
      "en": "The Credit Repair Specialist",
      "zh": "征信修复洗白"
    },
    "chan": {
      "en": "WeChat · private",
      "zh": "微信 · 私聊"
    },
    "sender": {
      "en": "Credit Advisor · Manager Guo",
      "zh": "征信顾问 · 郭经理"
    },
    "text": {
      "en": "Take your time, no pressure—I only take cases I'm confident on.\nThose overdue marks can be 'repaired' off your report through the proper channel.\nWe handle it remotely; you just send me your report login and the service fee up front.\nMany clients had their records cleaned this way, totally legit process.",
      "zh": "不急，慢慢来，我只接有把握的单子。\n那几条逾期记录，走正规通道是可以『修复』掉的。\n我们远程操作，您把征信查询的登录和服务费先发我就行。\n好多客户都是这么洗白的，流程很正规。"
    },
    "flags": [
      {
        "en": "Bait: 'no pressure, only confident cases, proper channel'—sounds professional.",
        "zh": "诱饵：『不急、只接有把握的、走正规通道』——听着很专业。"
      },
      {
        "en": "THE tell: 'remote operation + hand over your report login + pay up front' = there is no legal credit repair; they take the fee and your data.",
        "zh": "破绽：『远程操作+交出征信登录+先付费』= 征信根本无法修复，对方拿钱和你的资料跑路。"
      },
      {
        "en": "Principle: legitimate overdue records can't be deleted by any paid 'repair'; only time and repayment clear them.",
        "zh": "可迁移：真实逾期记录无法靠付费『修复』删除，只能靠时间和还款覆盖。"
      }
    ],
    "truthScam": {
      "en": "Right. 'Credit repair' is a fiction—the remote access and up-front fee are how they take your money and identity.",
      "zh": "判对了。『征信修复』是假概念，远程登录和先付费就是骗钱骗资料。"
    },
    "truthSafe": {
      "en": "This is a scam. The patient, professional tone covers a flat impossibility: no one can 'repair' a real overdue record—paying for it is the trap.",
      "zh": "这是骗局。耐心专业的口吻盖住一个硬事实：真实逾期无法『修复』，付费就是被骗。"
    }
  },
  {
    "answer": "scam",
    "risk": 15000,
    "difficulty": 3,
    "title": {
      "en": "The Loan Limit Verification",
      "zh": "网贷提额验资"
    },
    "chan": {
      "en": "Phone · call",
      "zh": "电话 · 来电"
    },
    "sender": {
      "en": "Lending Platform · Account Service",
      "zh": "某贷款平台 · 账户客服"
    },
    "text": {
      "en": "Good news—your application was pre-approved, no need to rush a decision.\nTo lift your limit we just need to verify your repayment ability.\nPlease transfer a sum into your own bound card and screenshot the balance to confirm the funds flow.\nThe money stays yours; this is only a verification step.",
      "zh": "好消息，您的申请预审通过了，您不用急着决定。\n要提额度，我们得验证一下您的还款能力。\n请往您自己绑定的卡里转一笔钱，截图余额，确认资金流水。\n钱还是您自己的，这只是个验资环节。"
    },
    "flags": [
      {
        "en": "Bait: 'pre-approved, no rush, the money stays yours'—feels safe.",
        "zh": "诱饵：『预审过了、不用急、钱还是你的』——感觉很安全。"
      },
      {
        "en": "THE tell: 'verify repayment ability' by moving money on demand leads to a request to transfer it out 'to confirm flow'—that's the theft step.",
        "zh": "破绽：所谓『验资』让你按指令转钱，下一步就让你转给指定账户『确认流水』——那才是被划走的环节。"
      },
      {
        "en": "Principle: real lenders never need you to move your own money to 'prove' anything.",
        "zh": "可迁移：正规放贷绝不需要你转动自己的钱来『证明』什么。"
      }
    ],
    "truthScam": {
      "en": "Right. 'Verifying funds' is the lead-in; the next instruction transfers your money to their account.",
      "zh": "判对了。『验资』是引子，下一条指令就把你的钱转到对方账户。"
    },
    "truthSafe": {
      "en": "This is a scam. 'Pre-approved, no rush' is the calm cover—any 'verify your money by transferring it' step is loan fraud.",
      "zh": "这是骗局。『预审过、不用急』是淡定的伪装，凡是『转钱验资』都是贷款诈骗。"
    }
  },
  {
    "answer": "scam",
    "risk": 120000,
    "difficulty": 3,
    "title": {
      "en": "The Old Classmate's Side Project",
      "zh": "老同学的副业"
    },
    "chan": {
      "en": "WeChat · private",
      "zh": "微信 · 私聊"
    },
    "sender": {
      "en": "Old classmate · Wenwen",
      "zh": "老同学 · 雯雯"
    },
    "text": {
      "en": "Crazy that we reconnected after all these years! How've you been?\nLife's been steady, my partner and I do a little overseas exchange thing on the side.\nNot pushing it on you at all—just chatting, you know how it is.\nIf you ever feel like dabbling, the platform's clean, I'll show you how I do mine.",
      "zh": "这么多年了还能联系上，太巧了！你最近咋样啊？\n我挺好的，跟对象顺手做点海外那边的兑换小副业。\n真没想拉你，就是唠唠嗑，你懂的。\n哪天你想玩玩，平台挺干净的，我手把手教你弄。"
    },
    "flags": [
      {
        "en": "Bait: a 'long-lost classmate', weeks of warm chat, 'not pushing it, just talking'.",
        "zh": "诱饵：『失联多年的老同学』、几周暖心闲聊、『没想拉你、就唠嗑』。"
      },
      {
        "en": "THE tell: the slow rapport always ends at 'come dabble on the platform I use'—a pig-butchering investment funnel.",
        "zh": "破绽：慢热的感情最后总落到『来我用的平台玩玩』——杀猪盘投资局。"
      },
      {
        "en": "Principle: when a rekindled relationship steers toward a specific 'clean platform', it's the setup, not luck.",
        "zh": "可迁移：重逢的关系一旦导向某个『干净平台』，那是设计，不是缘分。"
      }
    ],
    "truthScam": {
      "en": "Right. The warm reunion is the slow build of a pig-butchering scam—the 'clean platform' is the kill.",
      "zh": "判对了。暖心重逢是杀猪盘的养鱼期，那个『干净平台』就是宰杀。"
    },
    "truthSafe": {
      "en": "This is a scam. The patient, no-pressure reconnection is exactly the disguise—steering you onto a private platform is pig-butchering.",
      "zh": "这是骗局。耐心、不催的重逢正是伪装，导你上私有平台就是杀猪盘。"
    }
  },
  {
    "answer": "scam",
    "risk": 50000,
    "difficulty": 3,
    "title": {
      "en": "The Betting Insider's Comeback Plan",
      "zh": "博彩内幕回血"
    },
    "chan": {
      "en": "WeChat · group",
      "zh": "微信 · 群聊"
    },
    "sender": {
      "en": "Insider Circle · Brother Long",
      "zh": "内幕交流群 · 龙哥"
    },
    "text": {
      "en": "Take it slow, friend—I never tell anyone to go all in.\nWe've got insider results ahead of time; small steady bets, win back what you lost.\nNo entry fee, follow a few rounds and judge for yourself first.\nThe last three rounds I called all hit—but bet within your means.",
      "zh": "慢慢来，朋友，我从不让人梭哈。\n咱有提前内幕结果，小注稳走，把亏的慢慢回回来。\n不收入场费，先跟几把自己判断。\n上回我点的三把全中——但你量力，别上头。"
    },
    "flags": [
      {
        "en": "Bait: 'never go all in, bet small, within your means'—sounds responsible.",
        "zh": "诱饵：『从不梭哈、小注、量力』——听着很克制。"
      },
      {
        "en": "THE tell: 'insider results in advance' is impossible; early 'wins' are rigged to make you deposit and bet big, then you can't withdraw.",
        "zh": "破绽：『提前内幕结果』不可能存在，前期『连中』是做出来诱你充值加注，之后无法提现。"
      },
      {
        "en": "Principle: any 'guaranteed insider' gambling tip is a controlled trap, no exceptions.",
        "zh": "可迁移：任何『内幕包中』的赌局都是控盘陷阱，无一例外。"
      }
    ],
    "truthScam": {
      "en": "Right. There's no real 'insider'; the early hits are staged to pull you deeper before the platform freezes your money.",
      "zh": "判对了。根本没有『内幕』，前期连中是做局，诱你加大后平台就冻你的钱。"
    },
    "truthSafe": {
      "en": "This is a scam. The measured 'bet small, within means' tone is the disguise—'insider betting results' cannot exist, and that's the whole trap.",
      "zh": "这是骗局。『小注、量力』的克制是伪装，『博彩内幕结果』根本不存在，这就是整个局。"
    }
  },
  {
    "answer": "scam",
    "risk": 60000,
    "difficulty": 3,
    "title": {
      "en": "The Pre-IPO Internal Allotment",
      "zh": "原始股内购"
    },
    "chan": {
      "en": "WeChat · private",
      "zh": "微信 · 私聊"
    },
    "sender": {
      "en": "Acquaintance · Mr. Fang",
      "zh": "相识 · 方先生"
    },
    "text": {
      "en": "No rush at all—the listing window is still a way off.\nThere's a small internal allotment of pre-IPO shares, normally not open to outsiders.\nI saved a slice for people I know; once it lists you can flip it for several times the price.\nThink it over slowly, no need to decide today.",
      "zh": "完全不急，上市窗口还早着呢。\n有一批内部认购的原始股，平时不对外开放。\n我给认识的人留了点份额，等上市了能翻好几倍。\n你慢慢考虑，今天不用定。"
    },
    "flags": [
      {
        "en": "Bait: 'no rush, decide slowly, reserved for people I know'—patient and exclusive.",
        "zh": "诱饵：『不急、慢慢考虑、给认识的人留的』——耐心又专属。"
      },
      {
        "en": "THE tell: privately sold 'pre-IPO shares' with a promised multiple are fake—real pre-IPO equity isn't peddled in WeChat.",
        "zh": "破绽：私下兜售、承诺翻倍的『原始股』是假的，真正的原始股不会在微信里叫卖。"
      },
      {
        "en": "Principle: any 'guaranteed-to-list, several-times return' share offer in private chat is a scam.",
        "zh": "可迁移：私聊里『包上市、翻好几倍』的股份认购,一律是骗局。"
      }
    ],
    "truthScam": {
      "en": "Right. Privately hawked 'pre-IPO shares' with a guaranteed multiple are worthless paper—the listing never comes.",
      "zh": "判对了。私下兜售、承诺翻倍的『原始股』是废纸，那个『上市』永远不会来。"
    },
    "truthSafe": {
      "en": "This is a scam. The unhurried, exclusive framing is the lure—'pre-IPO shares sold privately with a promised return' is securities fraud.",
      "zh": "这是骗局。不急、专属的包装是诱饵，『私下兜售、承诺收益的原始股』就是证券诈骗。"
    }
  },
  {
    "answer": "scam",
    "risk": 25000,
    "difficulty": 3,
    "title": {
      "en": "The Quant Strategy Trial Room",
      "zh": "量化策略体验室"
    },
    "chan": {
      "en": "WeChat · group",
      "zh": "微信 · 群聊"
    },
    "sender": {
      "en": "Quant Study Room · Teacher Xu",
      "zh": "量化研习室 · 徐老师"
    },
    "text": {
      "en": "Our strategy isn't magic—it just trims losses and rides steady gains.\nNo hurry to fund anything; paper-trade alongside the signals for two weeks first.\nThose who tried it averaged a calm monthly return, nothing wild.\nWhen ready, the assistant helps you mirror the trades on our linked terminal.",
      "zh": "我们的策略不神，就是少亏、稳吃趋势。\n不急着让你出钱，先跟着信号模拟盘跑两周。\n体验过的人月收益都挺平稳，不夸张。\n准备好了，助理帮你在对接的终端上同步下单。"
    },
    "flags": [
      {
        "en": "Bait: 'not magic, paper-trade two weeks, calm returns'—understated and credible.",
        "zh": "诱饵：『不神、先模拟两周、收益平稳』——低调可信。"
      },
      {
        "en": "THE tell: a teacher's daily signals + a 'linked terminal' to mirror trades is the same closed fake-platform funnel.",
        "zh": "破绽：老师每天发信号 + 『对接终端』同步下单,还是封闭假盘那一套。"
      },
      {
        "en": "Principle: real trades go through a regulated broker, never a group's 'linked terminal'.",
        "zh": "可迁移：真实交易走持牌券商,绝不在某群的『对接终端』里。"
      }
    ],
    "truthScam": {
      "en": "Right. The two-week paper trial builds trust; the 'linked terminal' is a rigged platform that traps real money.",
      "zh": "判对了。两周模拟是建信任,『对接终端』是做的盘,真金白银进去就出不来。"
    },
    "truthSafe": {
      "en": "This is a scam. The low-key 'paper-trade first' patience is the anesthetic—a teacher's signals plus a private terminal is the trap.",
      "zh": "这是骗局。『先模拟』的低调耐心是麻醉剂,老师信号加私有终端就是局。"
    }
  },
  {
    "answer": "scam",
    "risk": 3200,
    "difficulty": 2,
    "title": {
      "en": "The App-Store Review Gig",
      "zh": "应用试玩评测兼职"
    },
    "chan": {
      "en": "WeChat · private",
      "zh": "微信 · 私聊"
    },
    "sender": {
      "en": "Recruiter · Sister Qin",
      "zh": "招募 · 秦姐"
    },
    "text": {
      "en": "Relaxed remote gig: download apps, play a bit, leave a review.\nFirst few tasks pay out clean, you'll see it hit your wallet.\nHigher tiers need you to pre-load 'task funds' that come back with the bonus.\nDo it at your own pace, plenty start with just the small ones.",
      "zh": "轻松的线上活儿:下载app,玩一会儿,写个评测。\n前几单干净结算,你能看到钱到账。\n高阶单需要你先充『任务本金』,完成连奖金一起退。\n你按自己节奏来,很多人先做小单就行。"
    },
    "flags": [
      {
        "en": "Bait: first tasks pay cleanly, 'your own pace, start small'—looks harmless.",
        "zh": "诱饵:前几单干净到账、『按节奏、先做小单』——看着无害。"
      },
      {
        "en": "THE tell: 'pre-load task funds' on higher tiers is advance-pay order fraud—the principal never returns.",
        "zh": "破绽:高阶单要你先充『任务本金』就是垫付刷单,本金有去无回。"
      },
      {
        "en": "Principle: a real review gig never asks you to deposit money to do the work.",
        "zh": "可迁移:真的试玩评测绝不会让你充钱才能干活。"
      }
    ],
    "truthScam": {
      "en": "Right. The clean first payouts are bait; 'pre-load task funds' is where the money disappears.",
      "zh": "判对了。前几单干净到账是饵,『先充任务本金』那步钱就没了。"
    },
    "truthSafe": {
      "en": "This is a scam. The early clean payouts soften you—any task that asks you to pre-load funds is order-boosting fraud.",
      "zh": "这是骗局。前期干净到账是软化你,凡要你先充本金都是刷单诈骗。"
    }
  },
  {
    "answer": "scam",
    "risk": 18000,
    "difficulty": 3,
    "title": {
      "en": "The Gold Deferred-Trade Mentor",
      "zh": "黄金递延带单导师"
    },
    "chan": {
      "en": "WeChat · group",
      "zh": "微信 · 群聊"
    },
    "sender": {
      "en": "Precious Metals Group · Teacher Bai",
      "zh": "贵金属交流群 · 白老师"
    },
    "text": {
      "en": "Gold's a safe harbor, friend—we play it slow and steady here.\nNo fee to follow; I post my entry and exit each session.\nStart light, take only the calls you're comfortable with.\nThe assistant will help you open on our cooperating exchange when you're set.",
      "zh": "黄金是避险品,朋友,咱这儿玩的就是稳。\n跟单不收费,我每场把进出点位都发群里。\n轻仓起步,你觉得舒服的单子才跟。\n你定下来了,助理帮你在合作交易所开个户。"
    },
    "flags": [
      {
        "en": "Bait: 'gold is safe, slow and steady, no fee, light positions'—reassuring.",
        "zh": "诱饵:『黄金避险、稳、不收费、轻仓』——很让人安心。"
      },
      {
        "en": "THE tell: a teacher posting entry/exit calls + a 'cooperating exchange' to open an account is a rigged trading platform.",
        "zh": "破绽:老师发进出点位 + 『合作交易所』开户,是做出来的假交易盘。"
      },
      {
        "en": "Principle: regulated metals trade on licensed exchanges, not a chat group's 'partner' venue.",
        "zh": "可迁移:正规贵金属在持牌交易所,不在群里指定的『合作』平台。"
      }
    ],
    "truthScam": {
      "en": "Right. 'Gold is safe' lowers your guard; the teacher's calls steer you onto a rigged exchange.",
      "zh": "判对了。『黄金避险』卸你戒心,老师的点位把你导上做局的交易所。"
    },
    "truthSafe": {
      "en": "This is a scam. The calm 'safe harbor, light positions' framing is the anesthetic—teacher's calls plus a 'cooperating exchange' is the trap.",
      "zh": "这是骗局。『避险、轻仓』的平稳包装是麻醉剂,老师点位加『合作交易所』就是局。"
    }
  },
  {
    "answer": "scam",
    "risk": 7000,
    "difficulty": 2,
    "title": {
      "en": "The Overdue-Account Settlement",
      "zh": "逾期账户协商"
    },
    "chan": {
      "en": "Phone · call",
      "zh": "电话 · 来电"
    },
    "sender": {
      "en": "Platform Aftercare · Officer Liang",
      "zh": "某平台贷后 · 梁专员"
    },
    "text": {
      "en": "No need to worry, this is just a friendly settlement reminder.\nYour account shows a small overdue balance we'd like to help resolve.\nWe can lower the payoff if you clear it today into our designated collection account.\nTake your time deciding—I'll hold the discounted offer for you.",
      "zh": "别担心,就是个善意的协商提醒。\n您账户有一笔小额逾期,我们想帮您处理掉。\n今天结清的话能给您减免,转到我们指定的归集账户就行。\n您慢慢考虑,这个优惠我先给您留着。"
    },
    "flags": [
      {
        "en": "Bait: 'friendly, no worry, discount, take your time'—gentle and helpful.",
        "zh": "诱饵:『善意、别担心、有减免、慢慢考虑』——温和又帮忙。"
      },
      {
        "en": "THE tell: 'pay into our designated collection account' is the trap—real repayment goes to the official platform channel, never a private account.",
        "zh": "破绽:『转到指定归集账户』就是局,真正还款走平台官方渠道,绝不进私人账户。"
      },
      {
        "en": "Principle: any 'settle today into our account for a discount' call is a payoff scam.",
        "zh": "可迁移:凡是『今天转到我们账户就减免』的电话都是还款诈骗。"
      }
    ],
    "truthScam": {
      "en": "Right. The 'discount' is bait; transferring to their 'collection account' sends your money straight to the scammer.",
      "zh": "判对了。『减免』是饵,转进『归集账户』钱直接进骗子口袋。"
    },
    "truthSafe": {
      "en": "This is a scam. The gentle, unhurried tone hides it—real repayment never goes to a 'designated collection account' over the phone.",
      "zh": "这是骗局。温和不急的口吻盖住它,真正还款绝不会按电话转进『指定归集账户』。"
    }
  },
  {
    "answer": "scam",
    "risk": 30000,
    "difficulty": 3,
    "title": {
      "en": "The Fellow Traveler's Trading Tip",
      "zh": "旅途网友的盘面分享"
    },
    "chan": {
      "en": "WeChat · private",
      "zh": "微信 · 私聊"
    },
    "sender": {
      "en": "Online friend · Ms. Yan",
      "zh": "网友 · 颜姐"
    },
    "text": {
      "en": "These weeks chatting with you have been really nice, honestly.\nI don't talk about it much, but I do a little forex on the side, quietly.\nI'd never push you—just sharing how my day went, win or lose.\nIf you're ever curious, I'll let you watch over my shoulder first, no money needed.",
      "zh": "这几周跟你聊天真挺舒服的,说真的。\n我平时不太提,自己悄悄做点外汇,小打小闹。\n绝不会拉你,就跟你说说我今天赚没赚、亏没亏。\n哪天你好奇,先在旁边看我怎么做,不用出钱。"
    },
    "flags": [
      {
        "en": "Bait: weeks of pleasant chat, 'I'd never push you, no money needed yet'.",
        "zh": "诱饵:几周舒服的闲聊、『绝不拉你、暂时不用出钱』。"
      },
      {
        "en": "THE tell: the slow emotional warm-up always lands on 'come do forex on my platform'—pig-butchering, the 'just watch' is the entry ramp.",
        "zh": "破绽:慢热的感情铺垫最后总落到『来我平台做外汇』——杀猪盘,『先在旁边看』就是入场坡道。"
      },
      {
        "en": "Principle: an online relationship that drifts toward 'invest where I do' is engineered, not coincidence.",
        "zh": "可迁移:网络关系一旦飘向『跟我一起投』,那是设计,不是偶然。"
      }
    ],
    "truthScam": {
      "en": "Right. The warm weeks are the feeding stage of a pig-butchering scam; 'watch me trade' is the on-ramp to her platform.",
      "zh": "判对了。舒服的几周是杀猪盘养鱼期,『看我做单』是导你上她平台的坡道。"
    },
    "truthSafe": {
      "en": "This is a scam. The no-pressure, patient affection is precisely the disguise—steering you toward her forex platform is pig-butchering.",
      "zh": "这是骗局。不催、耐心的好感正是伪装,导你去她的外汇平台就是杀猪盘。"
    }
  },
  {
    "answer": "scam",
    "risk": 22000,
    "difficulty": 3,
    "title": {
      "en": "The Debt-Optimization Consultant",
      "zh": "债务优化规划师"
    },
    "chan": {
      "en": "WeChat · private",
      "zh": "微信 · 私聊"
    },
    "sender": {
      "en": "Debt Planner · Advisor Tang",
      "zh": "债务规划师 · 唐顾问"
    },
    "text": {
      "en": "No rush, let's map your situation out calmly first.\nI can restructure your high-rate loans into one low-rate plan, totally legit.\nFirst I'll need a service deposit and a temporary handover of your loan-app logins to operate.\nMany clients lightened their burden this way—take your time to decide.",
      "zh": "不急,咱先把你的情况捋清楚。\n我能把你那些高息贷款重组成一笔低息的,完全合规。\n先收个服务定金,再把你贷款app的登录暂时交给我操作。\n好多客户都这么减轻负担的,你慢慢定。"
    },
    "flags": [
      {
        "en": "Bait: 'no rush, let's map it out, legit, lighten your burden'—calm and caring.",
        "zh": "诱饵:『不急、先捋清、合规、减轻负担』——冷静又体贴。"
      },
      {
        "en": "THE tell: 'service deposit + hand over your loan-app logins' lets them max out loans in your name and vanish; debt 'restructuring' like this isn't real.",
        "zh": "破绽:『服务定金+交出贷款app登录』让对方用你名义把贷款拉满卷走,这种债务『重组』根本不存在。"
      },
      {
        "en": "Principle: never pay up front or surrender account logins to anyone promising to 'optimize' your debt.",
        "zh": "可迁移:任何承诺『优化债务』的人,都不要先付费、更不要交出账户登录。"
      }
    ],
    "truthScam": {
      "en": "Right. The deposit and login handover are the trap—they drain your loan apps in your name and disappear.",
      "zh": "判对了。定金和登录交接就是局,对方用你名义把贷款app掏空跑路。"
    },
    "truthSafe": {
      "en": "This is a scam. The unhurried, professional 'restructuring' pitch is the cover—paying up front and handing over loan logins is how they rob you.",
      "zh": "这是骗局。不急、专业的『重组』话术是伪装,先付费再交出贷款登录就是被洗劫的方式。"
    }
  },
  {
    "answer": "safe",
    "risk": 0,
    "difficulty": 2,
    "title": {
      "en": "Real fraud alert — freeze it yourself",
      "zh": "真盗刷预警·自助冻结"
    },
    "chan": {
      "en": "SMS · card issuer",
      "zh": "短信 · 发卡行"
    },
    "sender": {
      "en": "95XXX",
      "zh": "95XXX"
    },
    "text": {
      "en": "[XX Bank] Card ending 6621 attempted a $980.00 charge at an overseas merchant 02:14, declined as suspicious. If this wasn't you, freeze the card in your XX Bank app or call the number on the back of your card.",
      "zh": "【XX银行】您尾号6621的卡02:14在境外商户尝试支出980.00元，已因可疑被拒。若非本人操作，请在XX银行App内冻结该卡，或拨打卡背面客服电话。"
    },
    "flags": [
      {
        "en": "Surface bait: a big overseas charge at 2am plus the word 'declined/suspicious' makes the heart race.",
        "zh": "表层诱饵：凌晨大额境外支出＋『可疑/已拒』字样，第一眼就吓人。"
      },
      {
        "en": "Safe-tell: it asks you for nothing — no code, no password. It tells you to act inside your own app or the number printed on YOUR card.",
        "zh": "安全凭据：它什么都没向你索要——不要验证码、不要密码，只让你去自己的App或卡背面的号码处理。"
      },
      {
        "en": "Transferable rule: a real alert says 'go do it yourself'; a scam says 'give the thing to me'.",
        "zh": "可迁移原则：真预警让你『去自己 App 做』，骗局让你『把东西给我』。"
      }
    ],
    "truthScam": {
      "en": "This one was real. The bank flagged a suspicious charge and pointed you back to your own app — block messages like this and customers stop trusting genuine alerts.",
      "zh": "这条是真的。银行拦下了可疑支出并让你回到自己的App处理——把真预警当骗局拦掉，客户以后就不信真正的提醒了。"
    },
    "truthSafe": {
      "en": "Right call. Real banks do send urgent alerts — the tell is what they ask you to do: act in your own app, not hand anything over.",
      "zh": "判得对。真银行确实会发紧急预警，区别在它让你做什么：去自己App处理，而不是把东西交出去。"
    }
  },
  {
    "answer": "safe",
    "risk": 0,
    "difficulty": 2,
    "title": {
      "en": "Real credit card statement",
      "zh": "真信用卡账单提醒"
    },
    "chan": {
      "en": "SMS · card issuer",
      "zh": "短信 · 发卡行"
    },
    "sender": {
      "en": "95XXX",
      "zh": "95XXX"
    },
    "text": {
      "en": "[某发卡行] Your June statement is out: balance $3,420.55, minimum due $342.00, due date Jul 18. View details and pay in the bank app.",
      "zh": "【某发卡行】您的6月账单已出：应还3420.55元，最低还款342.00元，到期还款日7月18日。详情及还款请见手机银行App。"
    },
    "flags": [
      {
        "en": "Surface bait: a four-figure amount and a hard due date feel like pressure to pay now.",
        "zh": "表层诱饵：四位数金额＋明确到期日，像是在催你赶紧还。"
      },
      {
        "en": "Safe-tell: no link, no code, no account number requested — it just routes you to the app you already have.",
        "zh": "安全凭据：没有链接、没有验证码、不问你账号，只让你去本就装好的App。"
      },
      {
        "en": "Transferable rule: a real bill points you into your own app; a scam pushes a link to 'pay here'.",
        "zh": "可迁移原则：真账单指向你自己的App，骗局塞给你一个『点这里还款』的链接。"
      }
    ],
    "truthScam": {
      "en": "This was a genuine statement notice. Treat real bills as scams and people miss payments — and stop reading the alerts that matter.",
      "zh": "这是真实账单提醒。把真账单当骗局，人会漏还款——也会从此不再看真正要紧的提醒。"
    },
    "truthSafe": {
      "en": "Right call. A statement that just tells you to check your own app and asks for nothing is exactly what a real bill looks like.",
      "zh": "判得对。只让你去自己App、什么都不索要的账单，正是真账单的样子。"
    }
  },
  {
    "answer": "safe",
    "risk": 0,
    "difficulty": 2,
    "title": {
      "en": "Large incoming transfer received",
      "zh": "真大额转入到账"
    },
    "chan": {
      "en": "SMS · card issuer",
      "zh": "短信 · 发卡行"
    },
    "sender": {
      "en": "95XXX",
      "zh": "95XXX"
    },
    "text": {
      "en": "[XX Bank] Card ending 0418 — incoming transfer $12,000.00 credited 15:32, available balance $14,260.31. Details in app.",
      "zh": "【XX银行】您尾号0418卡15:32转入12000.00元已入账，可用余额14260.31元。详情见手机银行。"
    },
    "flags": [
      {
        "en": "Surface bait: a sudden five-figure sum landing makes you wonder if something's wrong.",
        "zh": "表层诱饵：突然一笔五位数到账，让人怀疑是不是出事了。"
      },
      {
        "en": "Safe-tell: the money came IN and there's nothing to do — no verify, no 'confirm to release', no action demanded.",
        "zh": "安全凭据：钱是转『入』的，且无需任何操作——不验证、不『确认放款』、不要你做任何动作。"
      },
      {
        "en": "Transferable rule: real alerts report money arriving; scams invent a reason you must send money out.",
        "zh": "可迁移原则：真预警通报钱『进来了』，骗局编个理由让你把钱『转出去』。"
      }
    ],
    "truthScam": {
      "en": "It was a real credit notice. Flagging genuine 'money received' texts as fraud just trains people to distrust their own bank.",
      "zh": "这是真实到账通知。把真『到账』短信当诈骗，只会让人连自己银行都不敢信。"
    },
    "truthSafe": {
      "en": "Right call. Money arriving with no action required is the bank informing you, not a trap.",
      "zh": "判得对。钱进账且无需任何操作，是银行在通知你，而非陷阱。"
    }
  },
  {
    "answer": "safe",
    "risk": 0,
    "difficulty": 3,
    "title": {
      "en": "Login code you triggered yourself",
      "zh": "你自己触发的登录验证码"
    },
    "chan": {
      "en": "SMS · card issuer",
      "zh": "短信 · 发卡行"
    },
    "sender": {
      "en": "95XXX",
      "zh": "95XXX"
    },
    "text": {
      "en": "[XX Bank] Verification code 538207, valid 5 min, for logging into mobile banking. If this wasn't you, do not enter it.",
      "zh": "【XX银行】验证码538207，5分钟内有效，用于登录手机银行。如非本人操作请勿输入。"
    },
    "flags": [
      {
        "en": "Surface bait: the words 'verification code' alone set off alarm bells these days.",
        "zh": "表层诱饵：单是『验证码』三个字，如今就足够拉响警报。"
      },
      {
        "en": "Safe-tell: the code was sent TO you because you just logged in — nobody is on the phone asking you to read it out.",
        "zh": "安全凭据：验证码是因你刚登录而发『给你』的——没有人来电让你把它念出来。"
      },
      {
        "en": "Transferable rule: a code you requested is safe; danger is only when someone else asks you to hand it over.",
        "zh": "可迁移原则：你自己触发的验证码是安全的，危险只在『有人让你把它交出去』时。"
      }
    ],
    "truthScam": {
      "en": "This code was triggered by your own login. The danger isn't the code text — it's anyone who calls asking for it. Blocking the code itself helps no one.",
      "zh": "这条验证码是你自己登录触发的。危险的从来不是验证码短信，而是来电向你索要它的人。拦掉验证码本身毫无意义。"
    },
    "truthSafe": {
      "en": "Right call. A code you requested, with no one asking you to share it, is exactly how login is supposed to work.",
      "zh": "判得对。你自己触发、又没人向你索取的验证码，正是登录该有的样子。"
    }
  },
  {
    "answer": "safe",
    "risk": 0,
    "difficulty": 2,
    "title": {
      "en": "Installment repayment reminder",
      "zh": "真分期还款日提醒"
    },
    "chan": {
      "en": "SMS · card issuer",
      "zh": "短信 · 发卡行"
    },
    "sender": {
      "en": "95XXX",
      "zh": "95XXX"
    },
    "text": {
      "en": "[某发卡行] Reminder: installment 4/12 of $416.67 is due Jul 10. Keep your card account funded; repay in the app. Late payment affects credit.",
      "zh": "【某发卡行】提醒：您的分期第4/12期416.67元将于7月10日扣款，请保持账户余额充足，可在App内还款。逾期将影响征信。"
    },
    "flags": [
      {
        "en": "Surface bait: a dated deadline plus 'affects credit' feels like a threat.",
        "zh": "表层诱饵：明确扣款日＋『影响征信』，听着像威胁。"
      },
      {
        "en": "Safe-tell: it asks you only to keep your OWN account funded and to pay in the app — no link, no code, no transfer-to-us.",
        "zh": "安全凭据：它只让你给自己的账户留够余额、在App内还款——没有链接、没有验证码、不要你转账给谁。"
      },
      {
        "en": "Transferable rule: a real reminder points to your own balance; a scam invents a special 'pay-off account' to wire to.",
        "zh": "可迁移原则：真提醒指向你自己的余额，骗局会编一个专门的『还款账户』让你汇过去。"
      }
    ],
    "truthScam": {
      "en": "It was a real installment reminder. Mistaking it for fraud means a missed deduction and a real credit ding — and lost trust in true reminders.",
      "zh": "这是真实分期提醒。误当诈骗会导致扣款失败、真伤征信——也会让人不再信真提醒。"
    },
    "truthSafe": {
      "en": "Right call. A reminder to fund your own account and pay in-app is the bank doing its job, not a con.",
      "zh": "判得对。提醒你给自己账户留钱、在App内还款，是银行尽责，不是骗局。"
    }
  },
  {
    "answer": "safe",
    "risk": 0,
    "difficulty": 2,
    "title": {
      "en": "Credit limit increase notice",
      "zh": "真额度上调通知"
    },
    "chan": {
      "en": "SMS · card issuer",
      "zh": "短信 · 发卡行"
    },
    "sender": {
      "en": "95XXX",
      "zh": "95XXX"
    },
    "text": {
      "en": "[XX Bank] Your card ending 7702 credit limit has been raised to $20,000 effective today, based on your account review. Details in app.",
      "zh": "【XX银行】根据账户评估，您尾号7702信用卡额度已上调至20000元，即日起生效。详情见手机银行。"
    },
    "flags": [
      {
        "en": "Surface bait: a sudden five-figure limit change feels like an account someone tampered with.",
        "zh": "表层诱饵：额度突然变成五位数，像是账户被人动过。"
      },
      {
        "en": "Safe-tell: it's an informational notice — nothing to confirm, no code to enter, no 'click to accept'.",
        "zh": "安全凭据：纯告知性通知——不用确认、不要输验证码、没有『点击接受』。"
      },
      {
        "en": "Transferable rule: a real notice just informs; a scam dangles a limit boost behind a link or a fee.",
        "zh": "可迁移原则：真通知只是告知，骗局会把提额吊在链接或手续费后面。"
      }
    ],
    "truthScam": {
      "en": "A genuine limit-increase notice. Flagging it as fraud teaches people to fear normal account messages.",
      "zh": "这是真实提额通知。把它当诈骗，会让人对正常账户消息也草木皆兵。"
    },
    "truthSafe": {
      "en": "Right call. A limit change that asks for nothing and just notifies you is the bank, not a scammer.",
      "zh": "判得对。什么都不要你做、只通知你的额度变更，是银行而非骗子。"
    }
  },
  {
    "answer": "safe",
    "risk": 0,
    "difficulty": 2,
    "title": {
      "en": "Real card transaction text",
      "zh": "真消费交易短信"
    },
    "chan": {
      "en": "SMS · card issuer",
      "zh": "短信 · 发卡行"
    },
    "sender": {
      "en": "95XXX",
      "zh": "95XXX"
    },
    "text": {
      "en": "[XX Bank] Card ending 3390 spent $688.00 at a supermarket 19:47, available balance $5,112.40. Not you? Freeze the card in-app.",
      "zh": "【XX银行】您尾号3390卡19:47在超市消费688.00元，可用余额5112.40元。非本人操作请在App内冻结。"
    },
    "flags": [
      {
        "en": "Surface bait: a sizeable charge plus 'not you? freeze it' reads like a breach warning.",
        "zh": "表层诱饵：一笔不小的消费＋『非本人请冻结』，读着像被盗刷警告。"
      },
      {
        "en": "Safe-tell: the remedy it offers is in YOUR app — it doesn't ask you to call back, confirm a code, or reverse anything via a link.",
        "zh": "安全凭据：它给的补救手段在你自己的App里——不让你回拨、不让你确认验证码、不让你点链接撤单。"
      },
      {
        "en": "Transferable rule: a real transaction text gives you the off-switch in your own app; a scam gives you a number to call.",
        "zh": "可迁移原则：真交易短信把『开关』放在你自己App里，骗局给你一个号码让你回拨。"
      }
    ],
    "truthScam": {
      "en": "An ordinary spend notification. Block these and people lose the very alerts that catch real theft.",
      "zh": "这是普通消费通知。拦掉它，人就失去了能抓到真盗刷的那条提醒。"
    },
    "truthSafe": {
      "en": "Right call. A spend text that points the fix back into your own app is routine and safe.",
      "zh": "判得对。把补救指回你自己App的消费短信，是日常且安全的。"
    }
  },
  {
    "answer": "safe",
    "risk": 0,
    "difficulty": 3,
    "title": {
      "en": "Card report-lost confirmed",
      "zh": "真挂失成功通知"
    },
    "chan": {
      "en": "SMS · card issuer",
      "zh": "短信 · 发卡行"
    },
    "sender": {
      "en": "95XXX",
      "zh": "95XXX"
    },
    "text": {
      "en": "[XX Bank] Your card ending 5571 has been reported lost successfully at 11:08; the card is now disabled. A replacement can be requested in-app. If this wasn't you, call the number on your card.",
      "zh": "【XX银行】您尾号5571的卡已于11:08挂失成功，该卡已停用。可在App内申请补卡。如非本人操作，请拨打卡背面电话。"
    },
    "flags": [
      {
        "en": "Surface bait: 'card disabled' sounds like you've been locked out by an attacker.",
        "zh": "表层诱饵：『卡已停用』听着像被攻击者锁了账户。"
      },
      {
        "en": "Safe-tell: it confirms an action and gives you back the controls — replace in-app, or call the number on your own card; it asks for nothing.",
        "zh": "安全凭据：它确认了一个动作并把控制权交还给你——App内补卡，或拨自己卡背面的号；什么都不向你索要。"
      },
      {
        "en": "Transferable rule: a real confirmation hands control back to you; a scam uses the scare to extract a code or payment.",
        "zh": "可迁移原则：真确认把控制权还给你，骗局借这一吓向你套验证码或钱。"
      }
    ],
    "truthScam": {
      "en": "A genuine lost-card confirmation. If someone else reported it, the safe move is your own card's number — not treating the bank as the enemy.",
      "zh": "这是真实挂失成功通知。若是他人操作，正确做法是拨自己卡背面的号——而不是把银行当成敌人。"
    },
    "truthSafe": {
      "en": "Right call. A confirmation that hands controls back to you and asks for nothing is the bank, plain and simple.",
      "zh": "判得对。把控制权交还给你、什么都不索要的确认，就是银行本身。"
    }
  },
  {
    "answer": "safe",
    "risk": 0,
    "difficulty": 2,
    "title": {
      "en": "New card activation reminder",
      "zh": "真开卡激活提醒"
    },
    "chan": {
      "en": "SMS · card issuer",
      "zh": "短信 · 发卡行"
    },
    "sender": {
      "en": "95XXX",
      "zh": "95XXX"
    },
    "text": {
      "en": "[某发卡行] Your new card ending 8845 has arrived. Activate it in the bank app or at any branch within 30 days. Unactivated cards cannot be used.",
      "zh": "【某发卡行】您尾号8845的新卡已寄达，请于30天内在手机银行App或任意网点激活，未激活卡片无法使用。"
    },
    "flags": [
      {
        "en": "Surface bait: a deadline plus 'cannot be used' nudges you to act fast.",
        "zh": "表层诱饵：时限＋『无法使用』，催着你赶紧行动。"
      },
      {
        "en": "Safe-tell: it routes you to the app or a physical branch — never to a link, and it never asks for card numbers or codes.",
        "zh": "安全凭据：它指向App或实体网点——绝不给链接，也绝不问你卡号或验证码。"
      },
      {
        "en": "Transferable rule: a real activation happens in your app or at a counter; a scam 'activation link' is the trap.",
        "zh": "可迁移原则：真激活在你App里或柜台办，骗局的『激活链接』才是陷阱。"
      }
    ],
    "truthScam": {
      "en": "A real activation reminder. Treat it as fraud and a new card sits dead in a drawer — and trust in real notices erodes.",
      "zh": "这是真实激活提醒。当成诈骗，新卡就废在抽屉里——对真通知的信任也随之流失。"
    },
    "truthSafe": {
      "en": "Right call. Activation pointed to your app or a branch, with no link and no code asked, is the real thing.",
      "zh": "判得对。指向App或网点、不给链接不问验证码的激活提醒，是真的。"
    }
  },
  {
    "answer": "safe",
    "risk": 0,
    "difficulty": 2,
    "title": {
      "en": "Annual fee reminder",
      "zh": "真年费提醒"
    },
    "chan": {
      "en": "SMS · card issuer",
      "zh": "短信 · 发卡行"
    },
    "sender": {
      "en": "95XXX",
      "zh": "95XXX"
    },
    "text": {
      "en": "[XX Bank] Card ending 2106 annual fee $30.00 will be charged Jul 20. Swipe 6 times before then to waive it. Check progress in-app.",
      "zh": "【XX银行】您尾号2106卡年费30.00元将于7月20日收取，当期前刷满6笔可减免。进度详见手机银行。"
    },
    "flags": [
      {
        "en": "Surface bait: an upcoming charge and a 'do this or pay' condition feel coercive.",
        "zh": "表层诱饵：即将扣费＋『不做就收钱』的条件，听着像逼你。"
      },
      {
        "en": "Safe-tell: every action it mentions happens on your own card and in your own app — nothing is handed to anyone.",
        "zh": "安全凭据：它提到的每个动作都在你自己卡上、自己App里完成——没有任何东西交给别人。"
      },
      {
        "en": "Transferable rule: a real fee notice tells you to swipe your own card; a scam tells you to pay a fee to 'unlock' something.",
        "zh": "可迁移原则：真年费提醒让你刷自己的卡，骗局让你交一笔费去『解锁』什么。"
      }
    ],
    "truthScam": {
      "en": "A genuine annual-fee reminder. Block it and a customer pays a fee they could have waived — and learns to ignore the bank.",
      "zh": "这是真实年费提醒。拦掉它，客户就白交了本可减免的费——还学会了无视银行。"
    },
    "truthSafe": {
      "en": "Right call. A fee notice whose only actions live in your own app is routine and safe.",
      "zh": "判得对。所有动作都在你自己App里的年费提醒，是日常且安全的。"
    }
  },
  {
    "answer": "safe",
    "risk": 0,
    "difficulty": 3,
    "title": {
      "en": "Repeated decline, card auto-locked",
      "zh": "连续失败·卡自动锁定"
    },
    "chan": {
      "en": "SMS · card issuer",
      "zh": "短信 · 发卡行"
    },
    "sender": {
      "en": "95XXX",
      "zh": "95XXX"
    },
    "text": {
      "en": "[XX Bank] Card ending 9034 was temporarily locked after 3 failed attempts 21:10 for your protection. Unlock it yourself in the bank app, or call the number on the card.",
      "zh": "【XX银行】您尾号9034卡21:10因连续3次操作失败已临时锁定以保护账户。请在手机银行App内自助解锁，或拨打卡背面电话。"
    },
    "flags": [
      {
        "en": "Surface bait: 'locked', 'failed attempts', a time stamp — it reads like an active break-in.",
        "zh": "表层诱饵：『锁定』『连续失败』＋时间戳，读着像正在被入侵。"
      },
      {
        "en": "Safe-tell: the unlock is self-service in your app or via your card's own number — it doesn't ask you to verify with a code or click a link.",
        "zh": "安全凭据：解锁是在你App里自助、或拨你卡自己的号——不让你用验证码核验、也不让你点链接。"
      },
      {
        "en": "Transferable rule: a real lock gives you the unlock; a scam 'unlock' demands a code, a fee, or a remote-control app.",
        "zh": "可迁移原则：真锁定把解锁交给你，骗局的『解锁』要验证码、要手续费、或要你装远控App。"
      }
    ],
    "truthScam": {
      "en": "A real protective lock. The unlock was in your own hands — block this and people fight their own bank instead of the thief.",
      "zh": "这是真实的保护性锁定。解锁就在你自己手里——拦掉它，人会跟自己银行较劲，而不是防贼。"
    },
    "truthSafe": {
      "en": "Right call. A lock that hands you a self-service unlock and asks for nothing is the bank protecting you.",
      "zh": "判得对。把自助解锁交还给你、什么都不索要的锁定，是银行在保护你。"
    }
  },
  {
    "answer": "safe",
    "risk": 0,
    "difficulty": 2,
    "title": {
      "en": "Autopay scheduled today",
      "zh": "真自动还款今日扣款"
    },
    "chan": {
      "en": "SMS · card issuer",
      "zh": "短信 · 发卡行"
    },
    "sender": {
      "en": "95XXX",
      "zh": "95XXX"
    },
    "text": {
      "en": "[某发卡行] Reminder: autopay will deduct full statement $2,108.66 from your linked account today. Ensure sufficient balance. Manage in-app.",
      "zh": "【某发卡行】提醒：今日将通过自动还款从您的关联账户扣全额账单2108.66元，请保持余额充足。可在App内管理。"
    },
    "flags": [
      {
        "en": "Surface bait: a four-figure deduction 'today' triggers panic about money leaving.",
        "zh": "表层诱饵：今日扣四位数，立刻让人慌『钱要走了』。"
      },
      {
        "en": "Safe-tell: it's a deduction from YOUR own linked account that you set up — no new payee, no link, no code.",
        "zh": "安全凭据：是从你自己设定的关联账户扣款——没有新收款人、没有链接、没有验证码。"
      },
      {
        "en": "Transferable rule: a real autopay debits your own linked account; a scam asks you to authorize a stranger's account.",
        "zh": "可迁移原则：真自动还款扣你自己的关联账户，骗局让你给一个陌生账户授权。"
      }
    ],
    "truthScam": {
      "en": "A genuine autopay reminder. Mistaking it for fraud can leave the account short and the bill unpaid.",
      "zh": "这是真实自动还款提醒。误当诈骗，可能导致余额不足、账单没还上。"
    },
    "truthSafe": {
      "en": "Right call. A debit from the account you yourself linked, asking nothing of you, is normal autopay.",
      "zh": "判得对。从你自己关联的账户扣款、什么都不要你做，是正常的自动还款。"
    }
  },
  {
    "answer": "safe",
    "risk": 0,
    "difficulty": 3,
    "title": {
      "en": "Suspicious login blocked",
      "zh": "真异地登录已拦截"
    },
    "chan": {
      "en": "SMS · card issuer",
      "zh": "短信 · 发卡行"
    },
    "sender": {
      "en": "95XXX",
      "zh": "95XXX"
    },
    "text": {
      "en": "[XX Bank] A login from a new device in another city was blocked 03:26. If it was you, log in again normally. If not, change your password in-app.",
      "zh": "【XX银行】03:26检测到异地新设备登录，已为您拦截。若为本人请重新正常登录；若非本人，请在App内修改密码。"
    },
    "flags": [
      {
        "en": "Surface bait: 'login from another city' at 3am screams account takeover.",
        "zh": "表层诱饵：凌晨『异地登录』，第一反应就是账户被盗。"
      },
      {
        "en": "Safe-tell: both remedies are inside your own app — log in normally, or change your password there. No code to give, no callback to make.",
        "zh": "安全凭据：两个补救都在你自己App里——正常登录或改密码。没有验证码要给，没有电话要回拨。"
      },
      {
        "en": "Transferable rule: a real block tells you to secure your own app; a scam uses the same scare to extract your code 'to verify it's you'.",
        "zh": "可迁移原则：真拦截让你去自己App加固，骗局用同样的吓唬向你套验证码『核验是不是你』。"
      }
    ],
    "truthScam": {
      "en": "A real intrusion-blocked notice. The fix lives in your own app — flag it as fraud and you ignore a warning that actually protected you.",
      "zh": "这是真实的登录拦截通知。补救就在你自己App里——当成诈骗，你忽略的恰是真正保护了你的那条警告。"
    },
    "truthSafe": {
      "en": "Right call. A block whose only remedies are inside your own app, asking for no code, is the bank guarding your account.",
      "zh": "判得对。补救只在你自己App、不要任何验证码的拦截，是银行在守护你的账户。"
    }
  },
  {
    "answer": "safe",
    "risk": 0,
    "difficulty": 2,
    "title": {
      "en": "Points expiring reminder",
      "zh": "真积分到期提醒"
    },
    "chan": {
      "en": "SMS · card issuer",
      "zh": "短信 · 发卡行"
    },
    "sender": {
      "en": "95XXX",
      "zh": "95XXX"
    },
    "text": {
      "en": "[XX Bank] Reminder: 8,600 card points worth about $86 expire Jun 30. Redeem in the bank app before then.",
      "zh": "【XX银行】提醒：您有8600积分（约合86元）将于6月30日到期，请在手机银行App内尽快兑换。"
    },
    "flags": [
      {
        "en": "Surface bait: 'expires soon' plus a cash value pressures you to act this instant.",
        "zh": "表层诱饵：『即将到期』＋折算金额，催着你立刻行动。"
      },
      {
        "en": "Safe-tell: redemption happens in your own app — there's no link, no code, and nothing to claim from a stranger.",
        "zh": "安全凭据：兑换在你自己App里完成——没有链接、没有验证码、不用向谁领取。"
      },
      {
        "en": "Transferable rule: a real points notice sends you into your app; a scam dangles a 'claim your points' link.",
        "zh": "可迁移原则：真积分提醒把你引向App，骗局吊一个『领取积分』的链接。"
      }
    ],
    "truthScam": {
      "en": "A real points reminder. Block it and the customer simply loses points they'd earned — no harm prevented, value wasted.",
      "zh": "这是真实积分提醒。拦掉它，客户白白损失已赚到的积分——没防住任何危险，只是浪费。"
    },
    "truthSafe": {
      "en": "Right call. A points reminder that lives entirely in your own app is harmless and routine.",
      "zh": "判得对。全程在你自己App里的积分提醒，无害且日常。"
    }
  },
  {
    "answer": "safe",
    "risk": 0,
    "difficulty": 3,
    "title": {
      "en": "Refund credited back to card",
      "zh": "真退款已退回到卡"
    },
    "chan": {
      "en": "SMS · card issuer",
      "zh": "短信 · 发卡行"
    },
    "sender": {
      "en": "95XXX",
      "zh": "95XXX"
    },
    "text": {
      "en": "[XX Bank] Card ending 4417 received a merchant refund of $529.00 at 14:05, credited to your card. Details in app.",
      "zh": "【XX银行】您尾号4417卡14:05收到商户退款529.00元，已退回至本卡。详情见手机银行。"
    },
    "flags": [
      {
        "en": "Surface bait: an unexpected refund and the word 'refund' are classic scam openers, so it feels rigged.",
        "zh": "表层诱饵：意外退款＋『退款』字样，是骗局的经典开场，让人觉得有诈。"
      },
      {
        "en": "Safe-tell: the money was credited TO your card automatically — it doesn't ask you to 'confirm', click, or provide details to receive it.",
        "zh": "安全凭据：钱已自动退回你卡上——不要你『确认』、不要你点击、也不要你提供信息才能收到。"
      },
      {
        "en": "Transferable rule: a real refund just arrives; a scam 'refund' makes you click or hand over card details first.",
        "zh": "可迁移原则：真退款直接到账，骗局的『退款』要你先点链接或先交卡信息。"
      }
    ],
    "truthScam": {
      "en": "A genuine refund notice — the money is already on your card. The scam version makes you act to 'receive' it; this one didn't.",
      "zh": "这是真实退款通知——钱已经在你卡上了。骗局版会让你做点什么才能『收到』，而这条没有。"
    },
    "truthSafe": {
      "en": "Right call. A refund that simply lands on your card, with nothing required to claim it, is real.",
      "zh": "判得对。直接落到你卡上、无需任何操作领取的退款，是真的。"
    }
  },
  {
    "answer": "safe",
    "risk": 0,
    "difficulty": 2,
    "title": {
      "en": "Password changed successfully",
      "zh": "真登录密码修改成功"
    },
    "chan": {
      "en": "SMS · card issuer",
      "zh": "短信 · 发卡行"
    },
    "sender": {
      "en": "95XXX",
      "zh": "95XXX"
    },
    "text": {
      "en": "[XX Bank] Your mobile banking login password was changed successfully 16:20. If this wasn't you, call the number on the back of your card immediately.",
      "zh": "【XX银行】您的手机银行登录密码已于16:20修改成功。如非本人操作，请立即拨打卡背面客服电话。"
    },
    "flags": [
      {
        "en": "Surface bait: 'password changed' plus 'immediately' makes you fear you've been hacked.",
        "zh": "表层诱饵：『密码已修改』＋『立即』，让人怕是被黑了。"
      },
      {
        "en": "Safe-tell: if it wasn't you, it points you to the number on YOUR OWN card — not a hotline in the text, not a code to read out.",
        "zh": "安全凭据：若非本人，它让你拨自己卡背面的号——不是短信里的热线，也不要你念验证码。"
      },
      {
        "en": "Transferable rule: a real confirmation routes you to your card's own number; a scam supplies the 'support' number itself.",
        "zh": "可迁移原则：真确认让你拨自己卡上的号，骗局会直接给你一个『客服』号。"
      }
    ],
    "truthScam": {
      "en": "A real change-confirmation. Even the 'if not you' path sends you to your own card's number — that's the bank, not a trap.",
      "zh": "这是真实的修改确认。连『若非本人』也是让你拨自己卡上的号——这是银行，不是陷阱。"
    },
    "truthSafe": {
      "en": "Right call. A confirmation that, even in the worst case, points to your own card's number is genuine.",
      "zh": "判得对。即便最坏情况也只指向你自己卡上号码的确认，是真的。"
    }
  },
  {
    "answer": "safe",
    "risk": 0,
    "difficulty": 3,
    "title": {
      "en": "Large outgoing flagged, held for you",
      "zh": "大额支出待你本人核验"
    },
    "chan": {
      "en": "SMS · card issuer",
      "zh": "短信 · 发卡行"
    },
    "sender": {
      "en": "95XXX",
      "zh": "95XXX"
    },
    "text": {
      "en": "[XX Bank] A $9,500.00 transfer from card ending 1180 was paused for risk review 10:40. To proceed or cancel, open your bank app — we will not call you about this.",
      "zh": "【XX银行】您尾号1180卡10:40一笔9500.00元转出已暂停风控审核。如需继续或取消，请打开手机银行App操作。"
    },
    "flags": [
      {
        "en": "Surface bait: a near-five-figure transfer 'paused for review' feels like an emergency you must resolve now.",
        "zh": "表层诱饵：近五位数转出『暂停审核』，像是必须马上处理的紧急事。"
      },
      {
        "en": "Safe-tell: it puts the proceed/cancel decision inside your own app — it does not call you, does not ask for a code, does not give a number to dial.",
        "zh": "安全凭据：它把『继续/取消』的决定放进你自己App——不来电、不要验证码、不给你回拨号码。"
      },
      {
        "en": "Transferable rule: a real hold waits for you in your app; a scam 'hold' calls you and walks you through 'releasing' it.",
        "zh": "可迁移原则：真冻结在你App里等你，骗局的『冻结』会来电一步步教你『解冻』。"
      }
    ],
    "truthScam": {
      "en": "A real risk-hold on a big transfer — the decision waits safely in your app. The scam version would phone you and coach you; this one stays silent.",
      "zh": "这是对大额转出的真实风控冻结——决定权安静地在你App里等你。骗局版会来电一步步引导你，而这条不会。"
    },
    "truthSafe": {
      "en": "Right call. A hold that hands the proceed/cancel choice to your own app, with no call and no code, is the bank protecting you.",
      "zh": "判得对。把继续或取消交给你自己App、不来电不要验证码的冻结，是银行在保护你。"
    }
  },
  {
    "answer": "safe",
    "risk": 0,
    "difficulty": 2,
    "title": {
      "en": "Tax Refund in the Official App",
      "zh": "个税退税·官方App"
    },
    "chan": {
      "en": "App push · tax authority",
      "zh": "App 推送 · 个税"
    },
    "sender": {
      "en": "Personal Income Tax App",
      "zh": "个人所得税 App"
    },
    "text": {
      "en": "Your 2025 annual tax reconciliation shows a refund of ¥1,286 available.\nOpen the Personal Income Tax App, go to Reconciliation, and apply for the refund to your bound bank card.\nNo fee. Refund is paid into your own account.",
      "zh": "您的2025年度个税汇算结果显示可退税 1286 元。\n请打开个人所得税 App，进入「综合所得年度汇算」，申请退税至您本人绑定的银行卡。\n无需缴纳任何费用，退款直接到您本人账户。"
    },
    "flags": [
      {
        "en": "Surface bait: the word \"refund\" plus an amount is a classic scam hook.",
        "zh": "表层诱饵：『退税』加金额是诈骗最爱的钩子。"
      },
      {
        "en": "Safe-tell: it sends you into the official app yourself, asks no fee, no code; money goes to your own card.",
        "zh": "安全点：让你自己进官方 App 办，不收费、不要验证码，钱退到你本人卡。"
      },
      {
        "en": "Transferable rule: a real refund never charges a fee first or makes you click a link to \"unlock\" it.",
        "zh": "可迁移原则：真退税绝不会先收手续费，也不会要你点链接『解锁』。"
      }
    ],
    "truthScam": {
      "en": "This was real. A fake refund gives itself away by demanding a \"handling fee\" or a link before it pays out — this had neither.",
      "zh": "这其实是真的。假退税的破绽是退钱前先要『手续费』或链接，这条都没有。"
    },
    "truthSafe": {
      "en": "Correct. It routes you to the official app, charges nothing, and pays into your own card — the marks of a genuine refund.",
      "zh": "判对了。它让你进官方 App、不收费、钱退到本人卡，正是真退税的样子。"
    }
  },
  {
    "answer": "safe",
    "risk": 0,
    "difficulty": 2,
    "title": {
      "en": "Medical Insurance Reimbursement Arrived",
      "zh": "医保报销·到账"
    },
    "chan": {
      "en": "SMS · municipal medical insurance",
      "zh": "短信 · 市医保局"
    },
    "sender": {
      "en": "City Medical Insurance Bureau",
      "zh": "XX市医保局"
    },
    "text": {
      "en": "Your outpatient reimbursement of ¥342.60 has been credited to your medical insurance personal account.\nCheck details in the official medical insurance app or at any service counter.\nNo action or payment required.",
      "zh": "您的门诊报销款 342.60 元已划入您的医保个人账户。\n可在官方医保 App 或就近经办网点查询明细。\n无需操作，无需缴费。"
    },
    "flags": [
      {
        "en": "Surface bait: \"insurance payout / reimbursement\" messages are heavily impersonated by scammers.",
        "zh": "表层诱饵：『医保报销到账』是诈骗高仿的重灾区。"
      },
      {
        "en": "Safe-tell: money is already in your account; it points to the official app/counter and asks nothing of you.",
        "zh": "安全点：钱已进你账户，只让你去官方 App/网点查，什么都不要你做。"
      },
      {
        "en": "Transferable rule: a genuine payout notifies you — it never requires a code or transfer to \"receive\" it.",
        "zh": "可迁移原则：真到账只是通知你，绝不会要验证码或转账才能『领取』。"
      }
    ],
    "truthScam": {
      "en": "This was real. Fake \"reimbursement\" messages make you confirm a code or click to receive — this just told you it landed.",
      "zh": "这其实是真的。假报销会让你确认验证码或点链接领取，这条只是告诉你已到账。"
    },
    "truthSafe": {
      "en": "Correct. The money is already in your account and verification stays on official channels — a genuine notice.",
      "zh": "判对了。钱已在你账户、核验走官方渠道，是真通知。"
    }
  },
  {
    "answer": "safe",
    "risk": 0,
    "difficulty": 2,
    "title": {
      "en": "Social Security Contribution Reminder",
      "zh": "社保缴费·提醒"
    },
    "chan": {
      "en": "App push · social security",
      "zh": "App 推送 · 社保"
    },
    "sender": {
      "en": "Social Security Service App",
      "zh": "社保服务 App"
    },
    "text": {
      "en": "Reminder: your flexible-employment social insurance for this month is due before the 25th.\nPay through the social security app or your bound bank withholding — at the standard rate, no extra charge.\nOverdue may affect your coverage.",
      "zh": "提醒：您本月灵活就业社保费将于25日前到期，请及时缴纳。\n可通过社保 App 或绑定的银行代扣缴费，按标准费率，无额外收费。\n逾期可能影响参保待遇。"
    },
    "flags": [
      {
        "en": "Surface bait: \"due / overdue / affects coverage\" creates urgency scammers love.",
        "zh": "表层诱饵：『到期/逾期/影响待遇』制造紧迫感，正是诈骗惯用。"
      },
      {
        "en": "Safe-tell: it pays at the standard rate through the official app or bank withholding — no special account.",
        "zh": "安全点：按标准费率走官方 App 或银行代扣，没有指定的『特殊账户』。"
      },
      {
        "en": "Transferable rule: real contribution reminders never route money to a private \"officer\" account.",
        "zh": "可迁移原则：真缴费提醒绝不会把钱转进某个私人『工作人员』账户。"
      }
    ],
    "truthScam": {
      "en": "This was real. A scam version would give you a specific account to wire to — this points to the standard official channel.",
      "zh": "这其实是真的。诈骗版会给你一个指定账户汇款，这条只指向标准官方渠道。"
    },
    "truthSafe": {
      "en": "Correct. Standard rate, official app, no special account — a genuine due-date reminder.",
      "zh": "判对了。标准费率、官方 App、无指定账户，是真的缴费提醒。"
    }
  },
  {
    "answer": "safe",
    "risk": 0,
    "difficulty": 3,
    "title": {
      "en": "Housing Fund Withdrawal Credited",
      "zh": "公积金提取·到账"
    },
    "chan": {
      "en": "SMS · housing provident fund",
      "zh": "短信 · 公积金中心"
    },
    "sender": {
      "en": "Housing Provident Fund Center",
      "zh": "住房公积金管理中心"
    },
    "text": {
      "en": "Your housing fund withdrawal application of ¥8,500 has been approved and remitted to your bound bank card.\nCredit usually arrives within 1–2 business days. Query via the official fund app or counter.\nNo fee deducted.",
      "zh": "您申请的住房公积金提取 8500 元已审核通过，划转至您本人绑定的银行卡。\n通常1-2个工作日到账。可在官方公积金 App 或网点查询。\n未扣取任何费用。"
    },
    "flags": [
      {
        "en": "Surface bait: a large sum plus \"approved / remitted\" mimics payout-scam phrasing.",
        "zh": "表层诱饵：大额加『审核通过/划转』很像到账诈骗的话术。"
      },
      {
        "en": "Safe-tell: it's your own application, money goes to your own card, no fee, query stays official.",
        "zh": "安全点：是你本人的申请，钱到你本人卡，不扣费，查询走官方。"
      },
      {
        "en": "Transferable rule: a real withdrawal you initiated never charges an \"unfreezing\" fee to release it.",
        "zh": "可迁移原则：你本人发起的真提取，绝不会再收『解冻费』才放款。"
      }
    ],
    "truthScam": {
      "en": "This was real. A fake version invents a fee or a frozen status needing payment — this simply confirms your own withdrawal.",
      "zh": "这其实是真的。假版本会编个手续费或『冻结需缴费』，这条只是确认你本人的提取。"
    },
    "truthSafe": {
      "en": "Correct. Your application, your card, no fee — a genuine withdrawal notice.",
      "zh": "判对了。你本人申请、到本人卡、不扣费，是真的提取通知。"
    }
  },
  {
    "answer": "safe",
    "risk": 0,
    "difficulty": 2,
    "title": {
      "en": "Water Bill Arrears Reminder",
      "zh": "水费欠费·提醒"
    },
    "chan": {
      "en": "SMS · water utility",
      "zh": "短信 · 自来水公司"
    },
    "sender": {
      "en": "City Water Supply Co.",
      "zh": "XX市自来水公司"
    },
    "text": {
      "en": "Your water account is in arrears of ¥56.30. Please pay promptly to avoid supply interruption.\nPay via the official utility payment app, WeChat city service, or any business hall.\nKeep your account number handy.",
      "zh": "您的水费账户欠费 56.30 元，请及时缴纳以免影响正常供水。\n可通过官方缴费 App、城市服务或就近营业厅缴费。\n请准备好您的户号。"
    },
    "flags": [
      {
        "en": "Surface bait: \"arrears / supply will be cut\" is a top utility-scam pressure line.",
        "zh": "表层诱饵：『欠费/将停水』是水电诈骗最常用的施压话术。"
      },
      {
        "en": "Safe-tell: it names official channels you go to yourself, no link, no account to wire to.",
        "zh": "安全点：让你自己去官方渠道缴，没有链接、没有要你汇款的账户。"
      },
      {
        "en": "Transferable rule: a real arrears notice never sends a payment link or asks for your card password.",
        "zh": "可迁移原则：真欠费通知不会发缴费链接，也不会问你卡密码。"
      }
    ],
    "truthScam": {
      "en": "This was real. A scam would embed a payment link or demand immediate transfer — this just told you to pay through normal channels.",
      "zh": "这其实是真的。诈骗会塞个缴费链接或催你立刻转账，这条只让你走正常渠道缴费。"
    },
    "truthSafe": {
      "en": "Correct. Official channels, no link, no wiring account — a genuine arrears reminder.",
      "zh": "判对了。官方渠道、没链接、没汇款账户，是真欠费提醒。"
    }
  },
  {
    "answer": "safe",
    "risk": 0,
    "difficulty": 2,
    "title": {
      "en": "Gas Bill Overdue Notice",
      "zh": "燃气欠费·告知"
    },
    "chan": {
      "en": "SMS · gas company",
      "zh": "短信 · 燃气公司"
    },
    "sender": {
      "en": "City Gas Co.",
      "zh": "XX燃气公司"
    },
    "text": {
      "en": "Your natural gas account shows an overdue balance of ¥88.00.\nTop up via the official gas app, the city service mini-program, or a business hall to ensure continued supply.\nNo staff will phone you for card details.",
      "zh": "您的天然气账户欠费 88.00 元。\n请通过官方燃气 App、城市服务小程序或营业厅充值，以保障正常用气。\n工作人员不会致电索取您的银行卡信息。"
    },
    "flags": [
      {
        "en": "Surface bait: \"overdue / supply at risk\" is a classic urgency hook.",
        "zh": "表层诱饵：『欠费/影响用气』是典型的紧迫钩子。"
      },
      {
        "en": "Safe-tell: you top up through official apps yourself; the note even waves off any phone request for card info.",
        "zh": "安全点：让你自己用官方 App 充，还点明不会电话索要卡信息。"
      },
      {
        "en": "Transferable rule: a real bill never has someone call you to read out your card and code.",
        "zh": "可迁移原则：真账单不会有人打电话让你报卡号和验证码。"
      }
    ],
    "truthScam": {
      "en": "This was real. The scam twist is a follow-up call asking for your card and code — this message preempts exactly that.",
      "zh": "这其实是真的。诈骗的套路是随后来电索要卡号验证码，这条恰恰提前堵掉了。"
    },
    "truthSafe": {
      "en": "Correct. Self-service official top-up and no card requests — a genuine overdue notice.",
      "zh": "判对了。自助官方充值、不索要卡信息，是真欠费告知。"
    }
  },
  {
    "answer": "safe",
    "risk": 0,
    "difficulty": 3,
    "title": {
      "en": "ETC Renewal Reminder",
      "zh": "ETC续费·提醒"
    },
    "chan": {
      "en": "App push · ETC service",
      "zh": "App 推送 · ETC"
    },
    "sender": {
      "en": "ETC Service App",
      "zh": "ETC 服务 App"
    },
    "text": {
      "en": "Your ETC device certificate expires next month. Renew to keep using highway fast lanes.\nRenew inside the official ETC app or at a bank ETC counter — same rate, no extra processing charge.\nNo need to re-bind via any outside link.",
      "zh": "您的 ETC 设备证书将于下月到期，请续期以继续使用高速快捷通道。\n请在官方 ETC App 内或银行 ETC 网点办理续期，费率不变，无额外手续费。\n无需通过任何外部链接重新绑定。"
    },
    "flags": [
      {
        "en": "Surface bait: \"certificate expiring / re-verify\" is the exact line of rampant ETC phishing.",
        "zh": "表层诱饵：『证书到期/重新认证』正是泛滥的 ETC 钓鱼话术。"
      },
      {
        "en": "Safe-tell: it tells you to use the official app/bank counter and explicitly not any outside link.",
        "zh": "安全点：让你用官方 App/银行网点办，并明说不要外部链接。"
      },
      {
        "en": "Transferable rule: real ETC renewal never needs you to re-enter card and code on a texted link.",
        "zh": "可迁移原则：真 ETC 续期绝不会让你在短信链接里重填卡号验证码。"
      }
    ],
    "truthScam": {
      "en": "This was real. The scam version is a link telling you to \"re-certify\" with full card details — this steers you away from links entirely.",
      "zh": "这其实是真的。诈骗版是发链接让你『重新认证』填全套卡信息，这条反而让你别碰链接。"
    },
    "truthSafe": {
      "en": "Correct. Official app, unchanged rate, no outside link — a genuine renewal reminder.",
      "zh": "判对了。官方 App、费率不变、无外部链接，是真续费提醒。"
    }
  },
  {
    "answer": "safe",
    "risk": 0,
    "difficulty": 3,
    "title": {
      "en": "Annual Tax Reconciliation Reminder",
      "zh": "个税汇算·提醒"
    },
    "chan": {
      "en": "App push · tax authority",
      "zh": "App 推送 · 个税"
    },
    "sender": {
      "en": "Personal Income Tax App",
      "zh": "个人所得税 App"
    },
    "text": {
      "en": "The 2025 annual individual tax reconciliation window is open until June 30.\nComplete it yourself in the Personal Income Tax App; you may owe a top-up or be due a refund.\nNo agent fee required.",
      "zh": "2025年度个人所得税综合所得汇算清缴已开放，截止6月30日。\n请在个人所得税 App 内自行办理，可能需补税或可退税。\n无需缴纳任何代办费用。"
    },
    "flags": [
      {
        "en": "Surface bait: \"deadline / may owe tax\" pressures you and smells like a scam.",
        "zh": "表层诱饵：『截止/可能补税』施压，闻着像诈骗。"
      },
      {
        "en": "Safe-tell: you do it yourself in the official app; no \"agent\" and no fee.",
        "zh": "安全点：让你在官方 App 自办，没有『代办人』也不收费。"
      },
      {
        "en": "Transferable rule: a real reconciliation notice never sells you a paid \"fast-track\" via private chat.",
        "zh": "可迁移原则：真汇算提醒不会私聊推销付费『加急代办』。"
      }
    ],
    "truthScam": {
      "en": "This was real. A scam would offer a paid agent or link to \"help\" — this just points you to the official app.",
      "zh": "这其实是真的。诈骗会推个付费代办或链接『帮你办』，这条只让你进官方 App。"
    },
    "truthSafe": {
      "en": "Correct. Self-service in the official app, no agent fee — a genuine reconciliation reminder.",
      "zh": "判对了。官方 App 自办、无代办费，是真的汇算提醒。"
    }
  },
  {
    "answer": "safe",
    "risk": 0,
    "difficulty": 3,
    "title": {
      "en": "Court SMS — Verify Officially",
      "zh": "法院短信·官方核验"
    },
    "chan": {
      "en": "SMS · people's court",
      "zh": "短信 · 人民法院"
    },
    "sender": {
      "en": "District People's Court",
      "zh": "XX区人民法院"
    },
    "text": {
      "en": "You have a case notice pending. Please log in to the official judicial litigation platform with your ID to view it.\nVerify authenticity through the court's public service number.\nDo not transfer money to anyone over this matter.",
      "zh": "您有一则案件通知待查收，请凭本人身份证登录官方诉讼服务平台查看。\n可通过法院公开服务电话核验真伪。\n切勿就此事向任何人转账。"
    },
    "flags": [
      {
        "en": "Surface bait: \"court / case notice\" is the textbook impersonation that scares people.",
        "zh": "表层诱饵：『法院/案件通知』是吓唬人的教科书冒充。"
      },
      {
        "en": "Safe-tell: it tells you to verify via the public number and explicitly to transfer money to no one.",
        "zh": "安全点：让你打公开电话核验，并明确说别向任何人转账。"
      },
      {
        "en": "Transferable rule: a real court never asks for a transfer to a \"safe account\" by SMS.",
        "zh": "可迁移原则：真法院绝不会短信要你把钱转到『安全账户』。"
      }
    ],
    "truthScam": {
      "en": "This was real. The fake-court scam pivots to a \"safe account\" transfer — this message tells you to do the opposite.",
      "zh": "这其实是真的。假法院诈骗会转到『安全账户』，这条恰恰叫你别转。"
    },
    "truthSafe": {
      "en": "Correct. Official verification and an explicit no-transfer warning — a genuine court notice.",
      "zh": "判对了。官方核验、明确叫你别转账，是真的法院通知。"
    }
  },
  {
    "answer": "safe",
    "risk": 0,
    "difficulty": 3,
    "title": {
      "en": "Government Affairs Verification Notice",
      "zh": "政务短信·可核验"
    },
    "chan": {
      "en": "SMS · government service",
      "zh": "短信 · 政务服务"
    },
    "sender": {
      "en": "Government Service Platform",
      "zh": "政务服务平台"
    },
    "text": {
      "en": "Your real-name authentication for the government service account needs re-confirmation.\nComplete it inside the official government service app under My Account.\nNever provide your password or SMS code to any caller.",
      "zh": "您的政务服务账号实名认证需重新确认。\n请在官方政务服务 App 内「我的-账户」中完成认证。\n请勿向任何来电提供密码或短信验证码。"
    },
    "flags": [
      {
        "en": "Surface bait: \"authentication needs re-confirming\" is a favorite phishing pretext.",
        "zh": "表层诱饵：『认证需重新确认』是钓鱼最爱的借口。"
      },
      {
        "en": "Safe-tell: it keeps you inside the official app and tells you never to hand over your code.",
        "zh": "安全点：让你在官方 App 内完成，并叮嘱别把验证码给任何人。"
      },
      {
        "en": "Transferable rule: real re-authentication happens in-app, never by reading codes to a stranger.",
        "zh": "可迁移原则：真重新认证在 App 内完成，绝不靠对陌生人报验证码。"
      }
    ],
    "truthScam": {
      "en": "This was real. The scam form harvests your code over the phone — this message tells you flatly not to share it.",
      "zh": "这其实是真的。诈骗版会电话套你验证码，这条直接叫你别给。"
    },
    "truthSafe": {
      "en": "Correct. In-app authentication and a no-code warning — a genuine government notice.",
      "zh": "判对了。App 内认证、警示别给验证码，是真的政务通知。"
    }
  },
  {
    "answer": "safe",
    "risk": 0,
    "difficulty": 2,
    "title": {
      "en": "Traffic Violation Notice",
      "zh": "交管违章·告知"
    },
    "chan": {
      "en": "App push · traffic management",
      "zh": "App 推送 · 交管"
    },
    "sender": {
      "en": "Traffic Management App",
      "zh": "交管 App"
    },
    "text": {
      "en": "Your vehicle has a pending violation: speeding, recorded on the 18th.\nView details and handle it yourself in the official traffic management app or at a vehicle administration office.\nPay only through official channels.",
      "zh": "您的车辆有一条待处理违法记录：超速，记录日期18日。\n请在官方交管 App 或车管所自行查看并处理。\n罚款仅通过官方渠道缴纳。"
    },
    "flags": [
      {
        "en": "Surface bait: \"violation / fine pending\" rattles drivers and is widely faked.",
        "zh": "表层诱饵：『违章/待缴罚款』让车主紧张，被广泛仿冒。"
      },
      {
        "en": "Safe-tell: you handle it yourself in the official app/office; payment only via official channels.",
        "zh": "安全点：让你在官方 App/车管所自办，罚款只走官方渠道。"
      },
      {
        "en": "Transferable rule: a real violation notice never includes a pay-now link to a private account.",
        "zh": "可迁移原则：真违章告知不会附『立即缴罚』到私人账户的链接。"
      }
    ],
    "truthScam": {
      "en": "This was real. The scam adds a fake pay link to a private wallet — this points only to official handling.",
      "zh": "这其实是真的。诈骗会加个假缴费链接到私人钱包，这条只指向官方处理。"
    },
    "truthSafe": {
      "en": "Correct. Self-service in the official app, official-only payment — a genuine violation notice.",
      "zh": "判对了。官方 App 自办、仅官方缴费，是真的违章告知。"
    }
  },
  {
    "answer": "safe",
    "risk": 0,
    "difficulty": 2,
    "title": {
      "en": "Highway Toll Top-up Reminder",
      "zh": "高速通行·提醒"
    },
    "chan": {
      "en": "SMS · highway operator",
      "zh": "短信 · 高速运营"
    },
    "sender": {
      "en": "Highway Operation Center",
      "zh": "高速公路运营中心"
    },
    "text": {
      "en": "An unpaid toll passage of ¥23.00 was recorded for your plate.\nSettle it in the official highway app or the bound ETC account; standard amount, no surcharge.\nDo not pay through any link sent to you.",
      "zh": "您的车牌有一笔未结清通行费 23.00 元。\n请在官方高速 App 或绑定的 ETC 账户结清，金额标准，无附加费。\n请勿通过任何收到的链接缴费。"
    },
    "flags": [
      {
        "en": "Surface bait: \"unpaid toll\" with a precise amount mimics scam billing texts.",
        "zh": "表层诱饵：『未结清通行费』加精确金额很像诈骗账单短信。"
      },
      {
        "en": "Safe-tell: pay in the official app/ETC, standard amount, and explicitly not via any link.",
        "zh": "安全点：在官方 App/ETC 缴、金额标准，并明说别用任何链接。"
      },
      {
        "en": "Transferable rule: a real toll notice never bundles a clickable pay link with surcharges.",
        "zh": "可迁移原则：真通行费通知不会捆绑带附加费的可点缴费链接。"
      }
    ],
    "truthScam": {
      "en": "This was real. The scam packs a link plus a bogus surcharge — this tells you to ignore links and pay the standard amount officially.",
      "zh": "这其实是真的。诈骗会塞链接加虚假附加费，这条让你别点链接、按标准金额官方缴。"
    },
    "truthSafe": {
      "en": "Correct. Official app/ETC, standard amount, no link — a genuine toll reminder.",
      "zh": "判对了。官方 App/ETC、标准金额、无链接，是真的通行费提醒。"
    }
  },
  {
    "answer": "safe",
    "risk": 0,
    "difficulty": 2,
    "title": {
      "en": "Vaccination Appointment Reminder",
      "zh": "疫苗预约·提醒"
    },
    "chan": {
      "en": "SMS · community health center",
      "zh": "短信 · 社区卫生中心"
    },
    "sender": {
      "en": "Community Health Service Center",
      "zh": "社区卫生服务中心"
    },
    "text": {
      "en": "Reminder: your booster vaccination is booked for the 27th, 9:00–11:00.\nBring your ID and come to the center directly; the public-health vaccine is free.\nReschedule via the official health appointment app if needed.",
      "zh": "提醒：您预约的加强针接种时间为27日 9:00-11:00。\n请携带本人身份证直接到中心接种，免疫规划疫苗免费。\n如需改约，请在官方健康预约 App 操作。"
    },
    "flags": [
      {
        "en": "Surface bait: an unsolicited health \"appointment\" message can read like a phishing lure.",
        "zh": "表层诱饵：突来的健康『预约』短信也可能像钓鱼诱饵。"
      },
      {
        "en": "Safe-tell: it's free, you just show up with ID, rescheduling stays in the official app.",
        "zh": "安全点：免费、带身份证直接去，改约也在官方 App 内。"
      },
      {
        "en": "Transferable rule: a real appointment reminder never asks you to prepay or click to \"confirm slot\".",
        "zh": "可迁移原则：真预约提醒不会让你预付款或点链接『确认名额』。"
      }
    ],
    "truthScam": {
      "en": "This was real. A scam version charges a \"reservation fee\" or links to confirm — this just gives you a time and a free shot.",
      "zh": "这其实是真的。诈骗版会收『预约费』或发链接确认，这条只给你时间和免费接种。"
    },
    "truthSafe": {
      "en": "Correct. Free, ID only, official rescheduling — a genuine appointment reminder.",
      "zh": "判对了。免费、只带身份证、官方改约，是真的预约提醒。"
    }
  },
  {
    "answer": "safe",
    "risk": 0,
    "difficulty": 2,
    "title": {
      "en": "Health Check Booking Reminder",
      "zh": "体检预约·提醒"
    },
    "chan": {
      "en": "SMS · public health checkup",
      "zh": "短信 · 公共体检"
    },
    "sender": {
      "en": "City Health Examination Center",
      "zh": "市健康体检中心"
    },
    "text": {
      "en": "Your free annual resident health check is booked for the 29th morning.\nFast beforehand and bring your ID and social security card to the center.\nManage your booking in the official health app.",
      "zh": "您预约的居民免费年度健康体检定于29日上午。\n请空腹并携带本人身份证、社保卡到中心。\n预约管理请使用官方健康 App。"
    },
    "flags": [
      {
        "en": "Surface bait: free \"resident benefit\" wording resembles subsidy-scam bait.",
        "zh": "表层诱饵：『居民免费福利』措辞像补贴诈骗的诱饵。"
      },
      {
        "en": "Safe-tell: it's free, you attend in person with ID, booking handled in the official app.",
        "zh": "安全点：免费、本人带证件到场、预约在官方 App 管理。"
      },
      {
        "en": "Transferable rule: a real free checkup never requires an upfront payment or a link login.",
        "zh": "可迁移原则：真免费体检不会要先付款或点链接登录。"
      }
    ],
    "truthScam": {
      "en": "This was real. A scam would demand a deposit or link login — this only asks you to show up fasting with your card.",
      "zh": "这其实是真的。诈骗会要押金或链接登录，这条只让你空腹带卡到场。"
    },
    "truthSafe": {
      "en": "Correct. Free, in-person, official-app booking — a genuine checkup reminder.",
      "zh": "判对了。免费、本人到场、官方 App 预约，是真的体检提醒。"
    }
  },
  {
    "answer": "safe",
    "risk": 0,
    "difficulty": 3,
    "title": {
      "en": "Electricity Arrears Before Cutoff",
      "zh": "电费欠费·停电前"
    },
    "chan": {
      "en": "SMS · power supply",
      "zh": "短信 · 供电公司"
    },
    "sender": {
      "en": "City Power Supply Bureau",
      "zh": "XX市供电局"
    },
    "text": {
      "en": "Your electricity account is overdue ¥130.40. To avoid a power cut, please pay before the 26th.\nPay via the official grid app, bank counter, or business hall.\nNo staff will ask for your card password or a code.",
      "zh": "您的电费账户欠费 130.40 元，为避免停电，请于26日前缴清。\n可通过官方电网 App、银行柜台或营业厅缴费。\n工作人员不会索取您的卡密码或验证码。"
    },
    "flags": [
      {
        "en": "Surface bait: \"overdue / cutoff imminent\" is a high-pressure scam staple.",
        "zh": "表层诱饵：『欠费/即将停电』是高压施压的诈骗常客。"
      },
      {
        "en": "Safe-tell: it lists official payment channels and disclaims any request for password or code.",
        "zh": "安全点：列出官方缴费渠道，并声明不会索要密码或验证码。"
      },
      {
        "en": "Transferable rule: a real cutoff warning never has someone call to \"help\" you pay over the phone.",
        "zh": "可迁移原则：真停电预警不会有人来电『帮你』电话缴费。"
      }
    ],
    "truthScam": {
      "en": "This was real. The scam twist is a caller offering to pay it for you to grab your card and code — this rules that out.",
      "zh": "这其实是真的。诈骗套路是来电『替你缴』骗卡号验证码，这条已排除。"
    },
    "truthSafe": {
      "en": "Correct. Official channels, no password or code requests — a genuine arrears warning.",
      "zh": "判对了。官方渠道、不索要密码验证码，是真的欠费预警。"
    }
  },
  {
    "answer": "safe",
    "risk": 0,
    "difficulty": 3,
    "title": {
      "en": "Childcare Subsidy to Your Account",
      "zh": "育儿补贴·到本人账户"
    },
    "chan": {
      "en": "SMS · civil affairs bureau",
      "zh": "短信 · 民政局"
    },
    "sender": {
      "en": "District Civil Affairs Bureau",
      "zh": "XX区民政局"
    },
    "text": {
      "en": "Your childcare subsidy of ¥500 will be disbursed to the bank card you registered with the bureau.\nNo application link is needed; confirm eligibility at the civil affairs counter or official app.\nThe bureau never collects a fee to release a subsidy.",
      "zh": "您的育儿补贴 500 元将发放至您在民政局登记的银行卡。\n无需点击任何申领链接，资格可在民政窗口或官方 App 核实。\n民政局发放补贴不会收取任何费用。"
    },
    "flags": [
      {
        "en": "Surface bait: \"subsidy disbursement\" is one of the most impersonated benefit scams.",
        "zh": "表层诱饵：『补贴发放』是被冒充最多的福利诈骗之一。"
      },
      {
        "en": "Safe-tell: money goes to your registered card, no link to click, no fee to release it.",
        "zh": "安全点：钱发到你登记的卡、不用点链接、发放不收费。"
      },
      {
        "en": "Transferable rule: a real subsidy is paid to you and never charges a fee to \"unlock\" it.",
        "zh": "可迁移原则：真补贴是发给你的，绝不会收费才『解锁』。"
      }
    ],
    "truthScam": {
      "en": "This was real. A fake subsidy demands a fee or a link before paying — this pays to your registered card with neither.",
      "zh": "这其实是真的。假补贴会在发放前要手续费或链接，这条直接发到你登记的卡，两样都没有。"
    },
    "truthSafe": {
      "en": "Correct. Paid to your own card, no link, no fee — a genuine subsidy notice.",
      "zh": "判对了。发到你本人卡、无链接、无费用，是真的补贴通知。"
    }
  },
  {
    "answer": "safe",
    "risk": 0,
    "difficulty": 3,
    "title": {
      "en": "Pension Authentication Reminder",
      "zh": "养老金认证·提醒"
    },
    "chan": {
      "en": "App push · pension service",
      "zh": "App 推送 · 养老金"
    },
    "sender": {
      "en": "Pension Service App",
      "zh": "养老金服务 App"
    },
    "text": {
      "en": "Your annual pension qualification authentication is due before month-end to keep payments uninterrupted.\nComplete face authentication yourself in the official pension app at home.\nNo fee, no third party, no card details needed.",
      "zh": "您的养老金资格年度认证将于月底到期，请及时认证以免影响发放。\n可在官方养老金 App 内自助完成人脸认证，足不出户。\n无需费用、无需他人代办、无需提供银行卡信息。"
    },
    "flags": [
      {
        "en": "Surface bait: \"authentication due / payments may stop\" pressures elderly users and is widely faked.",
        "zh": "表层诱饵：『认证到期/影响发放』施压老人，被广泛仿冒。"
      },
      {
        "en": "Safe-tell: self-service face auth in the official app; no fee, no agent, no card info.",
        "zh": "安全点：在官方 App 自助人脸认证，无费用、无代办、不要卡信息。"
      },
      {
        "en": "Transferable rule: real qualification authentication never costs money or needs your card number.",
        "zh": "可迁移原则：真资格认证不花钱，也不需要你的卡号。"
      }
    ],
    "truthScam": {
      "en": "This was real. The scam version charges an \"agent fee\" or harvests card details — this is free self-service in the official app.",
      "zh": "这其实是真的。诈骗版会收『代办费』或套卡信息，这条是官方 App 内免费自助。"
    },
    "truthSafe": {
      "en": "Correct. Free in-app face authentication, no card info — a genuine authentication reminder.",
      "zh": "判对了。官方 App 内免费人脸认证、不要卡信息，是真的认证提醒。"
    }
  },
  {
    "answer": "safe",
    "risk": 0,
    "difficulty": 2,
    "title": {
      "en": "Quarterly Bonus Credited",
      "zh": "季度奖金已到账"
    },
    "chan": {
      "en": "Bank app push · your account",
      "zh": "银行 App 推送 · 本人账户"
    },
    "sender": {
      "en": "Your Bank App",
      "zh": "你的银行 App"
    },
    "text": {
      "en": "Your account ending 6612 was credited ¥4,200.00 at 18:02.\nMemo: Q2 performance bonus.\nView details in-app.",
      "zh": "您尾号6612账户于18:02收入4,200.00元。\n摘要：二季度绩效奖金。\n详情见App账单。"
    },
    "flags": [
      {
        "en": "Surface bait: an unexpected large credit makes you suspect a 'wrong transfer, send it back' scam.",
        "zh": "表层诱饵：一笔意外的大额入账，让你联想到「转错账快退回」骗局。"
      },
      {
        "en": "Safe-tell: it's a real incoming credit in your own bank app — no link, no reply, no action asked of you.",
        "zh": "安全本质：这是你本人银行App里的真实入账通知，没有链接、没让你回复、没让你做任何操作。"
      },
      {
        "en": "Transferable rule: the 'refund the overpayment' scam needs you to send money back — a genuine credit asks nothing.",
        "zh": "可迁移原则：「退还多打的钱」骗局要你把钱转回去，真入账什么都不要求你做。"
      }
    ],
    "truthScam": {
      "en": "Actually this was real — your bonus genuinely landed. Flagging your own bank's credit notice as fraud means you'd reject your own salary.",
      "zh": "其实这是真的——奖金确实到账了。把自己银行的入账通知当诈骗拦下，等于把自己的工资也拒之门外。"
    },
    "truthSafe": {
      "en": "Right call. A real credit in your own bank app that asks nothing of you is just good news.",
      "zh": "判得好。本人银行App里、不要你做任何操作的真实入账，就是个好消息。"
    }
  },
  {
    "answer": "safe",
    "risk": 0,
    "difficulty": 3,
    "title": {
      "en": "Manager Asks to Move a Meeting",
      "zh": "经理改个会议时间"
    },
    "chan": {
      "en": "Work IM · known account",
      "zh": "办公 IM · 实名账号"
    },
    "sender": {
      "en": "Manager Lin (work IM)",
      "zh": "林经理（办公IM实名号）"
    },
    "text": {
      "en": "Tomorrow's 10am review clashes with the client call.\nCan we push it to 2pm? Let the team know.\nThanks.",
      "zh": "明天上午10点的评审跟客户那边的电话撞了。\n挪到下午2点行吗？麻烦你通知下大家。\n谢了。"
    },
    "flags": [
      {
        "en": "Surface bait: a boss messaging you directly screams 'impersonating the leader' after all those scam warnings.",
        "zh": "表层诱饵：领导直接私信你，被反复警告过的你立刻想到「冒充领导」。"
      },
      {
        "en": "Safe-tell: it's your manager's real IM account asking a normal scheduling favor — no money, no secrecy, no new account.",
        "zh": "安全本质：是经理本人的IM实名号，让你办件正经排会的事——不涉及钱、不要保密、没有新账号。"
      },
      {
        "en": "Transferable rule: the boss-impersonation scam always has money + urgency + a new account. None here.",
        "zh": "可迁移原则：冒充领导骗局必有「钱+催促+新账号」，这里一个都没有。"
      }
    ],
    "truthScam": {
      "en": "Actually real — it's just rescheduling a meeting. Treating every boss message as fraud means you'd ignore your actual manager and miss the new time.",
      "zh": "其实是真的——只是改个会议时间。把领导每条消息都当诈骗，等于无视真经理、错过新会议时间。"
    },
    "truthSafe": {
      "en": "Good eye. Your manager's real account asking a normal favor with no money or secrecy is just work.",
      "zh": "看得准。经理本人实名号办件不涉及钱、不要保密的正经事，就是日常工作。"
    }
  },
  {
    "answer": "safe",
    "risk": 0,
    "difficulty": 2,
    "title": {
      "en": "Reimbursement Invoice Approved",
      "zh": "报销发票已通过"
    },
    "chan": {
      "en": "Finance system · company portal",
      "zh": "财务系统 · 公司内网"
    },
    "sender": {
      "en": "Finance Notice (intranet)",
      "zh": "财务通知（内网）"
    },
    "text": {
      "en": "Your June expense claim (4 invoices, ¥863) has been approved.\nPayout with this month's salary.\nNo action needed.",
      "zh": "您6月的报销单（4张发票，863元）已审核通过。\n随当月工资一并发放。\n无需操作。"
    },
    "flags": [
      {
        "en": "Surface bait: 'invoice' and 'payout' echo the fake VAT-invoice and fake-refund scams you've been warned about.",
        "zh": "表层诱饵：「发票」「发放」让你想到被警告过的假发票、假退款骗局。"
      },
      {
        "en": "Safe-tell: it's an in-house finance system note confirming your own claim — no link to click, nothing to confirm.",
        "zh": "安全本质：是公司财务系统里确认你自己报销单的通知，没有链接可点、没有要确认的东西。"
      },
      {
        "en": "Transferable rule: invoice scams push you to a payment page; this just says 'no action needed'.",
        "zh": "可迁移原则：发票骗局会把你引到付款页，这条直接写「无需操作」。"
      }
    ],
    "truthScam": {
      "en": "Actually real — your reimbursement cleared. Blocking the finance system's own approval means your money just sits there.",
      "zh": "其实是真的——报销过了。把财务系统自己的审核通知拦下，钱就卡在那儿不动了。"
    },
    "truthSafe": {
      "en": "Correct. An internal approval that asks nothing of you is exactly what a real reimbursement looks like.",
      "zh": "对的。不要你做任何事的内部审核通过，正是真报销该有的样子。"
    }
  },
  {
    "answer": "safe",
    "risk": 0,
    "difficulty": 2,
    "title": {
      "en": "Parcel Pickup Code",
      "zh": "快递取件码"
    },
    "chan": {
      "en": "SMS · courier locker",
      "zh": "短信 · 快递柜"
    },
    "sender": {
      "en": "Smart Locker",
      "zh": "丰巢/某快递柜"
    },
    "text": {
      "en": "Your parcel is in Locker 7, cabinet B-12.\nPickup code: 8246.\nFree storage 18h. Enter code at the screen.",
      "zh": "您的快递已放入7号柜，B-12格口。\n取件码：8246。\n免费保管18小时，请到柜机屏幕输入取件。"
    },
    "flags": [
      {
        "en": "Surface bait: a 'code' in a message triggers your verification-code reflex — you want to never share any code.",
        "zh": "表层诱饵：消息里有「码」，触发你的验证码警觉——你想着任何码都不外泄。"
      },
      {
        "en": "Safe-tell: this code is for you to type at the locker screen, not to tell anyone — no link, no callback number.",
        "zh": "安全本质：这个码是给你自己到柜机屏幕上输入的，不是发给谁——没链接、没回拨电话。"
      },
      {
        "en": "Transferable rule: a verification-code scam asks you to read the code to a 'staffer'; a pickup code you key in yourself.",
        "zh": "可迁移原则：验证码骗局要你把码念给「客服」，取件码是你自己在柜机输入。"
      }
    ],
    "truthScam": {
      "en": "Actually real — that's just your locker pickup code. Refuse it and your parcel stays locked up until it's returned.",
      "zh": "其实是真的——这就是取件码。拒了它，包裹只能锁在柜里直到被退回。"
    },
    "truthSafe": {
      "en": "Nice. A code you punch into the locker yourself, with no one to share it with, is perfectly safe.",
      "zh": "漂亮。一个你自己在柜机上输入、没有对象可外泄的码，完全安全。"
    }
  },
  {
    "answer": "safe",
    "risk": 0,
    "difficulty": 2,
    "title": {
      "en": "Delivery Signed Confirmation",
      "zh": "快递签收提醒"
    },
    "chan": {
      "en": "Courier app push · your order",
      "zh": "快递 App 推送 · 你的订单"
    },
    "sender": {
      "en": "Courier App",
      "zh": "快递 App"
    },
    "text": {
      "en": "Order ...4471 delivered and signed at the front desk at 15:30.\nRate your courier in-app if you like.",
      "zh": "订单尾号4471已于15:30送达并由前台代签。\n如愿意，可在App内为快递员评价。"
    },
    "flags": [
      {
        "en": "Surface bait: 'signed for you' rings the fake-delivery / 'compensation for lost parcel' alarm.",
        "zh": "表层诱饵：「代签」让你想到假签收、「丢件理赔」那类骗局的警铃。"
      },
      {
        "en": "Safe-tell: it's your own courier app confirming a real order — the rating link only opens the app, asks for nothing.",
        "zh": "安全本质：是你本人快递App确认真实订单，评价入口只是打开App本身，什么都不索取。"
      },
      {
        "en": "Transferable rule: parcel scams push a 'claim compensation' link and bank details; this just confirms delivery.",
        "zh": "可迁移原则：快递骗局会塞「申请理赔」链接要银行信息，这条只是确认送达。"
      }
    ],
    "truthScam": {
      "en": "Actually real — your package arrived. Calling a normal delivery confirmation a scam just leaves you anxious over nothing.",
      "zh": "其实是真的——你的包裹到了。把正常签收提醒当诈骗，只是平白让自己虚惊一场。"
    },
    "truthSafe": {
      "en": "Right. A delivery confirmation in your own app that asks for nothing is just a status update.",
      "zh": "对。本人App里、什么都不索取的签收提醒，只是个状态更新。"
    }
  },
  {
    "answer": "safe",
    "risk": 0,
    "difficulty": 3,
    "title": {
      "en": "Parcel Rerouted to New Address",
      "zh": "快递改派通知"
    },
    "chan": {
      "en": "Courier app push · your order",
      "zh": "快递 App 推送 · 你的订单"
    },
    "sender": {
      "en": "Courier App",
      "zh": "快递 App"
    },
    "text": {
      "en": "Per your request, order ...0925 has been rerouted to your office address.\nNew ETA: tomorrow before 6pm.",
      "zh": "已按您的申请，将订单尾号0925改派至您的公司地址。\n预计送达：明天18点前。"
    },
    "flags": [
      {
        "en": "Surface bait: 'address changed' sounds like the classic 'your parcel had an exception, click to fix' scam.",
        "zh": "表层诱饵：「地址变更」很像「您的包裹异常，点此处理」那种经典骗局。"
      },
      {
        "en": "Safe-tell: it confirms a change you made in the app yourself — no link, no fee, no info requested.",
        "zh": "安全本质：它确认的是你自己在App里发起的改派——没链接、没费用、不要任何信息。"
      },
      {
        "en": "Transferable rule: reroute scams demand a 'redelivery fee' or login; a real reroute confirmation charges nothing.",
        "zh": "可迁移原则：改派骗局会要「重派费」或登录，真改派确认不收一分钱。"
      }
    ],
    "truthScam": {
      "en": "Actually real — it's confirming the reroute you asked for. Block it and you'll wonder where your parcel went.",
      "zh": "其实是真的——它在确认你自己申请的改派。拦下它，你反而要纳闷包裹去哪了。"
    },
    "truthSafe": {
      "en": "Sharp. Confirming a change you initiated, with no fee or link, is genuine.",
      "zh": "敏锐。确认你本人发起的变更、不收费不带链接，是真的。"
    }
  },
  {
    "answer": "safe",
    "risk": 0,
    "difficulty": 2,
    "title": {
      "en": "Friend Splits the Bill",
      "zh": "好友 AA 转账"
    },
    "chan": {
      "en": "WeChat · friend you know",
      "zh": "微信 · 相熟好友"
    },
    "sender": {
      "en": "Mei (friend)",
      "zh": "好友 Mei"
    },
    "text": {
      "en": "Sent you ¥58 for last night's hotpot.\nTreat next round's on me, deal?",
      "zh": "上次火锅的钱给你转过去啦，58。\n下顿我请，说定了哈～"
    },
    "flags": [
      {
        "en": "Surface bait: an incoming transfer makes you fear a 'mistaken transfer, refund me more' setup.",
        "zh": "表层诱饵：收到转账让你担心「转错了，多退我点」的套路。"
      },
      {
        "en": "Safe-tell: it's a normal AA payback from a friend you know, with context that matches reality — accept and move on.",
        "zh": "安全本质：是相熟好友的正常AA回款，情境对得上现实——收下就行。"
      },
      {
        "en": "Transferable rule: the 'wrong transfer' scam later asks you to send extra back; a friend paying their share asks nothing.",
        "zh": "可迁移原则：「转错账」骗局随后会要你多退钱，朋友还AA分摊什么都不要。"
      }
    ],
    "truthScam": {
      "en": "Actually real — your friend just paid their hotpot share. Treating a buddy's AA as fraud freezes up normal life.",
      "zh": "其实是真的——朋友只是还了火锅的AA。把哥们儿的AA当诈骗，正常生活就被你卡死了。"
    },
    "truthSafe": {
      "en": "Good. A known friend paying their share with matching context is just splitting the bill.",
      "zh": "好。相熟好友按真实情境还分摊款，就是正常AA而已。"
    }
  },
  {
    "answer": "safe",
    "risk": 0,
    "difficulty": 2,
    "title": {
      "en": "Post Liked Notification",
      "zh": "动态被点赞通知"
    },
    "chan": {
      "en": "Social app push · your account",
      "zh": "社交 App 推送 · 你的账号"
    },
    "sender": {
      "en": "Social App",
      "zh": "社交 App"
    },
    "text": {
      "en": "3 people liked your post and 1 left a comment.\nTap to view in-app.",
      "zh": "3人点赞了你的动态，1条新评论。\n点击在App内查看。"
    },
    "flags": [
      {
        "en": "Surface bait: any app notification feels like phishing bait after so many fake-system warnings.",
        "zh": "表层诱饵：被那么多假系统通知吓过后，任何App提醒都像钓鱼诱饵。"
      },
      {
        "en": "Safe-tell: it's your real social app's normal engagement ping — opens in-app, asks for no login or info.",
        "zh": "安全本质：是你真实社交App的正常互动提醒——在App内打开，不要登录不要信息。"
      },
      {
        "en": "Transferable rule: fake-system scams push an external link to 'verify your account'; this stays inside the app.",
        "zh": "可迁移原则：假系统骗局会推外链让你「验证账号」，这条只在App内停留。"
      }
    ],
    "truthScam": {
      "en": "Actually real — someone just liked your post. Calling every app ping a scam means you'd silence your whole feed.",
      "zh": "其实是真的——有人给你点了赞。把每条App提醒当诈骗，等于把整个消息流都静音了。"
    },
    "truthSafe": {
      "en": "Right. A like/comment notice that only opens the app is exactly as harmless as it looks.",
      "zh": "对。只在App内打开的点赞评论提醒，跟它看起来一样无害。"
    }
  },
  {
    "answer": "safe",
    "risk": 0,
    "difficulty": 3,
    "title": {
      "en": "Satisfaction Survey Callback",
      "zh": "客服满意度回访"
    },
    "chan": {
      "en": "App in-message · official service",
      "zh": "App 内消息 · 官方客服"
    },
    "sender": {
      "en": "Customer Service (in-app)",
      "zh": "官方客服（App内）"
    },
    "text": {
      "en": "About your repair ticket from Mon — was it resolved to your satisfaction?\nTap a star 1–5 below. That's all, thanks!",
      "zh": "关于您周一的报修工单，本次是否解决满意？\n在下方点1–5颗星即可，仅此而已，感谢！"
    },
    "flags": [
      {
        "en": "Surface bait: 'customer service callback' is exactly the wrapper many refund/account scams use.",
        "zh": "表层诱饵：「客服回访」正是许多退款、盗号骗局常用的外壳。"
      },
      {
        "en": "Safe-tell: it's inside the official app about a ticket you really opened, asking only for a star rating — no info, no link.",
        "zh": "安全本质：在官方App内、针对你真开过的工单，只要你点星评分——不要信息、不带链接。"
      },
      {
        "en": "Transferable rule: fake-callback scams ask for card/code/screen-share; a real survey only wants a rating.",
        "zh": "可迁移原则：假回访会要银行卡/验证码/共享屏幕，真满意度调查只要个评分。"
      }
    ],
    "truthScam": {
      "en": "Actually real — it's just rating a repair you actually had. Reject every callback and even honest surveys get nowhere.",
      "zh": "其实是真的——只是给你真办过的报修打个分。把每个回访都拒了，连诚实的调查也办不成。"
    },
    "truthSafe": {
      "en": "Good instinct, good call: a survey tied to your real ticket that wants nothing but a star is safe.",
      "zh": "直觉好、判得也好：绑定你真实工单、只要一颗星的调查，是安全的。"
    }
  },
  {
    "answer": "safe",
    "risk": 0,
    "difficulty": 2,
    "title": {
      "en": "Property Notice: Water Shutoff",
      "zh": "物业停水通知"
    },
    "chan": {
      "en": "Resident group · property mgmt",
      "zh": "业主群 · 物业管理处"
    },
    "sender": {
      "en": "Property Management",
      "zh": "物业管理处"
    },
    "text": {
      "en": "Notice: water mains maintenance this Thu 9–12am, Building 3 will have no water.\nPlease store water in advance. Sorry for the trouble.",
      "zh": "通知：本周四上午9–12点检修主管道，3号楼临时停水。\n请提前储水，给您带来不便敬请谅解。"
    },
    "flags": [
      {
        "en": "Surface bait: 'utility notice' is a known scam shell (fake gas/water bills demanding payment).",
        "zh": "表层诱饵：「水电通知」是常见骗局外壳（假水电费催缴）。"
      },
      {
        "en": "Safe-tell: it's an informational notice in your real resident group — no fee, no link, nothing to pay or click.",
        "zh": "安全本质：是你真实业主群里的告知性通知——不收费、无链接、没有要缴或要点的东西。"
      },
      {
        "en": "Transferable rule: utility scams demand urgent payment via a link; this only tells you to store water.",
        "zh": "可迁移原则：水电骗局会催你点链接缴费，这条只是让你提前储水。"
      }
    ],
    "truthScam": {
      "en": "Actually real — it's just a maintenance heads-up. Block it and you'll be the one caught with no water Thursday.",
      "zh": "其实是真的——只是检修通知。拦下它，周四没水的就是你自己。"
    },
    "truthSafe": {
      "en": "Right. An info-only property notice with no payment or link is genuine housekeeping.",
      "zh": "对。只告知、不收费不带链接的物业通知，是正经的日常事务。"
    }
  },
  {
    "answer": "safe",
    "risk": 0,
    "difficulty": 3,
    "title": {
      "en": "Classmate Reunion Invite",
      "zh": "同学聚会通知"
    },
    "chan": {
      "en": "Class group chat · old classmates",
      "zh": "同学群 · 老同学"
    },
    "sender": {
      "en": "Class Rep (group)",
      "zh": "班长（同学群）"
    },
    "text": {
      "en": "Reunion set for the 18th, 6pm, the old noodle place near school.\nReply with a thumbs-up if you're coming so I can book a table.",
      "zh": "聚会定18号晚6点，学校旁边那家老面馆。\n来的扣个赞，方便我订桌。"
    },
    "flags": [
      {
        "en": "Surface bait: group-chat gatherings can front 'collect the AA fee here' scams, so you brace for a payment ask.",
        "zh": "表层诱饵：群里聚会有时是「这儿交AA费」骗局的幌子，你下意识防着要钱。"
      },
      {
        "en": "Safe-tell: it's your real class group asking only for a thumbs-up to count heads — no money collected here.",
        "zh": "安全本质：是你真实同学群里只要你扣个赞统计人数——这里没收任何钱。"
      },
      {
        "en": "Transferable rule: fake-collection scams push a 'pay the deposit now' link; this just wants a head count.",
        "zh": "可迁移原则：假收款骗局会塞「先交订金」链接，这条只想统计到场人数。"
      }
    ],
    "truthScam": {
      "en": "Actually real — it's just your class rep counting heads. Suspect every reunion and you'll wall yourself off from old friends.",
      "zh": "其实是真的——只是班长在统计人数。每场聚会都怀疑，你就把老同学全挡在墙外了。"
    },
    "truthSafe": {
      "en": "Good. A class group asking for a thumbs-up to book a table, collecting nothing, is just a get-together.",
      "zh": "好。同学群里扣赞订桌、不收一分钱，就是次普通聚会。"
    }
  },
  {
    "answer": "safe",
    "risk": 0,
    "difficulty": 2,
    "title": {
      "en": "Salary Deposited",
      "zh": "工资已发放"
    },
    "chan": {
      "en": "Bank app push · your account",
      "zh": "银行 App 推送 · 本人账户"
    },
    "sender": {
      "en": "Your Bank App",
      "zh": "你的银行 App"
    },
    "text": {
      "en": "Account ending 6612 credited ¥9,850.00.\nMemo: payroll — June salary.\nBalance updated in-app.",
      "zh": "尾号6612账户收入9,850.00元。\n摘要：代发工资——6月薪资。\n余额已在App更新。"
    },
    "flags": [
      {
        "en": "Surface bait: a payroll-themed message recalls 'HR needs your card to pay you' scams.",
        "zh": "表层诱饵：工资主题的消息让你想到「HR要你银行卡才能发薪」骗局。"
      },
      {
        "en": "Safe-tell: it's a plain credit in your own bank app — it already paid you, it isn't asking for a thing.",
        "zh": "安全本质：是你本人银行App里的纯入账——钱已经发到了，没向你要任何东西。"
      },
      {
        "en": "Transferable rule: payroll scams ask you to 'confirm card details to release pay'; a real deposit just arrives.",
        "zh": "可迁移原则：工资骗局会让你「确认卡号才能放款」，真发薪直接到账。"
      }
    ],
    "truthScam": {
      "en": "Actually real — that's your salary. Flagging your own payday as fraud is being scared of good news.",
      "zh": "其实是真的——这是你的工资。把发薪日当诈骗拦下，是连好消息都害怕了。"
    },
    "truthSafe": {
      "en": "Correct. Money arriving in your own account with nothing asked of you is just payday.",
      "zh": "对的。钱进你本人账户、什么都不向你要，就是发薪日。"
    }
  },
  {
    "answer": "safe",
    "risk": 0,
    "difficulty": 3,
    "title": {
      "en": "Colleague Needs the Slide Deck",
      "zh": "同事要份PPT"
    },
    "chan": {
      "en": "Work IM · known account",
      "zh": "办公 IM · 实名账号"
    },
    "sender": {
      "en": "Coworker Zhao (work IM)",
      "zh": "同事小赵（办公IM实名号）"
    },
    "text": {
      "en": "Hey, do you still have last week's project deck?\nClient asked for it. Send it to the shared drive when you can, no rush.",
      "zh": "在不？上周那份项目PPT你那还有吗？\n客户要，方便了传到共享盘就行，不急。"
    },
    "flags": [
      {
        "en": "Surface bait: a coworker asking you to 'send a file' pattern-matches the impersonation-then-malware ask.",
        "zh": "表层诱饵：同事让你「传个文件」，与冒充后投毒的套路撞型。"
      },
      {
        "en": "Safe-tell: it's a colleague's real IM account asking for a routine deck on the internal shared drive — no money, no link, no secrecy.",
        "zh": "安全本质：是同事本人IM实名号，要份常规PPT传到内部共享盘——不涉及钱、无链接、不要保密。"
      },
      {
        "en": "Transferable rule: the leader-impersonation scam needs money + urgency + secrecy + a new account; this has none.",
        "zh": "可迁移原则：冒充领导骗局要「钱+催促+保密+新账号」，这条一项都没有。"
      }
    ],
    "truthScam": {
      "en": "Actually real — a coworker just wants a file for the client. Suspect every 'send me the deck' and teamwork grinds to a halt.",
      "zh": "其实是真的——同事只是要份给客户的文件。每句「把PPT发我」都怀疑，团队协作就停摆了。"
    },
    "truthSafe": {
      "en": "Reasonable to pause — and right to clear it: a known account, an internal file, no money or secrecy. That's just work.",
      "zh": "停一下合理——放行也对：实名号、内部文件、不涉及钱不要保密，就是日常工作。"
    }
  },
  {
    "answer": "safe",
    "risk": 0,
    "difficulty": 2,
    "title": {
      "en": "Order Shipped Update",
      "zh": "订单已发货"
    },
    "chan": {
      "en": "Shopping app push · your order",
      "zh": "购物 App 推送 · 你的订单"
    },
    "sender": {
      "en": "Shopping App",
      "zh": "购物 App"
    },
    "text": {
      "en": "Your order ...3380 has shipped.\nExpected in 2–3 days. Track inside the app.",
      "zh": "您的订单尾号3380已发货。\n预计2–3天送达，可在App内查看物流。"
    },
    "flags": [
      {
        "en": "Surface bait: shipping texts are heavily spoofed in 'your order has a problem, click here' scams.",
        "zh": "表层诱饵：发货短信常被仿冒成「订单异常，点此处理」骗局。"
      },
      {
        "en": "Safe-tell: it's your own shopping app updating a real order — tracking opens in-app, asks nothing of you.",
        "zh": "安全本质：是你本人购物App更新真实订单——物流在App内查看，什么都不向你要。"
      },
      {
        "en": "Transferable rule: order-problem scams push an external link for 'refund/verification'; this only shows tracking.",
        "zh": "可迁移原则：订单异常骗局会推外链让你「退款/验证」，这条只显示物流。"
      }
    ],
    "truthScam": {
      "en": "Actually real — your order's on its way. Block normal shipping updates and you'll never know where your stuff is.",
      "zh": "其实是真的——你的订单在路上。把正常发货提醒拦了，你永远不知道东西到哪了。"
    },
    "truthSafe": {
      "en": "Right. A shipping update in your own app that only shows tracking is genuine.",
      "zh": "对。本人App里只显示物流的发货提醒，是真的。"
    }
  },
  {
    "answer": "safe",
    "risk": 0,
    "difficulty": 2,
    "title": {
      "en": "Landlord Confirms Repair Visit",
      "zh": "房东确认上门维修"
    },
    "chan": {
      "en": "WeChat · your landlord",
      "zh": "微信 · 你的房东"
    },
    "sender": {
      "en": "Landlord Wang",
      "zh": "房东老王"
    },
    "text": {
      "en": "Plumber's coming Sat morning for the kitchen tap, like we talked about.\nAround 10? Let me know if that works.",
      "zh": "上次说的厨房水龙头，周六上午让师傅来修。\n10点左右行不？你看方便不。"
    },
    "flags": [
      {
        "en": "Surface bait: 'someone's coming to your home' raises fake-repairman / fake-landlord fears.",
        "zh": "表层诱饵：「有人要上门」勾起假维修工、假房东的担忧。"
      },
      {
        "en": "Safe-tell: it's your real landlord confirming a repair you already discussed — no deposit, no link, no transfer.",
        "zh": "安全本质：是你真房东确认你俩早商量好的维修——不要押金、无链接、不要转账。"
      },
      {
        "en": "Transferable rule: rental scams demand an urgent deposit to a new account; this just confirms a time.",
        "zh": "可迁移原则：租房骗局会催你往新账号打押金，这条只是约个时间。"
      }
    ],
    "truthScam": {
      "en": "Actually real — it's just scheduling the plumber. Suspect your own landlord and your kitchen tap stays broken.",
      "zh": "其实是真的——只是约师傅。连真房东都怀疑，你那水龙头就一直坏着。"
    },
    "truthSafe": {
      "en": "Good. Your landlord confirming an agreed repair with no money involved is just life admin.",
      "zh": "好。房东确认你俩说好的维修、不涉及钱，就是生活琐事。"
    }
  },
  {
    "answer": "safe",
    "risk": 0,
    "difficulty": 3,
    "title": {
      "en": "HR: Year-End Bonus Schedule",
      "zh": "HR年终奖发放安排"
    },
    "chan": {
      "en": "Company-wide notice · HR account",
      "zh": "全员通知 · HR 实名号"
    },
    "sender": {
      "en": "HR (company notice)",
      "zh": "人事部（全员通知）"
    },
    "text": {
      "en": "Notice to all: year-end bonus will pay to your usual payroll card on the 28th with December salary.\nNo action required; questions to HR.",
      "zh": "全员通知：年终奖将于28号随12月工资发放至各位常用代发卡。\n无需任何操作，如有疑问请咨询人事。"
    },
    "flags": [
      {
        "en": "Surface bait: a bonus announcement reads like the 'claim your year-end reward, enter card info' phishing wave.",
        "zh": "表层诱饵：奖金公告像「领取年终福利，填卡号」那波钓鱼。"
      },
      {
        "en": "Safe-tell: it's a real all-staff HR notice paying to your existing card — no new account, no card entry, no link.",
        "zh": "安全本质：是真实全员HR通知，发到你现有的卡——不要新账号、不要填卡、无链接。"
      },
      {
        "en": "Transferable rule: bonus-phishing makes you 'register your card to receive it'; a real notice pays the card you already use.",
        "zh": "可迁移原则：奖金钓鱼会让你「登记卡片才能领」，真通知发到你早就在用的卡。"
      }
    ],
    "truthScam": {
      "en": "Actually real — it's just the bonus schedule. Block HR's own announcement and you'll be chasing a payment that's already coming.",
      "zh": "其实是真的——只是发奖安排。把HR自己的公告拦了，你反而要去追一笔本就会到的钱。"
    },
    "truthSafe": {
      "en": "Right. An all-staff notice paying your existing card and asking nothing is the real thing.",
      "zh": "对。发到你现有卡、什么都不要的全员通知，是真的。"
    }
  },
  {
    "answer": "safe",
    "risk": 0,
    "difficulty": 3,
    "title": {
      "en": "Manager Approves Your Leave",
      "zh": "经理批了你的请假"
    },
    "chan": {
      "en": "Work IM · known account",
      "zh": "办公 IM · 实名账号"
    },
    "sender": {
      "en": "Manager Lin (work IM)",
      "zh": "林经理（办公IM实名号）"
    },
    "text": {
      "en": "Approved your leave for Fri.\nHand the client follow-up to Zhao before you go. Have a good break.",
      "zh": "你周五的假批了。\n走之前把客户跟进交接给小赵就行，好好休息。"
    },
    "flags": [
      {
        "en": "Surface bait: an unprompted boss DM is the exact shape of the leader-impersonation scam you fear.",
        "zh": "表层诱饵：领导主动私信，正是你提防的冒充领导骗局的形状。"
      },
      {
        "en": "Safe-tell: it's your manager's real account doing normal approval and handover — no money, no secrecy, no new account.",
        "zh": "安全本质：是经理本人实名号做正常审批与交接——不涉及钱、不要保密、没有新账号。"
      },
      {
        "en": "Transferable rule: impersonation needs money + urgency + secrecy + a new account; a leave approval has none.",
        "zh": "可迁移原则：冒充领导要「钱+催促+保密+新账号」，批个假一项都没有。"
      }
    ],
    "truthScam": {
      "en": "Actually real — your boss just approved your day off. Distrust every manager message and you'd reject your own leave.",
      "zh": "其实是真的——领导只是批了你的假。每条领导消息都不信，等于把自己的假也拒了。"
    },
    "truthSafe": {
      "en": "Good read. A known account handling approval and handover, with no money or secrecy, is just management.",
      "zh": "判得好。实名号做审批与交接、不涉及钱不要保密，就是正常管理。"
    }
  }
];

let CASES = [];
const state = { i: 0, saved: 0, lost: 0, correct: 0, answered: 0, trust: 100, lastChoice: null, lastDelta: null, decided: false };
let lang = localStorage.getItem("fd_lang") || ((navigator.language || "en").toLowerCase().startsWith("zh") ? "zh" : "en");
let screenName = "intro";
let timerId = null, timeLeft = 0, roundSeconds = DECISION_SECONDS;

const $ = (id) => document.getElementById(id);
const T = (k) => L[lang][k];
const tc = (o) => o[lang];
const money = (n) => (lang === "zh" ? "¥" : "$") + n.toLocaleString(lang === "zh" ? "zh-CN" : "en-US");
const pad2 = (n) => String(n).padStart(2, "0");

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Draw 5–10 cases. Guarantee the shift is genuinely confusing: it always
// includes at least one ambiguous "decoy-genuine" and one "stealth-scam,"
// plus a plain scam and a plain safe. Then ramp it up — easy first, hard last.
function drawRound() {
  // Deterministic single-case load for video capture / deep-linking.
  // ?case=<index> or ?case=<title substring, en or zh>. No-op for normal play.
  const forced = new URLSearchParams(location.search).get("case");
  if (forced) {
    const q = decodeURIComponent(forced).toLowerCase();
    const c = /^\d+$/.test(q)
      ? LIBRARY[+q]
      : LIBRARY.find((x) => (x.title.en + "|" + x.title.zh).toLowerCase().includes(q));
    if (c) {
      CASES = [c];
      Object.assign(state, { i: 0, saved: 0, lost: 0, correct: 0, answered: 0, trust: 100, decided: false, lastChoice: null, lastDelta: null });
      return;
    }
  }
  const pool = shuffle(LIBRARY.slice());
  const n = Math.min(LIBRARY.length, 5 + Math.floor(Math.random() * 6)); // 5..10
  const dif = (c) => c.difficulty || 1;
  const anchors = [
    (c) => c.answer === "scam" && dif(c) >= 2, // a stealth scam
    (c) => c.answer === "safe" && dif(c) >= 2, // a decoy genuine
    (c) => c.answer === "scam",                // any scam
    (c) => c.answer === "safe",                // any safe
  ];
  const picked = [];
  anchors.forEach((pred) => {
    const c = pool.find((x) => pred(x) && !picked.includes(x));
    if (c) picked.push(c);
  });
  for (const c of pool) { if (picked.length >= n) break; if (!picked.includes(c)) picked.push(c); }
  picked.length = Math.min(picked.length, n);
  // Escalate: ascending difficulty, lightly shuffled within each tier.
  picked.sort((a, b) => (dif(a) - dif(b)) || (Math.random() < 0.5 ? -1 : 1));
  CASES = picked;
  Object.assign(state, { i: 0, saved: 0, lost: 0, correct: 0, answered: 0, trust: 100, decided: false, lastChoice: null, lastDelta: null });
}

function applyLang() {
  document.documentElement.lang = lang;
  localStorage.setItem("fd_lang", lang);
  document.querySelectorAll("#langToggle button").forEach((b) => b.classList.toggle("on", b.dataset.lang === lang));
  document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = T(el.dataset.i18n); });
  document.querySelectorAll("[data-i18n-html]").forEach((el) => { el.innerHTML = T(el.dataset.i18nHtml); });
  syncStats();
  if (screenName === "case") { paintCase(); if (state.decided) renderVerdict(); }
  else if (screenName === "report") { renderReport(); }
}

function buildTicks() {
  const t = $("ticks"); t.innerHTML = "";
  CASES.forEach((_, idx) => {
    const i = document.createElement("i");
    if (idx < state.i) i.className = "done";
    t.appendChild(i);
  });
}

function syncStats() {
  $("statSaved").textContent = money(state.saved);
  $("statLost").textContent = money(state.lost);
  $("statAcc").textContent = `${state.correct}/${state.answered}`;
  const t = $("statTrust");
  if (t) { t.textContent = state.trust + "%"; t.classList.toggle("low", state.trust <= 50); }
}

function show(screen) {
  stopTimer();
  ["introScreen", "caseScreen", "reportScreen"].forEach((s) => $(s).classList.add("hidden"));
  $(screen).classList.remove("hidden");
  screenName = screen === "introScreen" ? "intro" : screen === "caseScreen" ? "case" : "report";
  $("ledger").style.display = screen === "introScreen" ? "none" : "flex";
}

/* ----- decision timer ----- */
function fmtTime(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}
function paintTimer() {
  const pct = Math.max(0, timeLeft) / (roundSeconds * 1000) * 100;
  $("timerFill").style.width = pct + "%";
  $("timerSecs").textContent = fmtTime(timeLeft);
  $("timer").classList.toggle("low", timeLeft <= 5000);
}
function startTimer() {
  stopTimer();
  roundSeconds = caseSeconds(CASES[state.i]);
  timeLeft = roundSeconds * 1000;
  $("timer").style.display = "flex";
  paintTimer();
  timerId = setInterval(() => {
    timeLeft -= 100;
    if (timeLeft <= 0) { timeLeft = 0; paintTimer(); decide(null, true); return; }
    paintTimer();
  }, 100);
}
function stopTimer() { if (timerId) { clearInterval(timerId); timerId = null; } }

/* ----- rendering ----- */
function paintCase() {
  const c = CASES[state.i];
  $("caseKicker").innerHTML = `${T("caseKickerWord")} <b>${pad2(state.i + 1)}</b> / ${pad2(CASES.length)} · ${tc(c.chan)}`;
  $("caseTitle").textContent = tc(c.title);
  $("exhibitTab").textContent = `${T("exhibitWord")} ${String.fromCharCode(65 + state.i)} — ${T("transcriptWord")}`;
  $("caseMessage").innerHTML = tc(c.text);
  $("caseSender").innerHTML = tc(c.sender);
  if (c.risk > 0) { $("atRisk").style.display = "flex"; $("atRiskFig").textContent = money(c.risk); }
  else { $("atRisk").style.display = "none"; }
}

function renderCase() {
  state.decided = false;
  $("caseScreen").classList.remove("decided");
  paintCase();
  $("caseActions").classList.remove("hidden");
  $("rulingPrompt").classList.remove("hidden");
  // Easy cases keep the framing hint; from difficulty 2 up it's gone — you're on your own.
  $("caseHint").classList.toggle("hidden", ((CASES[state.i].difficulty || 1) >= 2));
  $("verdictBox").innerHTML = "";
  buildTicks();
  syncStats();
  show("caseScreen");
  startTimer();
}

function decide(choice, timedOut) {
  if (state.decided) return;
  stopTimer();
  const c = CASES[state.i];
  const right = !timedOut && choice === c.answer;
  state.answered++;
  if (right) state.correct++;
  // Two axes of cost: miss a scam → money bleeds; cry wolf on a real one → trust bleeds.
  state.lastDelta = { money: 0, trust: 0 };
  if (c.answer === "scam") {
    if (right) state.saved += c.risk;
    else { state.lost += c.risk; state.lastDelta.money = -c.risk; }   // missed (or timed out on) a scam
  } else { // genuine
    if (!right) { const p = trustPenalty(c); state.trust = Math.max(0, state.trust - p); state.lastDelta.trust = -p; } // false alarm
  }
  state.decided = true;
  state.lastChoice = timedOut ? "timeout" : choice;
  syncStats();
  renderVerdict();
}

function renderVerdict() {
  const c = CASES[state.i];
  const timedOut = state.lastChoice === "timeout";
  const right = !timedOut && state.lastChoice === c.answer;

  $("caseScreen").classList.add("decided");
  $("caseActions").classList.add("hidden");
  $("rulingPrompt").classList.add("hidden");
  $("caseHint").classList.add("hidden");
  $("timer").style.display = "none";

  const stampKey = timedOut ? "stampTimeout"
    : right ? (c.answer === "scam" ? "stampBlocked" : "stampCleared")
            : (c.answer === "scam" ? "stampMissed" : "stampFalse");
  // Reveal text must match the player's RULING, not just the answer — each case
  // carries both phrasings (truthScam = ruled fraud, truthSafe = ruled genuine).
  // On timeout there's no ruling, so show the wrong-side text (a timeout is never "right").
  const effChoice = timedOut ? (c.answer === "scam" ? "safe" : "scam") : state.lastChoice;
  const truth = tc(effChoice === "scam" ? c.truthScam : c.truthSafe);
  const tells = c.flags.map((f) => `<li>${tc(f)}</li>`).join("");
  const last = state.i === CASES.length - 1;

  // The price of being wrong, spelled out: money on a missed scam, trust on a false alarm.
  let cost = "";
  const d = state.lastDelta || {};
  if (d.money < 0) cost = `<div class="cost money">${T("costLostLbl")} <b>${money(-d.money)}</b></div>`;
  else if (d.trust < 0) cost = `<div class="cost trust">${T("costTrustLbl")} <b>−${-d.trust}%</b></div>`;

  $("verdictBox").innerHTML = `
    <div class="verdict">
      <div class="verdict-head"><span class="stamp ${right ? "ok" : ""}">${T(stampKey)}</span>${cost}</div>
      <div class="kicker tells-kicker">${T("tells")}</div>
      <ol class="tells">${tells}</ol>
      <p class="pull">${truth}</p>
      <div class="next-wrap">
        <button class="linkbtn" id="nextBtn">${last ? T("seeReport") : T("next")}</button>
      </div>
    </div>`;

  $("nextBtn").onclick = () => {
    if (last) renderReport();
    else { state.i++; renderCase(); }
  };
}

function renderReport() {
  state.i = CASES.length;
  buildTicks();
  syncStats();
  $("rSaved").textContent = money(state.saved);
  $("rLost").textContent = money(state.lost);
  $("rAcc").textContent = `${state.correct}/${state.answered}`;
  const rt = $("rTrust");
  if (rt) { rt.textContent = state.trust + "%"; rt.classList.toggle("low", state.trust <= 50); }

  // Two axes decide the grade: you must read the tells AND keep the desk's trust.
  const pct = state.answered ? state.correct / state.answered : 0;
  let grade = "C", lineKey = "gC";
  if (state.trust <= 40) { grade = "D"; lineKey = "gD"; }            // cried wolf too often
  else if (pct === 1 && state.trust >= 90) { grade = "S"; lineKey = "gS"; }
  else if (pct >= 0.8 && state.trust >= 70) { grade = "A"; lineKey = "gA"; }
  else if (pct >= 0.6) { grade = "B"; lineKey = "gB"; }
  $("grade").textContent = grade;
  $("gradeLine").textContent = T(lineKey);
  show("reportScreen");
}

/* ----- wiring ----- */
$("langToggle").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-lang]");
  if (b && b.dataset.lang !== lang) { lang = b.dataset.lang; applyLang(); }
});
$("startBtn").onclick = () => { drawRound(); renderCase(); };
$("replayBtn").onclick = () => { drawRound(); renderCase(); };
$("caseActions").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-choice]");
  if (btn) decide(btn.dataset.choice, false);
});

// Boot
show("introScreen");
applyLang();

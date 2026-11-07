import{e as m,i as L,u as q}from"./account-core.BZTEmI4B.js";import{r as T}from"./mini-markdown.CfxEdaw8.js";import{a as D,b as O}from"./admin-core.3nDWpVUT.js";import{t as y,a as M,r as $,c as A,d as j,b as F,m as H,e as P}from"./ai-assist.DEEkIFgI.js";const r=(e,t="error")=>D("[data-new-msg]",e,t),x=`## 零、一句话总结

（做什么、什么时候交、多少钱，一句话说完）

## 一、任务类型与交付标准

本任务属**工具评测类教程**。正文结构、标题命名、分享权限等格式要求，一律以站内规范为准：

- [教程类任务规范 →](../spec/)

## 二、具体要求

01

02

## 三、账号与开销

制作本教程所需的会员 / 账号由发布方提供，全程零自付开销。

## 四、时间要求

**成品最晚交付时间（DDL）：**

## 五、对标参考

- **标杆范例（请务必先读）：**

## 六、交付流程

1. 完整教程文档
2. 对应的原图 / 配图文件
3. 按规范上传至钉钉总知识库

分享文档链接前，务必把权限打开到「互联网上获得链接的人可阅读」。

## 七、付款说明

**薪酬：** （税前）

**转账方式：** 由跳蛛直接微信转账

**税：** 5%（固定）

**打款时间：** 每月 15 号左右集中打款
`,C=["找人写一篇 OJO 的工具评测教程，8 月 20 号前交，150 元税前，会员我出","想要一支 30 秒的 AI 短片做板块片头，月底前，报酬 300","招人整理一份 Midjourney 角色一致性的实操教程，下周五截止，200 元"],c="admin-new-task",b=["title","summary","fee","deadline","publishedAt","slug","body"],w=b.filter(e=>e!=="publishedAt"),a=document.querySelector("[data-new-task]"),d=document.querySelector("[data-preview-out]"),i=document.querySelector("[data-restored]"),s=e=>a.querySelector(`[name="${e}"]`);a.querySelector('[name="publishedAt"]').value=y();const k=M(a,c,b),I=()=>Object.fromEntries(b.map(e=>[e,s(e).value.trim()])),f=()=>w.some(e=>s(e).value.trim());function p(){a.reset(),s("publishedAt").value=y(),d.hidden=!0,i.hidden=!0,A(c)}const o=$(c);if(o&&!w.some(e=>o.value[e]))A(c);else if(o){for(const[e,t]of Object.entries(o.value))s(e)&&t&&(s(e).value=t);i.hidden=!1,i.innerHTML=`已恢复${m(j(o.savedAt))}没发完的草稿。 <button type="button" class="atw-linkish" data-drop-draft>不要，清空</button>`,i.querySelector("[data-drop-draft]").addEventListener("click",p)}a.querySelector("[data-template]").addEventListener("click",()=>{const e=s("body");if(e.value.trim()){r("正文里已经写了东西，先清空再填模板");return}e.value=x,k.flush(),r("模板填好了，按小节改就行","ok")});a.querySelector("[data-preview]").addEventListener("click",()=>{if(!d.hidden){d.hidden=!0;return}d.innerHTML=T(s("body").value),d.hidden=!1});a.querySelector("[data-clear]").addEventListener("click",()=>{f()&&!confirm("表单里写的东西会全部清掉，确定？")||(p(),r("清空了","ok"))});async function J(){if(!await F())return;const e=document.querySelector("[data-ai-host]");e.hidden=!1;const t=H(e,{lead:"把这份任务用大白话说一句——做什么、什么时候交、多少钱，剩下的它来搭。",placeholder:`例：找人写一篇 OJO 的工具评测教程，8 月 20 号前交，150 元税前，会员我出。
（Ctrl / ⌘ + Enter 直接跑）`,examples:C,actionLabel:"帮我拟一份 →",hint:"出来的是草稿，直接落进下面的表单。<b>它没有的信息一律不编</b>——缺什么会在这儿列出来提醒你补。",async run(l,u){const E=f()?I():null,{draft:S,missing:h}=await P({input:l,today:y(),current:E});for(const[v,g]of Object.entries(S))s(v)&&g&&(s(v).value=g);k.flush(),i.hidden=!0,u.showMissing(h),u.say(h.length?"填好了，下面几处还得你补一句":"填好了，逐项过一眼再发布","ok"),u.setAction("按这段话再改一版 →"),r("")}}),n=()=>t.setAction(f()?"按这段话再改一版 →":"帮我拟一份 →");a.addEventListener("input",n),n()}a.addEventListener("submit",async e=>{e.preventDefault();const t=new FormData(a);r("发布中…","busy");try{const{task:n}=await L("POST","/admin/tasks",{title:t.get("title"),summary:t.get("summary"),fee:t.get("fee"),deadline:t.get("deadline"),publishedAt:t.get("publishedAt"),slug:t.get("slug"),body:t.get("body")});p();const l=q(`tasks/detail/?slug=${encodeURIComponent(n.slug)}`);document.querySelector("[data-new-msg]").innerHTML=`已发布：${m(n.title)} · <a href="${m(l)}">去看看 →</a>`,document.querySelector("[data-new-msg]").dataset.tone="ok"}catch(n){r(n.message)}});async function K(){await O()&&await J()}K();

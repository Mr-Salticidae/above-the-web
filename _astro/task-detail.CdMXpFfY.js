import{g as G,h as E,r as K,i as b,v as U,T as q,e as i,p as S,u as C,l as Q,f as k}from"./account-core.BZTEmI4B.js";import{r as X}from"./mini-markdown.CfxEdaw8.js";import{b as z,r as J,d as V,a as W,c as D,m as Y,f as Z}from"./ai-assist.DEEkIFgI.js";const ee={open:"is-open",taken:"is-taken",done:"is-done",closed:"is-closed"},te=[{label:"思路 + 作品 + 排期",text:"我打算这么做：（两句话说清怎么做）。做过的同类：（贴一个链接）。（几号）前能交。"},{label:"这工具我熟",text:"这个工具我用了（多久），平时拿它做（什么）。这次想（怎么做），（几号）前能交。"},{label:"第一次接，但想做",text:"之前没接过这类，但我做过（相关的什么）。愿意先出一版（什么）给你看，行再往下做。"}];function d(r,...p){return r.reduce((u,c,f)=>u+c+(f<p.length?p[f]:""),"")}async function re(){const r=document.querySelector("[data-task-detail]");if(!r)return;const p=r.hasAttribute("data-dynamic"),u=p?String(new URLSearchParams(location.search).get("slug")||""):r.dataset.slug,c=r.querySelector("[data-claim-panel]"),f=r.querySelector("[data-timeline]"),T=document.querySelector("[data-stub-text]");function L(e){T&&(T.textContent=e)}if(p&&!u){L("这个链接少了任务编号，从任务书列表进来吧。");return}const y=`claim:${u}`;let h=G();const H=E()?z().catch(()=>!1):Promise.resolve(!1);E()&&(h=await K()||h);let $;try{$=await b("GET",`/tasks/${encodeURIComponent(u)}`)}catch(e){p&&L(e.status===404?"这份任务书不存在，或者已经被发布方下架了。":"暂时读不到这份任务书，稍后再试。");return}const M=await H;p&&P($),x($);function P({task:e,body:t}){document.title=e.title?`${e.title} · 蛛网之上`:document.title;const a=r.querySelector("[data-task-title]");a&&(a.textContent=e.title||"任务书");const o=(n,g)=>{const v=r.querySelector(n);if(!v)return;v.hidden=!g;const A=v.querySelector("b");A&&(A.textContent=g)};o("[data-meta-deadline]",U(e.deadline)),o("[data-meta-published]",U(e.publishedAt));const l=r.querySelector("[data-task-body]");l&&(l.innerHTML=X(t)),r.hidden=!1;const s=document.querySelector("[data-task-stub]");s&&(s.hidden=!0)}function x({task:e,events:t,deliveries:a,myClaim:o}){const l=r.querySelector("[data-status-label]");if(l){const n=e.status==="taken"&&e.taker?` · ${e.taker}`:"";l.textContent=(q[e.status]||e.status)+n,l.className=`tm-status ${ee[e.status]||""}`}const s=r.querySelector("[data-crumb-status]");s&&(s.textContent=q[e.status]||e.status),R(e),I(e),j(t,a,e),B(e,o)}function I(e){const t=r.querySelector("[data-deliverable]");if(!t)return;const a=t.querySelector("[data-deliverable-link]");t.hidden=!e.deliverableUrl,a&&e.deliverableUrl&&(a.href=e.deliverableUrl)}function R(e){const t=r.querySelector("[data-meta-fee]");if(t){t.hidden=!e.fee;const o=t.querySelector("b");o&&(o.textContent=e.fee)}const a=r.querySelector("[data-fee-note]");a&&(a.hidden=!e.feeBase,a.textContent=e.feeBase?`报酬已调整：原 ${e.feeBase}${e.feeNote?` · ${e.feeNote}`:""}`:"")}function j(e,t,a){if(!f)return;const o=e.map(n=>{const g=n.from===n.to&&n.note?i(n.note):i(q[n.to]||n.to)+(n.note?`：${i(n.note)}`:"");return d`<li>
        <span class="tl-when">${S(n.createdAt)}</span>
        <span class="tl-what">${g}</span>
      </li>`}),l=t.map(n=>d`<li>
        <span class="tl-when">${S(n.createdAt)}</span>
        <span class="tl-what">交付：<a href="${i(n.url)}" target="_blank" rel="noopener">${i(n.url)}</a></span>
      </li>`),s=[...o,...l];f.innerHTML=s.length?d`<h2 class="tl-title">流转记录</h2><ul class="tl-list">${s.join("")}</ul>`:"",f.hidden=s.length===0,a.status==="closed"&&a.paidAt&&f.insertAdjacentHTML("beforeend",d`<p class="tl-paid">报酬已于 ${S(a.paidAt)} 结清。</p>`)}function B(e,t){if(!c)return;if(c.hidden=!1,e.status!=="open"){if(h&&e.takerUserId===h.id&&["taken","done"].includes(e.status)){c.innerHTML=d`
          <h2 class="cp-title">${e.status==="taken"?"这份任务定给了你":"你已提交交付"}</h2>
          <p class="cp-note">
            ${e.status==="taken"?"做完之后把成稿链接贴在这里，任务会转入「完工待打款」。":"发布方确认后会打款并收官。发现问题可以再提交一次，以最后一次为准。"}
          </p>
          <form class="cp-form" data-deliver>
            <label><span>成稿链接</span><input name="url" type="url" required placeholder="https://" /></label>
            <label><span>补充说明<i>可留空</i></span><input name="note" maxlength="500" /></label>
            <button class="cp-primary" type="submit">提交交付</button>
            <p class="cp-msg" data-cp-msg role="status"></p>
          </form>`,c.querySelector("[data-deliver]").addEventListener("submit",O);return}c.innerHTML=d`
        <p class="cp-closed">
          ${e.status==="taken"?`这份任务已经定给${e.taker?` ${i(e.taker)}`:"其他人"}了。`:e.status==="done"?"已交付，等待发布方确认打款。":"这份任务已经收官。"}
          新的任务书会发在<a href="${C("tasks/")}">任务书列表</a>。
        </p>`;return}if(!h){const n=location.pathname+location.search;c.innerHTML=d`
        <h2 class="cp-title">认领这份任务</h2>
        <p class="cp-note">认领需要登录——任务连着报酬和打款，得能把人对上。读站不需要账号。</p>
        <div class="cp-actions">
          <a class="cp-primary" href="${i(Q(n))}">登录后认领</a>
          <a class="cp-ghost" href="${i(k(n))}">没有账号，去注册</a>
        </div>`;return}if(t&&t.status==="pending"){c.innerHTML=d`
        <h2 class="cp-title">已提交申请</h2>
        <p class="cp-note">${S(t.createdAt)} 提交，等发布方定人。定了会在这里和你的<a href="${C("account/")}">个人中心</a>更新。</p>
        <button class="cp-ghost" type="button" data-withdraw>撤回申请</button>
        <p class="cp-msg" data-cp-msg role="status"></p>`,c.querySelector("[data-withdraw]").addEventListener("click",F);return}const a=t&&t.status==="rejected",o=J(y),l=o?.value.pitch?o:null;c.innerHTML=d`
      <h2 class="cp-title">认领这份任务</h2>
      ${a?d`<p class="cp-note cp-rejected">上次没选上${t.decideNote?`：${i(t.decideNote)}`:""}。改一改再报一次也行。</p>`:d`<p class="cp-note">写清楚你打算怎么做、做过什么同类的东西。发布方定人后会直接联系你。</p>`}
      <div data-ai-host hidden></div>
      ${l?d`<p class="cp-restored">已恢复${i(V(l.savedAt))}写了一半的内容。 <button type="button" class="atw-linkish" data-drop-draft>不要，清空</button></p>`:""}
      <form class="cp-form" data-claim>
        <label>
          <span>自荐说明<i>你的思路、相关作品链接</i></span>
          <textarea name="pitch" rows="4" maxlength="1000">${i(l?.value.pitch||"")}</textarea>
        </label>
        <label>
          <span>联系方式<i>微信号 / QQ / 邮箱</i></span>
          <input name="contact" maxlength="120" value="${i(l?.value.contact||h.contact||"")}" required />
        </label>
        <button class="cp-primary" type="submit">提交认领申请</button>
        <p class="cp-msg" data-cp-msg role="status"></p>
      </form>`;const s=c.querySelector("[data-claim]");s.addEventListener("submit",_),W(s,y,["pitch","contact"]),c.querySelector("[data-drop-draft]")?.addEventListener("click",()=>{s.querySelector('[name="pitch"]').value="",D(y),c.querySelector(".cp-restored").hidden=!0}),M&&N(s)}function N(e){const t=c.querySelector("[data-ai-host]");t&&(t.hidden=!1,Y(t,{lead:"用大白话说说你想怎么做、做过什么，它帮你理成一段自荐。",placeholder:`例：这个工具我用过一阵，打算按「装—用—坑」三段来写，之前做过两期类似教程。下周三前能交。
（Ctrl / ⌘ + Enter 直接跑）`,examples:te,examplesLead:"不知道从哪说起？点一句，把括号换成你的实际情况：",actionLabel:"帮我理一理 →",hint:"理完落进下面的框，发之前自己再读一遍。<b>你没说过的经历它不会替你编</b>——缺什么会列在这儿。",async run(a,o){const{pitch:l,missing:s}=await Z({slug:u,input:a}),n=e.querySelector('[name="pitch"]');n.value=l,n.dispatchEvent(new Event("input",{bubbles:!0})),o.showMissing(s),o.say(s.length?"理好了，下面几处补一句更稳":"理好了，读一遍再提交","ok"),o.setAction("换个说法再理一版 →")}}))}function m(e,t="error"){const a=c.querySelector("[data-cp-msg]");a&&(a.textContent=e,a.dataset.tone=e?t:"")}async function w(){const e=await b("GET",`/tasks/${encodeURIComponent(u)}`);x(e)}async function _(e){e.preventDefault(),m("提交中…","busy");const t=new FormData(e.target);try{await b("POST",`/tasks/${encodeURIComponent(u)}/claim`,{pitch:t.get("pitch"),contact:t.get("contact")}),D(y),await w()}catch(a){m(a.message)}}async function F(){m("撤回中…","busy");try{await b("DELETE",`/tasks/${encodeURIComponent(u)}/claim`),await w()}catch(e){m(e.message)}}async function O(e){e.preventDefault(),m("提交中…","busy");const t=new FormData(e.target);try{await b("POST",`/tasks/${encodeURIComponent(u)}/delivery`,{url:t.get("url"),note:t.get("note")}),await w()}catch(a){m(a.message)}}}export{re as h};

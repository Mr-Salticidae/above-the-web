import{i as p,T as v,e as d,p as f}from"./account-core.BZTEmI4B.js";import{s as o,l as $,t as w,b as h,a as m,c as k}from"./admin-core.3nDWpVUT.js";function S(s){const t=document.querySelector("[data-tasks]");if(!s.length){t.innerHTML='<p class="atw-empty">库里还没有任务，去「新建任务书」发一份，或点右上角「同步任务清单」。</p>';return}t.innerHTML=s.map(e=>{const a=Object.entries(v).map(([l,i])=>`<option value="${l}"${l===e.status?" selected":""}>${i}</option>`).join(""),n=e.listed?"":e.source==="web"?" · 已下架":" · markdown 已删除",r=e.source==="web"?`<button class="atw-ghost" type="button" data-edit>编辑正文</button>
               <button class="atw-ghost" type="button" data-toggle-listed>${e.listed?"下架":"重新上架"}</button>
               <button class="atw-ghost" type="button" data-export>导出 md</button>`:"";return`<article class="ad-task${e.listed?"":" is-unlisted"}" data-slug="${d(e.slug)}">
          <div class="ad-task-head">
            <a href="${w(e)}">${d(e.title||e.slug)}</a>
            <span class="ad-task-meta">${e.source==="web"?"站内新建 · ":""}${d(e.fee||"")}${e.feeBase?`（原 ${d(e.feeBase)}）`:""}${e.deadline?` · 截止 ${d(e.deadline)}`:""}${n}</span>
          </div>
          <div class="ad-task-row">
            <select data-status>${a}</select>
            <input class="ad-inline-input" data-taker value="${d(e.taker||"")}" placeholder="承接人（无账号时手填）" maxlength="32" />
            <input class="ad-inline-input" data-deliverable value="${d(e.deliverableUrl||"")}" placeholder="成稿链接" />
            <input class="ad-inline-input" data-note placeholder="备注（写进流转记录）" maxlength="500" />
            <button class="atw-ghost" type="button" data-save>保存</button>
          </div>
          <div class="ad-task-row">
            <button class="atw-ghost" type="button" data-fee>调整报酬</button>
            ${r}
          </div>
          <div class="ad-fee-box" data-fee-box hidden></div>
          <div class="ad-task-edit" data-edit-box hidden></div>
          <p class="ad-task-stamp">
            ${e.pendingClaims?`${e.pendingClaims} 人在申请 · `:""}
            ${e.claimedAt?`定人 ${f(e.claimedAt)} · `:""}
            ${e.deliveredAt?`交付 ${f(e.deliveredAt)} · `:""}
            ${e.paidAt?`打款 ${f(e.paidAt)}`:""}
          </p>
        </article>`}).join(""),t.querySelectorAll("[data-slug]").forEach(e=>{const a=s.find(n=>n.slug===e.dataset.slug);e.querySelector("[data-save]").addEventListener("click",()=>y(a.slug,{status:e.querySelector("[data-status]").value,takerName:e.querySelector("[data-taker]").value,deliverableUrl:e.querySelector("[data-deliverable]").value,note:e.querySelector("[data-note]").value},"已保存")),e.querySelector("[data-fee]").addEventListener("click",()=>x(e,a)),a.source==="web"&&(e.querySelector("[data-edit]").addEventListener("click",()=>L(e,a)),e.querySelector("[data-toggle-listed]").addEventListener("click",()=>y(a.slug,{listed:!a.listed},a.listed?"已下架":"已重新上架")),e.querySelector("[data-export]").addEventListener("click",()=>q(a)))})}async function y(s,t,e){o("保存中…","busy");try{await p("PATCH",`/admin/tasks/${encodeURIComponent(s)}`,t),o(e,"ok"),await b()}catch(a){o(a.message)}}function x(s,t){const e=s.querySelector("[data-fee-box]");if(!e.hidden){e.hidden=!0,e.innerHTML="";return}const a=t.feeBase||t.fee||"";e.hidden=!1,e.innerHTML=`<form class="atw-form" data-fee-form>
      <p class="ad-fee-now">当前：<b>${d(t.fee||"未定")}</b>${t.feeBase?` <span>（原 ${d(t.feeBase)}${t.feeNote?` · ${d(t.feeNote)}`:""}）</span>`:""}</p>
      <div class="ad-new-row">
        <label>
          <span>在原价上加<i>报销、加急费；填负数就是减</i></span>
          <input name="delta" type="number" step="1" inputmode="decimal" />
        </label>
        <label>
          <span>或直接写新报酬<i>填了这栏就以它为准</i></span>
          <input name="override" maxlength="40" placeholder="${d(a)}" />
        </label>
      </div>
      <label>
        <span>事由<i>写进流转记录，承接人在任务页看得到</i></span>
        <input name="feeNote" maxlength="120" value="${d(t.feeNote||"")}" placeholder="报销 40 元会员费" />
      </label>
      <p class="ad-fee-preview" data-fee-preview></p>
      <div class="ad-new-actions">
        <button class="atw-primary" type="submit">保存调整</button>
        ${t.feeBase?'<button class="atw-ghost" type="button" data-fee-reset>撤销调整</button>':""}
        <button class="atw-ghost" type="button" data-fee-cancel>收起</button>
      </div>
      <p class="atw-msg" data-fee-msg role="status"></p>
    </form>`;const n=e.querySelector("[data-fee-form]"),r=e.querySelector("[data-fee-preview]"),l=()=>{const c=n.querySelector('[name="override"]').value.trim();if(c)return c;const u=n.querySelector('[name="delta"]').value.trim();return u?k(a,u):""},i=()=>{const c=l();if(n.querySelector('[name="delta"]').value.trim()&&!c){r.textContent=`「${a||"空"}」里没有可加减的数字，请直接写新报酬`,r.dataset.tone="error";return}r.dataset.tone="",r.textContent=c?`${a||"未定"} → ${c}`:""};n.addEventListener("input",i),i(),e.querySelector("[data-fee-cancel]").addEventListener("click",()=>{e.hidden=!0,e.innerHTML=""}),e.querySelector("[data-fee-reset]")?.addEventListener("click",()=>y(t.slug,{feeOverride:""},"已撤销调整，报酬回到任务书里的数")),n.addEventListener("submit",async c=>{c.preventDefault();const u=l();if(!u){m("[data-fee-msg]","填个加减金额，或者直接写新报酬");return}m("[data-fee-msg]","保存中…","busy");try{await p("PATCH",`/admin/tasks/${encodeURIComponent(t.slug)}`,{feeOverride:u,feeNote:n.querySelector('[name="feeNote"]').value}),o(`报酬已调整为 ${u}`,"ok"),await b()}catch(g){m("[data-fee-msg]",g.message)}})}async function L(s,t){const e=s.querySelector("[data-edit-box]");if(!e.hidden){e.hidden=!0,e.innerHTML="";return}e.hidden=!1,e.innerHTML='<p class="atw-empty">读取正文…</p>';let a;try{a=await p("GET",`/tasks/${encodeURIComponent(t.slug)}`)}catch(r){e.innerHTML=`<p class="atw-empty">${d(r.message)}</p>`;return}const n=a.task;e.innerHTML=`<form class="atw-form" data-edit-form>
      <label><span>标题</span><input name="title" maxlength="80" required value="${d(n.title)}" /></label>
      <label><span>一句话摘要</span><textarea name="summary" rows="2" maxlength="200" required>${d(n.summary)}</textarea></label>
      <div class="ad-new-row">
        <label><span>报酬<i>任务书上写的数；临时加钱用「调整报酬」</i></span><input name="fee" maxlength="40" value="${d(n.feeBase||n.fee)}" /></label>
        <label><span>截止日期</span><input name="deadline" type="date" value="${d(n.deadline)}" /></label>
        <label><span>发布日期</span><input name="publishedAt" type="date" value="${d(n.publishedAt)}" /></label>
      </div>
      <label><span>正文<i>markdown</i></span><textarea name="body" rows="16" maxlength="20000" required>${d(a.body)}</textarea></label>
      <div class="ad-new-actions">
        <button class="atw-primary" type="submit">保存正文</button>
        <button class="atw-ghost" type="button" data-cancel>收起</button>
      </div>
      <p class="atw-msg" data-edit-msg role="status"></p>
    </form>`,e.querySelector("[data-cancel]").addEventListener("click",()=>{e.hidden=!0,e.innerHTML=""}),e.querySelector("[data-edit-form]").addEventListener("submit",async r=>{r.preventDefault();const l=new FormData(r.target);m("[data-edit-msg]","保存中…","busy");try{await p("PATCH",`/admin/tasks/${encodeURIComponent(t.slug)}`,{title:l.get("title"),summary:l.get("summary"),fee:l.get("fee"),deadline:l.get("deadline"),publishedAt:l.get("publishedAt"),body:l.get("body")}),o("正文已更新","ok"),await b()}catch(i){m("[data-edit-msg]",i.message)}})}async function q(s){o("导出中…","busy");try{const{task:t,body:e}=await p("GET",`/tasks/${encodeURIComponent(s.slug)}`),a=i=>JSON.stringify(String(i??"")),n=["---",`title: ${a(t.title)}`,`summary: ${a(t.summary)}`,`date: ${t.publishedAt}`,...t.deadline?[`deadline: ${t.deadline}`]:[],...t.feeBase||t.fee?[`fee: ${a(t.feeBase||t.fee)}`]:[],`status: ${t.status}`,...t.taker?[`taker: ${a(t.taker)}`]:[],"---","",""],r=new Blob([`${n.join(`
`)}${e.trim()}
`],{type:"text/markdown;charset=utf-8"}),l=document.createElement("a");l.href=URL.createObjectURL(r),l.download=`${t.publishedAt}-${t.slug}.md`,l.click(),URL.revokeObjectURL(l.href),o("已导出，放进 src/data/tasks/ 提交即可（同步后由 md 接管）","ok")}catch(t){o(t.message)}}document.querySelector("[data-sync]").addEventListener("click",async()=>{o("同步中…","busy");try{const{sync:s}=await p("POST","/admin/tasks/sync");o(`同步完成：新增 ${s.created}、刷新 ${s.updated}、下架 ${s.delisted}`+(s.adopted?`，其中 ${s.adopted} 份改由 md 接管`:""),"ok"),await b()}catch(s){o(s.message)}});async function b(){const{tasks:s}=await $();S(s)}async function T(){if(await h())try{await b()}catch(s){o(s.message)}}T();

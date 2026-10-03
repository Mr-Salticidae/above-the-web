import{e,p as u,i as p}from"./account-core.BZTEmI4B.js";import{b as m,s as c,l as y,t as g}from"./admin-core.3nDWpVUT.js";function h({pendingClaims:a,tasks:s}){document.querySelector("[data-pending-count]").textContent=a.length?`· ${a.length}`:"";const n=document.querySelector("[data-pending]");if(!a.length){n.innerHTML='<p class="atw-empty">没有待处理的申请。</p>';return}const i=Object.fromEntries(s.map(t=>[t.slug,t]));n.innerHTML=a.map(t=>`<article class="ad-claim" data-claim-id="${e(t.id)}">
          <div class="ad-claim-head">
            <a href="${g(i[t.taskSlug]||{slug:t.taskSlug,source:"md"})}">${e(t.taskTitle||t.taskSlug)}</a>
            <span class="ad-claim-date">${u(t.createdAt)}</span>
          </div>
          <p class="ad-claim-who"><b>${e(t.user)}</b> @${e(t.username)} · ${e(t.contact||"未填联系方式")}</p>
          ${t.pitch?`<p class="ad-claim-pitch">${e(t.pitch)}</p>`:""}
          <div class="ad-claim-actions">
            <input class="ad-inline-input" data-note placeholder="给对方的留言（可留空）" maxlength="500" />
            <button class="atw-primary" type="button" data-accept>定给他</button>
            <button class="atw-ghost" type="button" data-reject>不选</button>
          </div>
        </article>`).join(""),n.querySelectorAll("[data-claim-id]").forEach(t=>{const o=t.dataset.claimId,r=()=>t.querySelector("[data-note]").value;t.querySelector("[data-accept]").addEventListener("click",()=>l(o,"accept",r())),t.querySelector("[data-reject]").addEventListener("click",()=>l(o,"reject",r()))})}async function l(a,s,n){c("处理中…","busy");try{await p("POST",`/admin/claims/${encodeURIComponent(a)}/${s}`,{note:n}),c(s==="accept"?"已定人":"已标记落选","ok"),await d()}catch(i){c(i.message)}}async function d(){h(await y())}async function b(){if(await m())try{await d()}catch(a){c(a.message)}}b();

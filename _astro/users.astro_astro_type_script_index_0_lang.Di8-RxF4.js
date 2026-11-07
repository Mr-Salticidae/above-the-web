import{i as c,e as s,n as g}from"./account-core.BZTEmI4B.js";import{b,s as d}from"./admin-core.3nDWpVUT.js";function $(e){document.querySelector("[data-user-count]").textContent=e.length?`· ${e.length}`:"";const o=document.querySelector("[data-users]");o.innerHTML=e.map(t=>`<article class="ad-user" data-user-id="${s(t.id)}">
          <div>
            <p class="ad-user-name"><b>${s(t.display_name)}</b> @${s(t.username)}${t.role==="admin"?" · 发布方":""}${t.status==="suspended"?" · 已停用":""}</p>
            <p class="ad-user-meta">${s(t.email)}${t.contact?` · ${s(t.contact)}`:""}${t.payee?` · 收款 ${s(t.payee)}`:""}</p>
          </div>
          <div class="ad-user-actions">
            <button class="atw-ghost" type="button" data-reset-link ${t.status==="active"?"":"disabled"}>重置链接</button>
            <button class="atw-ghost" type="button" data-toggle-role>${t.role==="admin"?"降为成员":"设为发布方"}</button>
            <button class="atw-ghost" type="button" data-toggle-status>${t.status==="active"?"停用":"恢复"}</button>
          </div>
          <p class="ad-reset-out" data-reset-out hidden></p>
        </article>`).join(""),o.querySelectorAll("[data-user-id]").forEach(t=>{const a=e.find(r=>r.id===t.dataset.userId);t.querySelector("[data-toggle-role]").addEventListener("click",()=>m(a.id,{role:a.role==="admin"?"member":"admin",status:a.status})),t.querySelector("[data-toggle-status]").addEventListener("click",()=>m(a.id,{role:a.role,status:a.status==="active"?"suspended":"active"})),t.querySelector("[data-reset-link]").addEventListener("click",async r=>{const n=t.querySelector("[data-reset-out]");r.target.disabled=!0,n.hidden=!1,n.textContent="生成中…";try{const{url:i,expiresAt:y}=await c("POST",`/admin/users/${a.id}/reset-link`);n.innerHTML=`<code>${s(i)}</code>
            <span class="ad-reset-hint">${g(y)} 前有效，只能用一次，发给本人就行。</span>`;const l=document.createRange();l.selectNodeContents(n.querySelector("code"));const u=window.getSelection();u.removeAllRanges(),u.addRange(l)}catch(i){n.textContent=i.message}finally{r.target.disabled=!1}})})}async function m(e,o){d("更新中…","busy");try{await c("PATCH",`/admin/users/${encodeURIComponent(e)}`,o),d("已更新","ok"),await p()}catch(t){d(t.message)}}async function p(){const{users:e}=await c("GET","/admin/users");$(e)}async function h(){if(await b())try{await p()}catch(e){d(e.message)}}h();

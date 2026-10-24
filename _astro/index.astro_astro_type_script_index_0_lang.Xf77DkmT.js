import{i as o,k,a as m,l as d,s as q,m as T,u as r,R as A,b,e as n,d as $,c as E,n as H,p as y,h as M,q as w,g as I,r as U,T as B}from"./account-core.BZTEmI4B.js";const C={pending:"等发布方定人",accepted:"已定给你",rejected:"没选上",withdrawn:"你已撤回"};let u=null;function c(t,a,e="error"){const s=document.querySelector(`[data-msg="${t}"]`);s&&(s.textContent=a,s.dataset.tone=a?e:"")}const N=["overview","profile","security"];function f(t){const a=N.includes(t)?t:"overview";document.querySelectorAll("[data-tab]").forEach(e=>{const s=e.dataset.tab===a;e.classList.toggle("is-active",s),e.setAttribute("aria-selected",String(s))}),document.querySelectorAll("[data-panel]").forEach(e=>{e.hidden=e.dataset.panel!==a})}document.querySelectorAll("[data-tab]").forEach(t=>{t.addEventListener("click",()=>{f(t.dataset.tab),history.replaceState(null,"",`#${t.dataset.tab}`)})});function S(){const t=location.hash.replace("#","");return t==="claims"?"overview":t}window.addEventListener("hashchange",()=>f(S()));function p(t){const a=t.role==="admin"?`<span class="acct-badge">${A.admin}</span>`:"";document.querySelector("[data-identity]").innerHTML=`${b(t,"xl")}
      <div class="acc-id-text">
        <h1>${n($(t))}${a}</h1>
        <p class="acc-id-sub">@${n(t.username)} · ${n(t.email)}</p>
      </div>`;const e=document.querySelector("[data-admin-link]");e.hidden=t.role!=="admin",e.href=r("admin/"),document.querySelector("[data-add-account]").href=d(location.pathname,{add:!0});const s=document.querySelector('[data-form="profile"]');s.username.value=t.username,s.displayName.value=t.display_name||"",s.contact.value=t.contact||"",s.payee.value=t.payee||"",s.bio.value=t.bio||""}function g(t,a){const e=a.filter(l=>l.status==="accepted").length,s=a.filter(l=>l.status==="pending").length,i=[t.contact?"":"联系方式",t.payee?"":"收款方式"].filter(Boolean),L=i.length?`<a class="acc-stat is-todo" href="#profile">还差${i.join("、")}<span>去补上 →</span></a>`:"";document.querySelector("[data-stats]").innerHTML=`
      <div class="acc-stat"><b>${a.length}</b><span>累计申请</span></div>
      <div class="acc-stat"><b>${s}</b><span>等定人</span></div>
      <div class="acc-stat"><b>${e}</b><span>已定给你</span></div>
      <div class="acc-stat is-date"><b>${y(t.created_at)||"—"}</b><span>注册于</span></div>
      ${L}`}function P(t){const a=document.querySelector("[data-claims]");if(!t.length){a.innerHTML=`<p class="atw-empty">还没有认领记录。去<a href="${r("tasks/")}">任务书</a>看看有什么在招。</p>`;return}a.innerHTML=t.map(e=>{const s=r(`tasks/${e.taskSlug}/`),i=e.decideNote?`<p class="atw-claim-note">发布方留言：${n(e.decideNote)}</p>`:"";return`<article class="atw-claim">
          <div class="atw-claim-top">
            <span class="atw-claim-status is-${e.status}">${C[e.status]||e.status}</span>
            <span class="atw-claim-date">${y(e.createdAt)} 申请</span>
          </div>
          <h3><a href="${s}">${n(e.taskTitle||e.taskSlug)}</a></h3>
          <p class="atw-claim-meta">
            任务当前：${B[e.taskStatus]||e.taskStatus}
            ${e.taskFee?` · ${n(e.taskFee)}`:""}
          </p>
          ${i}
        </article>`}).join("")}function _(t){const a=document.querySelector("[data-sessions]");if(!t.length){a.innerHTML='<p class="atw-empty">没有其它登录中的会话。</p>';return}a.innerHTML=t.map(e=>`<div class="acc-session${e.current?" is-current":""}">
          <div>
            <p class="acc-session-name">${e.current?"当前设备":"另一处登录"}</p>
            <p class="acc-session-meta">${H(e.createdAt)} 登录 · ${y(e.expiresAt)} 到期</p>
          </div>
          <button class="atw-ghost" type="button" data-revoke="${n(e.id)}">${e.current?"退出这台":"退掉"}</button>
        </div>`).join("")}function h(){const t=E();document.querySelector("[data-accounts]").innerHTML=t.map(a=>`<div class="acc-account${a.isActive?" is-current":""}">
          ${b(a.user)}
          <div class="acc-account-text">
            <p class="acc-account-name">${n($(a.user))}${a.isActive?'<span class="acc-account-tag">当前</span>':""}</p>
            <p class="acc-account-sub">@${n(a.user.username)}</p>
          </div>
          ${a.isActive?"":`<span class="acc-account-actions">
                  <button class="atw-ghost" type="button" data-switch="${n(a.userId)}">切到这个</button>
                  <button class="atw-ghost" type="button" data-forget="${n(a.userId)}">移除</button>
                </span>`}
        </div>`).join("")}document.querySelector('[data-form="profile"]').addEventListener("submit",async t=>{t.preventDefault(),c("profile","保存中…","busy");const a=t.target;try{const{user:e}=await o("PATCH","/profile",{displayName:a.displayName.value,contact:a.contact.value,payee:a.payee.value,bio:a.bio.value});u=e,k(e),p(e),h(),c("profile","已保存","ok")}catch(e){c("profile",e.message)}});document.querySelector('[data-form="password"]').addEventListener("submit",async t=>{t.preventDefault(),c("password","更新中…","busy");try{await o("POST","/auth/password",{currentPassword:t.target.currentPassword.value,newPassword:t.target.newPassword.value}),t.target.reset(),c("password","密码已更新，其它设备已退出","ok"),v()}catch(a){c("password",a.message)}});document.querySelector("[data-sessions]").addEventListener("click",async t=>{const a=t.target.closest("[data-revoke]");if(a){a.disabled=!0,c("sessions","处理中…","busy");try{const{current:e}=await o("DELETE",`/auth/sessions/${encodeURIComponent(a.dataset.revoke)}`);if(e){await m(),location.href=d(location.pathname);return}c("sessions","已退出那一处登录","ok"),v()}catch(e){a.disabled=!1,c("sessions",e.message)}}});document.querySelector("[data-accounts]").addEventListener("click",async t=>{const a=t.target.closest("[data-switch]");if(a){a.disabled=!0,c("accounts","切换中…","busy"),await q(a.dataset.switch)?location.reload():location.href=d(location.pathname);return}const e=t.target.closest("[data-forget]");e&&(T(e.dataset.forget),h(),c("accounts","已从这台机器上移除","ok"))});document.querySelector("[data-logout]").addEventListener("click",async t=>{t.target.disabled=!0;const{remaining:a}=await m();location.href=a?d(""):r("")});document.querySelector("[data-logout-all]").addEventListener("click",async t=>{confirm("退出所有设备？这个账号在别处的登录会立刻作废。")&&(t.target.disabled=!0,await m({everywhere:!0}),location.href=r(""))});async function v(){try{const{sessions:t}=await o("GET","/auth/sessions");_(t)}catch{document.querySelector("[data-sessions]").innerHTML='<p class="atw-empty">会话列表暂时读不到。</p>'}}async function j(){if(!M()){w();return}const t=I();t&&(u=t,p(t),document.querySelector('[data-view="loading"]').hidden=!0,document.querySelector('[data-view="ready"]').hidden=!1);const a=await U();if(!a){w();return}u=a,p(a),h(),f(S()),document.querySelector('[data-view="loading"]').hidden=!0,document.querySelector('[data-view="ready"]').hidden=!1,location.hash==="#claims"&&document.getElementById("claims")?.scrollIntoView({block:"start"});try{const{claims:e}=await o("GET","/my/claims");P(e),g(a,e)}catch{document.querySelector("[data-claims]").innerHTML='<p class="atw-empty">认领记录暂时读不到，刷新试试。</p>',g(a,[])}v()}j();

import{j as y,m as P,a as T,l as v,s as G,n as _,u as l,i as F,R as g,b as B,e as r,d as j,c as J,p as K,q as E,h as V,t as x,g as W,r as Y,T as z}from"./account-core.Dei-M62E.js";import{c as Q,G as S,P as X,a as Z,r as O,m as tt}from"./features.CV3-d4zW.js";const et={pending:"等发布方定人",accepted:"已定给你",rejected:"没选上",withdrawn:"你已撤回"};let p=null;function d(t,e,a="error"){const s=document.querySelector(`[data-msg="${t}"]`);s&&(s.textContent=e,s.dataset.tone=e?a:"")}const at=["overview","profile","security"];function L(t){const e=at.includes(t)?t:"overview";document.querySelectorAll("[data-tab]").forEach(a=>{const s=a.dataset.tab===e;a.classList.toggle("is-active",s),a.setAttribute("aria-selected",String(s))}),document.querySelectorAll("[data-panel]").forEach(a=>{a.hidden=a.dataset.panel!==e})}document.querySelectorAll("[data-tab]").forEach(t=>{t.addEventListener("click",()=>{L(t.dataset.tab),history.replaceState(null,"",`#${t.dataset.tab}`)})});function U(){const t=location.hash.replace("#","");return t==="claims"?"overview":t}window.addEventListener("hashchange",()=>L(U()));function q(t){const a=t.role==="dm"?`<span class="acct-badge is-dm">${g.dm}</span>`:t.role==="admin"?`<span class="acct-badge">${g.admin}</span>`:`<span class="acct-badge is-reader">${g.member}</span>`;document.querySelector("[data-identity]").innerHTML=`${B(t,"xl")}
      <div class="acc-id-text">
        <h1>${r(j(t))}${a}</h1>
        <p class="acc-id-sub">@${r(t.username)} · ${r(t.email)}</p>
      </div>`;const s=document.querySelector("[data-admin-link]");s.hidden=t.role!=="admin",s.href=l("admin/"),document.querySelector("[data-add-account]").href=v(location.pathname,{add:!0});const c=document.querySelector('[data-form="profile"]');c.username.value=t.username,c.displayName.value=t.display_name||"",c.contact.value=t.contact||"",c.payee.value=t.payee||"",c.bio.value=t.bio||""}const k=(()=>{try{return JSON.parse(document.getElementById("juben-cases")?.textContent||"[]")||[]}catch{return[]}})(),u=Q({cases:k,owner:S});u.boot();let f=null,n=null,I=null,H=null;function M(t){const e=document.querySelector("[data-sync-card]");if(!e||!t)return;const a=e.querySelector("[data-sync-when]");a&&(a.textContent=t.lastSyncAt?O(t.lastSyncAt):t.state==="syncing"?"同步中…":"还没同步过");const s=e.querySelector("[data-sync-pending]");s&&(s.textContent=t.pending?`${t.pending} 项`:"0 项");const c=e.querySelector("[data-sync-devices]");c&&(c.textContent=t.devices?`${t.devices} 台`:"这台");const i=e.querySelector("[data-sync-wipe]");i&&(i.disabled=t.state==="syncing")}function st(){const t=k.map(o=>{const m=u.count(o.id),w=Array.isArray(o.modules)?o.modules.length:0;return{id:o.id,title:o.title,done:m,total:w,next:o.modules.find(D=>!u.isDone(o.id,D))||o.modules[0],pct:w?Math.min(100,Math.round(m/w*100)):0}}),e=t.reduce((o,m)=>o+m.done,0),a=t.reduce((o,m)=>o+m.total,0),s=a?Math.round(e/a*100):0,c=t.map(o=>`<a class="acc-vault-row" href="${l("juben/")}?case=${encodeURIComponent(o.id)}&module=${encodeURIComponent(o.next)}">
          <span class="acc-vault-name">${r(o.title)}</span>
          <span class="acc-vault-bar"><i style="width:${o.pct}%"></i></span>
          <span class="acc-vault-num">${o.done}/${o.total}</span>
        </a>`).join(""),i=n&&n.enabled?"进度跟着账号走：换台设备登录同一个账号，勾选原样接着读。":"进度记在这台机器上的这个账号里，换设备暂时不跟着走。";return`<section class="acc-home-block">
        <h2>我的档案库 <button class="acc-sync" type="button" id="acc-sync-badge" hidden>本机记录</button> <a class="acc-home-more" href="${l("juben/")}">进档案库 →</a></h2>
        <p class="acc-note">${i}点卷名直接从那一卷接着读。</p>
        <div class="acc-vault-total">
          <b>${s}%</b>
          <span>全部学习项完成 · ${e}/${a}</span>
        </div>
        <div class="acc-vault-rows">${c||'<p class="atw-empty">暂时没有可读的卷宗。</p>'}</div>
        ${R()}
        <div class="acc-invite">
          <p class="acc-invite-label">我的邀请码</p>
          <code id="acc-invite-code">${r(f?f.code:"……")}</code>
          <button class="atw-ghost" type="button" data-copy-invite>复制</button>
          <p class="acc-invite-hint">交给值得信任的准 DM；每带一人进门，传承就长一格。</p>
        </div>
        ${nt()}
      </section>`}function R(){const t=u.lastReading();if(!t)return"";const e=k.find(i=>i.id===t.caseId),a=e?.title||t.caseId,s=e?.modules.find(i=>!u.isDone(t.caseId,i))||e?.modules[0],c=`${l("juben/")}?case=${encodeURIComponent(t.caseId)}${s?`&module=${encodeURIComponent(s)}`:""}`;return`<p class="acc-resume">上次读到《${r(a)}》 · ${O(t.at)}
      <a href="${c}">接着读 →</a></p>`}function nt(){return!n||!n.enabled?`<div class="acc-sync-card is-local" data-sync-card="local">
        <p class="acc-sync-title">进度目前只记在这台机器上</p>
        <p class="acc-sync-hint">跨设备同步关着（服务端开关或接口版本所致）；勾选照旧有效，只是不跟着账号走。</p>
        <div class="acc-sync-actions">
          <button class="atw-ghost" type="button" data-sync-wipe>清空本机进度</button>
        </div>
        <p class="acc-sync-hint" data-sync-hint></p>
      </div>`:`<div class="acc-sync-card" data-sync-card="cloud">
      <div class="acc-sync-facts">
        <p><span>上次同步</span><b data-sync-when>—</b></p>
        <p><span>待同步</span><b data-sync-pending>0 项</b></p>
        <p><span>记录过的设备</span><b data-sync-devices>—</b></p>
      </div>
      <div class="acc-sync-actions">
        <button class="atw-ghost" type="button" data-sync-now>立即同步</button>
        <button class="atw-ghost" type="button" data-sync-wipe>清空全部进度</button>
      </div>
      <p class="acc-sync-hint">勾选先存本机，联网后自动对账。同一账号在别的设备上打开，会接着同一处读。</p>
      <p class="acc-sync-hint" data-sync-hint></p>
    </div>`}function ct(){return`<section class="acc-home-block">
        <h2>你手上还没有剧本档案</h2>
        <p class="acc-note">
          剧本的答案、组织者手册、结局解析都不在公开页上。DM 身份是传出来的——
          找一位已经在带本的朋友要一枚邀请码，在剧本研究室兑换即可，不用另外申请。
        </p>
        <p class="acc-home-actions">
          <a class="atw-primary" href="${l("juben/")}">去剧本研究室</a>
          <a class="atw-ghost" href="${l("notes/")}">翻笔记</a>
        </p>
        <p class="acc-note">
          读者身份现在就能用：笔记全文搜索、在笔记里对着「小织」追问，以及分栏订阅。
          兑换邀请码的表单也在剧本研究室里，登录后就能看到。
        </p>
        ${R()}
      </section>`}function h(t){const e=document.querySelector("[data-home]");if(!e)return;const a=F(t);if(n&&n.setOwner(t.id||S),u.setOwner(t.id||S),u.adoptGuest(),n&&n.note(),e.innerHTML=a?st():ct(),a&&n){const s=e.querySelector("#acc-sync-badge");s&&(s.hidden=!1,I?.(),I=tt(s,n))}n&&(M(n.status()),H?.(),H=n.subscribe(M)),a&&!f&&y("GET","/dm/invite").then(s=>{f=s.invite;const c=document.getElementById("acc-invite-code");c&&f&&(c.textContent=f.code)}).catch(()=>{})}document.addEventListener("click",async t=>{const e=t.target.closest("[data-copy-invite]");if(!e)return;const a=document.getElementById("acc-invite-code")?.textContent.trim()||"";try{await navigator.clipboard.writeText(a),e.textContent="已复制"}catch{e.textContent="复制失败"}setTimeout(()=>{e.textContent="复制"},1500)});const ot=()=>n&&n.enabled?"清空全部进度":"清空本机进度";let b=!1,$=null;document.addEventListener("click",async t=>{const e=t.target.closest("[data-sync-now]");if(e){if(!n)return;e.disabled=!0,await n.syncNow(),e.disabled=!1;const i=document.querySelector("[data-sync-hint]");i&&(i.textContent=["error","pending"].includes(n.status().state)?"这次没对上，检查网络后再点一次。":"已对齐。别的设备上的改动也一并取回来了。");return}const a=t.target.closest("[data-sync-wipe]");if(!a)return;if(!b){b=!0,a.dataset.armed="1",a.textContent="真的清空？再点一次",clearTimeout($),$=setTimeout(()=>{b=!1;const i=document.querySelector("[data-sync-wipe]");i&&(delete i.dataset.armed,i.textContent=ot())},4e3);return}b=!1,clearTimeout($),a.disabled=!0,a.textContent="清空中…";let s=!0;n&&n.enabled?s=await n.reset():u.clearAll(),h(p);const c=document.querySelector("[data-sync-hint]");c&&(c.textContent=s?n&&n.enabled?"已清空。别的设备下次打开会跟着归零。":"已清空本机记录。":"清空失败：本机记录和待同步内容都还在。请检查网络后重试。")});function N(t,e){const a=e.filter(o=>o.status==="accepted").length,s=e.filter(o=>o.status==="pending").length,c=[t.contact?"":"联系方式",t.payee?"":"收款方式"].filter(Boolean),i=c.length?`<a class="acc-stat is-todo" href="#profile">还差${c.join("、")}<span>去补上 →</span></a>`:"";document.querySelector("[data-stats]").innerHTML=`
      <div class="acc-stat"><b>${e.length}</b><span>累计申请</span></div>
      <div class="acc-stat"><b>${s}</b><span>等定人</span></div>
      <div class="acc-stat"><b>${a}</b><span>已定给你</span></div>
      <div class="acc-stat is-date"><b>${E(t.created_at)||"—"}</b><span>注册于</span></div>
      ${i}`}function it(t){const e=document.querySelector("[data-claims]");if(!t.length){e.innerHTML=`<p class="atw-empty">还没有认领记录。去<a href="${l("tasks/")}">任务书</a>看看有什么在招。</p>`;return}e.innerHTML=t.map(a=>{const s=l(`tasks/${a.taskSlug}/`),c=a.decideNote?`<p class="atw-claim-note">发布方留言：${r(a.decideNote)}</p>`:"";return`<article class="atw-claim">
          <div class="atw-claim-top">
            <span class="atw-claim-status is-${a.status}">${et[a.status]||a.status}</span>
            <span class="atw-claim-date">${E(a.createdAt)} 申请</span>
          </div>
          <h3><a href="${s}">${r(a.taskTitle||a.taskSlug)}</a></h3>
          <p class="atw-claim-meta">
            任务当前：${z[a.taskStatus]||a.taskStatus}
            ${a.taskFee?` · ${r(a.taskFee)}`:""}
          </p>
          ${c}
        </article>`}).join("")}function rt(t){const e=document.querySelector("[data-sessions]");if(!t.length){e.innerHTML='<p class="atw-empty">没有其它登录中的会话。</p>';return}e.innerHTML=t.map(a=>`<div class="acc-session${a.current?" is-current":""}">
          <div>
            <p class="acc-session-name">${a.current?"当前设备":"另一处登录"}</p>
            <p class="acc-session-meta">${K(a.createdAt)} 登录 · ${E(a.expiresAt)} 到期</p>
          </div>
          <button class="atw-ghost" type="button" data-revoke="${r(a.id)}">${a.current?"退出这台":"退掉"}</button>
        </div>`).join("")}function A(){const t=J();document.querySelector("[data-accounts]").innerHTML=t.map(e=>`<div class="acc-account${e.isActive?" is-current":""}">
          ${B(e.user)}
          <div class="acc-account-text">
            <p class="acc-account-name">${r(j(e.user))}${e.isActive?'<span class="acc-account-tag">当前</span>':""}</p>
            <p class="acc-account-sub">@${r(e.user.username)}</p>
          </div>
          ${e.isActive?"":`<span class="acc-account-actions">
                  <button class="atw-ghost" type="button" data-switch="${r(e.userId)}">切到这个</button>
                  <button class="atw-ghost" type="button" data-forget="${r(e.userId)}">移除</button>
                </span>`}
        </div>`).join("")}document.querySelector('[data-form="profile"]').addEventListener("submit",async t=>{t.preventDefault(),d("profile","保存中…","busy");const e=t.target;try{const{user:a}=await y("PATCH","/profile",{displayName:e.displayName.value,contact:e.contact.value,payee:e.payee.value,bio:e.bio.value});p=a,P(a),q(a),A(),d("profile","已保存","ok")}catch(a){d("profile",a.message)}});document.querySelector('[data-form="password"]').addEventListener("submit",async t=>{t.preventDefault(),d("password","更新中…","busy");try{await y("POST","/auth/password",{currentPassword:t.target.currentPassword.value,newPassword:t.target.newPassword.value}),t.target.reset(),d("password","密码已更新，其它设备已退出","ok"),C()}catch(e){d("password",e.message)}});document.querySelector("[data-sessions]").addEventListener("click",async t=>{const e=t.target.closest("[data-revoke]");if(e){e.disabled=!0,d("sessions","处理中…","busy");try{const{current:a}=await y("DELETE",`/auth/sessions/${encodeURIComponent(e.dataset.revoke)}`);if(a){await T(),location.href=v(location.pathname);return}d("sessions","已退出那一处登录","ok"),C()}catch(a){e.disabled=!1,d("sessions",a.message)}}});document.querySelector("[data-accounts]").addEventListener("click",async t=>{const e=t.target.closest("[data-switch]");if(e){e.disabled=!0,d("accounts","切换中…","busy"),await G(e.dataset.switch)?location.reload():location.href=v(location.pathname);return}const a=t.target.closest("[data-forget]");a&&(_(a.dataset.forget),A(),d("accounts","已从这台机器上移除","ok"))});document.querySelector("[data-logout]").addEventListener("click",async t=>{t.target.disabled=!0;const{remaining:e}=await T();location.href=e?v(""):l("")});document.querySelector("[data-logout-all]").addEventListener("click",async t=>{confirm("退出所有设备？这个账号在别处的登录会立刻作废。")&&(t.target.disabled=!0,await T({everywhere:!0}),location.href=l(""))});async function C(){try{const{sessions:t}=await y("GET","/auth/sessions");rt(t)}catch{document.querySelector("[data-sessions]").innerHTML='<p class="atw-empty">会话列表暂时读不到。</p>'}}async function dt(){if(!V()){x();return}const t=W();t&&(p=t,q(t),h(t),document.querySelector('[data-view="loading"]').hidden=!0,document.querySelector('[data-view="ready"]').hidden=!1);const e=await Y();if(!e){x();return}p=e,q(e),h(e),A(),L(U()),document.querySelector('[data-view="loading"]').hidden=!0,document.querySelector('[data-view="ready"]').hidden=!1,location.hash==="#claims"&&document.getElementById("claims")?.scrollIntoView({block:"start"});const a=document.querySelector("[data-claims]");if(a)try{const{claims:s}=await y("GET","/my/claims");it(s),N(e,s)}catch{a.innerHTML='<p class="atw-empty">认领记录暂时读不到，刷新试试。</p>',N(e,[])}C()}async function lt(){if(!X||!p)return;let t=!0;try{t=(await y("GET","/meta"))?.features?.progressSync!==!1}catch{t=!0}t&&(n=Z(u,{request:y,owner:u.owner}),n.start(),h(p),n.syncNow().then(()=>{p&&h(p)}),window.addEventListener("online",()=>n&&n.syncNow()),document.addEventListener("visibilitychange",()=>{document.visibilityState==="visible"&&n&&n.syncNow()}))}dt().finally(lt);

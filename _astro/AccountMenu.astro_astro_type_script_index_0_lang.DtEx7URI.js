import{g as x,s as q,l as $,a as M,u as d,o as O,r as S,d as u,b,e as s,c as H,f as U,R as v,i as C}from"./account-core.Dei-M62E.js";const i=document.querySelector("[data-account-menu]"),o=i?.querySelector("[data-acct-trigger]"),L=i?.querySelector("[data-acct-face]"),n=i?.querySelector("[data-acct-pop]");if(i&&o&&L&&n){let m=function(t){i.dataset.state=t?"signed-in":"anonymous",o.title=t?"账号菜单":f?"登录后可认领任务":"登录后进 DM 档案库",o.setAttribute("aria-label",t?`账号：${u(t)}`:"登录"),L.innerHTML=t?`${b(t)}<span class="acct-name">${s(u(t))}</span>`:'<span class="acct-name">登录</span>'},k=function(t){const a=t.user;return`<button class="acct-row" type="button" role="menuitem" data-switch="${s(t.userId)}">
        ${b(a)}
        <span class="acct-row-text">
          <span class="acct-row-name">${s(u(a))}</span>
          <span class="acct-row-sub">@${s(a.username)}</span>
        </span>
      </button>`},p=function(){const a=H().filter(g=>!g.isActive),c=location.pathname+location.search+location.hash;if(!e){const g=a.length?`<div class="acct-group">
              <p class="acct-group-title">切回用过的账号</p>
              ${a.map(k).join("")}
              <p class="acct-note">登录态过期了，点一下重新登录即可。</p>
            </div>`:"";n.innerHTML=`
          <p class="acct-hint">读站、看快讯、翻笔记都不用账号。<br />${f?"只有认领任务书要登录——那头连着报酬和打款。":"登录是为了进 DM 档案库，或对着知识库追问。"}</p>
          <div class="acct-cta-row">
            <a class="acct-cta" role="menuitem" href="${s($(c))}">登录</a>
            <a class="acct-cta is-ghost" role="menuitem" href="${s(U(c))}">注册</a>
          </div>
          ${g}`;return}const r=e.role==="admin"?`<span class="acct-badge">${v.admin}</span>`:e.role==="dm"?`<span class="acct-badge is-dm">${v.dm}</span>`:`<span class="acct-badge is-reader">${v.member}</span>`,E=e.role==="admin"?`<a class="acct-link" role="menuitem" href="${d("admin/")}">管理台</a>`:"",D=C(e)?`<a class="acct-link" role="menuitem" href="${d("juben/#dm-vault")}">DM 档案库</a>`:"";n.innerHTML=`
        <div class="acct-card">
          ${b(e,"lg")}
          <div class="acct-card-text">
            <p class="acct-card-name">${s(u(e))}${r}</p>
            <p class="acct-card-sub">@${s(e.username)}</p>
          </div>
        </div>
        <div class="acct-group">
          <a class="acct-link" role="menuitem" href="${d("account/")}">个人中心</a>
          ${f?`<a class="acct-link" role="menuitem" href="${d("account/#claims")}">我的认领</a>`:""}
          ${D}
          ${E}
        </div>
        <div class="acct-group">
          <p class="acct-group-title">切换账号</p>
          ${a.map(k).join("")}
          <a class="acct-link is-add" role="menuitem" href="${s($(c,{add:!0}))}">用其它账号登录</a>
        </div>
        <div class="acct-group is-foot">
          <button class="acct-link is-danger" type="button" role="menuitem" data-logout>退出登录</button>
        </div>`},A=function(){p(),n.hidden=!1,o.setAttribute("aria-expanded","true"),document.addEventListener("click",w,!0),document.addEventListener("keydown",y),n.querySelector("a, button")?.focus()},l=function({restoreFocus:t=!1}={}){n.hidden=!0,o.setAttribute("aria-expanded","false"),document.removeEventListener("click",w,!0),document.removeEventListener("keydown",y),t&&o.focus()},w=function(t){i.contains(t.target)||l()},y=function(t){if(t.key==="Escape"){l({restoreFocus:!0});return}if(t.key!=="ArrowDown"&&t.key!=="ArrowUp")return;const a=[...n.querySelectorAll("a, button")];if(!a.length)return;t.preventDefault();const c=a.indexOf(document.activeElement),r=t.key==="ArrowDown"?1:-1;a[(c+r+a.length)%a.length].focus()},e=x();const f=i.dataset.tasks==="on",h=()=>!n.hidden;o.addEventListener("click",()=>h()?l():A()),n.addEventListener("click",async t=>{const a=t.target.closest("[data-switch]");if(a){a.disabled=!0;const r=await q(a.dataset.switch);l(),r?location.reload():location.href=$(location.pathname+location.search);return}const c=t.target.closest("[data-logout]");c&&(c.disabled=!0,c.textContent="退出中…",await M(),l(),/\/(admin|account)\//.test(location.pathname)?location.href=d(""):location.reload())}),O(t=>{e=t,m(t),h()&&p()}),m(e),S().then(t=>{t&&(e=t,m(t),h()&&p())})}

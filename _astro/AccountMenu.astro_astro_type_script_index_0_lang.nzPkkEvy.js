import{g as A,s as E,l as h,a as x,u as d,o as q,r as S,d as u,b as $,e as n,c as H,f as O,R as U}from"./account-core.BZTEmI4B.js";const r=document.querySelector("[data-account-menu]"),o=r?.querySelector("[data-acct-trigger]"),k=r?.querySelector("[data-acct-face]"),s=r?.querySelector("[data-acct-pop]");if(r&&o&&k&&s){let p=function(t){r.dataset.state=t?"signed-in":"anonymous",o.title=t?"账号菜单":"登录后可认领任务",o.setAttribute("aria-label",t?`账号：${u(t)}`:"登录"),k.innerHTML=t?`${$(t)}<span class="acct-name">${n(u(t))}</span>`:'<span class="acct-name">登录</span>'},v=function(t){const a=t.user;return`<button class="acct-row" type="button" role="menuitem" data-switch="${n(t.userId)}">
        ${$(a)}
        <span class="acct-row-text">
          <span class="acct-row-name">${n(u(a))}</span>
          <span class="acct-row-sub">@${n(a.username)}</span>
        </span>
      </button>`},m=function(){const a=H().filter(g=>!g.isActive),c=location.pathname+location.search;if(!e){const g=a.length?`<div class="acct-group">
              <p class="acct-group-title">切回用过的账号</p>
              ${a.map(v).join("")}
              <p class="acct-note">登录态过期了，点一下重新登录即可。</p>
            </div>`:"";s.innerHTML=`
          <p class="acct-hint">读站、看快讯、翻笔记都不用账号。<br />只有认领任务书要登录——那头连着报酬和打款。</p>
          <div class="acct-cta-row">
            <a class="acct-cta" role="menuitem" href="${n(h(c))}">登录</a>
            <a class="acct-cta is-ghost" role="menuitem" href="${n(O(c))}">注册</a>
          </div>
          ${g}`;return}const i=e.role==="admin"?`<span class="acct-badge">${U.admin}</span>`:"",L=e.role==="admin"?`<a class="acct-link" role="menuitem" href="${d("admin/")}">管理台</a>`:"";s.innerHTML=`
        <div class="acct-card">
          ${$(e,"lg")}
          <div class="acct-card-text">
            <p class="acct-card-name">${n(u(e))}${i}</p>
            <p class="acct-card-sub">@${n(e.username)}</p>
          </div>
        </div>
        <div class="acct-group">
          <a class="acct-link" role="menuitem" href="${d("account/")}">个人中心</a>
          <a class="acct-link" role="menuitem" href="${d("account/#claims")}">我的认领</a>
          ${L}
        </div>
        <div class="acct-group">
          <p class="acct-group-title">切换账号</p>
          ${a.map(v).join("")}
          <a class="acct-link is-add" role="menuitem" href="${n(h(c,{add:!0}))}">用其它账号登录</a>
        </div>
        <div class="acct-group is-foot">
          <button class="acct-link is-danger" type="button" role="menuitem" data-logout>退出登录</button>
        </div>`},y=function(){m(),s.hidden=!1,o.setAttribute("aria-expanded","true"),document.addEventListener("click",w,!0),document.addEventListener("keydown",b),s.querySelector("a, button")?.focus()},l=function({restoreFocus:t=!1}={}){s.hidden=!0,o.setAttribute("aria-expanded","false"),document.removeEventListener("click",w,!0),document.removeEventListener("keydown",b),t&&o.focus()},w=function(t){r.contains(t.target)||l()},b=function(t){if(t.key==="Escape"){l({restoreFocus:!0});return}if(t.key!=="ArrowDown"&&t.key!=="ArrowUp")return;const a=[...s.querySelectorAll("a, button")];if(!a.length)return;t.preventDefault();const c=a.indexOf(document.activeElement),i=t.key==="ArrowDown"?1:-1;a[(c+i+a.length)%a.length].focus()},e=A();const f=()=>!s.hidden;o.addEventListener("click",()=>f()?l():y()),s.addEventListener("click",async t=>{const a=t.target.closest("[data-switch]");if(a){a.disabled=!0;const i=await E(a.dataset.switch);l(),i?location.reload():location.href=h(location.pathname+location.search);return}const c=t.target.closest("[data-logout]");c&&(c.disabled=!0,c.textContent="退出中…",await x(),l(),/\/(admin|account)\//.test(location.pathname)?location.href=d(""):location.reload())}),q(t=>{e=t,p(t),f()&&m()}),p(e),S().then(t=>{t&&(e=t,p(t),f()&&m())})}

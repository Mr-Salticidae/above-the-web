import{u as o,e as r,p as i}from"./account-core.BZTEmI4B.js";import{b as c,l as d,s as m,t as u}from"./admin-core.3nDWpVUT.js";function h({tasks:e,pendingClaims:s}){const t=a=>e.filter(l=>l.listed&&l.status===a).length,n=[{n:s.length,label:"待处理申请",href:"admin/claims/",hot:s.length>0},{n:t("open"),label:"招募中",href:"admin/tasks/"},{n:t("taken"),label:"进行中",href:"admin/tasks/"},{n:t("done"),label:"完工待打款",href:"admin/tasks/",hot:t("done")>0}];document.querySelector("[data-stats]").innerHTML=n.map(a=>`<a class="ad-stat${a.hot?" is-hot":""}" href="${o(a.href)}">
          <b>${a.n}</b><span>${a.label}</span>
        </a>`).join("")}function f({pendingClaims:e,tasks:s}){const t=document.querySelector("[data-recent]");if(!e.length){t.innerHTML='<p class="atw-empty">没有待处理的申请。</p>';return}const n=Object.fromEntries(s.map(a=>[a.slug,a]));t.innerHTML=`${e.slice(0,5).map(a=>`<article class="ad-claim">
          <div class="ad-claim-head">
            <a href="${u(n[a.taskSlug]||{slug:a.taskSlug,source:"md"})}">${r(a.taskTitle||a.taskSlug)}</a>
            <span class="ad-claim-date">${i(a.createdAt)}</span>
          </div>
          <p class="ad-claim-who"><b>${r(a.user)}</b> @${r(a.username)}</p>
        </article>`).join("")}<p class="ad-note">去<a href="${o("admin/claims/")}">待处理申请</a>里定人。</p>`}async function p(){if(await c())try{const e=await d();h(e),f(e)}catch(e){m(e.message)}}p();

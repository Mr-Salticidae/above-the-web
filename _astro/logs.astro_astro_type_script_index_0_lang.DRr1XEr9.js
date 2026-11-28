import{j as r,p as i,e}from"./account-core.Dei-M62E.js";import{b as c,s as p}from"./admin-core.DM5j6ROT.js";function m(a){const o=document.querySelector("[data-logs]");o.innerHTML=a.length?`<ul class="ad-logs">${a.map(t=>{let s="";try{const n=JSON.parse(t.details_json||"{}");s=n.fee||n.failure||n.title||""}catch{s=""}return`<li>
              <span>${i(t.created_at)}</span>
              <span>${e(t.actor_name||"—")}</span>
              <span>${e(t.action)}</span>
              <span>${e(t.target_id||"")}${s?` · ${e(String(s))}`:""}</span>
            </li>`}).join("")}</ul>`:'<p class="atw-empty">还没有操作记录。</p>'}async function l(){if(await c())try{const{logs:a}=await r("GET","/admin/audit-logs");m(a)}catch(a){p(a.message)}}l();

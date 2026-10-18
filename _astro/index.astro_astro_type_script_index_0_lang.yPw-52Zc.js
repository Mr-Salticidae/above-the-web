import{i as p,u as f,e as l,v as i,T as m}from"./account-core.BZTEmI4B.js";const h={open:"open",taken:"taken",done:"archive",closed:"archive"};function g(t){const a=document.createElement("a");return a.className="task-card",a.href=f(`tasks/detail/?slug=${encodeURIComponent(t.slug)}`),a.dataset.taskCard="",a.dataset.slug=t.slug,a.dataset.status=t.status,a.dataset.date=t.publishedAt||"",a.innerHTML=`
    <div class="tc-top">
      <span class="tc-status" data-status-label></span>
      <span class="tc-date">${l(i(t.publishedAt))} 发布</span>
    </div>
    <h2>${l(t.title||t.slug)}</h2>
    <p class="tc-summary">${l(t.summary)}</p>
    <div class="tc-meta">
      ${t.fee?`<span class="tc-fee">${l(t.fee)}</span>`:""}
      ${t.deadline?`<span class="tc-deadline">截止 ${l(i(t.deadline))}</span>`:""}
      <span class="tc-queue" data-queue hidden></span>
      <span class="tc-cta">查看任务书 →</span>
    </div>`,a}function y(t,a){const d={open:[],taken:[],archive:[]};for(const c of t){const e=a.get(c.dataset.slug);if(e){c.dataset.status=e.status;const r=c.querySelector("[data-status-label]");if(r){const s=e.status==="taken"&&e.taker?` · ${e.taker}`:"";r.textContent=(m[e.status]||e.status)+s,r.className=`tc-status is-${e.status}`}const u=c.querySelector(".tc-meta");if(u&&e.fee){let s=c.querySelector(".tc-fee");s||(s=document.createElement("span"),s.className="tc-fee",u.prepend(s)),s.textContent=e.fee}const o=c.querySelector("[data-queue]");if(o){const s=e.status==="open"&&e.pendingClaims>0;o.hidden=!s,s&&(o.textContent=`已有 ${e.pendingClaims} 人申请`)}c.classList.toggle("is-taken",e.status==="taken")}d[h[c.dataset.status]||"archive"].push(c)}for(const[c,e]of Object.entries(d)){const r=document.querySelector(`[data-group="${c}"]`),u=r?.querySelector("[data-group-list]");if(u){e.sort((o,s)=>(s.dataset.date||"").localeCompare(o.dataset.date||""));for(const o of e)u.append(o);r.hidden=e.length===0}}const n=document.querySelector("[data-empty-open]");n&&(n.hidden=d.open.length>0)}async function S(){if(!document.querySelector("[data-group-list]"))return;const t=Array.from(document.querySelectorAll("[data-task-card]"));try{const{tasks:a}=await p("GET","/tasks"),d=new Set(t.map(n=>n.dataset.slug));for(const n of a)n.source==="web"&&!d.has(n.slug)&&t.push(g(n));y(t,new Map(a.map(n=>[n.slug,n])))}catch{}}S();

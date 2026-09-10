import { mountAppShell } from '../core/app-shell.js';
import { getActiveProfile } from '../core/user-session.js';
import { getVisibleF4, getF4Code, openF4 } from '../services/f4-service.js';

const profile = getActiveProfile();
const teamUser = ['commercial','technical'].includes(profile.id);
const managerial = ['manager','cve'].includes(profile.id);
mountAppShell({ activePage:'minhas-f4', title: teamUser ? 'Controle de F4s' : (managerial ? 'Acompanhar F4s' : 'Minhas F4') });

const data = getVisibleF4(profile);
const tableBody=document.querySelector('#tableBody'), resultCount=document.querySelector('#resultCount'), emptyState=document.querySelector('#emptyState');
const searchInput=document.querySelector('#searchInput'), statusFilter=document.querySelector('#statusFilter'), dateFilter=document.querySelector('#dateFilter'), sectorFilter=document.querySelector('#sectorFilter'), statsGrid=document.querySelector('#statsGrid');
let activeFilter='all';
let dashboardFlowFilter=null;
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const statusClass=v=>norm(v).replace(/\s+/g,'-');
const fmt=d=>d?new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR'):'—';
function elapsed(since){ if(!since)return '—'; const ms=Date.now()-new Date(since).getTime(); const d=Math.max(0,Math.floor(ms/86400000)); if(d===0){const h=Math.max(1,Math.floor(ms/3600000)); return `há ${h}h`;} return `há ${d} dia${d===1?'':'s'}`; }
function matches(item,f){
  switch(f){
    case 'commercial': return item.currentStep==='commercial';
    case 'technical': return item.currentStep==='technical';
    case 'cve': return item.currentStep==='cve';
    case 'returned': return item.status==='Devolvida' && item.returnedToProfile===profile.id;
    case 'approved': return item.status==='Aprovada';
    case 'rejected': return item.status==='Rejeitada';
    case 'validation': return ['commercial','technical'].includes(item.currentStep);
    case 'manager': return item.currentStep==='manager';
    default:return true;
  }
}
function configure(){
  if(teamUser){
    document.querySelector('.page-heading .eyebrow').textContent=profile.id==='commercial'?'Compras':'Engenharia';
    document.querySelector('#pageTitle').textContent='F4s sob sua responsabilidade';
    document.querySelector('.page-description').textContent='Acompanhe as F4 que já passaram pela sua área e identifique as que exigem sua atuação agora.';
    document.querySelector('#summaryTitle').textContent='Visão do fluxo da sua área';
    const cards=[['all','Todas as F4'],['commercial','Validação comercial'],['technical','Validação técnica'],['cve','Em decisão do CVE'],['returned','Devolvidas para mim'],['approved','Aprovadas'],['rejected','Rejeitadas']];
    statsGrid.classList.add('manager-stats-grid');
    statsGrid.innerHTML=cards.map(([k,l],i)=>`<button class="stat-card ${i===0?'is-selected':''}" data-filter="${k}" aria-pressed="${i===0}"><span class="stat-label">${l}</span><strong class="stat-value" data-count-filter="${k}">0</strong><span class="stat-help">${k==='all'?'Já destinadas à sua área':'Filtrar por etapa'}</span></button>`).join('');
    statusFilter.innerHTML=cards.map(([k,l])=>`<option value="${k}">${l}</option>`).join('');
  } else if(managerial){
    document.querySelector('#pageTitle').textContent='Acompanhe as F4 dos projetos';
    document.querySelector('.page-description').textContent='Monitore a situação de todas as F4 e acompanhe cada etapa de validação.';
    const cards=[['all','Todas as F4'],['commercial','Validação comercial'],['technical','Validação técnica'],['manager','Decisão do gerente'],['cve','Decisão do CVE'],['approved','Aprovadas'],['rejected','Rejeitadas']];
    statsGrid.classList.add('manager-stats-grid');
    statsGrid.innerHTML=cards.map(([k,l],i)=>`<button class="stat-card ${i===0?'is-selected':''}" data-filter="${k}" aria-pressed="${i===0}"><span class="stat-label">${l}</span><strong class="stat-value" data-count-filter="${k}">0</strong><span class="stat-help">Acompanhar fluxo</span></button>`).join('');
    statusFilter.innerHTML=cards.map(([k,l])=>`<option value="${k}">${l}</option>`).join('');
  }
}
function sync(){ document.querySelectorAll('[data-count-filter]').forEach(el=>el.textContent=data.filter(i=>matches(i,el.dataset.countFilter)).length); }
function filtered(){ const q=norm(searchInput.value); return data.filter(item=>{ const hay=norm([getF4Code(item),item.title,item.description,item.supplier,item.currentAssignee?.name,item.currentAssignee?.role,item.status,item.stage].join(' ')); if(q&&!hay.includes(q))return false; if((teamUser||managerial)&&!matches(item,activeFilter))return false; if(!(teamUser||managerial)&&dashboardFlowFilter&&!matches(item,dashboardFlowFilter))return false; if(!(teamUser||managerial)&&statusFilter.value!=='Todos'&&item.status!==statusFilter.value)return false; if(sectorFilter.value!=='Todos'&&item.sector!==sectorFilter.value)return false; return true; }); }
function render(){ const items=filtered(); resultCount.textContent=items.length; emptyState.hidden=items.length!==0; tableBody.innerHTML=items.map(item=>`<tr class="clickable-row" tabindex="0" data-id="${item.id}"><td class="id-cell">${getF4Code(item)}</td><td><span class="f4-title">${item.title}</span><span class="f4-description">${item.description}</span></td><td><span class="status-badge ${statusClass(item.status)}">${item.status}</span></td><td>${fmt(item.updatedAt)}</td><td>${item.owner}</td><td><span class="assignee-name">${item.currentAssignee?.name||item.responsible}</span><span class="assignee-role">${item.currentAssignee?.role||item.sector} · ${elapsed(item.currentAssigneeSince)}</span></td><td>${item.sector}</td></tr>`).join(''); tableBody.querySelectorAll('tr').forEach(r=>{const o=()=>openF4(r.dataset.id);r.onclick=o;r.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();o();}}}); }
function select(f){activeFilter=f; if(teamUser||managerial)statusFilter.value=f; statsGrid.querySelectorAll('.stat-card').forEach(c=>{const s=c.dataset.filter===f;c.classList.toggle('is-selected',s);c.setAttribute('aria-pressed',s)}); render();}
configure();sync();statsGrid.querySelectorAll('[data-filter]').forEach(c=>c.onclick=()=>select(c.dataset.filter));
[searchInput,dateFilter,sectorFilter].forEach(el=>el.addEventListener(el.tagName==='INPUT'?'input':'change',render));
statusFilter.addEventListener('change',()=>teamUser||managerial?select(statusFilter.value):render());
document.querySelector('#clearFilters')?.addEventListener('click',()=>{searchInput.value='';dateFilter.value='Todos';sectorFilter.value='Todos';if(teamUser||managerial)select('all');else{dashboardFlowFilter=null;statusFilter.value='Todos';render();}});
document.querySelector('#newF4Button')?.addEventListener('click',()=>location.href='./nova-f4.html');
const params=new URLSearchParams(location.search); const flowParam=params.get('flow'); const validFlowFilters=['validation','commercial','technical','manager','cve','approved','rejected']; if(params.get('returned')==='me'&&(teamUser||managerial))select('returned'); else if(flowParam&&validFlowFilters.includes(flowParam)){ if(teamUser||managerial)select(flowParam); else{dashboardFlowFilter=flowParam;render();} } else { if(teamUser||managerial)select('all'); else render(); }

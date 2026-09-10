import { mountAppShell } from '../core/app-shell.js';
import { getActiveProfile } from '../core/user-session.js';
import { getVisibleF4, getWorkQueue, getF4Code, openF4 } from '../services/f4-service.js';

const profile=getActiveProfile();
mountAppShell({activePage:'dashboard',title:'VISÃO GERAL'});
const data=getVisibleF4(profile), team=['commercial','technical'].includes(profile.id);
const welcome=document.querySelector('#welcomeTitle'); if(welcome)welcome.textContent=`Olá, ${profile.name.split(' ')[0]}!`;
const subtitle=document.querySelector('.welcome-block p'); if(team&&subtitle)subtitle.textContent=`Visão geral das F4 acompanhadas pela equipe de ${profile.id==='commercial'?'Compras':'Engenharia'}`;
function count(f){return data.filter(i=>{switch(f){case'validation':return ['commercial','technical'].includes(i.currentStep);case'cve':return i.currentStep==='cve';case'returned':return i.status==='Devolvida'&&i.returnedToProfile===profile.id;case'approved':return i.status==='Aprovada';case'rejected':return i.status==='Rejeitada';default:return true;}}).length;}
if(team){
  document.querySelector('.quick-actions').innerHTML=`<button class="quick-card" data-go="minhas-f4"><span class="quick-icon">F4</span><span>Controle de F4s</span></button><button class="quick-card" data-go="returned"><span class="quick-icon">↩</span><span>Devolvidas para mim</span></button>`;
  const ag=document.querySelector('.attention-grid'); ag.classList.add('team-status-grid'); ag.innerHTML=[['all','Todas as F4'],['validation','Em validação'],['cve','Em decisão do CVE'],['returned','Devolvidas'],['approved','Aprovadas'],['rejected','Rejeitadas']].map(([k,l])=>`<button class="attention-card team-status-card" data-dashboard-filter="${k}"><div class="attention-content"><h4>${l}</h4><strong>${count(k)}</strong><p>${k==='all'?'Já destinadas à sua área':'Acompanhar situação'}</p></div></button>`).join('');
  document.querySelector('#attentionTitle').textContent='Situação das F4 da sua área';
}
const tbody=document.querySelector('#workQueueBody'); tbody.innerHTML=getWorkQueue(profile).map(i=>`<tr data-id="${i.id}" tabindex="0"><td><strong>${getF4Code(i)}</strong></td><td><span class="request-title">${i.title}</span><span class="request-description">${i.description}</span></td><td>${i.stage}</td><td>${new Date(`${i.dueDate}T12:00:00`).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})}</td><td><span class="status-badge">${i.status}</span></td></tr>`).join(''); tbody.querySelectorAll('tr').forEach(r=>r.onclick=()=>openF4(r.dataset.id));
const flow=document.querySelector('#flowTrack'); const flowDefs=team?[['validation','Em validação'],['cve','Decisão do CVE'],['returned','Devolvidas'],['approved','Aprovadas'],['rejected','Rejeitadas']]:[['all','Todas'],['validation','Em validação'],['cve','Decisão CVE'],['approved','Aprovadas'],['rejected','Rejeitadas']]; flow.innerHTML=flowDefs.map(([k,l])=>`<button class="flow-stage" data-dashboard-filter="${k}"><span class="flow-value">${count(k)}</span><span class="flow-label">${l}</span></button>`).join('');
function go(filter){let q='';if(filter==='returned')q='?returned=me';else if(filter&&filter!=='all')q=`?flow=${filter}`;location.href=`./minhas-f4.html${q}`;}
document.querySelectorAll('[data-go="minhas-f4"]').forEach(e=>e.onclick=()=>go('all'));document.querySelectorAll('[data-go="returned"]').forEach(e=>e.onclick=()=>go('returned'));document.querySelectorAll('[data-dashboard-filter]').forEach(e=>e.onclick=()=>go(e.dataset.dashboardFilter));document.querySelectorAll('[data-placeholder-action="Nova F4"]').forEach(e=>e.onclick=()=>location.href='./nova-f4.html');

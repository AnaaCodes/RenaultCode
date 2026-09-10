
import { mountAppShell } from '../core/app-shell.js';
import { showToast } from '../core/toast.js';
import { hasPermission } from '../core/user-session.js';

if (!hasPermission('finalDecision')) {
  window.location.replace('./minhas-f4.html');
  throw new Error('Acesso restrito à decisão gerencial.');
}

mountAppShell({ activePage: 'minhas-f4', title: 'VALIDAÇÃO F4' });

const form=document.querySelector('#reviewForm');
const saveDraftButton=document.querySelector('#saveDraftButton');
const autosaveStatus=document.querySelector('#autosaveStatus');
const additional=document.querySelector('#additionalRequestSection');
const DRAFT_KEY='f4-new-draft-review';

function updateDecision() {
  const decision=form.querySelector('input[name="renaultDecision"]:checked')?.value;
  additional.hidden = decision !== 'Documentação adicional solicitada';
}
form.querySelectorAll('input[name="renaultDecision"]').forEach(i=>i.addEventListener('change',updateDecision));

function values() {
  const data={};
  [...form.elements].forEach(el=>{
    if(!el.name) return;
    if(el.type==='checkbox') data[el.name]=el.checked;
    else if(el.type==='radio') { if(el.checked) data[el.name]=el.value; }
    else data[el.name]=el.value;
  });
  return data;
}
function fill(vals={}) {
  [...form.elements].forEach(el=>{
    if(!el.name || !(el.name in vals)) return;
    if(el.type==='checkbox') el.checked=Boolean(vals[el.name]);
    else if(el.type==='radio') el.checked=vals[el.name]===el.value;
    else el.value=vals[el.name];
  });
  updateDecision();
}
function saveDraft({notify=true}={}) {
  const payload={savedAt:new Date().toISOString(),values:values()};
  localStorage.setItem(DRAFT_KEY,JSON.stringify(payload));
  autosaveStatus.textContent=`Rascunho salvo às ${new Date(payload.savedAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}.`;
  if(notify) showToast('Revisão final salva neste navegador.');
}
function restore() {
  try{
    const payload=JSON.parse(localStorage.getItem(DRAFT_KEY)||'null');
    if(!payload) return;
    fill(payload.values);
    if(payload.savedAt) autosaveStatus.textContent=`Rascunho salvo às ${new Date(payload.savedAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}.`;
  }catch{}
}
function validate() {
  const decision=form.querySelector('input[name="renaultDecision"]:checked')?.value;
  if(!decision){ showToast('Selecione a decisão da Renault.'); return false; }
  if(decision==='Documentação adicional solicitada'){
    const options=['additionalPrf','additionalSet','additionalTooling','additionalPackaging'];
    if(!options.some(name=>form.elements[name].checked)){
      showToast('Marque ao menos um item que necessita documentação ou renegociação.');
      return false;
    }
  }
  if(!form.elements.reviewConfirmed.checked){
    showToast('Confirme a revisão das informações antes de concluir.');
    form.elements.reviewConfirmed.focus();
    return false;
  }
  return true;
}
form.addEventListener('input',()=>autosaveStatus.textContent='Alterações ainda não salvas.');
form.addEventListener('change',()=>autosaveStatus.textContent='Alterações ainda não salvas.');
saveDraftButton.addEventListener('click',()=>saveDraft());
form.addEventListener('submit',e=>{
  e.preventDefault();
  if(!validate()) return;
  saveDraft({notify:false});
  localStorage.setItem('f4-last-completed',JSON.stringify({completedAt:new Date().toISOString(),decision:form.querySelector('input[name="renaultDecision"]:checked').value}));
  showToast('F4 concluída e decisão registrada.');
  setTimeout(()=>window.location.href='./minhas-f4.html',650);
});
restore();
updateDecision();


import { mountAppShell } from '../core/app-shell.js';
import { showToast } from '../core/toast.js';

mountAppShell({ activePage: 'nova-f4', title: 'NOVA F4' });

const form = document.querySelector('#doaForm');
const saveDraftButton = document.querySelector('#saveDraftButton');
const autosaveStatus = document.querySelector('#autosaveStatus');
const DRAFT_KEY = 'f4-new-draft-doa';
const SUMMARY_KEY = 'f4-new-draft-step-3';

function readSummary() {
  try { return JSON.parse(localStorage.getItem(SUMMARY_KEY) || '{}')?.values || {}; }
  catch { return {}; }
}
const summary = readSummary();
const currency = summary.offerCurrency || 'EUR';
const n = v => Number.isFinite(Number.parseFloat(v || '0')) ? Number.parseFloat(v || '0') : 0;
const yes = key => summary[key] === 'Sim';
function money(value) {
  return new Intl.NumberFormat('pt-BR',{style:'currency',currency,minimumFractionDigits:2,maximumFractionDigits:2}).format(value||0);
}
function technicalInOfferCurrency() {
  if (!yes('technicalImpact')) return 0;
  return [1,2,3].reduce((sum,i)=> summary[`technicalCurrency${i}`]===currency ? sum+n(summary[`technicalAmount${i}`]) : sum,0);
}
function impactValues() {
  const unit = technicalInOfferCurrency() + (yes('massProductionImpact')?n(summary.massProductionAmount):0) + (yes('aftersalesImpact')?n(summary.aftersalesAmount):0);
  return {
    initial: (yes('toolingImpact')?n(summary.toolingAmount):0) + (yes('setImpact')?n(summary.setAmount):0) + (yes('packagingImpact')?n(summary.packagingAmount):0),
    annual: unit * n(summary.annualVolume)
  };
}
function initialLevel(value) {
  if (value < 50000) return 'Comprador';
  if (value < 200000) return 'PPM / RSAM';
  if (value < 500000) return 'GPPM / DIR-Tech';
  if (value < 5000000) return 'VP';
  return 'CPO';
}
function annualLevel(value) {
  if (value < 50000) return 'Comprador';
  if (value < 200000) return 'PPM / RSAM';
  if (value < 500000) return 'GPPM / DIR-Tech';
  if (value < 1000000) return 'VP';
  return 'CPO';
}
function renderDoaResult() {
  const {initial,annual}=impactValues();
  document.querySelector('#initialCostValue').textContent = money(initial);
  document.querySelector('#annualImpactValue').textContent = `${money(annual)} / ano`;
  if (currency === 'EUR') {
    document.querySelector('#initialDoaLevel').textContent = `Nível estimado: ${initialLevel(initial)}`;
    document.querySelector('#annualDoaLevel').textContent = `Nível estimado: ${annualLevel(annual)}`;
    document.querySelector('#doaNote').textContent = 'Estimativa automática em EUR com base nos valores registrados na etapa Impactos.';
  } else {
    document.querySelector('#initialDoaLevel').textContent = 'Aguardando conversão FOREX para EUR';
    document.querySelector('#annualDoaLevel').textContent = 'Aguardando conversão FOREX para EUR';
    document.querySelector('#doaNote').textContent = 'O nível DOA depende dos valores convertidos para EUR. A taxa FOREX deve ser aplicada pelo backend antes da decisão definitiva.';
  }
}
renderDoaResult();

function updateScope() {
  const usage = form.querySelector('input[name="partUsage"]:checked')?.value;
  document.querySelector('#scopePrompt').hidden = Boolean(usage);
  document.querySelector('#dedicatedScope').hidden = usage !== 'dedicated';
  document.querySelector('#transversalScope').hidden = usage !== 'transversal';
}
form.querySelectorAll('input[name="partUsage"]').forEach(i=>i.addEventListener('change',updateScope));

function values() {
  const data={};
  [...form.elements].forEach(el=>{
    if (!el.name) return;
    if (el.type==='checkbox') data[el.name]=el.checked;
    else if (el.type==='radio') { if (el.checked) data[el.name]=el.value; }
    else data[el.name]=el.value;
  });
  return data;
}
function fill(vals={}) {
  [...form.elements].forEach(el=>{
    if (!el.name || !(el.name in vals)) return;
    if (el.type==='checkbox') el.checked=Boolean(vals[el.name]);
    else if (el.type==='radio') el.checked=vals[el.name]===el.value;
    else el.value=vals[el.name];
  });
  updateScope();
}
function saveDraft({notify=true}={}) {
  const payload={savedAt:new Date().toISOString(),values:values()};
  localStorage.setItem(DRAFT_KEY,JSON.stringify(payload));
  autosaveStatus.textContent=`Rascunho salvo às ${new Date(payload.savedAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}.`;
  if (notify) showToast('Validação DOA salva neste navegador.');
}
function restore() {
  try {
    const payload=JSON.parse(localStorage.getItem(DRAFT_KEY)||'null');
    if (!payload) return;
    fill(payload.values);
    if(payload.savedAt) autosaveStatus.textContent=`Rascunho salvo às ${new Date(payload.savedAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}.`;
  } catch {}
}
function validate() {
  const usage=form.querySelector('input[name="partUsage"]:checked')?.value;
  if (!usage) { showToast('Selecione o uso da peça.'); form.querySelector('input[name="partUsage"]')?.focus(); return false; }
  const applicable = usage==='dedicated'
    ? ['dedicatedUnique','dedicatedLoe']
    : ['transversalUnique','transversalBeforeTga','transversalAfterTga'];
  if (!applicable.some(name=>form.elements[name]?.checked)) {
    showToast('Marque pelo menos uma condição de escopo da modificação.');
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
  localStorage.setItem('f4-last-submission', JSON.stringify({
    submittedAt: new Date().toISOString(),
    status: 'Submetida',
    nextStep: 'Validação Renault'
  }));
  showToast('F4 submetida. A validação seguirá com as áreas responsáveis da Renault.');
  setTimeout(()=>window.location.href='./minhas-f4.html',450);
});
restore();
updateScope();

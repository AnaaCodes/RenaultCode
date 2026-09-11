import { mountAppShell } from '../core/app-shell.js';
import { showToast } from '../core/toast.js';
import { getActiveProfile } from '../core/user-session.js';
import { createF4, generateF4Code, getNextF4OrderNumber } from '../services/f4-service.js';

mountAppShell({ activePage: 'nova-f4', title: 'NOVA F4' });

const form = document.querySelector('#doaForm');
const saveDraftButton = document.querySelector('#saveDraftButton');
const autosaveStatus = document.querySelector('#autosaveStatus');
const DRAFT_KEY = 'f4-new-draft-doa';
const SUMMARY_KEY = 'f4-new-draft-step-3';

function readDraft(key) {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); }
  catch { return null; }
}
function readSummary() { return readDraft(SUMMARY_KEY)?.values || {}; }
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
    else if (el.type==='radio') { if(el.checked) data[el.name]=el.value; }
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
  updateScope();
}
function saveDraft({notify=true}={}) {
  const payload={savedAt:new Date().toISOString(),values:values()};
  localStorage.setItem(DRAFT_KEY,JSON.stringify(payload));
  autosaveStatus.textContent=`Rascunho salvo às ${new Date(payload.savedAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}.`;
  if(notify) showToast('Validação DOA salva neste navegador.');
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

function mdValue(value) {
  return String(value ?? '—').replaceAll('|', '\\|').replaceAll('\n', '<br>');
}
function markdownTable(obj) {
  const entries = Object.entries(obj || {}).filter(([, value]) => value !== '' && value !== null && value !== undefined && value !== false);
  if (!entries.length) return '_Sem informações registradas._';
  return ['| Campo | Valor |', '|---|---|', ...entries.map(([key,value]) => `| ${mdValue(key)} | ${mdValue(Array.isArray(value) ? value.join(', ') : value)} |`)].join('\n');
}
function buildInitialMarkdown(record, drafts) {
  const code = generateF4Code(record.supplier, record.orderNumber, record.year);
  const setRows = drafts.details?.setRows || [];
  const refs = drafts.details?.references || [];
  return [
    `# F4 ${code} - ${record.title}`,
    '', `**Versão:** 1.0.0  `, `**Status:** ${record.status}  `, `**Fornecedor:** ${record.supplier}  `, `**Data:** ${new Date().toLocaleString('pt-BR')}`,
    '', '## Dados gerais', '', markdownTable(drafts.general),
    '', '## Impactos', '', markdownTable(drafts.impacts),
    '', '## Detalhamento dos impactos', '', markdownTable(drafts.details?.values || {}),
    '', '### Custos SET', '', setRows.length
      ? ['| Seção | Descrição | Quantidade | Custo unitário |','|---|---|---:|---:|',...setRows.map(row=>`| ${mdValue(row.section)} | ${mdValue(row.description)} | ${mdValue(row.quantity)} | ${mdValue(row.unitCost)} |`)].join('\n')
      : '_Sem custos SET registrados._',
    '', '### Referências impactadas', '', refs.length
      ? ['| Referência atual | Nova referência | Último preço | Impacto peça | Impacto Token | Observações |','|---|---|---:|---:|---:|---|',...refs.map(row=>`| ${mdValue(row.current)} | ${mdValue(row.newRef)} | ${mdValue(row.lastPrice)} | ${mdValue(row.partImpact)} | ${mdValue(row.tokenImpact)} | ${mdValue(row.notes)} |`)].join('\n')
      : '_Sem referências registradas._',
    '', '## DOA', '', markdownTable(drafts.doa), ''
  ].join('\n');
}
function draftContentOverrides(drafts) {
  const general = drafts.general || {};
  const impacts = drafts.impacts || {};
  const details = drafts.details || {};
  const dv = details.values || {};
  const doa = drafts.doa || {};
  const num = value => Number.isFinite(Number(value)) ? Number(value) : 0;
  return {
    request: {
      title: general.title, description: general.description, changeCause: general.changeCause,
      vehicles: general.vehicles, changeOrigin: general.changeOrigin, scoppId: general.scoppId,
      multidisciplinary: general.multidisciplinary, lupNumber: general.lupNumber,
      setPayment: general.setPayment, customerQualityLup: general.customerQualityLup
    },
    impact: {
      currency: impacts.offerCurrency || 'EUR', units: impacts.units || 'Peça', multiCurrency: impacts.multiCurrency || 'Não',
      technicalImpact: impacts.technicalImpact || 'Não',
      technicalValues: [1,2,3].map(i=>({currency:impacts[`technicalCurrency${i}`],value:num(impacts[`technicalAmount${i}`])})).filter(v=>v.currency && v.value),
      toolingImpact: impacts.toolingImpact || 'Não', toolingAmount:num(impacts.toolingAmount),
      setImpact: impacts.setImpact || 'Não', setAmount:num(impacts.setAmount),
      massProductionImpact: impacts.massProductionImpact || 'Não', massProductionAmount:num(impacts.massProductionAmount),
      aftersalesImpact: impacts.aftersalesImpact || 'Não', aftersalesAmount:num(impacts.aftersalesAmount),
      packagingImpact: impacts.packagingImpact || 'Não', packagingAmount:num(impacts.packagingAmount),
      annualVolume:num(impacts.annualVolume), capacityImpact: impacts.capacityImpact || 'Não'
    },
    partPrice: {
      csrImpact:dv.csrImpact || 'Não', weightImpact:num(dv.weightImpact), material:num(dv.materialCost), direct:num(dv.directCost),
      indirect:num(dv.indirectCost), general:num(dv.generalMargin), packaging:num(dv.partPackaging)
    },
    tooling:{idoReference:dv.idoReference},
    set:{
      rows:(details.setRows||[]).map(row=>[row.section,row.description,num(row.quantity),num(row.unitCost)]),
      amortizationQuantity:num(dv.amortizationQuantity), estimatedDuration:dv.estimatedDuration,
      financialFeeRate:num(dv.financialFeeRate), financialFeeAmount:num(dv.financialFeeAmount), tokenAmount:num(dv.tokenAmount), amortizedPackaging:num(dv.amortizedPackaging)
    },
    references:(details.references||[]).map(row=>({current:row.current,lastPrice:num(row.lastPrice),diversity:row.diversity||'Não',newRef:row.newRef,partImpact:num(row.partImpact),tokenImpact:num(row.tokenImpact),notes:row.notes})),
    beforeAfter:{before:dv.detailsBefore,after:dv.detailsAfter,beforeFiles:details.beforeFileNames||[],afterFiles:details.afterFileNames||[]},
    capacity:{previous:num(dv.previousCapacity),next:num(dv.newCapacity)},
    doa:{
      partUsage:doa.partUsage==='dedicated'?'Peça dedicada':doa.partUsage==='transversal'?'Peça transversal':doa.partUsage,
      scopes:Object.entries(doa).filter(([key,value])=>!['partUsage','doaNotes'].includes(key)&&value===true).map(([key])=>key),
      notes:doa.doaNotes
    }
  };
}
function createSubmittedF4() {
  const profile = getActiveProfile();
  const drafts = {
    general: readDraft('f4-new-draft-step-1')?.values || {},
    impacts: readDraft('f4-new-draft-step-3')?.values || {},
    details: readDraft('f4-new-draft-impact-details') || {},
    doa: values()
  };
  const orderNumber = getNextF4OrderNumber();
  const year = new Date().getFullYear();
  const id = String(orderNumber).padStart(4,'0');
  const now = new Date();
  const nowIso = now.toISOString();
  const due = new Date(now); due.setDate(due.getDate()+7);
  const record = {
    id, supplier:profile.name, orderNumber, year,
    title:drafts.general.title || `Nova F4 ${orderNumber}`,
    description:drafts.general.description || 'Solicitação criada pelo fornecedor.',
    project:drafts.general.vehicles ? `${drafts.general.vehicles} — Projeto` : 'Projeto não informado',
    status:'Submetida', updatedAt:nowIso.slice(0,10), dueDate:due.toISOString().slice(0,10),
    owner:profile.name, responsible:'Carlos Braatz', sector:'Compras', stage:'Aguardando validação comercial',
    currentStep:'commercial', currentAssigneeSince:nowIso,
    currentAssignee:{profileId:'commercial',name:'Carlos Braatz',role:'Compras · Validação comercial'}, assignedProfiles:['commercial'],
    currentVersion:'1.0.0', versioningSchema:2, validationCycle:1, activeSignatures:[], signatureAudit:[], finalSignatures:[],
    contentOverrides:draftContentOverrides(drafts),
    history:[
      {step:'creation',label:'Criação',date:nowIso,status:'Concluída',newStatus:'Criada',by:profile.name,sector:'Fornecedor',version:'1.0.0',validationCycle:1,description:'F4 criada e registrada no sistema.'},
      {step:'commercial',label:'Envio para validação comercial',date:nowIso,status:'Pendente',newStatus:'Em validação comercial',by:profile.name,sector:'Fornecedor',version:'1.0.0',validationCycle:1,description:'F4 enviada pelo fornecedor para início da validação comercial.'}
    ]
  };
  record.versionSnapshots = {'1.0.0':{version:'1.0.0',createdAt:nowIso,createdBy:profile.name,final:false,markdown:buildInitialMarkdown(record,drafts)}};
  return createF4(record);
}

form.addEventListener('input',()=>autosaveStatus.textContent='Alterações ainda não salvas.');
form.addEventListener('change',()=>autosaveStatus.textContent='Alterações ainda não salvas.');
saveDraftButton.addEventListener('click',()=>saveDraft());
form.addEventListener('submit',e=>{
  e.preventDefault();
  if(!validate()) return;
  saveDraft({notify:false});
  const created = createSubmittedF4();
  localStorage.setItem('f4-last-submission',JSON.stringify({submittedAt:new Date().toISOString(),status:'Submetida',nextStep:'Validação comercial',f4Id:created.id,version:'1.0.0'}));
  ['f4-new-draft-step-1','f4-new-draft-step-3','f4-new-draft-impact-details','f4-new-draft-doa'].forEach(key=>localStorage.removeItem(key));
  showToast(`F4 ${generateF4Code(created.supplier,created.orderNumber,created.year)} criada na versão 1.0.0 e submetida.`);
  setTimeout(()=>window.location.href=`./f4.html?id=${encodeURIComponent(created.id)}`,450);
});
restore();
updateScope();

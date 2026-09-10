
import { mountAppShell } from '../core/app-shell.js';
import { showToast } from '../core/toast.js';

mountAppShell({ activePage: 'nova-f4', title: 'NOVA F4' });

const form = document.querySelector('#impactDetailsForm');
const saveDraftButton = document.querySelector('#saveDraftButton');
const autosaveStatus = document.querySelector('#autosaveStatus');
const setRows = document.querySelector('#setRows');
const referenceRows = document.querySelector('#referenceRows');
const DRAFT_KEY = 'f4-new-draft-impact-details';
const SUMMARY_KEY = 'f4-new-draft-step-3';

function readSummary() {
  try {
    return JSON.parse(localStorage.getItem(SUMMARY_KEY) || '{}')?.values || {};
  } catch {
    return {};
  }
}
const summary = readSummary();
const currency = summary.offerCurrency || 'EUR';

function money(value, decimals = 2) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(Number(value) || 0);
}
function num(value) {
  const n = Number.parseFloat(value || '0');
  return Number.isFinite(n) ? n : 0;
}
function summaryYes(name) { return summary[name] === 'Sim'; }

function declaredTechnical() {
  if (!summaryYes('technicalImpact')) return 0;
  let total = 0;
  [1,2,3].forEach(i => {
    if (summary[`technicalCurrency${i}`] === currency) total += num(summary[`technicalAmount${i}`]);
  });
  return total;
}

function toggleFromSummary() {
  const pairs = [
    ['partPriceContent','partPriceDisabled',summaryYes('technicalImpact')],
    ['toolingContent','toolingDisabled',summaryYes('toolingImpact')],
    ['setContent','setDisabled',summaryYes('setImpact')],
    ['capacityContent','capacityDisabled',summaryYes('capacityImpact')]
  ];
  pairs.forEach(([contentId, disabledId, enabled]) => {
    const content = document.getElementById(contentId);
    const disabled = document.getElementById(disabledId);
    if (content) content.hidden = !enabled;
    if (disabled) disabled.hidden = enabled;
  });

  const tooling = document.querySelector('#toolingDetailAmount');
  if (tooling) tooling.value = num(summary.toolingAmount).toFixed(2);

  document.querySelector('#partPriceDeclared').textContent = money(declaredTechnical(), 3);
  document.querySelector('#setDeclared').textContent = money(num(summary.setAmount), 2);
}
toggleFromSummary();

const defaultSetRows = [
  ['Desenvolvimento específico','Projeto (horas)'],
  ['Desenvolvimento específico','Design'],
  ['Desenvolvimento específico','Industrialização'],
  ['Custos de validação','Validação'],
  ['Ferramental','Taxas de ferramental'],
  ['Ferramental','Valor amortizado de ferramental'],
  ['Outros','Produção antecipada / outros'],
  ['VC','Quantidades adicionais para VC']
];

function setRowTemplate(row = {}) {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input class="set-section" value="${escapeHtml(row.section || '')}" placeholder="Seção"></td>
    <td><input class="set-description" value="${escapeHtml(row.description || '')}" placeholder="Descrição"></td>
    <td><input class="set-qty" type="number" min="0" step="0.001" value="${row.quantity ?? 0}"></td>
    <td><input class="set-unit" type="number" min="0" step="0.01" value="${row.unitCost ?? 0}"></td>
    <td class="readonly-cell set-total">${money(num(row.total),2)}</td>
    <td><button class="icon-button remove-row" type="button" aria-label="Remover linha">×</button></td>`;
  tr.querySelectorAll('input').forEach(i => i.addEventListener('input', calculateSet));
  tr.querySelector('.remove-row').addEventListener('click', () => { tr.remove(); calculateSet(); markDirty(); });
  return tr;
}
function addDefaultSetRows() {
  defaultSetRows.forEach(([section, description]) => setRows.appendChild(setRowTemplate({section, description, quantity: 0, unitCost: 0})));
}
function calculateSet() {
  let total = 0;
  [...setRows.querySelectorAll('tr')].forEach(tr => {
    const qty = num(tr.querySelector('.set-qty').value);
    const unit = num(tr.querySelector('.set-unit').value);
    const rowTotal = qty * unit;
    tr.querySelector('.set-total').textContent = money(rowTotal,2);
    total += rowTotal;
  });
  document.querySelector('#setSubtotal').textContent = money(total,2);
  const declared = num(summary.setAmount);
  document.querySelector('#setDifference').textContent = money(total - declared,2);
  return total;
}
document.querySelector('#addSetRow').addEventListener('click', () => {
  setRows.appendChild(setRowTemplate({ section: 'Outros', description: '', quantity: 0, unitCost: 0 }));
  markDirty();
});

function refRowTemplate(row = {}) {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input class="ref-current" value="${escapeHtml(row.current || '')}" placeholder="Referência"></td>
    <td><input class="ref-last-price" type="number" min="0" step="0.001" value="${row.lastPrice ?? 0}"></td>
    <td><select class="ref-diversity"><option value="Não">Não</option><option value="Sim">Sim</option></select></td>
    <td><input class="ref-new" value="${escapeHtml(row.newRef || '')}" placeholder="Nova referência"></td>
    <td><input class="ref-part-impact" type="number" step="0.001" value="${row.partImpact ?? 0}"></td>
    <td><input class="ref-token-impact" type="number" step="0.001" value="${row.tokenImpact ?? 0}"></td>
    <td class="readonly-cell ref-total">${money(num(row.total),3)}</td>
    <td><input class="ref-notes" value="${escapeHtml(row.notes || '')}" placeholder="Observações"></td>
    <td><button class="icon-button remove-row" type="button" aria-label="Remover referência">×</button></td>`;
  tr.querySelector('.ref-diversity').value = row.diversity || 'Não';
  tr.querySelectorAll('input,select').forEach(i => i.addEventListener('input', () => { calculateReferences(); markDirty(); }));
  tr.querySelector('.remove-row').addEventListener('click', () => { tr.remove(); if (!referenceRows.children.length) addReferenceRow(); calculateReferences(); markDirty(); });
  return tr;
}
function addReferenceRow(row = {}) {
  referenceRows.appendChild(refRowTemplate(row));
}
document.querySelector('#addReferenceRow').addEventListener('click', () => { addReferenceRow(); markDirty(); });

function calculateReferences() {
  [...referenceRows.querySelectorAll('tr')].forEach(tr => {
    const total = num(tr.querySelector('.ref-part-impact').value) + num(tr.querySelector('.ref-token-impact').value);
    tr.querySelector('.ref-total').textContent = money(total,3);
  });
}

function calculatePartPrice() {
  const fields = ['materialCost','directCost','indirectCost','generalMargin','partPackaging'];
  const total = fields.reduce((acc,n) => acc + num(form.elements[n]?.value),0);
  const declared = declaredTechnical();
  document.querySelector('#partPriceTotal').textContent = money(total,3);
  document.querySelector('#partPriceDifference').textContent = money(total - declared,3);
  return total;
}
function calculateCapacity() {
  const previous = num(form.elements.previousCapacity?.value);
  const next = num(form.elements.newCapacity?.value);
  const delta = next - previous;
  const percent = previous > 0 ? (delta / previous) * 100 : 0;
  document.querySelector('#capacityDelta').textContent = `${new Intl.NumberFormat('pt-BR',{maximumFractionDigits:0}).format(delta)} peças/semana`;
  document.querySelector('#capacityPercent').textContent = `${new Intl.NumberFormat('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}).format(percent)}%`;
}
function escapeHtml(value='') {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}
function markDirty() { autosaveStatus.textContent = 'Alterações ainda não salvas.'; }

function serializeSetRows() {
  return [...setRows.querySelectorAll('tr')].map(tr => ({
    section: tr.querySelector('.set-section').value,
    description: tr.querySelector('.set-description').value,
    quantity: tr.querySelector('.set-qty').value,
    unitCost: tr.querySelector('.set-unit').value
  }));
}
function serializeReferences() {
  return [...referenceRows.querySelectorAll('tr')].map(tr => ({
    current: tr.querySelector('.ref-current').value,
    lastPrice: tr.querySelector('.ref-last-price').value,
    diversity: tr.querySelector('.ref-diversity').value,
    newRef: tr.querySelector('.ref-new').value,
    partImpact: tr.querySelector('.ref-part-impact').value,
    tokenImpact: tr.querySelector('.ref-token-impact').value,
    notes: tr.querySelector('.ref-notes').value
  }));
}
function serializeForm() {
  const values = Object.fromEntries(new FormData(form).entries());
  delete values.beforeFiles; delete values.afterFiles;
  return {
    values,
    setRows: serializeSetRows(),
    references: serializeReferences(),
    beforeFileNames: [...document.querySelector('#beforeFiles').files].map(f=>f.name),
    afterFileNames: [...document.querySelector('#afterFiles').files].map(f=>f.name)
  };
}
function saveDraft({notify=true}={}) {
  const payload = { ...serializeForm(), savedAt: new Date().toISOString() };
  localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
  autosaveStatus.textContent = `Rascunho salvo às ${new Date(payload.savedAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}.`;
  if (notify) showToast('Detalhamento dos impactos salvo neste navegador.');
}
function restoreDraft() {
  let payload;
  try { payload = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); } catch { payload = null; }
  if (!payload) {
    addDefaultSetRows(); addReferenceRow(); calculateAll(); return;
  }
  Object.entries(payload.values || {}).forEach(([name,value]) => {
    const fields = form.elements[name];
    if (!fields) return;
    if (fields instanceof RadioNodeList) [...fields].forEach(f => f.checked = f.value === value);
    else fields.value = value;
  });
  (payload.setRows?.length ? payload.setRows : defaultSetRows.map(([section,description])=>({section,description}))).forEach(r=>setRows.appendChild(setRowTemplate(r)));
  (payload.references?.length ? payload.references : [{}]).forEach(addReferenceRow);
  if (payload.beforeFileNames?.length) document.querySelector('#beforeFilesInfo').textContent = `Salvo anteriormente: ${payload.beforeFileNames.join(', ')}. Reanexe os arquivos para envio.`;
  if (payload.afterFileNames?.length) document.querySelector('#afterFilesInfo').textContent = `Salvo anteriormente: ${payload.afterFileNames.join(', ')}. Reanexe os arquivos para envio.`;
  if (payload.savedAt) autosaveStatus.textContent = `Rascunho salvo às ${new Date(payload.savedAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}.`;
  calculateAll();
}

function validateForm() {
  form.querySelectorAll('.is-invalid').forEach(el=>el.classList.remove('is-invalid'));
  form.querySelectorAll('.is-invalid').forEach(el=>el.classList.remove('is-invalid'));
  let first = null;

  if (summaryYes('technicalImpact') && calculatePartPrice() <= 0) {
    const field = form.elements.materialCost;
    field.closest('.form-field')?.classList.add('is-invalid'); first ||= field;
  }
  if (summaryYes('toolingImpact') && !form.elements.idoReference.value.trim()) {
    form.elements.idoReference.closest('.form-field')?.classList.add('is-invalid'); first ||= form.elements.idoReference;
  }
  if (summaryYes('setImpact') && calculateSet() <= 0) {
    const field = setRows.querySelector('.set-qty'); field?.classList.add('is-invalid'); first ||= field;
  }

  const rows = [...referenceRows.querySelectorAll('tr')];
  if (!rows.length) { addReferenceRow(); return false; }
  rows.forEach(tr => {
    const current = tr.querySelector('.ref-current');
    const newRef = tr.querySelector('.ref-new');
    const diversity = tr.querySelector('.ref-diversity').value;
    if (!current.value.trim()) { current.classList.add('is-invalid'); first ||= current; }
    if (diversity === 'Sim' && !newRef.value.trim()) { newRef.classList.add('is-invalid'); first ||= newRef; }
  });

  if (summaryYes('capacityImpact')) {
    ['previousCapacity','newCapacity'].forEach(name => {
      const field = form.elements[name];
      if (num(field.value) <= 0) { field.closest('.form-field')?.classList.add('is-invalid'); first ||= field; }
    });
  }
  if (first) {
    first.focus?.();
    showToast('Revise os campos obrigatórios do detalhamento.');
    return false;
  }
  return true;
}
function calculateAll() { calculatePartPrice(); calculateSet(); calculateReferences(); calculateCapacity(); }

form.addEventListener('input', () => { markDirty(); calculateAll(); });
form.addEventListener('change', () => { markDirty(); calculateAll(); });
saveDraftButton.addEventListener('click', () => saveDraft());
form.addEventListener('submit', event => {
  event.preventDefault();
  if (!validateForm()) return;
  saveDraft({notify:false});
  showToast('Detalhamento validado. Abrindo DOA.');
  setTimeout(()=>window.location.href='./nova-f4-doa.html',250);
});
document.querySelector('#beforeFiles').addEventListener('change', e => {
  const names=[...e.target.files].map(f=>f.name);
  document.querySelector('#beforeFilesInfo').textContent = names.length ? names.join(', ') : 'Nenhum arquivo selecionado.';
  markDirty();
});
document.querySelector('#afterFiles').addEventListener('change', e => {
  const names=[...e.target.files].map(f=>f.name);
  document.querySelector('#afterFilesInfo').textContent = names.length ? names.join(', ') : 'Nenhum arquivo selecionado.';
  markDirty();
});

restoreDraft();

import { mountAppShell } from '../core/app-shell.js';
import { showToast } from '../core/toast.js';

mountAppShell({ activePage: 'nova-f4', title: 'NOVA F4' });

const form = document.querySelector('#impactDetailsForm');
const saveDraftButton = document.querySelector('#saveDraftButton');
const autosaveStatus = document.querySelector('#autosaveStatus');
const setRows = document.querySelector('#setRows');
const referenceRows = document.querySelector('#referenceRows');
const capacityRows = document.querySelector('#capacityRows');

const DRAFT_KEY = 'f4-new-draft-impact-details';
const SUMMARY_KEY = 'f4-new-draft-step-3';
const GENERAL_KEY = 'f4-new-draft-step-1';

function readStoredValues(key) {
  try { return JSON.parse(localStorage.getItem(key) || '{}')?.values || {}; }
  catch { return {}; }
}

const summary = readStoredValues(SUMMARY_KEY);
const general = readStoredValues(GENERAL_KEY);
const currency = summary.offerCurrency || 'EUR';

function num(value) {
  const parsed = Number.parseFloat(value ?? '0');
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value, decimals = 2) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num(value));
}

function number(value, decimals = 0) {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num(value));
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[char]));
}

function summaryYes(name) { return summary[name] === 'Sim'; }

function declaredTechnical() {
  if (!summaryYes('technicalImpact')) return 0;
  return [1, 2, 3].reduce((total, index) => {
    return summary[`technicalCurrency${index}`] === currency
      ? total + num(summary[`technicalAmount${index}`])
      : total;
  }, 0);
}

function setContext(id, enabled, amount, decimals = 2) {
  const element = document.getElementById(id);
  if (!element) return;
  element.textContent = enabled ? `Sim · ${money(amount, decimals)}` : 'Não';
  element.dataset.state = enabled ? 'yes' : 'no';
}

function renderContext() {
  document.querySelector('#proposalCurrency').textContent = currency;
  setContext('technicalContext', summaryYes('technicalImpact'), declaredTechnical(), 3);
  setContext('toolingContext', summaryYes('toolingImpact'), summary.toolingAmount);
  setContext('setContext', summaryYes('setImpact'), summary.setAmount);
  const capacity = document.querySelector('#capacityContext');
  capacity.textContent = summaryYes('capacityImpact') ? 'Sim' : 'Não';
  capacity.dataset.state = summaryYes('capacityImpact') ? 'yes' : 'no';

  const title = general.title || general.modificationTitle || '';
  document.querySelector('#modificationTitle').value = title;

  document.querySelector('#lastPriceHeader').textContent = `Último preço validado (${currency})`;
  document.querySelector('#partImpactHeader').textContent = `Impacto peça s/ Token (${currency})`;
  document.querySelector('#tokenImpactHeader').textContent = `Impacto Token SET (${currency})`;
}

function toggleSection(contentId, disabledId, enabled) {
  const content = document.getElementById(contentId);
  const disabled = document.getElementById(disabledId);
  if (content) content.hidden = !enabled;
  if (disabled) disabled.hidden = enabled;
}

function toggleFromSummary() {
  toggleSection('partPriceContent', 'partPriceDisabled', summaryYes('technicalImpact'));
  toggleSection('toolingContent', 'toolingDisabled', summaryYes('toolingImpact'));
  toggleSection('setContent', 'setDisabled', summaryYes('setImpact'));
  toggleSection('capacityContent', 'capacityDisabled', summaryYes('capacityImpact'));

  const financialEnabled = summaryYes('setImpact') || summaryYes('packagingImpact');
  toggleSection('financialContent', 'financialDisabled', financialEnabled);

  document.querySelector('#toolingDetailAmount').value = num(summary.toolingAmount).toFixed(2);
  document.querySelector('#partPriceDeclared').textContent = money(declaredTechnical(), 3);
  document.querySelector('#setDeclared').textContent = money(summary.setAmount, 2);
}

const defaultSetRows = [
  { section: 'Desenvolvimento específico', description: 'Projeto (horas)', removable: false },
  { section: 'Desenvolvimento específico', description: 'Design', removable: false },
  { section: 'Desenvolvimento específico', description: 'Industrialização', removable: false },
  { section: 'Custos de validação', description: '', removable: true },
  { section: 'Custos de validação', description: '', removable: true },
  { section: 'Ferramental', description: 'Taxas de ferramental', removable: false },
  { section: 'Ferramental', description: 'Valor de ferramental amortizado', removable: false },
  { section: 'Outros', description: '', removable: true },
  { section: 'Outros', description: '', removable: true },
  { section: 'VC', description: 'Quantidades adicionais para VC', removable: false }
];

function setRowTemplate(row = {}) {
  const tr = document.createElement('tr');
  const removable = row.removable !== false;
  tr.innerHTML = `
    <td><input class="set-section" value="${escapeHtml(row.section || '')}" placeholder="Seção" ${removable ? '' : 'readonly'}></td>
    <td><input class="set-description" value="${escapeHtml(row.description || '')}" placeholder="${row.section === 'Custos de validação' ? 'Ex.: Teste funcional' : row.section === 'Outros' ? 'Ex.: Produção antecipada' : 'Descrição'}" ${row.description && !removable ? 'readonly' : ''}></td>
    <td><input class="set-qty" type="number" min="0" step="0.001" value="${escapeHtml(row.quantity ?? 0)}"></td>
    <td><input class="set-unit" type="number" min="0" step="0.01" value="${escapeHtml(row.unitCost ?? 0)}"></td>
    <td class="readonly-cell set-total">${money(row.total, 2)}</td>
    <td>${removable ? '<button class="icon-button remove-row" type="button" aria-label="Remover linha">×</button>' : ''}</td>`;

  tr.querySelectorAll('input').forEach(input => input.addEventListener('input', () => {
    calculateSet();
    markDirty();
  }));
  tr.querySelector('.remove-row')?.addEventListener('click', () => {
    tr.remove();
    calculateSet();
    markDirty();
  });
  return tr;
}

function addDefaultSetRows() {
  defaultSetRows.forEach(row => setRows.appendChild(setRowTemplate({ ...row, quantity: 0, unitCost: 0 })));
}

function calculateSet() {
  let total = 0;
  [...setRows.querySelectorAll('tr')].forEach(tr => {
    const rowTotal = num(tr.querySelector('.set-qty')?.value) * num(tr.querySelector('.set-unit')?.value);
    tr.querySelector('.set-total').textContent = money(rowTotal, 2);
    total += rowTotal;
  });
  document.querySelector('#setSubtotal').textContent = money(total, 2);
  const difference = total - num(summary.setAmount);
  document.querySelector('#setDifference').textContent = signedMoney(difference, 2);
  setDifferenceState('setDifferenceBox', difference);
  return total;
}

document.querySelector('#addSetRow').addEventListener('click', () => {
  setRows.appendChild(setRowTemplate({ section: 'Outros', description: '', quantity: 0, unitCost: 0, removable: true }));
  markDirty();
});

function refRowTemplate(row = {}) {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input class="ref-current" value="${escapeHtml(row.current || '')}" placeholder="Referência"></td>
    <td><input class="ref-last-price" type="number" min="0" step="0.001" value="${escapeHtml(row.lastPrice ?? 0)}"></td>
    <td><select class="ref-diversity"><option value="Não">Não</option><option value="Sim">Sim</option></select></td>
    <td><input class="ref-new" value="${escapeHtml(row.newRef || '')}" placeholder="Nova referência"></td>
    <td><input class="ref-part-impact" type="number" step="0.001" value="${escapeHtml(row.partImpact ?? 0)}"></td>
    <td><input class="ref-token-impact" type="number" step="0.001" value="${escapeHtml(row.tokenImpact ?? 0)}"></td>
    <td class="readonly-cell ref-total">${money(row.total, 3)}</td>
    <td><input class="ref-notes" value="${escapeHtml(row.notes || '')}" placeholder="Observações"></td>
    <td><button class="icon-button remove-row" type="button" aria-label="Remover referência">×</button></td>`;

  tr.querySelector('.ref-diversity').value = row.diversity || 'Não';
  tr.querySelectorAll('input, select').forEach(input => input.addEventListener('input', () => {
    input.classList.remove('is-invalid');
    calculateReferences();
    markDirty();
  }));
  tr.querySelector('.ref-diversity').addEventListener('change', () => {
    tr.querySelector('.ref-new').placeholder = tr.querySelector('.ref-diversity').value === 'Sim' ? 'Obrigatória' : 'Nova referência';
  });
  tr.querySelector('.remove-row').addEventListener('click', () => {
    tr.remove();
    if (!referenceRows.children.length) addReferenceRow();
    calculateReferences();
    markDirty();
  });
  return tr;
}

function addReferenceRow(row = {}) { referenceRows.appendChild(refRowTemplate(row)); }
document.querySelector('#addReferenceRow').addEventListener('click', () => { addReferenceRow(); markDirty(); });

function calculateReferences() {
  [...referenceRows.querySelectorAll('tr')].forEach(tr => {
    const total = num(tr.querySelector('.ref-part-impact').value) + num(tr.querySelector('.ref-token-impact').value);
    tr.querySelector('.ref-total').textContent = money(total, 3);
  });
}

function capacityRowTemplate(row = {}) {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input class="capacity-description" value="${escapeHtml(row.description || '')}" placeholder="Ex.: Linha / referência / processo"></td>
    <td><input class="capacity-previous" type="number" min="0" step="1" value="${escapeHtml(row.previous ?? '')}" placeholder="0"></td>
    <td><input class="capacity-new" type="number" min="0" step="1" value="${escapeHtml(row.next ?? '')}" placeholder="0"></td>
    <td class="readonly-cell capacity-variation">0</td>
    <td><button class="icon-button remove-row" type="button" aria-label="Remover item de capacidade">×</button></td>`;

  tr.querySelectorAll('input').forEach(input => input.addEventListener('input', () => {
    input.classList.remove('is-invalid');
    calculateCapacity();
    markDirty();
  }));
  tr.querySelector('.remove-row').addEventListener('click', () => {
    tr.remove();
    if (!capacityRows.children.length) addCapacityRow();
    calculateCapacity();
    markDirty();
  });
  return tr;
}

function addCapacityRow(row = {}) { capacityRows.appendChild(capacityRowTemplate(row)); }
document.querySelector('#addCapacityRow').addEventListener('click', () => { addCapacityRow(); markDirty(); });

function calculateCapacity() {
  let previousTotal = 0;
  let newTotal = 0;
  [...capacityRows.querySelectorAll('tr')].forEach(tr => {
    const previous = num(tr.querySelector('.capacity-previous').value);
    const next = num(tr.querySelector('.capacity-new').value);
    const delta = next - previous;
    previousTotal += previous;
    newTotal += next;
    const pct = previous > 0 ? (delta / previous) * 100 : 0;
    tr.querySelector('.capacity-variation').textContent = `${delta >= 0 ? '+' : ''}${number(delta)} (${delta >= 0 ? '+' : ''}${number(pct, 2)}%)`;
  });

  const delta = newTotal - previousTotal;
  const percent = previousTotal > 0 ? (delta / previousTotal) * 100 : 0;
  document.querySelector('#previousCapacityTotal').textContent = `${number(previousTotal)} peças/semana`;
  document.querySelector('#newCapacityTotal').textContent = `${number(newTotal)} peças/semana`;
  document.querySelector('#capacityDelta').textContent = `${delta >= 0 ? '+' : ''}${number(delta)} peças/semana`;
  document.querySelector('#capacityPercent').textContent = `${delta >= 0 ? '+' : ''}${number(percent, 2)}%`;
}

function signedMoney(value, decimals = 2) {
  const formatted = money(Math.abs(value), decimals);
  if (Math.abs(value) < 0.0005) return money(0, decimals);
  return `${value > 0 ? '+' : '−'} ${formatted}`;
}

function setDifferenceState(id, difference) {
  const box = document.getElementById(id);
  if (!box) return;
  box.classList.toggle('has-difference', Math.abs(difference) > 0.0005);
  box.classList.toggle('is-matched', Math.abs(difference) <= 0.0005);
}

function calculatePartPrice() {
  const fields = ['materialCost', 'directCost', 'indirectCost', 'generalMargin', 'partPackaging'];
  const total = fields.reduce((acc, name) => acc + num(form.elements[name]?.value), 0);
  const difference = total - declaredTechnical();
  document.querySelector('#partPriceTotal').textContent = money(total, 3);
  document.querySelector('#partPriceDifference').textContent = signedMoney(difference, 3);
  setDifferenceState('partPriceDifferenceBox', difference);
  return total;
}

function markDirty() { autosaveStatus.textContent = 'Alterações ainda não salvas.'; }

function serializeSetRows() {
  return [...setRows.querySelectorAll('tr')].map(tr => ({
    section: tr.querySelector('.set-section').value,
    description: tr.querySelector('.set-description').value,
    quantity: tr.querySelector('.set-qty').value,
    unitCost: tr.querySelector('.set-unit').value,
    removable: Boolean(tr.querySelector('.remove-row'))
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

function serializeCapacityRows() {
  return [...capacityRows.querySelectorAll('tr')].map(tr => ({
    description: tr.querySelector('.capacity-description').value,
    previous: tr.querySelector('.capacity-previous').value,
    next: tr.querySelector('.capacity-new').value
  }));
}

function serializeForm() {
  const values = Object.fromEntries(new FormData(form).entries());
  delete values.beforeFiles;
  delete values.afterFiles;
  return {
    values,
    setRows: serializeSetRows(),
    references: serializeReferences(),
    capacityRows: serializeCapacityRows(),
    beforeFileNames: [...document.querySelector('#beforeFiles').files].map(file => file.name),
    afterFileNames: [...document.querySelector('#afterFiles').files].map(file => file.name)
  };
}

function saveDraft({ notify = true } = {}) {
  const payload = { ...serializeForm(), savedAt: new Date().toISOString() };
  localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
  autosaveStatus.textContent = `Rascunho salvo às ${new Date(payload.savedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`;
  if (notify) showToast('Detalhamento dos impactos salvo neste navegador.');
}

function restoreDraft() {
  let payload;
  try { payload = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); }
  catch { payload = null; }

  if (!payload) {
    addDefaultSetRows();
    addReferenceRow();
    addCapacityRow();
    calculateAll();
    return;
  }

  Object.entries(payload.values || {}).forEach(([name, value]) => {
    const fields = form.elements[name];
    if (!fields) return;
    if (fields instanceof RadioNodeList) [...fields].forEach(field => { field.checked = field.value === value; });
    else fields.value = value;
  });

  const storedSetRows = payload.setRows?.length ? payload.setRows : defaultSetRows;
  storedSetRows.forEach(row => setRows.appendChild(setRowTemplate(row)));
  (payload.references?.length ? payload.references : [{}]).forEach(addReferenceRow);
  (payload.capacityRows?.length ? payload.capacityRows : [{}]).forEach(addCapacityRow);

  if (payload.beforeFileNames?.length) {
    document.querySelector('#beforeFilesInfo').textContent = `Salvo anteriormente: ${payload.beforeFileNames.join(', ')}. Reanexe os arquivos para envio.`;
  }
  if (payload.afterFileNames?.length) {
    document.querySelector('#afterFilesInfo').textContent = `Salvo anteriormente: ${payload.afterFileNames.join(', ')}. Reanexe os arquivos para envio.`;
  }
  if (payload.savedAt) {
    autosaveStatus.textContent = `Rascunho salvo às ${new Date(payload.savedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`;
  }
  calculateAll();
}

function clearValidation() {
  form.querySelectorAll('.is-invalid').forEach(element => element.classList.remove('is-invalid'));
}

function validateForm() {
  clearValidation();
  let first = null;

  if (summaryYes('technicalImpact') && calculatePartPrice() <= 0) {
    const field = form.elements.materialCost;
    field.closest('.form-field')?.classList.add('is-invalid');
    first ||= field;
  }

  if (summaryYes('toolingImpact') && !form.elements.idoReference.value.trim()) {
    const field = form.elements.idoReference;
    field.closest('.form-field')?.classList.add('is-invalid');
    first ||= field;
  }

  if (summaryYes('setImpact') && calculateSet() <= 0) {
    const field = setRows.querySelector('.set-qty');
    field?.classList.add('is-invalid');
    first ||= field;
  }

  const refs = [...referenceRows.querySelectorAll('tr')];
  let completeReferenceCount = 0;
  refs.forEach(tr => {
    const current = tr.querySelector('.ref-current');
    const newRef = tr.querySelector('.ref-new');
    const diversity = tr.querySelector('.ref-diversity').value;
    const rowHasData = current.value.trim() || newRef.value.trim() || num(tr.querySelector('.ref-last-price').value) > 0 || num(tr.querySelector('.ref-part-impact').value) !== 0 || num(tr.querySelector('.ref-token-impact').value) !== 0 || tr.querySelector('.ref-notes').value.trim();

    if (rowHasData && !current.value.trim()) {
      current.classList.add('is-invalid');
      first ||= current;
    }
    if (current.value.trim()) completeReferenceCount += 1;
    if (diversity === 'Sim' && !newRef.value.trim()) {
      newRef.classList.add('is-invalid');
      first ||= newRef;
    }
  });

  if (completeReferenceCount === 0) {
    const field = refs[0]?.querySelector('.ref-current');
    field?.classList.add('is-invalid');
    first ||= field;
  }

  if (summaryYes('capacityImpact')) {
    let validCapacityRows = 0;
    [...capacityRows.querySelectorAll('tr')].forEach(tr => {
      const description = tr.querySelector('.capacity-description');
      const previous = tr.querySelector('.capacity-previous');
      const next = tr.querySelector('.capacity-new');
      const rowHasData = description.value.trim() || previous.value || next.value;
      if (!rowHasData) return;

      if (!description.value.trim()) { description.classList.add('is-invalid'); first ||= description; }
      if (num(previous.value) <= 0) { previous.classList.add('is-invalid'); first ||= previous; }
      if (num(next.value) <= 0) { next.classList.add('is-invalid'); first ||= next; }
      if (description.value.trim() && num(previous.value) > 0 && num(next.value) > 0) validCapacityRows += 1;
    });

    if (!validCapacityRows) {
      const firstRow = capacityRows.querySelector('tr');
      const field = firstRow?.querySelector('.capacity-description');
      field?.classList.add('is-invalid');
      first ||= field;
    }
  }

  if (first) {
    first.focus?.();
    first.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    showToast('Revise os campos obrigatórios do detalhamento antes de continuar.');
    return false;
  }
  return true;
}

function calculateAll() {
  calculatePartPrice();
  calculateSet();
  calculateReferences();
  calculateCapacity();
}

form.addEventListener('input', event => {
  event.target.closest('.form-field')?.classList.remove('is-invalid');
  markDirty();
  calculateAll();
});
form.addEventListener('change', () => { markDirty(); calculateAll(); });

saveDraftButton.addEventListener('click', () => saveDraft());
form.addEventListener('submit', event => {
  event.preventDefault();
  if (!validateForm()) return;
  saveDraft({ notify: false });
  showToast('Detalhamento validado. Abrindo DOA.');
  setTimeout(() => { window.location.href = './nova-f4-doa.html'; }, 250);
});

function updateFileSelection(input, info) {
  const files = [...input.files];
  info.classList.toggle('has-files', files.length > 0);

  if (!files.length) {
    info.textContent = 'Nenhum arquivo selecionado.';
    return;
  }

  const label = files.length === 1 ? '1 arquivo selecionado' : `${files.length} arquivos selecionados`;
  info.textContent = `${label}: ${files.map(file => file.name).join(', ')}`;
}

function setupFileDropzone(inputId, dropzoneId, infoId) {
  const input = document.querySelector(inputId);
  const dropzone = document.querySelector(dropzoneId);
  const info = document.querySelector(infoId);

  if (!input || !dropzone || !info) return;

  input.addEventListener('change', () => {
    updateFileSelection(input, info);
    markDirty();
  });

  ['dragenter', 'dragover'].forEach(type => {
    dropzone.addEventListener(type, event => {
      event.preventDefault();
      event.stopPropagation();
      dropzone.classList.add('is-dragging');
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    });
  });

  ['dragleave', 'dragend', 'drop'].forEach(type => {
    dropzone.addEventListener(type, event => {
      event.preventDefault();
      event.stopPropagation();
      dropzone.classList.remove('is-dragging');
    });
  });

  dropzone.addEventListener('drop', event => {
    const droppedFiles = [...(event.dataTransfer?.files || [])];
    if (!droppedFiles.length) return;

    const transfer = new DataTransfer();
    droppedFiles.forEach(file => transfer.items.add(file));
    input.files = transfer.files;
    updateFileSelection(input, info);
    markDirty();
  });
}

setupFileDropzone('#beforeFiles', '#beforeDropzone', '#beforeFilesInfo');
setupFileDropzone('#afterFiles', '#afterDropzone', '#afterFilesInfo');

renderContext();
toggleFromSummary();
restoreDraft();

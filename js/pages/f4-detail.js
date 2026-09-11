import { mountAppShell } from '../core/app-shell.js';
import { showToast } from '../core/toast.js';
import { getActiveProfile } from '../core/user-session.js';
import { getF4ById, getF4Code, saveWorkflowState } from '../services/f4-service.js';

mountAppShell({ activePage: 'minhas-f4', title: 'Detalhes da F4' });

const params = new URLSearchParams(location.search);
const profile = getActiveProfile();
const content = document.querySelector('#detailContent');
let f4 = getF4ById(params.get('id'));

const roleConfig = {
  commercial: {
    title: 'Validação comercial', subtitle: 'Compras',
    areas: ['Dados gerais', 'Preço da peça', 'SET / TEF', 'Ferramental', 'Condições comerciais', 'DOA', 'Documentação / anexos', 'Outro']
  },
  technical: {
    title: 'Validação técnica', subtitle: 'Engenharia',
    areas: ['Dados gerais', 'Impactos técnicos', 'Referências impactadas', 'Capacidade produtiva', 'Desenhos / anexos', 'Outro']
  },
  manager: {
    title: 'Decisão do gerente de projeto', subtitle: 'Gerente do projeto',
    areas: ['Dados gerais', 'Impactos', 'Validação comercial', 'Validação técnica', 'DOA', 'Documentação / anexos', 'Outro']
  },
  cve: {
    title: 'Decisão final do CVE', subtitle: 'CVE',
    areas: ['Impacto econômico', 'DOA', 'Validação comercial', 'Validação técnica', 'Decisão do gerente', 'Documentação / anexos', 'Outro']
  }
};

const esc = value => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');
const fmt = value => value ? new Date(value).toLocaleDateString('pt-BR') : '—';
const dateTime = value => value ? new Date(value).toLocaleString('pt-BR', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
}) : '—';
const cls = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, '-');
const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const yesNo = value => value ? 'Sim' : 'Não';

function elapsed(since) {
  if (!since) return '—';
  const ms = Math.max(0, Date.now() - new Date(since));
  const d = Math.floor(ms / 86400000);
  if (d > 0) return `há ${d} dia${d === 1 ? '' : 's'}`;
  const h = Math.max(1, Math.floor(ms / 3600000));
  return `há ${h}h`;
}
function latest(step) { return [...(f4.history || [])].reverse().find(h => h.step === step); }
function approvalStatus(step) {
  const h = latestInCurrentCycle(step);
  if (!h) return 'Pendente';
  if (['Aprovada', 'Concluída'].includes(h.status)) return 'Aprovado';
  if (h.status === 'Rejeitada') return 'Rejeitado';
  if (h.status === 'Devolvida') return 'Devolvido';
  return h.status;
}

const historySectorByStep = {
  creation: 'Fornecedor',
  supplier: 'Fornecedor',
  commercial: 'Compras',
  technical: 'Engenharia',
  manager: 'Gerência do projeto',
  cve: 'CVE',
  final: 'Sistema'
};

function normalizeVersion(version = '1.0.0') {
  const match = String(version).match(/^(\d+)\.([0-9])\.([0-9])$/);
  return match ? `${Number(match[1])}.${match[2]}.${match[3]}` : '1.0.0';
}

function incrementVersion(version = '1.0.0') {
  const [majorRaw, minorRaw, patchRaw] = normalizeVersion(version).split('.').map(Number);
  let major = majorRaw;
  let minor = minorRaw;
  let patch = patchRaw + 1;
  if (patch > 9) { patch = 0; minor += 1; }
  if (minor > 9) { minor = 0; major += 1; }
  return `${major}.${minor}.${patch}`;
}

function currentVersion() {
  return normalizeVersion(f4?.currentVersion || '1.0.0');
}

function historySnapshotId(entry, index = (f4?.history || []).length) {
  if (entry?.snapshotId) return entry.snapshotId;
  const stamp = String(entry?.date || new Date().toISOString()).replace(/[^0-9]/g, '').slice(0, 17);
  return `hist-${stamp || Date.now()}-${index}-${Math.random().toString(16).slice(2, 8)}`;
}

function appendHistory(entry) {
  f4.history = f4.history || [];
  const historyEntry = {
    ...entry,
    version: normalizeVersion(entry.version || currentVersion()),
    validationCycle: entry.validationCycle || f4.validationCycle || 1
  };
  historyEntry.snapshotId = historySnapshotId(historyEntry);
  f4.history.push(historyEntry);
  historyEntry.markdownSnapshot = buildHistoryMarkdown(historyEntry);
  return historyEntry;
}

function latestInCurrentCycle(step) {
  const cycle = f4?.validationCycle || 1;
  return [...(f4?.history || [])].reverse().find(h => h.step === step && (h.validationCycle || 1) === cycle);
}

function signatureFor(decision, step, date, reason = '') {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    decision,
    step,
    title: decision === 'approve' ? 'F4 aprovada por' : 'F4 rejeitada por',
    name: profile.name,
    sector: historySectorByStep[step] || profile.role,
    date,
    version: currentVersion(),
    validationCycle: f4.validationCycle || 1,
    reason: reason || ''
  };
}

function registerSignature(signature, { active = false } = {}) {
  f4.signatureAudit = Array.isArray(f4.signatureAudit) ? f4.signatureAudit : [];
  f4.signatureAudit.push(signature);
  if (!active) return;
  f4.activeSignatures = Array.isArray(f4.activeSignatures) ? f4.activeSignatures : [];
  f4.activeSignatures = f4.activeSignatures.filter(item => item.step !== signature.step);
  f4.activeSignatures.push(signature);
}

function invalidateCurrentApprovals(reason) {
  const active = Array.isArray(f4.activeSignatures) ? f4.activeSignatures : [];
  if (active.length) {
    const ids = new Set(active.map(item => item.id));
    f4.signatureAudit = (f4.signatureAudit || []).map(item => ids.has(item.id)
      ? { ...item, valid: false, invalidatedAt: new Date().toISOString(), invalidationReason: reason }
      : item);
  }
  f4.activeSignatures = [];
  f4.validationCycle = (f4.validationCycle || 1) + 1;
}

function normalizeSupplierSubmissionHistory() {
  if (!f4 || !Array.isArray(f4.history)) return;

  const supplierName = f4.supplier || f4.owner || 'Fornecedor';
  let changed = false;

  f4.history.forEach((entry, index, history) => {
    const startsCommercialValidation = entry.step === 'commercial'
      && ['Em andamento', 'Pendente'].includes(entry.status);

    if (!startsCommercialValidation) return;

    const previous = history[index - 1];
    const isResubmission = previous?.status === 'Devolvida'
      && (previous?.returnedTo === 'Fornecedor' || previous?.returnedToProfile === 'supplier');

    const expectedLabel = isResubmission
      ? 'Reenvio para validação comercial'
      : 'Envio para validação comercial';
    const expectedDescription = isResubmission
      ? 'F4 corrigida pelo fornecedor e reenviada para nova validação comercial.'
      : 'F4 enviada pelo fornecedor para início da validação comercial.';

    if (entry.by !== supplierName) { entry.by = supplierName; changed = true; }
    if (entry.sector !== 'Fornecedor') { entry.sector = 'Fornecedor'; changed = true; }
    if (entry.label !== expectedLabel) { entry.label = expectedLabel; changed = true; }
    if (entry.description !== expectedDescription) { entry.description = expectedDescription; changed = true; }
    if (entry.newStatus !== 'Em validação comercial') { entry.newStatus = 'Em validação comercial'; changed = true; }
  });

  // Corrige inclusive estados antigos que já estavam persistidos no localStorage,
  // sem criar uma nova versão do histórico.
  if (changed) saveWorkflowState(f4);
}

function historySector(entry) {
  return entry.sector || historySectorByStep[entry.step] || 'Sistema';
}

function historyDescription(entry) {
  const areas = Array.isArray(entry.errorAreas) && entry.errorAreas.length
    ? ` Áreas indicadas: ${entry.errorAreas.join(', ')}.`
    : '';
  if (entry.guidance) return `${entry.guidance}${areas}`;
  if (entry.description) return `${entry.description}${areas}`;
  if (entry.step === 'creation') return 'F4 criada e registrada no sistema.';
  if (entry.status === 'Devolvida') return `F4 devolvida para ${entry.returnedTo || 'correção'}.${areas}`;
  if (entry.status === 'Rejeitada') return `Alteração encerrada como rejeitada.${areas}`;
  if (entry.status === 'Aprovada') return `${entry.label || 'Etapa'} validada e aprovada.`;
  if (entry.status === 'Concluída') return 'Fluxo da F4 concluído com aprovação final.';
  if (entry.status === 'Em andamento') return `${entry.label || 'Etapa'} iniciada.`;
  return `Registro de alteração na etapa ${entry.label || entry.step || 'da F4'}.`;
}

function historyNewStatus(entry) {
  if (entry.newStatus) return entry.newStatus;
  if (entry.step === 'creation') return entry.status || 'Criada';
  if (entry.status === 'Devolvida' || entry.status === 'Rejeitada') return entry.status;
  if (entry.status === 'Concluída' || entry.step === 'final') return 'Aprovada';
  if (entry.status === 'Aprovada') {
    const nextStatusByStep = {
      commercial: 'Em validação técnica',
      technical: 'Em decisão do gerente',
      manager: 'Em decisão do CVE',
      cve: 'Aprovada'
    };
    return nextStatusByStep[entry.step] || entry.status;
  }
  if (entry.status === 'Em andamento' && entry.step === 'commercial') return 'Em validação comercial';
  return entry.status || 'Pendente';
}

const expandedHistoryRows = new Set();

function historyChangeDetails(entry) {
  const blocks = [];
  const guidance = entry.rejectionReason || entry.guidance || '';
  if (guidance) {
    blocks.push(`<div class="history-detail-block is-guidance"><span>${entry.rejectionReason ? 'Motivo da rejeição' : 'Orientação registrada'}</span><p>${esc(guidance)}</p></div>`);
  }
  if (Array.isArray(entry.errorAreas) && entry.errorAreas.length) {
    blocks.push(`<div class="history-detail-block"><span>Locais indicados para ajuste</span><div class="history-detail-tags">${entry.errorAreas.map(area => `<b>${esc(area)}</b>`).join('')}</div></div>`);
  }

  const directChanges = Array.isArray(entry.changeDetails) ? entry.changeDetails : [];
  const submittedChanges = entry.submittedChanges && typeof entry.submittedChanges === 'object'
    ? Object.values(entry.submittedChanges).flatMap(section => Array.isArray(section?.changes) ? section.changes : [])
    : [];
  const changes = directChanges.length ? directChanges : submittedChanges;
  if (changes.length) {
    blocks.push(`<div class="history-detail-block"><span>Campos alterados</span><div class="history-change-list">${changes.map(change => `
      <div class="history-change-item">
        <strong>${esc(change.label || change.path || 'Campo alterado')}</strong>
        <div><span>Antes</span><p>${esc(change.before ?? '—')}</p></div>
        <div><span>Depois</span><p>${esc(change.after ?? '—')}</p></div>
      </div>`).join('')}</div></div>`);
  } else if (Array.isArray(entry.changedFields) && entry.changedFields.length) {
    blocks.push(`<div class="history-detail-block"><span>Campos alterados</span><div class="history-detail-tags">${entry.changedFields.map(fieldName => `<b>${esc(fieldName)}</b>`).join('')}</div></div>`);
  }

  if (entry.commentSection || String(entry.label || '').startsWith('Comentário em')) {
    blocks.push(`<div class="history-detail-block"><span>Comentário registrado</span><p>${esc(entry.description || 'Comentário registrado nesta seção.')}</p></div>`);
  }
  if (entry.returnedTo) {
    blocks.push(`<div class="history-detail-block compact"><span>Destino da devolução</span><p>${esc(entry.returnedTo)}</p></div>`);
  }
  blocks.push(`<div class="history-detail-meta"><span>Versão ${esc(entry.version || currentVersion())}</span><span>Ciclo de validação ${esc(entry.validationCycle || 1)}</span><span>${dateTime(entry.date || f4.updatedAt)}</span></div>`);
  return blocks.join('');
}

function changeHistoryPanel() {
  const history = (f4.history || []).map(entry => ({ ...entry, version: normalizeVersion(entry.version || currentVersion()) })).reverse();

  const rows = history.map((entry, index) => {
    const rowId = entry.snapshotId || `history-${index}`;
    const isOpen = expandedHistoryRows.has(rowId);
    return `<tr class="history-main-row ${isOpen ? 'is-open' : ''}" data-history-row="${esc(rowId)}" tabindex="0" aria-expanded="${isOpen ? 'true' : 'false'}">
      <td><span class="history-expand-icon">⌄</span><strong class="history-version">${esc(entry.version)}</strong></td>
      <td><strong>${esc(entry.label || entry.step || 'Alteração da F4')}</strong></td>
      <td>${esc(historyDescription(entry))}</td>
      <td><span class="review-status ${cls(historyNewStatus(entry))}">${esc(historyNewStatus(entry))}</span></td>
      <td>${esc(entry.by || (entry.step === 'creation' ? f4.supplier : 'Sistema'))}</td>
      <td>${esc(historySector(entry))}</td>
      <td>${dateTime(entry.date || f4.updatedAt)}</td>
      <td><button class="history-download-button" type="button" data-download-history="${esc(entry.snapshotId || '')}">Baixar PDF</button></td>
    </tr>
    <tr class="history-detail-row" data-history-detail="${esc(rowId)}" ${isOpen ? '' : 'hidden'}><td colspan="8"><div class="history-expanded-content">${historyChangeDetails(entry)}</div></td></tr>`;
  }).join('');

  return `<section class="card detail-card change-history-panel" id="changeHistoryPanel" ${historyExpanded ? '' : 'hidden'}>
    <div class="detail-section-heading history-panel-heading">
      <div><p class="detail-kicker">Rastreabilidade</p><h3>Histórico de alterações</h3><p>Clique em qualquer registro para abrir os detalhes da ação, incluindo campos alterados, comentários e orientações de correção.</p></div>
      <span class="history-count">${history.length} registro${history.length === 1 ? '' : 's'}</span>
    </div>
    <div class="review-table-wrap history-table-wrap">
      <table class="review-table change-history-table">
        <thead><tr><th>Número da versão</th><th>Local / alteração</th><th>Descrição</th><th>Novo status</th><th>Usuário responsável</th><th>Setor</th><th>Data</th><th>Arquivo</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="8">Nenhuma alteração registrada.</td></tr>'}</tbody>
      </table>
    </div>
  </section>`;
}
function money(value, currency = 'EUR', decimals = 2) {
  try {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency', currency, minimumFractionDigits: decimals, maximumFractionDigits: decimals
    }).format(number(value));
  } catch {
    return `${currency} ${number(value).toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
  }
}
function percent(value) {
  return `${number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

function deepMerge(base, override) {
  if (!override || typeof override !== 'object') return base;
  if (Array.isArray(override)) return override.map(item => typeof item === 'object' && item !== null ? deepMerge({}, item) : item);
  const result = { ...(base || {}) };
  Object.entries(override).forEach(([key, value]) => {
    if (value === undefined) return;
    if (value && typeof value === 'object' && !Array.isArray(value)) result[key] = deepMerge(result[key] || {}, value);
    else result[key] = value;
  });
  return result;
}

function recalculateReviewData(data) {
  const technical = Array.isArray(data.impact?.technicalValues)
    ? data.impact.technicalValues.find(item => item.currency === data.impact.currency)?.value || data.impact.technicalValues[0]?.value || 0
    : 0;
  const unitImpact = number(technical) + (data.impact?.massProductionImpact === 'Sim' ? number(data.impact.massProductionAmount) : 0) + (data.impact?.aftersalesImpact === 'Sim' ? number(data.impact.aftersalesAmount) : 0);
  const annualVolume = number(data.impact?.annualVolume);
  const initialCosts = (data.impact?.toolingImpact === 'Sim' ? number(data.impact.toolingAmount) : 0)
    + (data.impact?.setImpact === 'Sim' ? number(data.impact.setAmount) : 0)
    + (data.impact?.packagingImpact === 'Sim' ? number(data.impact.packagingAmount) : 0);
  data.impact.unitImpact = unitImpact;
  data.impact.annualImpact = unitImpact * annualVolume;
  data.impact.initialCosts = initialCosts;

  if (data.partPrice) {
    data.partPrice.total = number(data.partPrice.material) + number(data.partPrice.direct) + number(data.partPrice.indirect) + number(data.partPrice.general) + number(data.partPrice.packaging);
    data.partPrice.declared = number(technical);
    data.partPrice.difference = data.partPrice.total - data.partPrice.declared;
  }
  if (data.tooling) data.tooling.amount = number(data.impact?.toolingAmount);
  if (data.set) {
    data.set.calculated = (data.set.rows || []).reduce((sum, row) => sum + number(row?.[2]) * number(row?.[3]), 0);
    data.set.declared = number(data.impact?.setAmount);
    data.set.difference = data.set.calculated - data.set.declared;
  }
  if (data.capacity) {
    data.capacity.delta = number(data.capacity.next) - number(data.capacity.previous);
    data.capacity.percent = number(data.capacity.previous) ? data.capacity.delta / number(data.capacity.previous) * 100 : 0;
  }
  if (data.doa) {
    data.doa.initialCosts = initialCosts;
    data.doa.annualImpact = data.impact.annualImpact;
    data.doa.initialDoa = initialCosts < 50000 ? 'Comprador' : initialCosts < 200000 ? 'PPM / RSAM' : initialCosts < 500000 ? 'GPPM / DIR-Tech' : initialCosts < 5000000 ? 'VP' : 'CPO';
    data.doa.annualDoa = data.impact.annualImpact < 50000 ? 'Comprador' : data.impact.annualImpact < 200000 ? 'PPM / RSAM' : data.impact.annualImpact < 500000 ? 'GPPM / DIR-Tech' : data.impact.annualImpact < 1000000 ? 'VP' : 'CPO';
  }
  if (data.supplier) data.supplier.version = currentVersion();
  if (data.metadata) data.metadata.version = currentVersion();
  return data;
}

function getReviewData(item) {
  const seed = Number.parseInt(item.id, 10) || 1;
  const creation = (item.history || []).find(h => h.step === 'creation')?.date || item.updatedAt;
  const currency = seed % 4 === 0 ? 'BRL' : 'EUR';
  const technicalAmount = Number((1.15 + (seed % 7) * 0.18).toFixed(3));
  const toolingAmount = 18000 + (seed % 6) * 4500;
  const setAmount = 9600 + (seed % 5) * 2800;
  const massProductionAmount = Number((0.12 + (seed % 4) * 0.06).toFixed(3));
  const aftersalesAmount = Number((0.08 + (seed % 3) * 0.04).toFixed(3));
  const packagingAmount = 2400 + (seed % 4) * 850;
  const annualVolume = 78000 + (seed % 8) * 12000;
  const unitImpact = technicalAmount + massProductionAmount + aftersalesAmount;
  const annualImpact = unitImpact * annualVolume;
  const initialCosts = toolingAmount + setAmount + packagingAmount;
  const previousCapacity = 4800 + (seed % 5) * 400;
  const newCapacity = previousCapacity + ((seed % 3) - 1) * 350 + 500;
  const capacityDelta = newCapacity - previousCapacity;
  const capacityPercent = previousCapacity ? (capacityDelta / previousCapacity) * 100 : 0;
  const weightImpact = (seed % 2 === 0 ? 1 : -1) * (8 + (seed % 6) * 4);
  const supplierManagers = ['Camila Ribeiro', 'Lucas Martins', 'Fernanda Lopes', 'Bruno Costa', 'Juliana Alves'];
  const plants = ['São José dos Pinhais/PR', 'Curitiba/PR', 'Joinville/SC', 'Caxias do Sul/RS', 'Sorocaba/SP'];
  const vehicleCode = String(item.project || '').split('—')[0].trim() || 'Projeto Renault';
  const version = item.status === 'Rascunho' ? 'Rev 00' : ['Aprovada', 'Rejeitada'].includes(item.status) ? 'Rev 02' : 'Rev 01';
  const partMaterial = technicalAmount * 0.46;
  const direct = technicalAmount * 0.18;
  const indirect = technicalAmount * 0.12;
  const general = technicalAmount * 0.16;
  const partPackaging = technicalAmount - partMaterial - direct - indirect - general;
  const setRows = [
    ['Desenvolvimento específico', 'Projeto (horas)', 34 + (seed % 4) * 6, 85],
    ['Desenvolvimento específico', 'Design', 14 + (seed % 3) * 4, 95],
    ['Desenvolvimento específico', 'Industrialização', 18 + (seed % 5) * 3, 88],
    ['Custos de validação', 'Validação', 1, 1650 + (seed % 3) * 300],
    ['Ferramental', 'Taxas de ferramental', 1, 1250 + (seed % 4) * 250],
    ['Outros', 'Produção antecipada / outros', 1, 780 + (seed % 5) * 120]
  ];
  const setCalculated = setRows.reduce((sum, row) => sum + row[2] * row[3], 0);
  const refBase = String(seed).padStart(4, '0');
  const references = [
    {
      current: `77 01 ${refBase} 01R`, lastPrice: 18.42 + (seed % 4), diversity: seed % 3 === 0 ? 'Sim' : 'Não',
      newRef: `77 01 ${refBase} 02R`, partImpact: technicalAmount, tokenImpact: seed % 2 === 0 ? 0.16 : 0,
      notes: 'Referência principal impactada pela modificação.'
    },
    {
      current: `82 00 ${refBase} 10R`, lastPrice: 7.90 + (seed % 3), diversity: 'Não',
      newRef: `82 00 ${refBase} 11R`, partImpact: Number((technicalAmount * 0.42).toFixed(3)), tokenImpact: 0,
      notes: 'Referência associada ao mesmo conjunto.'
    }
  ];
  const initialDoa = initialCosts < 50000 ? 'Comprador' : initialCosts < 200000 ? 'PPM / RSAM' : initialCosts < 500000 ? 'GPPM / DIR-Tech' : initialCosts < 5000000 ? 'VP' : 'CPO';
  const annualDoa = annualImpact < 50000 ? 'Comprador' : annualImpact < 200000 ? 'PPM / RSAM' : annualImpact < 500000 ? 'GPPM / DIR-Tech' : annualImpact < 1000000 ? 'VP' : 'CPO';

  const baseData = {
    request: {
      title: item.title,
      description: item.description,
      changeCause: `A modificação foi aberta para adequar ${item.title.toLowerCase()} ao escopo do projeto ${item.project}. A proposta considera impactos comerciais e técnicos, referências associadas e condições necessárias para implementação sem interrupção do fornecimento.`,
      vehicles: vehicleCode,
      changeOrigin: seed % 3 === 0 ? 'Engenharia' : seed % 3 === 1 ? 'Fornecedor' : 'Projeto',
      scoppId: `SCOPP-${item.year}-${String(item.orderNumber).padStart(5, '0')}`,
      multidisciplinary: seed % 2 === 0 ? 'Sim' : 'Não',
      lupNumber: `LUP-${item.year}-${String(4100 + seed)}`,
      setPayment: seed % 2 === 0 ? 'Token' : 'Cash or instalments',
      customerQualityLup: seed % 4 === 0 ? 'Sim' : 'Não'
    },
    supplier: {
      corporateName: item.supplier,
      version,
      manager: supplierManagers[seed % supplierManagers.length],
      plant: plants[seed % plants.length],
      date: fmt(creation),
      position: 'Supplier F4 Manager',
      alcor: `ALCOR-${String(20 + (seed % 70)).padStart(2, '0')}`,
      setAccount: seed % 2 === 0 ? `SAER-${String(100 + seed)}` : `PULSAR-${String(100 + seed)}`,
      leadTime: `${8 + (seed % 7)} semanas`,
      diversity: seed % 3 === 0 ? 'Sim — impacto acima do limiar de diversidade' : 'Não'
    },
    impact: {
      currency, units: 'Peça', multiCurrency: seed % 5 === 0 ? 'Sim' : 'Não',
      technicalImpact: 'Sim', technicalValues: [
        { currency, value: technicalAmount },
        ...(seed % 5 === 0 ? [{ currency: 'USD', value: Number((technicalAmount * 1.08).toFixed(3)) }] : [])
      ],
      toolingImpact: 'Sim', toolingAmount,
      setImpact: 'Sim', setAmount,
      massProductionImpact: 'Sim', massProductionAmount,
      aftersalesImpact: seed % 3 === 0 ? 'Não' : 'Sim', aftersalesAmount: seed % 3 === 0 ? 0 : aftersalesAmount,
      packagingImpact: 'Sim', packagingAmount,
      annualVolume,
      unitImpact,
      annualImpact,
      initialCosts,
      capacityImpact: 'Sim'
    },
    partPrice: {
      csrImpact: seed % 4 === 0 ? 'Sim' : 'Não', weightImpact,
      material: partMaterial, direct, indirect, general, packaging: partPackaging,
      total: technicalAmount, declared: technicalAmount, difference: 0
    },
    tooling: {
      idoReference: `IDO-${item.year}-${String(7000 + seed)}`,
      amount: toolingAmount
    },
    set: {
      rows: setRows,
      calculated: setCalculated,
      declared: setAmount,
      difference: setCalculated - setAmount,
      amortizationQuantity: 80000 + (seed % 5) * 15000,
      estimatedDuration: `${12 + (seed % 4) * 6} meses`,
      financialFeeRate: 4.5 + (seed % 3) * 0.65,
      financialFeeAmount: 540 + (seed % 4) * 180,
      tokenAmount: seed % 2 === 0 ? 1350 + (seed % 5) * 150 : 0,
      amortizedPackaging: 950 + (seed % 4) * 175
    },
    references,
    beforeAfter: {
      before: `Condição atual da peça/conjunto vinculada à referência ${references[0].current}, com especificação e processo vigentes antes da implementação desta F4.`,
      after: `Condição proposta com a referência ${references[0].newRef}, incorporando as alterações descritas nesta F4 e os impactos validados pelas áreas responsáveis.`,
      beforeFiles: [`Desenho_atual_${getF4Code(item).replace('/', '-')}.pdf`, `Foto_condicao_atual_${item.id}.jpg`],
      afterFiles: [`Desenho_proposto_${getF4Code(item).replace('/', '-')}.pdf`, `Memorial_modificacao_${item.id}.pdf`]
    },
    capacity: {
      previous: previousCapacity, next: newCapacity, delta: capacityDelta, percent: capacityPercent
    },
    doa: {
      partUsage: seed % 2 === 0 ? 'Peça dedicada' : 'Peça transversal',
      scopes: seed % 2 === 0
        ? ['Modificação em projeto/plataforma/órgão único', 'F4 vinculada a LOE modificada ou Green COCA']
        : ['Modificação transversal antes do TGA ou vinculada ao LOE'],
      initialCosts, initialDoa,
      annualImpact, annualDoa,
      notes: 'Nível estimado automaticamente a partir dos impactos econômicos registrados. Valores definitivos dependem das regras de DOA e, quando aplicável, da conversão FOREX para EUR.'
    },
    metadata: {
      code: getF4Code(item), version, createdBy: item.supplier, createdAt: dateTime(creation),
      updatedAt: fmt(item.updatedAt), status: item.status, project: item.project,
      attachmentCount: 4, currentResponsible: item.currentAssignee?.name || item.responsible
    }
  };
  return recalculateReviewData(deepMerge(baseData, item.contentOverrides || {}));
}


function markdownValue(value) {
  if (Array.isArray(value)) return value.join(', ');
  return String(value ?? '—').replaceAll('|', '\\|').replaceAll('\n', '<br>');
}

function markdownFields(entries) {
  return ['| Campo | Valor |', '|---|---|', ...entries.map(([label, value]) => `| ${markdownValue(label)} | ${markdownValue(value)} |`)].join('\n');
}

function buildVersionMarkdown(item, version, { final = false } = {}) {
  const d = getReviewData(item);
  const technicalValues = (d.impact.technicalValues || []).map(v => `${v.currency} ${number(v.value).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`).join(' / ') || '—';
  const setRows = (d.set.rows || []).map(row => `| ${markdownValue(row[0])} | ${markdownValue(row[1])} | ${markdownValue(row[2])} | ${markdownValue(row[3])} | ${markdownValue(number(row[2]) * number(row[3]))} |`);
  const refs = (d.references || []).map(ref => `| ${markdownValue(ref.current)} | ${markdownValue(ref.newRef)} | ${markdownValue(ref.lastPrice)} | ${markdownValue(ref.partImpact)} | ${markdownValue(ref.tokenImpact)} | ${markdownValue(ref.notes)} |`);
  return [
    `# F4 ${getF4Code(item)} - ${d.request.title}`,
    '', `**Versão:** ${version}${final ? ' - FINAL' : ''}  `, `**Status:** ${item.status}  `, `**Fornecedor:** ${item.supplier}  `, `**Projeto:** ${item.project || '—'}  `, `**Gerado em:** ${new Date().toLocaleString('pt-BR')}`,
    '', '## Solicitação', '', markdownFields([
      ['Título', d.request.title], ['Descrição', d.request.description], ['Causa da modificação', d.request.changeCause], ['Veículos / órgãos', d.request.vehicles],
      ['Origem da modificação', d.request.changeOrigin], ['SCOPP Dev GAP ECO ID', d.request.scoppId], ['F4 multidisciplinar', d.request.multidisciplinary], ['Número LUP', d.request.lupNumber],
      ['Modo de pagamento SET', d.request.setPayment], ['LUP qualidade cliente', d.request.customerQualityLup]
    ]),
    '', '## Fornecedor', '', markdownFields([
      ['Corporate Name', d.supplier.corporateName], ['Supplier F4 Manager', d.supplier.manager], ['Supplier Plant', d.supplier.plant], ['Data', d.supplier.date],
      ['Position', d.supplier.position], ['Supplier Account', d.supplier.alcor], ['SET Order Account', d.supplier.setAccount], ['Implementation Leadtime', d.supplier.leadTime], ['Diversidade', d.supplier.diversity]
    ]),
    '', '## Impactos', '', markdownFields([
      ['Moeda da oferta', d.impact.currency], ['Unidade', d.impact.units], ['Impacto técnico', d.impact.technicalImpact], ['Valores técnicos', technicalValues],
      ['Ferramental', `${d.impact.toolingImpact} - ${d.impact.toolingAmount}`], ['SET', `${d.impact.setImpact} - ${d.impact.setAmount}`],
      ['Produção em série', `${d.impact.massProductionImpact} - ${d.impact.massProductionAmount}`], ['Pós-venda', `${d.impact.aftersalesImpact} - ${d.impact.aftersalesAmount}`],
      ['Embalagem específica', `${d.impact.packagingImpact} - ${d.impact.packagingAmount}`], ['Volume médio anual', d.impact.annualVolume], ['Impacto unitário', d.impact.unitImpact],
      ['Impacto anual', d.impact.annualImpact], ['Custos iniciais', d.impact.initialCosts]
    ]),
    '', '## Composição do preço da peça', '', markdownFields([
      ['CSR Impact', d.partPrice.csrImpact], ['Impacto no peso (g)', d.partPrice.weightImpact], ['Material', d.partPrice.material], ['Custo direto', d.partPrice.direct],
      ['Custo indireto', d.partPrice.indirect], ['Custos gerais + margem', d.partPrice.general], ['Embalagem', d.partPrice.packaging], ['Total', d.partPrice.total]
    ]),
    '', '## Ferramental e SET', '', markdownFields([
      ['Referência IDO', d.tooling.idoReference], ['Valor ferramental', d.tooling.amount], ['SET calculado', d.set.calculated], ['SET declarado', d.set.declared],
      ['Quantidade amortização', d.set.amortizationQuantity], ['Duração estimada', d.set.estimatedDuration], ['Taxa financeira', d.set.financialFeeRate],
      ['Custos financeiros', d.set.financialFeeAmount], ['Token', d.set.tokenAmount], ['Embalagem amortizada', d.set.amortizedPackaging]
    ]),
    '', '### Detalhamento SET', '', '| Seção | Descrição | Qtd. | Custo unitário | Total |', '|---|---|---:|---:|---:|', ...(setRows.length ? setRows : ['| — | — | — | — | — |']),
    '', '## Referências impactadas', '', '| Referência atual | Nova referência | Último preço | Impacto peça | Impacto Token | Observações |', '|---|---|---:|---:|---:|---|', ...(refs.length ? refs : ['| — | — | — | — | — | — |']),
    '', '## Antes / depois', '', markdownFields([
      ['Condição anterior', d.beforeAfter.before], ['Condição proposta', d.beforeAfter.after], ['Anexos anteriores', (d.beforeAfter.beforeFiles || []).join(', ')], ['Anexos propostos', (d.beforeAfter.afterFiles || []).join(', ')]
    ]),
    '', '## Capacidade', '', markdownFields([
      ['Capacidade anterior', d.capacity.previous], ['Nova capacidade', d.capacity.next], ['Variação', d.capacity.delta], ['Variação percentual', `${number(d.capacity.percent).toFixed(2)}%`]
    ]),
    '', '## DOA', '', markdownFields([
      ['Uso da peça', d.doa.partUsage], ['Escopos', d.doa.scopes], ['Custos iniciais', d.doa.initialCosts], ['Nível custos iniciais', d.doa.initialDoa],
      ['Impacto anual', d.doa.annualImpact], ['Nível FYI', d.doa.annualDoa], ['Observações', d.doa.notes]
    ]),
    '', '## Metadados', '', markdownFields([
      ['Código F4', getF4Code(item)], ['Versão', version], ['Status', item.status], ['Criado por', item.supplier], ['Última alteração', item.updatedAt], ['Responsável atual', item.currentAssignee?.name || item.responsible]
    ]), ''
  ].join('\n');
}

function buildHistoryMarkdown(entry) {
  const version = normalizeVersion(entry.version || currentVersion());
  const status = historyNewStatus(entry);
  const stateAtAction = {
    ...f4,
    status: status || f4.status,
    updatedAt: String(entry.date || f4.updatedAt || '').slice(0, 10) || f4.updatedAt
  };
  const isFinal = entry.step === 'final' || entry.finalApproval === true;
  const base = buildVersionMarkdown(stateAtAction, version, { final: isFinal });
  const details = markdownFields([
    ['Alteração', entry.label || entry.step || 'Alteração da F4'],
    ['Descrição', historyDescription(entry)],
    ['Novo status', status],
    ['Usuário responsável', entry.by || (entry.step === 'creation' ? f4.supplier : 'Sistema')],
    ['Setor', historySector(entry)],
    ['Data', dateTime(entry.date || f4.updatedAt)]
  ]);
  return `${base}\n\n## Registro desta alteração\n\n${details}\n`;
}

function createVersionSnapshot(version, { final = false, createdBy = profile.name } = {}) {
  f4.versionSnapshots = f4.versionSnapshots || {};
  f4.versionSnapshots[version] = {
    version,
    createdAt: new Date().toISOString(),
    createdBy,
    final,
    markdown: buildVersionMarkdown(f4, version, { final })
  };
}

function signatureFromHistory(entry) {
  return {
    id: `legacy-${entry.step}-${entry.date || Math.random().toString(16).slice(2)}`,
    decision: 'approve', step: entry.step, title: 'F4 aprovada por', name: entry.by || 'Responsável',
    sector: historySector(entry), date: entry.date || f4.updatedAt, version: entry.version || '1.0.0', validationCycle: entry.validationCycle || 1, valid: true
  };
}

function ensureVersioningState() {
  if (!f4) return;
  let changed = false;
  f4.history = Array.isArray(f4.history) ? f4.history : [];

  if (f4.versioningSchema !== 2) {
    let version = '1.0.0';
    let cycle = 1;
    let finalBumped = false;
    f4.history.forEach(entry => {
      if (entry.contentChange === true) version = incrementVersion(version);
      if (entry.step === 'cve' && entry.status === 'Aprovada' && !finalBumped) {
        version = incrementVersion(version);
        f4.finalVersion = version;
        finalBumped = true;
      }
      entry.version = version;
      entry.validationCycle = cycle;
      if (['Devolvida', 'Rejeitada'].includes(entry.status)) cycle += 1;
    });
    f4.currentVersion = version;
    f4.validationCycle = Math.max(1, cycle);
    f4.versioningSchema = 2;
    changed = true;
  }

  f4.currentVersion = normalizeVersion(f4.currentVersion || '1.0.0');
  f4.validationCycle = f4.validationCycle || 1;
  f4.versionSnapshots = f4.versionSnapshots || {};
  f4.history.forEach((entry, index) => {
    if (!entry.snapshotId) {
      entry.snapshotId = historySnapshotId(entry, index);
      changed = true;
    }
    if (!entry.markdownSnapshot) {
      entry.markdownSnapshot = buildHistoryMarkdown(entry);
      changed = true;
    }
  });
  f4.activeSignatures = Array.isArray(f4.activeSignatures) ? f4.activeSignatures : [];
  f4.signatureAudit = Array.isArray(f4.signatureAudit) ? f4.signatureAudit : [];
  f4.finalSignatures = Array.isArray(f4.finalSignatures) ? f4.finalSignatures : [];

  if (!f4.signatureAudit.length) {
    let active = [];
    let cycle = 1;
    f4.history.forEach(entry => {
      entry.validationCycle = entry.validationCycle || cycle;
      if (entry.status === 'Aprovada' && ['commercial','technical','manager','cve'].includes(entry.step)) {
        const signature = signatureFromHistory(entry);
        active = active.filter(item => item.step !== entry.step);
        active.push(signature);
        f4.signatureAudit.push(signature);
      }
      if (entry.status === 'Rejeitada' && ['commercial','technical','manager','cve'].includes(entry.step)) {
        f4.signatureAudit.push({
          id:`legacy-reject-${entry.step}-${entry.date || Math.random().toString(16).slice(2)}`,
          decision:'reject', step:entry.step, title:'F4 rejeitada por', name:entry.by || 'Responsável',
          sector:historySector(entry), date:entry.date || f4.updatedAt, version:entry.version || '1.0.0',
          validationCycle:entry.validationCycle || cycle, reason:entry.guidance || entry.rejectionReason || '', valid:true
        });
      }
      if (['Devolvida','Rejeitada'].includes(entry.status)) {
        const ids = new Set(active.map(item => item.id));
        f4.signatureAudit = f4.signatureAudit.map(item => ids.has(item.id)
          ? { ...item, valid:false, invalidatedAt:entry.date || new Date().toISOString(), invalidationReason:`Fluxo reiniciado após ${entry.status.toLowerCase()}.` }
          : item);
        active = [];
        cycle += 1;
      }
    });
    f4.activeSignatures = f4.status === 'Aprovada' ? active : active;
    if (f4.status === 'Aprovada') f4.finalSignatures = active;
    changed = true;
  }

  if (!f4.versionSnapshots['1.0.0']) {
    createVersionSnapshot('1.0.0', { createdBy: f4.supplier });
    changed = true;
  }
  if (f4.status === 'Rejeitada' && f4.currentStep === 'rejected') {
    f4.rejectedVersion = f4.rejectedVersion || f4.currentVersion;
    f4.currentStep = 'supplier';
    f4.returnedToProfile = 'supplier';
    f4.currentAssignee = { profileId:'supplier', name:f4.supplier, role:'Fornecedor' };
    f4.responsible = f4.supplier;
    f4.sector = 'Fornecedor';
    f4.stage = 'Versão rejeitada - aguardando correção';
    changed = true;
  }

  if (f4.status === 'Aprovada') {
    if (!f4.finalVersion) {
      f4.finalVersion = f4.currentVersion === '1.0.0' ? incrementVersion('1.0.0') : f4.currentVersion;
      f4.currentVersion = f4.finalVersion;
      changed = true;
    }
    if (!f4.versionSnapshots[f4.finalVersion]) {
      createVersionSnapshot(f4.finalVersion, { final: true, createdBy: latest('cve')?.by || 'CVE' });
      changed = true;
    }
  }
  if (changed) saveWorkflowState(f4);
}

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function cleanMarkdownText(value) {
  return String(value ?? '')
    .replaceAll('<br>', ' / ')
    .replace(/\\\|/g, '|')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/^[-*]\s+/, '• ')
    .trim();
}

function parseSnapshotMarkdown(markdown) {
  const documentData = { title: 'F4', meta: {}, sections: [] };
  const lines = String(markdown || '').split(/\r?\n/);
  let section = null;
  let subsection = null;

  const pushTable = table => {
    if (!section) return;
    const target = subsection || section;
    target.blocks = target.blocks || [];
    const headers = table[0] || [];
    const rows = table.slice(1);
    if (headers.length === 2 && normalize(headers[0]) === 'campo' && normalize(headers[1]) === 'valor') {
      target.blocks.push({ type: 'fields', fields: rows.map(row => ({ label: row[0] || '—', value: row[1] || '—' })) });
    } else {
      target.blocks.push({ type: 'table', headers, rows });
    }
  };

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i];
    const line = raw.trim();
    if (!line) continue;

    const h1 = line.match(/^#\s+(.*)$/);
    if (h1) { documentData.title = cleanMarkdownText(h1[1]); continue; }

    const h2 = line.match(/^##\s+(.*)$/);
    if (h2) {
      section = { title: cleanMarkdownText(h2[1]), blocks: [], subsections: [] };
      documentData.sections.push(section);
      subsection = null;
      continue;
    }

    const h3 = line.match(/^###\s+(.*)$/);
    if (h3 && section) {
      subsection = { title: cleanMarkdownText(h3[1]), blocks: [] };
      section.subsections.push(subsection);
      continue;
    }

    const meta = line.match(/^\*\*(.+?):\*\*\s*(.*?)\s*$/);
    if (meta && !section) {
      documentData.meta[cleanMarkdownText(meta[1])] = cleanMarkdownText(meta[2]);
      continue;
    }

    if (line.startsWith('|') && line.endsWith('|')) {
      const tableLines = [];
      while (i < lines.length) {
        const current = lines[i].trim();
        if (!current.startsWith('|') || !current.endsWith('|')) break;
        tableLines.push(current);
        i += 1;
      }
      i -= 1;
      const parsed = tableLines
        .filter(row => !/^\|\s*:?-{3,}/.test(row))
        .map(row => row.slice(1, -1).split('|').map(cell => cleanMarkdownText(cell)));
      if (parsed.length) pushTable(parsed);
      continue;
    }
  }
  return documentData;
}

const pdfSectionDesign = {
  'Solicitação': ['DADOS DA F4', 'Solicitação e contexto da modificação', 'Informações que explicam o que está sendo alterado e por quê.'],
  'Fornecedor': ['INFORMAÇÕES DO FORNECEDOR', 'Dados do fornecedor e identificação da proposta', 'Dados usados para identificar o responsável pela F4 e as condições de implementação.'],
  'Impactos': ['IMPACTOS DA F4', 'Síntese econômica e impactos', 'Valores consolidados usados nas análises comercial, técnica e financeira.'],
  'Composição do preço da peça': ['PREÇO DA PEÇA', 'Composição detalhada do preço', 'Detalhamento dos componentes econômicos considerados na proposta.'],
  'Ferramental e SET': ['CUSTOS INICIAIS', 'Ferramental, SET e amortização', 'Detalhes usados para validar ferramental, serviços de engenharia e condições financeiras.'],
  'Referências impactadas': ['REFERÊNCIAS', 'Referências impactadas pela modificação', 'Relação entre referências atuais, novas referências e seus respectivos impactos.'],
  'Antes / depois': ['COMPARATIVO', 'Condição antes e depois', 'Registro da condição atual e da condição proposta para implementação.'],
  'Capacidade': ['CAPACIDADE PRODUTIVA', 'Impacto de capacidade', 'Comparativo de capacidade antes e depois da implementação da F4.'],
  'DOA': ['ALÇADAS E APROVAÇÕES', 'DOA e níveis de decisão', 'Informações utilizadas para determinar os níveis de aprovação necessários.'],
  'Metadados': ['RASTREABILIDADE', 'Metadados da F4', 'Informações de identificação, versão, status e responsabilidade atual.'],
  'Registro desta alteração': ['HISTÓRICO DA F4', 'Registro desta alteração', 'Dados da movimentação que originou este snapshot do histórico.']
};

function wrapPdfText(text, maxChars = 92) {
  const source = String(text || '').replace(/\s+/g, ' ').trim();
  if (!source) return [''];
  const words = source.split(/\s+/);
  const lines = [];
  let current = '';
  words.forEach(word => {
    if (!current) { current = word; return; }
    if (`${current} ${word}`.length <= maxChars) current += ` ${word}`;
    else { lines.push(current); current = word; }
  });
  if (current) lines.push(current);
  return lines;
}

function wrapPdfTextByWidth(text, width, size = 8.5, bold = false) {
  const avg = size * (bold ? .56 : .51);
  return wrapPdfText(cleanMarkdownText(text), Math.max(8, Math.floor(width / avg)));
}

function winAnsiHex(text) {
  const special = new Map([
    ['€',0x80],['‚',0x82],['ƒ',0x83],['„',0x84],['…',0x85],['†',0x86],['‡',0x87],['ˆ',0x88],['‰',0x89],['Š',0x8A],['‹',0x8B],['Œ',0x8C],['Ž',0x8E],
    ['‘',0x91],['’',0x92],['“',0x93],['”',0x94],['•',0x95],['–',0x96],['—',0x97],['˜',0x98],['™',0x99],['š',0x9A],['›',0x9B],['œ',0x9C],['ž',0x9E],['Ÿ',0x9F]
  ]);
  let hex = '';
  for (const char of String(text ?? '')) {
    let code = char.charCodeAt(0);
    if (special.has(char)) code = special.get(char);
    else if (code > 255) code = 0x3F;
    hex += code.toString(16).padStart(2, '0').toUpperCase();
  }
  return hex;
}

function pdfTextOp(text, x, y, size = 9, bold = false, color = [0.12, 0.13, 0.15]) {
  return `BT /${bold ? 'F2' : 'F1'} ${size} Tf ${color.join(' ')} rg ${x.toFixed(2)} ${y.toFixed(2)} Td <${winAnsiHex(text)}> Tj ET\n`;
}

function pdfRoundedRectOp(x, y, width, height, radius = 8, { fill = [1,1,1], stroke = [.87,.87,.89], lineWidth = .7 } = {}) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  const k = .5522847498;
  const x2 = x + width;
  const y2 = y + height;
  return `q ${fill.join(' ')} rg ${stroke.join(' ')} RG ${lineWidth} w ` +
    `${(x+r).toFixed(2)} ${y.toFixed(2)} m ${(x2-r).toFixed(2)} ${y.toFixed(2)} l ` +
    `${(x2-r+k*r).toFixed(2)} ${y.toFixed(2)} ${x2.toFixed(2)} ${(y+r-k*r).toFixed(2)} ${x2.toFixed(2)} ${(y+r).toFixed(2)} c ` +
    `${x2.toFixed(2)} ${(y2-r).toFixed(2)} l ${x2.toFixed(2)} ${(y2-r+k*r).toFixed(2)} ${(x2-r+k*r).toFixed(2)} ${y2.toFixed(2)} ${(x2-r).toFixed(2)} ${y2.toFixed(2)} c ` +
    `${(x+r).toFixed(2)} ${y2.toFixed(2)} l ${(x+r-k*r).toFixed(2)} ${y2.toFixed(2)} ${x.toFixed(2)} ${(y2-r+k*r).toFixed(2)} ${x.toFixed(2)} ${(y2-r).toFixed(2)} c ` +
    `${x.toFixed(2)} ${(y+r).toFixed(2)} l ${x.toFixed(2)} ${(y+r-k*r).toFixed(2)} ${(x+r-k*r).toFixed(2)} ${y.toFixed(2)} ${(x+r).toFixed(2)} ${y.toFixed(2)} c B Q\n`;
}

function pdfLineOp(x1, y1, x2, y2, color = [.88,.88,.9], width = .6) {
  return `q ${color.join(' ')} RG ${width} w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S Q\n`;
}

function markdownPdfBlob(markdown, { title, version } = {}) {
  const doc = parseSnapshotMarkdown(markdown);
  const PAGE_W = 595.28;
  const PAGE_H = 841.89;
  const MARGIN_X = 30;
  const CONTENT_W = PAGE_W - MARGIN_X * 2;
  const TOP_START = 88;
  const BOTTOM_LIMIT = 54;
  const purple = [.31,.086,.722];
  const text = [.08,.08,.1];
  const muted = [.39,.40,.44];
  const border = [.86,.86,.88];
  const lavender = [.972,.958,.995];
  const pageBg = [.985,.985,.989];
  const white = [1,1,1];
  const pages = [];
  let stream = '';
  let top = TOP_START;

  const pageY = (topValue, height = 0) => PAGE_H - topValue - height;

  function startPage() {
    stream = `q ${pageBg.join(' ')} rg 0 0 ${PAGE_W} ${PAGE_H} re f Q\n`;
    stream += `q ${purple.join(' ')} rg ${MARGIN_X} ${(PAGE_H - 26).toFixed(2)} ${CONTENT_W} 2 re f Q\n`;
    stream += pdfTextOp('DOCUMENTO DA F4', MARGIN_X, PAGE_H - 45, 7.2, true, purple);
    const headerTitle = title || doc.title || 'F4';
    const headerLines = wrapPdfTextByWidth(headerTitle, 350, 11.5, true).slice(0, 2);
    headerLines.forEach((line, index) => { stream += pdfTextOp(line, MARGIN_X, PAGE_H - 61 - index * 13, 11.5, true, text); });
    const displayVersion = version || doc.meta['Versão'] || '—';
    const pillW = 103;
    const pillH = 24;
    stream += pdfRoundedRectOp(PAGE_W - MARGIN_X - pillW, PAGE_H - 67, pillW, pillH, 12, { fill: lavender, stroke: [.82,.75,.95], lineWidth: .7 });
    stream += pdfTextOp(`VERSÃO ${displayVersion}`, PAGE_W - MARGIN_X - pillW + 12, PAGE_H - 53, 7.4, true, purple);
    top = TOP_START;
  }

  function finishPage() {
    pages.push(stream);
  }

  function newPage() {
    finishPage();
    startPage();
  }

  function ensureSpace(height) {
    if (top + height > PAGE_H - BOTTOM_LIMIT) newPage();
  }

  function drawSectionHeader(sectionTitle) {
    const [kicker, heading, description] = pdfSectionDesign[sectionTitle] || ['INFORMAÇÕES DA F4', sectionTitle, 'Informações registradas nesta seção da F4.'];
    const descLines = wrapPdfTextByWidth(description, CONTENT_W - 28, 7.8, false);
    const height = 52 + Math.max(0, descLines.length - 1) * 9;
    ensureSpace(height + 8);
    const y = pageY(top, height);
    stream += pdfRoundedRectOp(MARGIN_X, y, CONTENT_W, height, 9, { fill: white, stroke: border, lineWidth: .7 });
    stream += pdfTextOp(kicker, MARGIN_X + 14, PAGE_H - top - 14, 6.8, true, purple);
    stream += pdfTextOp(heading, MARGIN_X + 14, PAGE_H - top - 30, 12.2, true, text);
    descLines.forEach((line, index) => { stream += pdfTextOp(line, MARGIN_X + 14, PAGE_H - top - 43 - index * 9, 7.8, false, muted); });
    top += height + 6;
  }

  const wideLabels = new Set(['descrição','causa da modificação','causa detalhada da modificação','observações','condição anterior','condição proposta','escopos']);

  function drawFieldCell(field, x, cellTop, width, height) {
    const y = pageY(cellTop, height);
    stream += pdfRoundedRectOp(x, y, width, height, 0, { fill: white, stroke: border, lineWidth: .55 });
    if (!field?.label && !field?.value) return;
    const label = cleanMarkdownText(field.label || '').toUpperCase();
    if (label) stream += pdfTextOp(label, x + 10, PAGE_H - cellTop - 14, 6.2, false, muted);
    const valueLines = wrapPdfTextByWidth(field.value || '—', width - 20, 8.4, true);
    valueLines.forEach((line, index) => { stream += pdfTextOp(line, x + 10, PAGE_H - cellTop - 31 - index * 10, 8.4, true, text); });
  }

  function fieldHeight(field, width) {
    const lines = wrapPdfTextByWidth(field.value || '—', width - 20, 8.4, true);
    return Math.max(50, 37 + Math.max(1, lines.length) * 10);
  }

  function drawFields(fields) {
    const gap = 0;
    const half = (CONTENT_W - gap) / 2;
    let pending = null;

    const flushPending = () => {
      if (!pending) return;
      const h = fieldHeight(pending, half);
      ensureSpace(h + 1);
      drawFieldCell(pending, MARGIN_X, top, half, h);
      drawFieldCell({ label:'', value:'' }, MARGIN_X + half, top, half, h);
      top += h;
      pending = null;
    };

    fields.forEach(field => {
      const isWide = wideLabels.has(normalize(field.label));
      if (isWide) {
        flushPending();
        const h = fieldHeight(field, CONTENT_W);
        ensureSpace(h + 1);
        drawFieldCell(field, MARGIN_X, top, CONTENT_W, h);
        top += h;
        return;
      }
      if (!pending) { pending = field; return; }
      const h = Math.max(fieldHeight(pending, half), fieldHeight(field, half));
      ensureSpace(h + 1);
      drawFieldCell(pending, MARGIN_X, top, half, h);
      drawFieldCell(field, MARGIN_X + half, top, half, h);
      top += h;
      pending = null;
    });
    flushPending();
    top += 8;
  }

  function drawSubheading(label) {
    ensureSpace(34);
    stream += pdfTextOp(label, MARGIN_X + 2, PAGE_H - top - 12, 9.2, true, text);
    stream += pdfLineOp(MARGIN_X, PAGE_H - top - 20, MARGIN_X + CONTENT_W, PAGE_H - top - 20, border, .6);
    top += 30;
  }

  function tableColumnWidths(headers) {
    const min = 54;
    const raw = headers.map(header => Math.max(7, Math.min(18, cleanMarkdownText(header).length)));
    const total = raw.reduce((a,b) => a+b, 0) || 1;
    let widths = raw.map(weight => Math.max(min, CONTENT_W * weight / total));
    const sum = widths.reduce((a,b)=>a+b,0);
    widths = widths.map(width => width * CONTENT_W / sum);
    return widths;
  }

  function drawTable(table) {
    const headers = table.headers || [];
    const rows = table.rows || [];
    if (!headers.length) return;
    const widths = tableColumnWidths(headers);
    const headerH = 28;

    const drawHeader = () => {
      ensureSpace(headerH + 2);
      let x = MARGIN_X;
      headers.forEach((header, index) => {
        const w = widths[index];
        const y = pageY(top, headerH);
        stream += pdfRoundedRectOp(x, y, w, headerH, 0, { fill: lavender, stroke: border, lineWidth: .55 });
        const lines = wrapPdfTextByWidth(header, w - 12, 6.3, true).slice(0, 2);
        lines.forEach((line, lineIndex) => { stream += pdfTextOp(line.toUpperCase(), x + 6, PAGE_H - top - 11 - lineIndex * 8, 6.3, true, muted); });
        x += w;
      });
      top += headerH;
    };

    drawHeader();
    rows.forEach(row => {
      const lineSets = row.map((cell, index) => wrapPdfTextByWidth(cell || '—', widths[index] - 12, 6.8, false));
      const rowH = Math.max(28, 14 + Math.max(...lineSets.map(lines => lines.length), 1) * 8.2);
      if (top + rowH > PAGE_H - BOTTOM_LIMIT) {
        newPage();
        drawHeader();
      }
      let x = MARGIN_X;
      row.forEach((cell, index) => {
        const w = widths[index];
        const y = pageY(top, rowH);
        stream += pdfRoundedRectOp(x, y, w, rowH, 0, { fill: white, stroke: border, lineWidth: .5 });
        lineSets[index].forEach((line, lineIndex) => { stream += pdfTextOp(line, x + 6, PAGE_H - top - 13 - lineIndex * 8.2, 6.8, false, text); });
        x += w;
      });
      top += rowH;
    });
    top += 9;
  }

  startPage();

  doc.sections.forEach(section => {
    drawSectionHeader(section.title);
    (section.blocks || []).forEach(block => {
      if (block.type === 'fields') drawFields(block.fields || []);
      if (block.type === 'table') drawTable(block);
    });
    (section.subsections || []).forEach(sub => {
      drawSubheading(sub.title);
      (sub.blocks || []).forEach(block => {
        if (block.type === 'fields') drawFields(block.fields || []);
        if (block.type === 'table') drawTable(block);
      });
    });
    top += 8;
  });

  finishPage();

  const objects = [null, '', '',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'
  ];
  const pageIds = [];
  pages.forEach((pageStream, pageIndex) => {
    let pageContent = pageStream;
    pageContent += pdfTextOp(`F4 ${String(doc.title || '').replace(/^F4\s+/i, '').split(' - ')[0] || ''}`, MARGIN_X, 28, 6.8, false, muted);
    pageContent += pdfTextOp(`Página ${pageIndex + 1} de ${pages.length}`, PAGE_W - MARGIN_X - 70, 28, 6.8, false, muted);
    const contentId = objects.push(`<< /Length ${new TextEncoder().encode(pageContent).length} >>\nstream\n${pageContent}endstream`) - 1;
    const pageId = objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`) - 1;
    pageIds.push(pageId);
  });
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;

  let pdf = '%PDF-1.4\n%Renault F4\n';
  const offsets = [0];
  for (let i = 1; i < objects.length; i += 1) {
    offsets[i] = new TextEncoder().encode(pdf).length;
    pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xref = new TextEncoder().encode(pdf).length;
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < objects.length; i += 1) pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([new TextEncoder().encode(pdf)], { type:'application/pdf' });
}

function downloadHistoryPdf(snapshotId) {
  const entry = (f4.history || []).find(item => item.snapshotId === snapshotId);
  if (!entry) return showToast('Não foi possível localizar essa alteração no histórico.');
  if (!entry.markdownSnapshot) {
    entry.markdownSnapshot = buildHistoryMarkdown(entry);
    saveWorkflowState(f4);
  }
  const code = getF4Code(f4).replace('/', '-');
  const safeLabel = String(entry.label || 'alteracao').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 45) || 'alteracao';
  const blob = markdownPdfBlob(entry.markdownSnapshot, { title:`F4 ${getF4Code(f4)} · ${entry.label || 'Alteração'}`, version:entry.version });
  downloadBlob(`${code}_v${entry.version}_${safeLabel}.pdf`, blob);
}

const SECTION_EDIT_FIELDS = {
  solicitacao: [
    ['request.title','Título da modificação','text'], ['request.description','Descrição','textarea'], ['request.changeCause','Causa detalhada da modificação','textarea'],
    ['request.vehicles','Veículos / órgãos','text'], ['request.changeOrigin','Origem da modificação','text'], ['request.scoppId','SCOPP Dev GAP ECO ID','text'],
    ['request.multidisciplinary','F4 multidisciplinar','text'], ['request.lupNumber','Número LUP','text'], ['request.setPayment','Modo de pagamento SET','text'],
    ['request.customerQualityLup','LUP de qualidade do cliente (QC)','text']
  ],
  fornecedor: [
    ['supplier.manager','Supplier F4 Manager','text'], ['supplier.plant','Supplier Plant','text'], ['supplier.position','Position','text'],
    ['supplier.alcor','Supplier Account (ALCOR)','text'], ['supplier.setAccount','Supplier Account for SET Order','text'], ['supplier.leadTime','Implementation Leadtime','text'],
    ['supplier.diversity','Diversidade','text']
  ],
  impactos: [
    ['impact.currency','Moeda da oferta','text'], ['impact.units','Unidade','text'], ['impact.technicalValues.0.value','Impacto técnico principal','number'],
    ['impact.toolingAmount','Valor de ferramental','number'], ['impact.setAmount','Valor SET','number'], ['impact.massProductionAmount','PDS Mass Production','number'],
    ['impact.aftersalesAmount','PDS Aftersales','number'], ['impact.packagingAmount','Embalagem específica','number'], ['impact.annualVolume','Volume médio anual','number']
  ],
  preco: [
    ['partPrice.csrImpact','CSR Impact','text'], ['partPrice.weightImpact','Impacto no peso (g)','number'], ['partPrice.material','Material','number'],
    ['partPrice.direct','Custo direto','number'], ['partPrice.indirect','Custo indireto','number'], ['partPrice.general','Custos gerais + margem','number'],
    ['partPrice.packaging','Embalagem da peça','number']
  ],
  'ferramental-set': [
    ['tooling.idoReference','Referência IDO','text'], ['impact.toolingAmount','Valor de ferramental','number'], ['impact.setAmount','Valor SET','number'],
    ['set.amortizationQuantity','Quantidade de amortização','number'], ['set.estimatedDuration','Duração estimada','text'], ['set.financialFeeRate','Taxa financeira (%)','number'],
    ['set.financialFeeAmount','Custos financeiros','number'], ['set.tokenAmount','Token','number'], ['set.amortizedPackaging','Embalagem específica amortizada','number']
  ],
  referencias: [
    ['references.0.current','Referência atual principal','text'], ['references.0.newRef','Nova referência principal','text'], ['references.0.partImpact','Impacto da referência principal','number'],
    ['references.0.tokenImpact','Impacto SET Token','number'], ['references.0.notes','Observação da referência principal','textarea'],
    ['references.1.current','Segunda referência atual','text'], ['references.1.newRef','Segunda nova referência','text'], ['references.1.notes','Observação da segunda referência','textarea']
  ],
  documentos: [
    ['beforeAfter.before','Condição anterior','textarea'], ['beforeAfter.after','Condição proposta','textarea']
  ],
  capacidade: [
    ['capacity.previous','Capacidade anterior','number'], ['capacity.next','Nova capacidade','number']
  ],
  doa: [
    ['doa.partUsage','Uso da peça','text'], ['doa.notes','Observações DOA','textarea']
  ]
};

const SECTION_TITLES = {
  solicitacao:'Solicitação', fornecedor:'Fornecedor', impactos:'Impactos', preco:'Preço da peça',
  'ferramental-set':'Ferramental / SET', referencias:'Referências', documentos:'Antes / depois', capacidade:'Capacidade', doa:'DOA', metadados:'Metadados'
};

const editableFields = Object.values(SECTION_EDIT_FIELDS).flat();

function getPathValue(source, path) {
  return path.split('.').reduce((value, key) => value?.[Number.isInteger(Number(key)) && String(Number(key)) === key ? Number(key) : key], source);
}
function setPathValue(target, path, value) {
  const keys = path.split('.');
  let cursor = target;
  keys.forEach((key, index) => {
    const numeric = Number.isInteger(Number(key)) && String(Number(key)) === key;
    const actual = numeric ? Number(key) : key;
    if (index === keys.length - 1) { cursor[actual] = value; return; }
    const nextKey = keys[index + 1];
    const nextIsNumeric = Number.isInteger(Number(nextKey)) && String(Number(nextKey)) === nextKey;
    if (cursor[actual] == null) cursor[actual] = nextIsNumeric ? [] : {};
    cursor = cursor[actual];
  });
}
function cloneValue(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}
function canEditContent() {
  return profile.id === 'supplier'
    && f4.currentStep === 'supplier'
    && ['Devolvida','Rejeitada','Rascunho'].includes(f4.status)
    && f4.returnedToProfile === 'supplier'
    && !!f4.returnOrigin;
}

let editingSectionId = null;

function visibleChangeSummary() {
  if (profile.id === 'supplier' && canEditContent()) return f4.pendingReviewChanges || {};
  return f4.lastSubmittedChanges || {};
}
function sectionChangeInfo(sectionId) {
  return visibleChangeSummary()?.[sectionId] || null;
}
function sectionChangedCount(sectionId) {
  const info = sectionChangeInfo(sectionId);
  return Array.isArray(info?.changes) ? info.changes.length : Array.isArray(info?.changedFields) ? info.changedFields.length : 0;
}
function pencilIcon() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16.9 3.4a2.1 2.1 0 0 1 3 3L9.2 17.1l-4.2 1 1-4.2L16.9 3.4Zm-9.4 11.2-.5 1.8 1.8-.5 8.8-8.8-1.3-1.3-8.8 8.8Z"/></svg>`;
}
function sectionEditButton(sectionId) {
  if (!canEditContent() || !SECTION_EDIT_FIELDS[sectionId]?.length) return '';
  const active = editingSectionId === sectionId;
  return `<button class="section-edit-button ${active ? 'is-active' : ''}" type="button" data-edit-section="${esc(sectionId)}" aria-label="${active ? 'Fechar edição' : 'Editar'} ${esc(SECTION_TITLES[sectionId] || sectionId)}" title="${active ? 'Fechar edição' : 'Editar esta seção'}">${pencilIcon()}</button>`;
}
function sectionEditorPanel(sectionId) {
  if (!canEditContent() || editingSectionId !== sectionId) return '';
  const d = getReviewData(f4);
  const controls = (SECTION_EDIT_FIELDS[sectionId] || []).map(([path,label,type]) => {
    const value = getPathValue(d, path) ?? '';
    const control = type === 'textarea'
      ? `<textarea name="${esc(path)}" rows="3">${esc(value)}</textarea>`
      : `<input name="${esc(path)}" type="${type}" ${type === 'number' ? 'step="0.001"' : ''} value="${esc(value)}">`;
    return `<label class="section-edit-field ${type === 'textarea' ? 'is-wide' : ''}"><span>${esc(label)}</span>${control}</label>`;
  }).join('');
  return `<form class="section-edit-form" data-edit-form="${esc(sectionId)}">
    <div class="section-edit-intro"><div><strong>Editar ${esc(SECTION_TITLES[sectionId] || sectionId)}</strong><span>Altere somente os campos necessários. Ao salvar uma mudança real será criada a próxima versão da F4.</span></div><span class="version-chip">${currentVersion()} → ${incrementVersion(currentVersion())}</span></div>
    <div class="section-edit-grid">${controls}</div>
    <div class="section-edit-footer"><button class="secondary-edit-button" type="button" data-cancel-section-edit>Cancelar</button><button class="primary-edit-button" type="submit">Salvar alterações desta seção</button></div>
  </form>`;
}
function mergePendingSectionChanges(sectionId, newChanges, version) {
  const pending = cloneValue(f4.pendingReviewChanges || {}) || {};
  const existing = pending[sectionId] || { sectionId, sectionTitle: SECTION_TITLES[sectionId] || sectionId, changes: [] };
  const byPath = new Map((existing.changes || []).map(change => [change.path, change]));
  newChanges.forEach(change => {
    const previous = byPath.get(change.path);
    byPath.set(change.path, previous ? { ...change, before: previous.before } : change);
  });
  pending[sectionId] = {
    ...existing,
    version,
    changedAt: new Date().toISOString(),
    changes: [...byPath.values()],
    changedFields: [...byPath.values()].map(change => change.label)
  };
  f4.pendingReviewChanges = pending;
}
function saveSectionEdition(form, sectionId) {
  const fields = SECTION_EDIT_FIELDS[sectionId] || [];
  if (!fields.length) return false;
  const before = getReviewData(f4);
  const staged = [];
  fields.forEach(([path,label,type]) => {
    const field = form.elements[path];
    if (!field) return;
    const value = type === 'number' ? number(field.value) : field.value.trim();
    const previous = getPathValue(before, path);
    const same = type === 'number' ? number(previous) === value : String(previous ?? '') === String(value ?? '');
    if (!same) staged.push({ path, label, type, before: previous, after: value });
  });
  if (!staged.length) {
    showToast('Nenhuma alteração foi identificada nesta seção.');
    return false;
  }
  const titleChange = staged.find(change => change.path === 'request.title');
  const descriptionChange = staged.find(change => change.path === 'request.description');
  if (titleChange && !String(titleChange.after).trim()) return showToast('O título da F4 não pode ficar vazio.'), false;
  if (descriptionChange && !String(descriptionChange.after).trim()) return showToast('A descrição da F4 não pode ficar vazia.'), false;

  f4.contentOverrides = f4.contentOverrides || {};
  staged.forEach(change => {
    setPathValue(f4.contentOverrides, change.path, change.after);
    if (change.path === 'request.title') f4.title = change.after;
    if (change.path === 'request.description') f4.description = change.after;
  });
  if ((f4.activeSignatures || []).length) invalidateCurrentApprovals('Conteúdo da F4 alterado pelo fornecedor.');
  const version = incrementVersion(currentVersion());
  f4.currentVersion = version;
  const now = new Date().toISOString();
  if (f4.status === 'Rejeitada') {
    f4.status = 'Rascunho';
    f4.stage = 'Nova versão em correção';
    f4.currentStep = 'supplier';
    f4.returnedToProfile = 'supplier';
    f4.currentAssignee = { profileId:'supplier', name:f4.supplier, role:'Fornecedor' };
    f4.responsible = f4.supplier;
    f4.sector = 'Fornecedor';
    f4.currentAssigneeSince = now;
  }
  mergePendingSectionChanges(sectionId, staged, version);
  appendHistory({
    step:'supplier', label:`Conteúdo alterado — ${SECTION_TITLES[sectionId] || sectionId}`, date:now,
    status:f4.status, newStatus:f4.status, by:profile.name, sector:'Fornecedor',
    description:`${staged.length} campo${staged.length === 1 ? '' : 's'} alterado${staged.length === 1 ? '' : 's'} nesta seção.`,
    contentChange:true, changedFields:staged.map(change => change.label), changeDetails:staged,
    sectionId, version
  });
  f4.updatedAt = now.slice(0,10);
  createVersionSnapshot(version, { createdBy: profile.name });
  saveWorkflowState(f4);
  return true;
}

function contentEditorPanel() { return ''; }

function printableField(label, value, { wide = false } = {}) {
  return `<div class="pdf-field ${wide ? 'is-wide' : ''}"><span>${esc(label)}</span><strong>${esc(value ?? '—')}</strong></div>`;
}
function printableSection(kicker, title, description, body) {
  return `<section class="section-card"><div class="section-head"><p>${esc(kicker)}</p><h2>${esc(title)}</h2><span>${esc(description)}</span></div>${body}</section>`;
}
function printableTable(headers, rows) {
  return `<div class="pdf-table-wrap"><table class="pdf-table"><thead><tr>${headers.map(header => `<th>${esc(header)}</th>`).join('')}</tr></thead><tbody>${rows.length ? rows.map(row => `<tr>${row.map(cell => `<td>${esc(cell ?? '—')}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${headers.length}">Nenhuma informação registrada.</td></tr>`}</tbody></table></div>`;
}
function signatureCard(signature) {
  const logoUrl = new URL('../../assets/images/logo-renault.png', import.meta.url).href;
  return `<article class="digital-signature"><div class="signature-brand"><img src="${logoUrl}" alt="Renault"></div><div class="signature-data"><strong>F4 aprovada por</strong><b>${esc(signature.name)}</b><span>${esc(signature.sector)}</span><span>${dateTime(signature.date)}</span></div></article>`;
}
function openFinalPdf() {
  if (f4.status !== 'Aprovada' || !f4.finalVersion) return showToast('O PDF final só fica disponível após a aprovação do CVE.');
  const win = window.open('', '_blank');
  if (!win) return showToast('Permita pop-ups para gerar o PDF final.');
  const d = getReviewData(f4);
  const signatures = f4.finalSignatures || [];
  const technicalValues = (d.impact.technicalValues || []).map(item => `${item.currency} ${item.value}`).join(' / ') || '—';
  const setRows = (d.set.rows || []).map(row => [row[0], row[1], row[2], row[3], number(row[2]) * number(row[3])]);
  const refs = (d.references || []).map(ref => [ref.current, ref.newRef, ref.lastPrice, ref.partImpact, ref.tokenImpact, ref.notes]);

  const sections = [
    printableSection('DADOS DA F4', 'Solicitação e contexto da modificação', 'Informações que explicam o que está sendo alterado e por quê.', `<div class="pdf-grid">
      ${printableField('Título da modificação', d.request.title, { wide:true })}${printableField('Descrição', d.request.description, { wide:true })}
      ${printableField('Causa detalhada da modificação', d.request.changeCause, { wide:true })}${printableField('Veículos / órgãos', d.request.vehicles)}
      ${printableField('Origem da modificação', d.request.changeOrigin)}${printableField('SCOPP Dev GAP ECO ID', d.request.scoppId)}
      ${printableField('F4 multidisciplinar', d.request.multidisciplinary)}${printableField('Número LUP', d.request.lupNumber)}
      ${printableField('Modo de pagamento SET', d.request.setPayment)}${printableField('LUP de qualidade do cliente (QC)', d.request.customerQualityLup)}
    </div>`),
    printableSection('INFORMAÇÕES DO FORNECEDOR', 'Dados do fornecedor e identificação da proposta', 'Dados usados para identificar o responsável pela F4 e as condições de implementação.', `<div class="pdf-grid">
      ${printableField('Corporate Name', d.supplier.corporateName)}${printableField('F4 Version', d.supplier.version)}
      ${printableField('Supplier F4 Manager', d.supplier.manager)}${printableField('Supplier Plant', d.supplier.plant)}
      ${printableField('Date', d.supplier.date)}${printableField('Position', d.supplier.position)}
      ${printableField('Supplier Account (ALCOR)', d.supplier.alcor)}${printableField('Supplier Account for SET Order', d.supplier.setAccount)}
      ${printableField('Implementation Leadtime', d.supplier.leadTime)}${printableField('Diversidade', d.supplier.diversity)}
    </div>`),
    printableSection('IMPACTOS DA F4', 'Síntese econômica e impactos', 'Valores consolidados usados nas análises comercial, técnica e financeira.', `<div class="pdf-grid">
      ${printableField('Moeda da oferta', d.impact.currency)}${printableField('Unidade', d.impact.units)}
      ${printableField('Impacto técnico', d.impact.technicalImpact)}${printableField('Valores técnicos', technicalValues)}
      ${printableField('Ferramental', `${d.impact.toolingImpact} - ${d.impact.toolingAmount}`)}${printableField('SET', `${d.impact.setImpact} - ${d.impact.setAmount}`)}
      ${printableField('Produção em série', `${d.impact.massProductionImpact} - ${d.impact.massProductionAmount}`)}${printableField('Pós-venda', `${d.impact.aftersalesImpact} - ${d.impact.aftersalesAmount}`)}
      ${printableField('Embalagem específica', `${d.impact.packagingImpact} - ${d.impact.packagingAmount}`)}${printableField('Volume médio anual', d.impact.annualVolume)}
      ${printableField('Impacto unitário', d.impact.unitImpact)}${printableField('Impacto anual', d.impact.annualImpact)}${printableField('Custos iniciais', d.impact.initialCosts)}
    </div>`),
    printableSection('PREÇO DA PEÇA', 'Composição detalhada do preço', 'Detalhamento dos componentes econômicos considerados na proposta.', `<div class="pdf-grid">
      ${printableField('CSR Impact', d.partPrice.csrImpact)}${printableField('Impacto no peso (g)', d.partPrice.weightImpact)}
      ${printableField('Material', d.partPrice.material)}${printableField('Custo direto', d.partPrice.direct)}
      ${printableField('Custo indireto', d.partPrice.indirect)}${printableField('Custos gerais + margem', d.partPrice.general)}
      ${printableField('Embalagem', d.partPrice.packaging)}${printableField('Total', d.partPrice.total)}
    </div>`),
    printableSection('CUSTOS INICIAIS', 'Ferramental, SET e amortização', 'Detalhes usados para validar ferramental, serviços de engenharia e condições financeiras.', `<div class="pdf-grid">
      ${printableField('Referência IDO', d.tooling.idoReference)}${printableField('Valor de ferramental', d.tooling.amount)}
      ${printableField('SET calculado', d.set.calculated)}${printableField('SET declarado', d.set.declared)}
      ${printableField('Quantidade de amortização', d.set.amortizationQuantity)}${printableField('Duração estimada', d.set.estimatedDuration)}
      ${printableField('Taxa financeira', d.set.financialFeeRate)}${printableField('Custos financeiros', d.set.financialFeeAmount)}
      ${printableField('Token', d.set.tokenAmount)}${printableField('Embalagem amortizada', d.set.amortizedPackaging)}
    </div><h3 class="subsection-title">SET - detalhamento dos custos</h3>${printableTable(['Seção','Descrição','Qtd.','Custo unitário','Total'], setRows)}`),
    printableSection('REFERÊNCIAS', 'Referências impactadas pela modificação', 'Relação entre referências atuais, novas referências e seus respectivos impactos.', printableTable(['Referência atual','Nova referência','Último preço','Impacto peça','Impacto Token','Observações'], refs)),
    printableSection('COMPARATIVO', 'Condição antes e depois', 'Registro da condição atual e da condição proposta para implementação.', `<div class="pdf-grid">
      ${printableField('Condição anterior', d.beforeAfter.before, { wide:true })}${printableField('Condição proposta', d.beforeAfter.after, { wide:true })}
      ${printableField('Anexos anteriores', (d.beforeAfter.beforeFiles || []).join(', '), { wide:true })}${printableField('Anexos propostos', (d.beforeAfter.afterFiles || []).join(', '), { wide:true })}
    </div>`),
    printableSection('CAPACIDADE PRODUTIVA', 'Impacto de capacidade', 'Comparativo de capacidade antes e depois da implementação da F4.', `<div class="pdf-grid">
      ${printableField('Capacidade anterior', d.capacity.previous)}${printableField('Nova capacidade', d.capacity.next)}
      ${printableField('Variação', d.capacity.delta)}${printableField('Variação percentual', `${number(d.capacity.percent).toFixed(2)}%`)}
    </div>`),
    printableSection('ALÇADAS E APROVAÇÕES', 'DOA e níveis de decisão', 'Informações utilizadas para determinar os níveis de aprovação necessários.', `<div class="pdf-grid">
      ${printableField('Uso da peça', d.doa.partUsage)}${printableField('Escopos', Array.isArray(d.doa.scopes) ? d.doa.scopes.join(', ') : d.doa.scopes, { wide:true })}
      ${printableField('Custos iniciais', d.doa.initialCosts)}${printableField('Nível custos iniciais', d.doa.initialDoa)}
      ${printableField('Impacto anual', d.doa.annualImpact)}${printableField('Nível FYI', d.doa.annualDoa)}
      ${printableField('Observações', d.doa.notes, { wide:true })}
    </div>`),
    printableSection('RASTREABILIDADE', 'Metadados da F4', 'Informações de identificação, versão, status e responsabilidade atual.', `<div class="pdf-grid">
      ${printableField('Código F4', getF4Code(f4))}${printableField('Versão', f4.finalVersion)}
      ${printableField('Status', 'Aprovada')}${printableField('Projeto', f4.project || '—')}
      ${printableField('Criado por', f4.supplier)}${printableField('Última alteração', f4.updatedAt)}
      ${printableField('Responsável atual', f4.currentAssignee?.name || f4.responsible)}${printableField('Aprovação final', dateTime(f4.finalApprovedAt))}
    </div>`)
  ].join('');

  win.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(getF4Code(f4))} - ${esc(f4.finalVersion)} FINAL</title><style>
    @page{size:A4;margin:12mm}*{box-sizing:border-box}html{background:#f8f8fa}body{margin:0;font-family:Arial,sans-serif;color:#15151a;font-size:9pt;background:#f8f8fa}.toolbar{position:sticky;top:0;z-index:10;display:flex;justify-content:flex-end;padding:10px 12px;background:#fff;border-bottom:1px solid #e1e1e5}.toolbar button{border:0;border-radius:8px;padding:10px 15px;background:#4f16b8;color:#fff;font-weight:700;cursor:pointer}main{max-width:920px;margin:0 auto;padding:18px 0}.pdf-header{display:grid;grid-template-columns:1fr auto;gap:18px;align-items:start;padding:18px 20px;margin-bottom:14px;background:#fff;border:1px solid #dedee4;border-top:3px solid #4f16b8;border-radius:12px}.pdf-header .eyebrow{margin:0 0 5px;color:#4f16b8;font-size:7pt;font-weight:700;letter-spacing:.08em}.pdf-header h1{font-size:17pt;margin:0}.pdf-header p{margin:6px 0 0;color:#666b76;font-size:8.5pt}.final-badge{align-self:center;border:1px solid #cdb9f5;border-radius:999px;padding:7px 11px;background:#f8f4ff;color:#4f16b8;font-size:8pt;font-weight:700;white-space:nowrap}.section-card{margin:0 0 14px;background:#fff;border:1px solid #dedee4;border-radius:12px;overflow:hidden;break-inside:auto}.section-head{padding:14px 16px 12px;border-bottom:1px solid #e2e2e7;break-after:avoid}.section-head p{margin:0 0 5px;color:#4f16b8;font-size:6.8pt;font-weight:700;letter-spacing:.08em}.section-head h2{margin:0;font-size:12.5pt}.section-head span{display:block;margin-top:5px;color:#666b76;font-size:8pt}.pdf-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.pdf-field{min-height:52px;padding:9px 11px;border-right:1px solid #e2e2e7;border-bottom:1px solid #e2e2e7;break-inside:avoid}.pdf-field:nth-child(2n){border-right:0}.pdf-field.is-wide{grid-column:1/-1;border-right:0}.pdf-field span{display:block;margin-bottom:5px;color:#666b76;font-size:6.5pt;text-transform:uppercase;letter-spacing:.02em}.pdf-field strong{display:block;font-size:8.5pt;line-height:1.45}.subsection-title{margin:14px 16px 8px;font-size:9.5pt}.pdf-table-wrap{padding:0 16px 15px;overflow:hidden}.pdf-table{width:100%;border-collapse:collapse;table-layout:fixed}.pdf-table th,.pdf-table td{border:1px solid #dedee4;padding:7px 6px;text-align:left;vertical-align:top;word-wrap:break-word}.pdf-table th{background:#f6f2fc;color:#62636d;font-size:6.5pt;text-transform:uppercase}.pdf-table td{font-size:7.5pt;line-height:1.35}.signature-section{padding:15px 16px}.signatures{display:grid;gap:10px}.digital-signature{display:grid;grid-template-columns:95px 1fr;min-height:82px;border:2px solid #4f16b8;border-radius:9px;overflow:hidden;break-inside:avoid}.signature-brand{display:grid;place-items:center;background:#f7f3ff;border-right:1px solid #d8c9f7;padding:10px}.signature-brand img{max-width:68px;max-height:44px;object-fit:contain}.signature-data{display:grid;align-content:center;gap:3px;padding:10px 13px}.signature-data strong{color:#4f16b8;font-size:8pt}.signature-data b{font-size:10.5pt}.signature-data span{color:#555b65;font-size:8pt}.footer{margin-top:18px;padding:10px 2px;border-top:1px solid #d8d8dd;color:#777b84;font-size:7.5pt}@media print{html,body{background:#fff}.toolbar{display:none}main{padding:0}.section-card,.pdf-header{box-shadow:none}}
  </style></head><body><div class="toolbar"><button onclick="window.print()">Salvar / imprimir PDF</button></div><main>
    <header class="pdf-header"><div><p class="eyebrow">DOCUMENTO FINAL DA F4</p><h1>F4 ${esc(getF4Code(f4))}</h1><p>${esc(d.request.title)}</p></div><span class="final-badge">VERSÃO ${esc(f4.finalVersion)} - FINAL</span></header>
    ${sections}
    <section class="section-card"><div class="section-head"><p>ASSINATURAS DIGITAIS</p><h2>Assinaturas da versão final</h2><span>Somente as aprovações válidas do ciclo que concluiu esta versão aparecem neste documento.</span></div><div class="signature-section"><div class="signatures">${signatures.map(signatureCard).join('') || '<p>Nenhuma assinatura válida registrada.</p>'}</div></div></section>
    <div class="footer">Documento final da F4 ${esc(getF4Code(f4))}, versão ${esc(f4.finalVersion)}. Gerado pelo sistema F4.</div>
  </main><script>window.addEventListener('load',()=>setTimeout(()=>window.print(),300));<\/script></body></html>`);
  win.document.close();
}

const commentsKey = () => `f4-section-comments-${f4?.id || 'unknown'}`;
function getComments() {
  try { return JSON.parse(localStorage.getItem(commentsKey()) || '[]'); }
  catch { return []; }
}
function saveComments(comments) { localStorage.setItem(commentsKey(), JSON.stringify(comments)); }
function commentsPanel(sectionId, sectionTitle) {
  const comments = getComments().filter(comment => comment.sectionId === sectionId);
  return `<div class="section-comments" data-comments-section="${esc(sectionId)}">
    <div class="section-comments-head">
      <div><strong>Comentários desta seção</strong><span>${comments.length ? `${comments.length} comentário${comments.length === 1 ? '' : 's'} registrado${comments.length === 1 ? '' : 's'}` : 'Nenhum comentário registrado'}</span></div>
      <button class="section-comment-toggle" type="button" data-section-id="${esc(sectionId)}">+ Adicionar comentário</button>
    </div>
    <div class="section-comment-list">
      ${comments.map(comment => `<article class="section-comment-entry">
        <div class="section-comment-avatar">${esc((comment.author || '?').split(' ').map(v => v[0]).slice(0, 2).join(''))}</div>
        <div><div class="section-comment-meta"><strong>${esc(comment.author)}</strong><span>${esc(comment.role || '')} · ${dateTime(comment.createdAt)}</span></div><p>${esc(comment.text)}</p></div>
      </article>`).join('')}
    </div>
    <form class="section-comment-form" data-section-id="${esc(sectionId)}" data-section-title="${esc(sectionTitle)}" hidden>
      <label><span>Novo comentário</span><textarea maxlength="1200" placeholder="Registre uma observação, dúvida ou ponto que precisa ser verificado nesta parte da F4."></textarea></label>
      <div><small>O comentário ficará associado a esta seção e à F4 ${esc(getF4Code(f4))}.</small><span><button class="comment-cancel-button" type="button">Cancelar</button><button class="comment-save-button" type="submit">Salvar comentário</button></span></div>
    </form>
  </div>`;
}

function field(label, value, options = {}) {
  return `<div class="review-data-field ${options.wide ? 'is-wide' : ''}"><span>${esc(label)}</span><strong>${esc(value ?? '—')}</strong>${options.help ? `<small>${esc(options.help)}</small>` : ''}</div>`;
}
function sectionCard(id, kicker, title, description, body) {
  const changedCount = sectionChangedCount(id);
  const isEditing = editingSectionId === id;
  return `<section class="card detail-card validation-data-section ${changedCount ? 'has-edits' : ''} ${isEditing ? 'is-editing' : ''}" id="section-${esc(id)}">
    <div class="detail-section-heading"><div><p class="detail-kicker">${esc(kicker)}</p><h3>${esc(title)}</h3><p>${esc(description)}</p></div><div class="section-heading-actions">${changedCount ? `<span class="section-edited-badge">${changedCount} campo${changedCount === 1 ? '' : 's'} alterado${changedCount === 1 ? '' : 's'}</span>` : ''}${sectionEditButton(id)}</div></div>
    ${isEditing ? sectionEditorPanel(id) : body}
    ${commentsPanel(id, title)}
  </section>`;
}
function fileList(files = []) {
  if (!files.length) return '<span class="empty-value">Nenhum anexo informado.</span>';
  return `<div class="attachment-list">${files.map(name => `<span class="attachment-pill"><span>↳</span>${esc(name)}</span>`).join('')}</div>`;
}
function reviewNavigation() {
  const items = [
    ['solicitacao', 'Solicitação'], ['fornecedor', 'Fornecedor'], ['impactos', 'Impactos'], ['preco', 'Preço da peça'],
    ['ferramental-set', 'Ferramental / SET'], ['referencias', 'Referências'], ['documentos', 'Antes / depois'],
    ['capacidade', 'Capacidade'], ['doa', 'DOA'], ['metadados', 'Metadados']
  ];
  return `<nav class="review-section-nav" aria-label="Seções da F4">${items.map(([id, label]) => {
    const count = sectionChangedCount(id);
    return `<a href="#section-${id}" class="${count ? 'has-edits' : ''}"><span>${label}</span>${count ? `<b class="nav-edit-count" title="${count} campo${count === 1 ? '' : 's'} alterado${count === 1 ? '' : 's'}">${count}</b>` : ''}</a>`;
  }).join('')}</nav>`;
}

function fullReviewSections() {
  const d = getReviewData(f4);
  const i = d.impact;
  const p = d.partPrice;
  const s = d.set;
  const technicalCurrencies = i.technicalValues.map((item, index) => field(index === 0 ? 'Impacto técnico principal' : `${index + 1}ª moeda do impacto`, `${money(item.value, item.currency, 3)} / ${i.units}`)).join('');
  const request = sectionCard('solicitacao', 'Dados da F4', 'Solicitação e contexto da modificação', 'Informações que explicam o que está sendo alterado e por quê.', `
    <div class="review-data-grid">
      ${field('Título da modificação', d.request.title, { wide: true })}
      ${field('Descrição', d.request.description, { wide: true })}
      ${field('Causa detalhada da modificação', d.request.changeCause, { wide: true })}
      ${field('Veículos / órgãos', d.request.vehicles)}
      ${field('Origem da modificação', d.request.changeOrigin)}
      ${field('SCOPP Dev GAP ECO ID', d.request.scoppId)}
      ${field('F4 multidisciplinar', d.request.multidisciplinary)}
      ${field('Número LUP', d.request.lupNumber)}
      ${field('Modo de pagamento SET', d.request.setPayment)}
      ${field('LUP de qualidade do cliente (QC)', d.request.customerQualityLup)}
    </div>`);

  const supplier = sectionCard('fornecedor', 'Informações do fornecedor', 'Dados do fornecedor e identificação da proposta', 'Dados usados para identificar o responsável pela F4 e as condições de implementação.', `
    <div class="review-data-grid">
      ${field('Corporate Name', d.supplier.corporateName)}
      ${field('F4 Version', d.supplier.version)}
      ${field('Supplier F4 Manager', d.supplier.manager)}
      ${field('Supplier Plant', d.supplier.plant)}
      ${field('Date', d.supplier.date)}
      ${field('Position', d.supplier.position)}
      ${field('Supplier Account (ALCOR)', d.supplier.alcor)}
      ${field('Supplier Account for SET Order', d.supplier.setAccount)}
      ${field('Implementation Leadtime', d.supplier.leadTime)}
      ${field('Diversidade', d.supplier.diversity)}
    </div>`);

  const impact = sectionCard('impactos', 'Síntese econômica', 'Impactos econômicos e valores consolidados', 'Resumo dos impactos declarados para análise comercial, técnica e de aprovação.', `
    <div class="review-data-grid">
      ${field('Moeda da proposta', i.currency)}
      ${field('Unidade', i.units)}
      ${field('Impacto em múltiplas moedas', i.multiCurrency)}
      ${field('Technical Price Impact', i.technicalImpact)}
      ${technicalCurrencies}
      ${field('Tooling Impact', `${i.toolingImpact} · ${money(i.toolingAmount, i.currency)}`)}
      ${field('SET Impact', `${i.setImpact} · ${money(i.setAmount, i.currency)}`)}
      ${field('PDS — Produção em série', `${i.massProductionImpact} · ${money(i.massProductionAmount, i.currency, 3)} / ${i.units}`)}
      ${field('PDS — Pós-venda', `${i.aftersalesImpact} · ${money(i.aftersalesAmount, i.currency, 3)} / ${i.units}`)}
      ${field('Specific Packaging Total Cost Impact', `${i.packagingImpact} · ${money(i.packagingAmount, i.currency)}`)}
      ${field('Average Full Year Volume', `${i.annualVolume.toLocaleString('pt-BR')} ${i.units}/ano`)}
      ${field('Capacity Impact', i.capacityImpact)}
    </div>
    <div class="review-metric-grid">
      <div><span>Unit Impact (w/o SET)</span><strong>${money(i.unitImpact, i.currency, 3)}</strong><small>por ${i.units.toLowerCase()}</small></div>
      <div><span>Full Year Average Impact</span><strong>${money(i.annualImpact, i.currency)}</strong><small>por ano</small></div>
      <div><span>Total Initial Costs Impact</span><strong>${money(i.initialCosts, i.currency)}</strong><small>Ferramental + SET + embalagem</small></div>
    </div>`);

  const partPrice = sectionCard('preco', 'Breakdown', 'Composição do preço da peça', 'Detalhamento do impacto técnico declarado e conferência do valor total.', `
    <div class="review-data-grid">
      ${field('CSR Impact', p.csrImpact)}
      ${field('Weight Impact', `${p.weightImpact > 0 ? '+' : ''}${p.weightImpact} g`)}
      ${field('Material', money(p.material, i.currency, 3))}
      ${field('Custo direto', money(p.direct, i.currency, 3))}
      ${field('Custo indireto', money(p.indirect, i.currency, 3))}
      ${field('Custos gerais + margem', money(p.general, i.currency, 3))}
      ${field('Embalagem', money(p.packaging, i.currency, 3))}
    </div>
    <div class="review-metric-grid">
      <div><span>Impacto calculado no preço</span><strong>${money(p.total, i.currency, 3)}</strong></div>
      <div><span>Valor declarado</span><strong>${money(p.declared, i.currency, 3)}</strong></div>
      <div><span>Diferença</span><strong>${money(p.difference, i.currency, 3)}</strong></div>
    </div>`);

  const setRows = s.rows.map(row => `<tr><td>${esc(row[0])}</td><td>${esc(row[1])}</td><td>${number(row[2]).toLocaleString('pt-BR')}</td><td>${money(row[3], i.currency)}</td><td>${money(row[2] * row[3], i.currency)}</td></tr>`).join('');
  const toolingSet = sectionCard('ferramental-set', 'Custos iniciais', 'Ferramental, SET e amortização', 'Detalhes usados para validar ferramental, serviços de engenharia e condições financeiras.', `
    <div class="subsection-block"><div class="subsection-title"><h4>Ferramental</h4></div><div class="review-data-grid">
      ${field('Referência IDO', d.tooling.idoReference)}
      ${field('Valor de ferramental', money(d.tooling.amount, i.currency))}
    </div></div>
    <div class="subsection-block"><div class="subsection-title"><h4>SET — detalhamento dos custos</h4></div>
      <div class="review-table-wrap"><table class="review-table"><thead><tr><th>Seção</th><th>Descrição</th><th>Qtd.</th><th>Custo unitário</th><th>Total</th></tr></thead><tbody>${setRows}</tbody></table></div>
      <div class="review-metric-grid compact">
        <div><span>Total SET sem custos financeiros</span><strong>${money(s.calculated, i.currency)}</strong></div>
        <div><span>SET declarado</span><strong>${money(s.declared, i.currency)}</strong></div>
        <div><span>Diferença</span><strong>${money(s.difference, i.currency)}</strong></div>
      </div>
    </div>
    <div class="subsection-block"><div class="subsection-title"><h4>Amortização e condições financeiras</h4></div><div class="review-data-grid">
      ${field('Quantidade para amortização', `${s.amortizationQuantity.toLocaleString('pt-BR')} peças`)}
      ${field('Duração estimada', s.estimatedDuration)}
      ${field('Taxa financeira', percent(s.financialFeeRate))}
      ${field('Custos financeiros', money(s.financialFeeAmount, i.currency))}
      ${field('Token', money(s.tokenAmount, i.currency))}
      ${field('Embalagem específica amortizada', money(s.amortizedPackaging, i.currency))}
    </div></div>`);

  const referenceRows = d.references.map(ref => `<tr><td>${esc(ref.current)}</td><td>${money(ref.lastPrice, i.currency, 3)}</td><td>${esc(ref.diversity)}</td><td>${esc(ref.newRef)}</td><td>${money(ref.partImpact, i.currency, 3)}</td><td>${money(ref.tokenImpact, i.currency, 3)}</td><td>${money(ref.partImpact + ref.tokenImpact, i.currency, 3)}</td><td>${esc(ref.notes)}</td></tr>`).join('');
  const references = sectionCard('referencias', 'Referências impactadas', 'IMPACTED REFS', 'Relação das referências atuais, novas referências e impactos unitários associados.', `
    <div class="review-table-wrap"><table class="review-table wide-table"><thead><tr><th>Current Reference</th><th>Last Validated Price</th><th>Diversity Added</th><th>New Reference</th><th>Part Price Impact w/o Token</th><th>SET Token Impact</th><th>Total Impact</th><th>Other Information</th></tr></thead><tbody>${referenceRows}</tbody></table></div>`);

  const docs = sectionCard('documentos', 'Documentação técnica', 'Condição antes e depois da modificação', 'Informações e anexos usados para comparar a condição atual com a solução proposta.', `
    <div class="before-after-grid">
      <article><span class="compare-label">Antes</span><p>${esc(d.beforeAfter.before)}</p><div><strong>Anexos</strong>${fileList(d.beforeAfter.beforeFiles)}</div></article>
      <article><span class="compare-label proposed">Depois</span><p>${esc(d.beforeAfter.after)}</p><div><strong>Anexos</strong>${fileList(d.beforeAfter.afterFiles)}</div></article>
    </div>`);

  const capacity = sectionCard('capacidade', 'Impacto industrial', 'Capacidade produtiva', 'Comparação da capacidade semanal antes e depois da implementação.', `
    <div class="review-metric-grid">
      <div><span>Capacidade anterior</span><strong>${d.capacity.previous.toLocaleString('pt-BR')}</strong><small>peças/semana</small></div>
      <div><span>Nova capacidade</span><strong>${d.capacity.next.toLocaleString('pt-BR')}</strong><small>peças/semana</small></div>
      <div><span>Variação</span><strong>${d.capacity.delta > 0 ? '+' : ''}${d.capacity.delta.toLocaleString('pt-BR')}</strong><small>${d.capacity.percent > 0 ? '+' : ''}${percent(d.capacity.percent)}</small></div>
    </div>`);

  const doa = sectionCard('doa', 'Aprovação econômica', 'Validação DOA', 'Escopo da modificação e nível de aprovação estimado pelo impacto econômico.', `
    <div class="review-data-grid">
      ${field('Uso da peça', d.doa.partUsage)}
      ${field('Condições de escopo', d.doa.scopes.join(' · '), { wide: true })}
    </div>
    <div class="review-metric-grid">
      <div><span>Custos iniciais</span><strong>${money(d.doa.initialCosts, i.currency)}</strong><small>Nível estimado: ${esc(d.doa.initialDoa)}</small></div>
      <div><span>Impacto médio anual</span><strong>${money(d.doa.annualImpact, i.currency)}</strong><small>Nível estimado: ${esc(d.doa.annualDoa)}</small></div>
    </div>
    <div class="review-note-box"><strong>Observações DOA</strong><p>${esc(d.doa.notes)}</p></div>`);

  const metadata = sectionCard('metadados', 'Rastreabilidade', 'Metadados e governança da F4', 'Informações sistêmicas utilizadas para rastrear versão, autoria, responsável e documentação.', `
    <div class="review-data-grid">
      ${field('ID / Código F4', d.metadata.code)}
      ${field('Versão', d.metadata.version)}
      ${field('Status', d.metadata.status)}
      ${field('Projeto', d.metadata.project)}
      ${field('Criado por', d.metadata.createdBy)}
      ${field('Criado em', d.metadata.createdAt)}
      ${field('Última alteração', d.metadata.updatedAt)}
      ${field('Responsável atual', d.metadata.currentResponsible)}
      ${field('Anexos registrados', `${d.metadata.attachmentCount} arquivos`)}
    </div>`);

  return request + supplier + impact + partPrice + toolingSet + references + docs + capacity + doa + metadata;
}

function approvalPanel() {
  const rows = [
    ['commercial', 'Validação comercial', 'Compras'],
    ['technical', 'Validação técnica', 'Engenharia'],
    ['manager', 'Decisão do gerente', 'Gerente do projeto'],
    ['cve', 'Decisão final', 'CVE']
  ];
  return `<section class="card detail-card"><div class="detail-section-heading"><div><p class="detail-kicker">Aprovações</p><h3>Fluxo de validação</h3><p>O status é derivado do fluxo registrado para esta F4.</p></div></div><div class="approval-list">${rows.map(([key, label, sector]) => {
    const h = latestInCurrentCycle(key), status = approvalStatus(key);
    return `<div class="approval-row"><div><strong>${label}</strong><small>${sector}${h?.by ? ` · ${esc(h.by)}` : ''}</small></div><div class="approval-row-status"><span class="review-status ${cls(status)}">${status}</span><small>${h?.date ? dateTime(h.date) : 'Ainda não iniciada'}</small></div></div>`;
  }).join('')}</div></section>`;
}
function guidancePanel() {
  const notes = (f4.history || []).filter(h => h.guidance || h.status === 'Devolvida');
  return `<section class="card detail-card"><div class="detail-section-heading"><div><p class="detail-kicker">Orientações</p><h3>Pendências e pontos de correção</h3><p>Devoluções e justificativas ficam centralizadas nesta F4.</p></div></div>${notes.length ? `<div class="guidance-list">${notes.map(note => `<article class="guidance-entry"><div><strong>${esc(note.label)}</strong><small>${dateTime(note.date)}${note.returnedTo ? ` · devolvida para ${esc(note.returnedTo)}` : ''}</small></div>${note.guidance ? `<p>${esc(note.guidance)}</p>` : ''}</article>`).join('')}</div>` : `<div class="empty-guidance"><strong>Nenhuma orientação registrada.</strong><span>Quando houver devolução ou recusa, a justificativa aparecerá aqui.</span></div>`}</section>`;
}
function processTimeline() {
  const required = [
    ['creation', 'Criação'], ['commercial', 'Validação comercial'], ['technical', 'Validação técnica'],
    ['manager', 'Decisão do gerente'], ['cve', 'Decisão do CVE'], ['final', f4.status === 'Rejeitada' ? 'Cancelada' : 'Aprovada / cancelada']
  ];
  return `<div class="process-timeline">${required.map(([step, label]) => {
    const h = step === 'creation' || step === 'final' ? latest(step) : latestInCurrentCycle(step);
    const current = (step === 'commercial' && f4.currentStep === 'commercial') ||
      (step === 'technical' && f4.currentStep === 'technical') ||
      (step === 'manager' && f4.currentStep === 'manager') ||
      (step === 'cve' && f4.currentStep === 'cve') ||
      (step === 'creation' && ['creation', 'supplier'].includes(f4.currentStep));
    const done = !!h && ['Aprovada', 'Concluída', 'Rejeitada'].includes(h.status);
    return `<div class="process-row ${done ? 'done' : ''} ${current ? 'current' : ''}"><span class="process-dot"></span><div><strong>${label}</strong><small>${h?.date ? fmt(h.date) : '—'}${h?.status ? ` · ${h.status}` : ''}</small></div></div>`;
  }).join('')}${(() => {
    const lastReturn = [...(f4.history || [])].reverse().find(h => h.status === 'Devolvida');
    return lastReturn ? `<div class="return-event"><span>↩</span><div><strong>Devolvida para ${esc(lastReturn.returnedTo || 'correção')}</strong><small>${fmt(lastReturn.date)} · por ${esc(lastReturn.by || 'área responsável')}</small></div></div>` : '';
  })()}</div>`;
}

function actionWorkspace() {
  if (f4.status === 'Aprovada') return '';
  if (profile.id === 'supplier' && f4.currentStep === 'supplier') {
    if (f4.status === 'Rejeitada') {
      return `<section class="card detail-card action-workspace rejected-version-workspace"><div class="detail-section-heading"><div><p class="detail-kicker">Versão rejeitada</p><h3>Crie uma nova versão antes de reenviar</h3><p>O motivo da rejeição permanece registrado no histórico. Use o lápis nas seções indicadas, altere os dados necessários e salve para gerar a próxima versão.</p></div><span class="responsibility-chip">Versão rejeitada ${currentVersion()}</span></div></section>`;
    }
    if (['Devolvida','Rascunho'].includes(f4.status)) {
      return `<section class="card detail-card action-workspace"><div class="detail-section-heading"><div><p class="detail-kicker">Sua responsabilidade</p><h3>Correção pelo fornecedor</h3><p>Revise as orientações, faça as alterações de conteúdo necessárias e reenvie a F4 para a validação comercial.</p></div></div><div class="review-form-footer"><span>O reenvio não muda a versão; somente a edição de conteúdo gera uma nova versão.</span><button class="review-submit-button" id="resubmitButton">Reenviar para validação comercial</button></div></section>`;
    }
  }
  const cfg = roleConfig[profile.id];
  if (!cfg) return '';
  if (f4.currentStep !== profile.id) {
    return `<section class="card detail-card waiting-workspace"><div class="detail-section-heading"><div><p class="detail-kicker">Sua responsabilidade</p><h3>${cfg.title}</h3><p>Esta F4 não está aguardando uma decisão deste perfil neste momento.</p></div><span class="responsibility-chip">Responsável atual: ${esc(f4.currentAssignee?.role || f4.sector)}</span></div></section>`;
  }
  return `<section class="card detail-card review-workspace"><div class="detail-section-heading review-heading"><div><p class="detail-kicker">Sua responsabilidade</p><h3>${cfg.title}</h3><p>Registre a decisão após revisar todas as informações da F4 acima.</p></div><span class="responsibility-chip">${cfg.subtitle}</span></div><form id="roleReviewForm" class="role-review-form"><fieldset class="review-decision-group"><legend>Decisão</legend><div class="review-decision-grid"><label class="review-decision-option"><input type="radio" name="decision" value="approve"><span class="decision-icon approve">✓</span><span><strong>Aprovar</strong><small>${profile.id === 'commercial' ? 'Encaminhar para Engenharia.' : profile.id === 'technical' ? 'Encaminhar para o gerente do projeto.' : profile.id === 'manager' ? 'Encaminhar para decisão do CVE.' : 'Concluir a F4 como aprovada.'}</small></span></label><label class="review-decision-option"><input type="radio" name="decision" value="return"><span class="decision-icon return">↩</span><span><strong>Devolver para correção</strong><small>Exige indicação do ponto com erro e orientação.</small></span></label><label class="review-decision-option"><input type="radio" name="decision" value="reject"><span class="decision-icon reject">×</span><span><strong>Não aprovar</strong><small>Encerra a F4 como rejeitada e exige justificativa.</small></span></label></div></fieldset><div class="correction-fields" id="correctionFields" hidden><fieldset class="error-location-group"><legend>Onde está o erro ou ponto de atenção? <b>*</b></legend><p>Marque uma ou mais áreas.</p><div class="error-location-grid">${cfg.areas.map(area => `<label><input type="checkbox" name="area" value="${esc(area)}"><span>${esc(area)}</span></label>`).join('')}</div></fieldset><label class="review-guidance-field"><span id="guidanceLabel">Orientações para correção <b>*</b></span><textarea id="guidanceField" name="guidance" maxlength="1600" placeholder="Explique o problema, o que precisa ser corrigido e o resultado esperado."></textarea><small id="guidanceHelp">O texto ficará visível para quem receber a F4.</small></label></div><div class="review-form-footer"><span>Responsável: ${esc(profile.name)} · ${esc(profile.role)}</span><button class="review-submit-button" type="submit">Registrar decisão</button></div></form></section>`;
}

function transition(decision, areas, guidance) {
  const now = new Date().toISOString();
  const step = profile.id;
  const label = roleConfig[step].title;
  const cycle = f4.validationCycle || 1;
  f4.history = f4.history || [];

  if (decision === 'reject') {
    const rejectionSignature = signatureFor('reject', step, now, guidance);
    registerSignature(rejectionSignature, { active: false });
    appendHistory({
      step, label: `${label} - rejeição`, date: now, status: 'Rejeitada', newStatus: 'Rejeitada', by: profile.name,
      sector: historySectorByStep[step], guidance, rejectionReason: guidance, errorAreas: areas, validationCycle: cycle
    });
    invalidateCurrentApprovals(`F4 rejeitada por ${profile.name}.`);
    f4.rejectedVersion = currentVersion();
    f4.status = 'Rejeitada';
    f4.stage = 'Versão rejeitada - aguardando correção';
    f4.currentStep = 'supplier';
    f4.returnedToProfile = 'supplier';
    f4.returnOrigin = profile.id;
    f4.currentAssignee = { profileId:'supplier', name:f4.supplier, role:'Fornecedor' };
    f4.responsible = f4.supplier;
    f4.sector = 'Fornecedor';
    f4.currentAssigneeSince = now;
    f4.pendingReviewChanges = {};
    f4.lastSubmittedChanges = {};
  } else if (decision === 'return') {
    appendHistory({
      step, label, date: now, status: 'Devolvida', newStatus: 'Devolvida', by: profile.name,
      sector: historySectorByStep[step], returnedTo: 'Fornecedor', guidance, errorAreas: areas, validationCycle: cycle
    });
    invalidateCurrentApprovals(`F4 devolvida para correção por ${profile.name}.`);
    f4.status = 'Devolvida';
    f4.stage = 'Correção pelo fornecedor';
    f4.currentStep = 'supplier';
    f4.returnedToProfile = 'supplier';
    f4.returnOrigin = profile.id;
    f4.currentAssignee = { profileId: 'supplier', name: f4.supplier, role: 'Fornecedor' };
    f4.responsible = f4.supplier;
    f4.sector = 'Fornecedor';
    f4.currentAssigneeSince = now;
    f4.pendingReviewChanges = {};
    f4.lastSubmittedChanges = {};
  } else {
    const next = {
      commercial: ['technical', 'Em validação técnica', 'Engenharia', { profileId: 'technical', name: 'Mariana Silva', role: 'Engenharia · Validação técnica' }],
      technical: ['manager', 'Em decisão do gerente', 'Gerência do projeto', { profileId: 'manager', name: 'Marcos Oliveira', role: 'Gerente do projeto' }],
      manager: ['cve', 'Em decisão do CVE', 'CVE', { profileId: 'cve', name: 'Analice Mendes', role: 'CVE · Decisão final' }]
    };

    if (step === 'cve') {
      const finalVersion = incrementVersion(currentVersion());
      f4.currentVersion = finalVersion;
      f4.finalVersion = finalVersion;
      const cveSignature = { ...signatureFor('approve', step, now), version: finalVersion, valid: true };
      registerSignature(cveSignature, { active: true });
      appendHistory({
        step, label, date: now, status: 'Aprovada', newStatus: 'Aprovada', by: profile.name,
        sector: historySectorByStep[step], version: finalVersion, validationCycle: cycle, finalApproval: true
      });
      f4.status = 'Aprovada';
      f4.stage = 'Aprovada';
      f4.currentStep = 'approved';
      f4.finalApprovedAt = now;
      f4.finalSignatures = (f4.activeSignatures || []).map(signature => ({ ...signature, documentVersion: finalVersion, valid: true }));
      appendHistory({
        step: 'final', label: 'Versão final aprovada', date: now, status: 'Concluída', newStatus: 'Aprovada',
        by: profile.name, sector: 'CVE', version: finalVersion, validationCycle: cycle, finalApproval: true
      });
      createVersionSnapshot(finalVersion, { final: true, createdBy: profile.name });
    } else {
      const signature = { ...signatureFor('approve', step, now), valid: true };
      registerSignature(signature, { active: true });
      appendHistory({
        step, label, date: now, status: 'Aprovada', newStatus: historyNewStatus({ step, status: 'Aprovada' }),
        by: profile.name, sector: historySectorByStep[step], validationCycle: cycle
      });
      const [nextStep, status, sector, assignee] = next[step];
      f4.currentStep = nextStep;
      f4.status = status;
      f4.stage = status.replace('Em ', '');
      f4.sector = sector;
      f4.currentAssignee = assignee;
      f4.responsible = assignee.name;
      f4.currentAssigneeSince = now;
      f4.returnedToProfile = null;
      f4.assignedProfiles = [...new Set([...(f4.assignedProfiles || []), nextStep])];
    }
  }
  f4.updatedAt = now.slice(0, 10);
  saveWorkflowState(f4);
}

let historyExpanded = false;

function render() {
  if (!f4) {
    content.innerHTML = '<section class="card detail-card"><h3>F4 não encontrada</h3></section>';
    return;
  }
  content.innerHTML = `
    <section class="detail-heading"><div class="detail-heading-main"><div><a class="back-link" href="./minhas-f4.html">← Voltar</a><div class="detail-title-line"><h2>${getF4Code(f4)} — ${esc(f4.title)}</h2><span class="status-badge ${cls(f4.status)}">${esc(f4.status)}</span></div><p class="detail-subtitle">${esc(f4.description)}</p></div><div class="detail-version-actions"><span class="version-chip ${f4.finalVersion === currentVersion() ? 'is-final' : ''}">Versão ${currentVersion()}${f4.finalVersion === currentVersion() ? ' · FINAL' : ''}</span>${f4.status === 'Aprovada' && f4.finalVersion ? '<button class="version-action-button primary" id="finalPdfButton" type="button">Gerar PDF final</button>' : ''}</div></div></section>
    <div class="detail-grid">
      <section class="card detail-card"><div class="detail-section-heading"><div><p class="detail-kicker">F4</p><h3>Informações da solicitação</h3><p>Resumo operacional e responsável atual.</p></div></div><div class="current-owner-banner"><div class="current-owner-avatar">${esc((f4.currentAssignee?.name || '?').split(' ').map(n => n[0]).slice(0, 2).join(''))}</div><div><span>F4 está com</span><strong>${esc(f4.currentAssignee?.name || f4.responsible)}</strong><small>${esc(f4.currentAssignee?.role || f4.sector)} · ${elapsed(f4.currentAssigneeSince)}</small></div></div><div class="detail-fields"><div class="detail-field"><span>Código F4</span><strong>${getF4Code(f4)}</strong></div><div class="detail-field"><span>Fornecedor</span><strong>${esc(f4.supplier)}</strong></div><div class="detail-field"><span>Projeto</span><strong>${esc(f4.project || '—')}</strong></div><div class="detail-field"><span>Setor atual</span><strong>${esc(f4.sector)}</strong></div><div class="detail-field"><span>Etapa atual</span><strong>${esc(f4.stage)}</strong></div><div class="detail-field"><span>Última atualização</span><strong>${fmt(f4.updatedAt)}</strong></div><div class="detail-field"><span>Prazo</span><strong>${fmt(f4.dueDate)}</strong></div></div></section>
      <aside class="card detail-card process-card"><div class="detail-section-heading"><div><p class="detail-kicker">Andamento</p><h3>Fluxo da F4</h3></div></div>${processTimeline()}
        <div class="history-access-row process-history-access">
          <button class="history-access-button" id="historyToggleButton" type="button" aria-expanded="${historyExpanded ? 'true' : 'false'}" aria-controls="changeHistoryPanel">
            <span class="history-access-icon">↻</span>
            <span>${historyExpanded ? 'Ocultar histórico de alterações' : 'Ver histórico de alterações'}</span>
            <span class="history-access-count">${(f4.history || []).length}</span>
          </button>
        </div>
      </aside>
    </div>
    ${changeHistoryPanel()}
    <div class="complete-review-sticky">
      <section class="complete-review-heading"><div><p class="detail-kicker">Dossiê para validação</p><h3>Informações completas da F4</h3><p>Revise todos os dados registrados antes de aprovar, devolver ou rejeitar a solicitação. Cada seção permite registrar comentários específicos.</p></div><span>10 seções de análise</span></section>
      ${reviewNavigation()}
    </div>
    <div class="complete-review-stack">${fullReviewSections()}</div>
    <div class="review-information-grid">${approvalPanel()}${guidancePanel()}</div>
    ${actionWorkspace()}
    ${profile.id === 'supplier' ? `<section class="supplier-readonly-note"><strong>Validações Renault</strong><span>${canEditContent() ? 'Esta F4 foi devolvida. Use o lápis em cada seção para editar somente os dados necessários; ao reenviar, a edição será bloqueada novamente.' : 'O fornecedor acompanha as decisões e orientações, mas a edição só é liberada quando a F4 é devolvida para correção.'}</span></section>` : ''}`;
  setup();
}

let sectionNavigationCleanup = null;

function setupSectionNavigation() {
  if (sectionNavigationCleanup) {
    sectionNavigationCleanup();
    sectionNavigationCleanup = null;
  }

  const sticky = document.querySelector('.complete-review-sticky');
  const nav = document.querySelector('.review-section-nav');
  if (!sticky || !nav) return;

  const links = [...nav.querySelectorAll('a[href^="#section-"]')];
  const entries = links.map(link => ({
    link,
    section: document.querySelector(link.getAttribute('href'))
  })).filter(entry => entry.section);
  if (!entries.length) return;

  let activeId = '';
  let ticking = false;

  const keepActiveVisible = link => {
    const navRect = nav.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();
    if (linkRect.left < navRect.left + 8 || linkRect.right > navRect.right - 8) {
      nav.scrollTo({
        left: link.offsetLeft - (nav.clientWidth - link.offsetWidth) / 2,
        behavior: 'smooth'
      });
    }
  };

  const setActive = (entry, ensureVisible = true) => {
    const id = entry.section.id;
    if (activeId === id) return;
    activeId = id;
    entries.forEach(item => {
      const isActive = item === entry;
      item.link.classList.toggle('is-active', isActive);
      if (isActive) item.link.setAttribute('aria-current', 'location');
      else item.link.removeAttribute('aria-current');
    });
    if (ensureVisible) keepActiveVisible(entry.link);
  };

  const syncActiveSection = () => {
    ticking = false;
    const stickyBottom = sticky.getBoundingClientRect().bottom;
    const activationLine = stickyBottom + 28;
    let current = entries[0];

    for (const entry of entries) {
      if (entry.section.getBoundingClientRect().top <= activationLine) current = entry;
      else break;
    }

    const pageBottom = window.scrollY + window.innerHeight;
    const documentBottom = document.documentElement.scrollHeight - 4;
    if (pageBottom >= documentBottom) current = entries[entries.length - 1];

    setActive(current);
  };

  const scheduleSync = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(syncActiveSection);
  };

  const onNavClick = event => {
    const link = event.target.closest('a[href^="#section-"]');
    if (!link) return;
    const entry = entries.find(item => item.link === link);
    if (entry) setActive(entry, false);
  };

  window.addEventListener('scroll', scheduleSync, { passive: true });
  window.addEventListener('resize', scheduleSync);
  nav.addEventListener('click', onNavClick);
  syncActiveSection();

  sectionNavigationCleanup = () => {
    window.removeEventListener('scroll', scheduleSync);
    window.removeEventListener('resize', scheduleSync);
    nav.removeEventListener('click', onNavClick);
  };
}

function setupHistoryToggle() {
  const button = document.querySelector('#historyToggleButton');
  const panel = document.querySelector('#changeHistoryPanel');
  if (!button || !panel) return;

  button.onclick = () => {
    historyExpanded = !historyExpanded;
    panel.hidden = !historyExpanded;
    button.setAttribute('aria-expanded', historyExpanded ? 'true' : 'false');
    const label = button.querySelector('span:nth-child(2)');
    if (label) label.textContent = historyExpanded ? 'Ocultar histórico de alterações' : 'Ver histórico de alterações';
    button.classList.toggle('is-open', historyExpanded);
    if (historyExpanded) {
      requestAnimationFrame(() => panel.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  };
}

function setupComments() {
  document.querySelectorAll('.section-comment-toggle').forEach(button => {
    button.onclick = () => {
      const wrapper = button.closest('.section-comments');
      const form = wrapper?.querySelector('.section-comment-form');
      if (!form) return;
      form.hidden = !form.hidden;
      button.textContent = form.hidden ? '+ Adicionar comentário' : 'Fechar comentário';
      if (!form.hidden) form.querySelector('textarea')?.focus();
    };
  });
  document.querySelectorAll('.comment-cancel-button').forEach(button => {
    button.onclick = () => {
      const form = button.closest('.section-comment-form');
      if (!form) return;
      form.hidden = true;
      form.querySelector('textarea').value = '';
      const toggle = form.closest('.section-comments')?.querySelector('.section-comment-toggle');
      if (toggle) toggle.textContent = '+ Adicionar comentário';
    };
  });
  document.querySelectorAll('.section-comment-form').forEach(form => {
    form.onsubmit = event => {
      event.preventDefault();
      const textarea = form.querySelector('textarea');
      const text = textarea?.value.trim() || '';
      if (!text) return showToast('Digite um comentário antes de salvar.');
      const comments = getComments();
      comments.push({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        sectionId: form.dataset.sectionId,
        sectionTitle: form.dataset.sectionTitle,
        text,
        author: profile.name,
        role: profile.role,
        profileId: profile.id,
        createdAt: new Date().toISOString()
      });
      saveComments(comments);
      const now = new Date().toISOString();
      appendHistory({
        step: profile.id === 'supplier' ? 'supplier' : profile.id,
        label: `Comentário em ${form.dataset.sectionTitle}`,
        date: now,
        status: f4.status,
        newStatus: f4.status,
        by: profile.name,
        sector: profile.id === 'supplier' ? 'Fornecedor' : (historySectorByStep[profile.id] || profile.role),
        description: text,
        commentSection: form.dataset.sectionId
      });
      f4.updatedAt = now.slice(0, 10);
      saveWorkflowState(f4);
      showToast('Comentário registrado nesta seção. A versão da F4 foi mantida.');
      const targetId = form.dataset.sectionId;
      render();
      requestAnimationFrame(() => document.querySelector(`#section-${CSS.escape(targetId)}`)?.scrollIntoView({ block: 'center' }));
    };
  });
}

function setupVersionDownloads() {
  document.querySelectorAll('[data-download-history]').forEach(button => {
    button.onclick = event => {
      event.stopPropagation();
      downloadHistoryPdf(button.dataset.downloadHistory);
    };
  });
}

function setupSectionEditors() {
  document.querySelectorAll('[data-edit-section]').forEach(button => {
    button.onclick = () => {
      const sectionId = button.dataset.editSection;
      editingSectionId = editingSectionId === sectionId ? null : sectionId;
      render();
      if (editingSectionId) requestAnimationFrame(() => document.querySelector(`#section-${CSS.escape(editingSectionId)}`)?.scrollIntoView({ behavior:'smooth', block:'center' }));
    };
  });
  document.querySelectorAll('[data-cancel-section-edit]').forEach(button => {
    button.onclick = () => { editingSectionId = null; render(); };
  });
  document.querySelectorAll('[data-edit-form]').forEach(form => {
    form.onsubmit = event => {
      event.preventDefault();
      const sectionId = form.dataset.editForm;
      if (!saveSectionEdition(form, sectionId)) return;
      const version = currentVersion();
      editingSectionId = null;
      showToast(`Seção atualizada. A versão ${version} foi registrada e ficará destacada para a próxima validação.`);
      f4 = getF4ById(f4.id);
      render();
      requestAnimationFrame(() => document.querySelector(`#section-${CSS.escape(sectionId)}`)?.scrollIntoView({ behavior:'smooth', block:'center' }));
    };
  });
}

function setupHistoryRows() {
  document.querySelectorAll('[data-history-row]').forEach(row => {
    const toggle = () => {
      const id = row.dataset.historyRow;
      const detail = document.querySelector(`[data-history-detail="${CSS.escape(id)}"]`);
      if (!detail) return;
      const opening = detail.hidden;
      detail.hidden = !opening;
      row.classList.toggle('is-open', opening);
      row.setAttribute('aria-expanded', opening ? 'true' : 'false');
      if (opening) expandedHistoryRows.add(id); else expandedHistoryRows.delete(id);
    };
    row.onclick = event => { if (!event.target.closest('button,a,input,textarea,select')) toggle(); };
    row.onkeydown = event => {
      if ((event.key === 'Enter' || event.key === ' ') && !event.target.closest('button,a,input,textarea,select')) { event.preventDefault(); toggle(); }
    };
  });
}

function setupFinalPdf() {
  const button = document.querySelector('#finalPdfButton');
  if (button) button.onclick = openFinalPdf;
}

function updateDecisionFields(form, correctionFields) {
  const decision = form.elements.decision?.value;
  correctionFields.hidden = !['return','reject'].includes(decision);
  const label = document.querySelector('#guidanceLabel');
  const field = document.querySelector('#guidanceField');
  const help = document.querySelector('#guidanceHelp');
  if (!label || !field || !help) return;
  if (decision === 'reject') {
    label.innerHTML = 'Motivo da rejeição <b>*</b>';
    field.placeholder = 'Informe obrigatoriamente por que esta F4 está sendo rejeitada.';
    help.textContent = 'O motivo ficará registrado no histórico desta versão. Se uma versão posterior for aprovada, esta rejeição não aparecerá no PDF final.';
  } else {
    label.innerHTML = 'Orientações para correção <b>*</b>';
    field.placeholder = 'Explique o problema, o que precisa ser corrigido e o resultado esperado.';
    help.textContent = 'O texto ficará visível para quem receber a F4.';
  }
}

function setup() {
  setupHistoryToggle();
  setupHistoryRows();
  setupVersionDownloads();
  setupSectionEditors();
  setupFinalPdf();
  setupComments();
  setupSectionNavigation();
  const form = document.querySelector('#roleReviewForm');
  const correctionFields = document.querySelector('#correctionFields');
  if (form) {
    form.querySelectorAll('[name="decision"]').forEach(radio => {
      radio.onchange = () => updateDecisionFields(form, correctionFields);
    });
    form.onsubmit = event => {
      event.preventDefault();
      const decision = form.elements.decision.value;
      if (!decision) return showToast('Selecione uma decisão.');
      const areas = [...form.querySelectorAll('[name="area"]:checked')].map(input => input.value);
      const guidance = form.elements.guidance?.value.trim() || '';
      if (decision === 'return' && (!areas.length || !guidance)) return showToast('Marque onde está o erro e informe a orientação para correção.');
      if (decision === 'reject' && !guidance) return showToast('Informe o motivo da rejeição para continuar.');
      transition(decision, areas, guidance);
      showToast('Decisão registrada e fluxo atualizado.');
      f4 = getF4ById(f4.id);
      render();
    };
  }
  const resubmitButton = document.querySelector('#resubmitButton');
  if (resubmitButton) resubmitButton.onclick = () => {
    const now = new Date().toISOString();
    const submittedChanges = cloneValue(f4.pendingReviewChanges || {}) || {};
    f4.lastSubmittedChanges = submittedChanges;
    f4.pendingReviewChanges = {};
    appendHistory({
      step: 'commercial', label: 'Reenvio para validação comercial', date: now, status: 'Em andamento', newStatus: 'Em validação comercial',
      by: profile.name, sector: 'Fornecedor', description: 'F4 corrigida pelo fornecedor e reenviada para nova validação comercial.',
      submittedChanges, changedFields: Object.values(submittedChanges).flatMap(section => section.changedFields || [])
    });
    f4.status = 'Em validação comercial'; f4.stage = 'Validação comercial'; f4.currentStep = 'commercial'; f4.returnedToProfile = null; f4.rejectedVersion = null;
    f4.currentAssignee = { profileId: 'commercial', name: 'Carlos Braatz', role: 'Compras · Validação comercial' };
    f4.responsible = 'Carlos Braatz'; f4.sector = 'Compras'; f4.currentAssigneeSince = now;
    f4.assignedProfiles = [...new Set([...(f4.assignedProfiles || []), 'commercial'])];
    f4.updatedAt = now.slice(0, 10);
    saveWorkflowState(f4);
    showToast('F4 reenviada para validação comercial.');
    f4 = getF4ById(f4.id);
    render();
  };
}

normalizeSupplierSubmissionHistory();
ensureVersioningState();
render();

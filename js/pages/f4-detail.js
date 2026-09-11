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
  const h = latest(step);
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

function fallbackHistoryVersion(index) {
  return `1.0.${index}`;
}

function nextHistoryVersion() {
  const history = f4?.history || [];
  if (!history.length) return '1.0.0';
  const lastIndex = history.length - 1;
  const current = String(history[lastIndex]?.version || fallbackHistoryVersion(lastIndex));
  const match = current.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return fallbackHistoryVersion(history.length);
  return `${match[1]}.${match[2]}.${Number(match[3]) + 1}`;
}

function appendHistory(entry) {
  f4.history = f4.history || [];
  f4.history.push({ ...entry, version: entry.version || nextHistoryVersion() });
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

function changeHistoryPanel() {
  const history = (f4.history || []).map((entry, index) => ({
    ...entry,
    version: entry.version || fallbackHistoryVersion(index)
  })).reverse();

  const rows = history.map(entry => `<tr>
    <td><strong class="history-version">${esc(entry.version)}</strong></td>
    <td><strong>${esc(entry.label || entry.step || 'Alteração da F4')}</strong></td>
    <td>${esc(historyDescription(entry))}</td>
    <td><span class="review-status ${cls(historyNewStatus(entry))}">${esc(historyNewStatus(entry))}</span></td>
    <td>${esc(entry.by || (entry.step === 'creation' ? f4.supplier : 'Sistema'))}</td>
    <td>${esc(historySector(entry))}</td>
    <td>${dateTime(entry.date || f4.updatedAt)}</td>
  </tr>`).join('');

  return `<section class="card detail-card change-history-panel" id="changeHistoryPanel" ${historyExpanded ? '' : 'hidden'}>
    <div class="detail-section-heading history-panel-heading">
      <div><p class="detail-kicker">Rastreabilidade</p><h3>Histórico de alterações</h3><p>Todas as alterações permanecem registradas. A versão aumenta no último número a cada novo evento.</p></div>
      <span class="history-count">${history.length} registro${history.length === 1 ? '' : 's'}</span>
    </div>
    <div class="review-table-wrap history-table-wrap">
      <table class="review-table change-history-table">
        <thead><tr><th>Número da versão</th><th>Local / alteração</th><th>Descrição</th><th>Novo status</th><th>Usuário responsável</th><th>Setor</th><th>Data</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="7">Nenhuma alteração registrada.</td></tr>'}</tbody>
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

  return {
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
  return `<section class="card detail-card validation-data-section" id="section-${esc(id)}">
    <div class="detail-section-heading"><div><p class="detail-kicker">${esc(kicker)}</p><h3>${esc(title)}</h3><p>${esc(description)}</p></div></div>
    ${body}
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
  return `<nav class="review-section-nav" aria-label="Seções da F4">${items.map(([id, label]) => `<a href="#section-${id}">${label}</a>`).join('')}</nav>`;
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
    const h = latest(key), status = approvalStatus(key);
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
    const h = latest(step);
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
  if (['Aprovada', 'Rejeitada'].includes(f4.status)) return '';
  if (profile.id === 'supplier' && f4.currentStep === 'supplier' && f4.status === 'Devolvida') {
    return `<section class="card detail-card action-workspace"><div class="detail-section-heading"><div><p class="detail-kicker">Sua responsabilidade</p><h3>Correção pelo fornecedor</h3><p>Revise as orientações registradas e reenvie a F4 para a validação comercial.</p></div></div><div class="review-form-footer"><span>A F4 retornará para Compras após o reenvio.</span><button class="review-submit-button" id="resubmitButton">Reenviar para validação comercial</button></div></section>`;
  }
  const cfg = roleConfig[profile.id];
  if (!cfg) return '';
  if (f4.currentStep !== profile.id) {
    return `<section class="card detail-card waiting-workspace"><div class="detail-section-heading"><div><p class="detail-kicker">Sua responsabilidade</p><h3>${cfg.title}</h3><p>Esta F4 não está aguardando uma decisão deste perfil neste momento.</p></div><span class="responsibility-chip">Responsável atual: ${esc(f4.currentAssignee?.role || f4.sector)}</span></div></section>`;
  }
  return `<section class="card detail-card review-workspace"><div class="detail-section-heading review-heading"><div><p class="detail-kicker">Sua responsabilidade</p><h3>${cfg.title}</h3><p>Registre a decisão após revisar todas as informações da F4 acima.</p></div><span class="responsibility-chip">${cfg.subtitle}</span></div><form id="roleReviewForm" class="role-review-form"><fieldset class="review-decision-group"><legend>Decisão</legend><div class="review-decision-grid"><label class="review-decision-option"><input type="radio" name="decision" value="approve"><span class="decision-icon approve">✓</span><span><strong>Aprovar</strong><small>${profile.id === 'commercial' ? 'Encaminhar para Engenharia.' : profile.id === 'technical' ? 'Encaminhar para o gerente do projeto.' : profile.id === 'manager' ? 'Encaminhar para decisão do CVE.' : 'Concluir a F4 como aprovada.'}</small></span></label><label class="review-decision-option"><input type="radio" name="decision" value="return"><span class="decision-icon return">↩</span><span><strong>Devolver para correção</strong><small>Exige indicação do ponto com erro e orientação.</small></span></label><label class="review-decision-option"><input type="radio" name="decision" value="reject"><span class="decision-icon reject">×</span><span><strong>Não aprovar</strong><small>Encerra a F4 como rejeitada e exige justificativa.</small></span></label></div></fieldset><div class="correction-fields" id="correctionFields" hidden><fieldset class="error-location-group"><legend>Onde está o erro ou ponto de atenção? <b>*</b></legend><p>Marque uma ou mais áreas.</p><div class="error-location-grid">${cfg.areas.map(area => `<label><input type="checkbox" name="area" value="${esc(area)}"><span>${esc(area)}</span></label>`).join('')}</div></fieldset><label class="review-guidance-field"><span>Orientações / justificativa <b>*</b></span><textarea name="guidance" maxlength="1600" placeholder="Explique o problema, o que precisa ser corrigido e o resultado esperado."></textarea><small>O texto ficará visível para quem receber a F4.</small></label></div><div class="review-form-footer"><span>Responsável: ${esc(profile.name)} · ${esc(profile.role)}</span><button class="review-submit-button" type="submit">Registrar decisão</button></div></form></section>`;
}

function transition(decision, areas, guidance) {
  const now = new Date().toISOString(), step = profile.id, label = roleConfig[step].title;
  f4.history = f4.history || [];
  if (decision === 'reject') {
    appendHistory({ step, label, date: now, status: 'Rejeitada', newStatus: 'Rejeitada', by: profile.name, sector: historySectorByStep[step], guidance, errorAreas: areas });
    f4.status = 'Rejeitada'; f4.stage = 'Rejeitada'; f4.currentStep = 'rejected'; f4.sector = profile.id === 'cve' ? 'CVE' : profile.role;
  } else if (decision === 'return') {
    appendHistory({ step, label, date: now, status: 'Devolvida', newStatus: 'Devolvida', by: profile.name, sector: historySectorByStep[step], returnedTo: 'Fornecedor', guidance, errorAreas: areas });
    f4.status = 'Devolvida'; f4.stage = 'Correção pelo fornecedor'; f4.currentStep = 'supplier'; f4.returnedToProfile = 'supplier'; f4.returnOrigin = profile.id;
    f4.currentAssignee = { profileId: 'supplier', name: f4.supplier, role: 'Fornecedor' };
    f4.responsible = f4.supplier; f4.sector = 'Fornecedor'; f4.currentAssigneeSince = now;
  } else {
    appendHistory({ step, label, date: now, status: 'Aprovada', newStatus: historyNewStatus({ step, status: 'Aprovada' }), by: profile.name, sector: historySectorByStep[step] });
    const next = {
      commercial: ['technical', 'Em validação técnica', 'Engenharia', { profileId: 'technical', name: 'Mariana Silva', role: 'Engenharia · Validação técnica' }],
      technical: ['manager', 'Em decisão do gerente', 'Gerência do projeto', { profileId: 'manager', name: 'Marcos Oliveira', role: 'Gerente do projeto' }],
      manager: ['cve', 'Em decisão do CVE', 'CVE', { profileId: 'cve', name: 'Analice Mendes', role: 'CVE · Decisão final' }]
    };
    if (step === 'cve') {
      appendHistory({ step: 'final', label: 'Aprovação final', date: now, status: 'Concluída', newStatus: 'Aprovada', by: profile.name, sector: 'CVE' });
      f4.status = 'Aprovada'; f4.stage = 'Aprovada'; f4.currentStep = 'approved';
    } else {
      const [nextStep, status, sector, assignee] = next[step];
      f4.currentStep = nextStep; f4.status = status; f4.stage = status.replace('Em ', ''); f4.sector = sector;
      f4.currentAssignee = assignee; f4.responsible = assignee.name; f4.currentAssigneeSince = now; f4.returnedToProfile = null;
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
    <section class="detail-heading"><div><a class="back-link" href="./minhas-f4.html">← Voltar</a><div class="detail-title-line"><h2>${getF4Code(f4)} — ${esc(f4.title)}</h2><span class="status-badge ${cls(f4.status)}">${esc(f4.status)}</span></div><p class="detail-subtitle">${esc(f4.description)}</p></div></section>
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
    ${profile.id === 'supplier' ? '<section class="supplier-readonly-note"><strong>Validações Renault</strong><span>O fornecedor acompanha as decisões e orientações, mas não edita aprovações internas.</span></section>' : ''}`;
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
      showToast('Comentário registrado nesta seção.');
      const targetId = form.dataset.sectionId;
      render();
      requestAnimationFrame(() => document.querySelector(`#section-${CSS.escape(targetId)}`)?.scrollIntoView({ block: 'center' }));
    };
  });
}

function setup() {
  setupHistoryToggle();
  setupComments();
  setupSectionNavigation();
  const form = document.querySelector('#roleReviewForm');
  const correctionFields = document.querySelector('#correctionFields');
  if (form) {
    form.querySelectorAll('[name="decision"]').forEach(radio => {
      radio.onchange = () => { correctionFields.hidden = !['return', 'reject'].includes(form.elements.decision.value); };
    });
    form.onsubmit = event => {
      event.preventDefault();
      const decision = form.elements.decision.value;
      if (!decision) return showToast('Selecione uma decisão.');
      const areas = [...form.querySelectorAll('[name="area"]:checked')].map(input => input.value);
      const guidance = form.elements.guidance?.value.trim() || '';
      if (['return', 'reject'].includes(decision) && (!areas.length || !guidance)) return showToast('Marque onde está o erro e informe a orientação/justificativa.');
      transition(decision, areas, guidance);
      showToast('Decisão registrada e fluxo atualizado.');
      f4 = getF4ById(f4.id);
      render();
    };
  }
  const resubmitButton = document.querySelector('#resubmitButton');
  if (resubmitButton) resubmitButton.onclick = () => {
    const now = new Date().toISOString();
    appendHistory({ step: 'commercial', label: 'Reenvio para validação comercial', date: now, status: 'Em andamento', newStatus: 'Em validação comercial', by: profile.name, sector: 'Fornecedor', description: 'F4 corrigida pelo fornecedor e reenviada para nova validação comercial.' });
    f4.status = 'Em validação comercial'; f4.stage = 'Validação comercial'; f4.currentStep = 'commercial'; f4.returnedToProfile = null;
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
render();

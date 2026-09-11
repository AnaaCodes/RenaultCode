import { mountAppShell } from '../core/app-shell.js';
import { getActiveProfile } from '../core/user-session.js';
import { getVisibleF4, getF4Code, openF4 } from '../services/f4-service.js';
import {
  esc, norm, formatDate, statusClass, profileCopy, relativeDeadline
} from './activity-utils.js';

mountAppShell({ activePage: 'pendencias', title: 'Pendências' });

const profile = getActiveProfile();
const visible = getVisibleF4(profile);
const [heading, description] = profileCopy(profile, 'pendencias');

document.querySelector('#activityTitle').textContent = heading;
document.querySelector('#activityDescription').textContent = description;

function isFinal(item) {
  if (profile.id === 'supplier' && item.currentAssignee?.profileId === 'supplier') return false;
  return ['Aprovada', 'Rejeitada'].includes(item.status) || ['approved', 'rejected'].includes(item.currentStep);
}

function needsAction(item) {
  return item.currentAssignee?.profileId === profile.id || item.returnedToProfile === profile.id;
}

function pendingReason(item) {
  if (needsAction(item)) {
    if (profile.id === 'supplier') {
      if (item.status === 'Rejeitada') return { label: 'Nova versão necessária', className: 'danger', detail: 'A versão foi rejeitada. Corrija o conteúdo e gere uma nova versão antes de reenviar.' };
      if (item.status === 'Devolvida') return { label: 'Correção solicitada', className: 'warning', detail: 'Revise as orientações recebidas, corrija a F4 e reenvie para validação.' };
      if (item.status === 'Rascunho' || item.currentStep === 'creation') return { label: 'Finalizar F4', className: '', detail: 'Conclua o preenchimento e envie a solicitação para iniciar a validação.' };
      return { label: 'Ação do fornecedor', className: '', detail: 'Esta solicitação depende de uma ação do fornecedor.' };
    }
    const labels = {
      commercial: ['Validar comercialmente', 'Analise condições comerciais e registre sua decisão.'],
      technical: ['Realizar validação técnica', 'Revise os impactos técnicos e registre sua decisão.'],
      manager: ['Decisão do projeto', 'Revise a F4 do projeto e registre sua decisão.'],
      cve: ['Decisão final do CVE', 'Faça a revisão final da F4 e registre a decisão do CVE.']
    };
    const [label, detail] = labels[profile.id] || ['Ação necessária', 'Esta F4 depende de uma ação deste perfil.'];
    return { label, className: '', detail };
  }
  const deadline = relativeDeadline(item.dueDate);
  if (deadline.overdue) return { label: 'Acompanhar atraso', className: 'danger', detail: 'A F4 segue aberta após o prazo previsto.' };
  if (deadline.dueSoon) return { label: 'Acompanhar prazo', className: 'warning', detail: 'A F4 está próxima da data prevista e continua em andamento.' };
  return { label: 'Em acompanhamento', className: '', detail: `Aguardando ${item.currentAssignee?.role || item.sector || 'próxima etapa do fluxo'}.` };
}

const activeItems = visible.filter(item => !isFinal(item)).map(item => {
  const deadline = relativeDeadline(item.dueDate);
  return {
    item,
    action: needsAction(item),
    deadline,
    reason: pendingReason(item),
    watch: !needsAction(item)
  };
}).sort((a, b) => {
  if (a.action !== b.action) return a.action ? -1 : 1;
  if (a.deadline.overdue !== b.deadline.overdue) return a.deadline.overdue ? -1 : 1;
  const ad = a.deadline.days ?? 9999;
  const bd = b.deadline.days ?? 9999;
  return ad - bd;
});

const actionCount = activeItems.filter(entry => entry.action).length;
const soonCount = activeItems.filter(entry => entry.deadline.dueSoon).length;
const overdueCount = activeItems.filter(entry => entry.deadline.overdue).length;
const watchCount = activeItems.filter(entry => entry.watch).length;

if (profile.id === 'supplier') {
  document.querySelector('#pendingActionLabel').textContent = 'Para corrigir / enviar';
  document.querySelector('#pendingActionHelp').textContent = 'F4 que dependem diretamente do fornecedor.';
  document.querySelector('#focusActionTitle').textContent = 'Ação do fornecedor';
  document.querySelector('#focusActionDescription').textContent = 'Rascunhos, devoluções e versões que precisam ser corrigidas ou reenviadas.';
} else if (profile.id === 'manager') {
  document.querySelector('#pendingActionLabel').textContent = 'Decisões do projeto';
  document.querySelector('#pendingActionHelp').textContent = 'F4 aguardando uma decisão do gerente do projeto.';
} else if (profile.id === 'cve') {
  document.querySelector('#pendingActionLabel').textContent = 'Decisões do CVE';
  document.querySelector('#pendingActionHelp').textContent = 'F4 aguardando decisão final do CVE.';
}

document.querySelector('#pendingActionCount').textContent = actionCount;
document.querySelector('#pendingSoonCount').textContent = soonCount;
document.querySelector('#pendingOverdueCount').textContent = overdueCount;
document.querySelector('#pendingWatchCount').textContent = watchCount;
document.querySelector('#focusActionCount').textContent = actionCount;
document.querySelector('#focusSoonCount').textContent = soonCount;
document.querySelector('#focusOverdueCount').textContent = overdueCount;

const projectSelect = document.querySelector('#pendingProject');
[...new Set(activeItems.map(entry => entry.item.project).filter(Boolean))].sort().forEach(project => {
  projectSelect.insertAdjacentHTML('beforeend', `<option value="${esc(project)}">${esc(project)}</option>`);
});

const search = document.querySelector('#pendingSearch');
const type = document.querySelector('#pendingType');
const requestedType = new URLSearchParams(location.search).get('type');
if (['all', 'action', 'soon', 'overdue', 'watch'].includes(requestedType)) type.value = requestedType;
const body = document.querySelector('#pendingBody');
const empty = document.querySelector('#pendingEmpty');
const resultCount = document.querySelector('#pendingResultCount');

function matchesType(entry) {
  if (type.value === 'all') return true;
  if (type.value === 'action') return entry.action;
  if (type.value === 'soon') return entry.deadline.dueSoon;
  if (type.value === 'overdue') return entry.deadline.overdue;
  if (type.value === 'watch') return entry.watch;
  return true;
}

function filtered() {
  const q = norm(search.value);
  return activeItems.filter(entry => {
    if (!matchesType(entry)) return false;
    if (projectSelect.value !== 'all' && entry.item.project !== projectSelect.value) return false;
    if (!q) return true;
    return norm([
      getF4Code(entry.item), entry.item.title, entry.item.description, entry.item.project,
      entry.item.currentAssignee?.name, entry.item.currentAssignee?.role, entry.reason.label
    ].join(' ')).includes(q);
  });
}

function render() {
  const rows = filtered();
  resultCount.textContent = rows.length;
  empty.hidden = rows.length !== 0;
  body.innerHTML = rows.map(({ item, reason, deadline, action }) => {
    const deadlineClass = deadline.overdue ? 'danger' : deadline.dueSoon ? 'warning' : '';
    return `<tr data-id="${esc(item.id)}">
      <td><strong>${esc(getF4Code(item))}</strong><span class="muted-line">${esc(item.project || 'Sem projeto')}</span></td>
      <td><strong>${esc(item.title)}</strong><span class="muted-line">${esc(item.description)}</span></td>
      <td><span class="pending-label ${reason.className}">${esc(reason.label)}</span><span class="muted-line">${esc(reason.detail)}</span></td>
      <td><strong>${esc(item.currentAssignee?.name || item.responsible || '—')}</strong><span class="muted-line">${esc(item.currentAssignee?.role || item.sector || '—')}</span></td>
      <td><span class="deadline-text ${deadlineClass}">${esc(deadline.label)}</span><span class="muted-line">${formatDate(item.dueDate)}</span></td>
      <td><span class="status-badge ${statusClass(item.status)}">${esc(item.status)}</span></td>
      <td><button class="open-f4-link" type="button" data-open-id="${esc(item.id)}">${action ? 'Resolver' : 'Ver F4'}</button></td>
    </tr>`;
  }).join('');

  body.querySelectorAll('[data-open-id]').forEach(button => {
    button.addEventListener('click', event => {
      event.stopPropagation();
      openF4(button.dataset.openId);
    });
  });
  body.querySelectorAll('tr[data-id]').forEach(row => row.addEventListener('click', () => openF4(row.dataset.id)));
}

[search, type, projectSelect].forEach(element => element.addEventListener(element === search ? 'input' : 'change', render));
document.querySelector('#pendingClear').addEventListener('click', () => {
  search.value = '';
  type.value = 'all';
  projectSelect.value = 'all';
  render();
});

render();

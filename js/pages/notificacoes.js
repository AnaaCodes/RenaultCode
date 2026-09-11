import { mountAppShell } from '../core/app-shell.js';
import { getActiveProfile } from '../core/user-session.js';
import { getVisibleF4, getF4Code, openF4 } from '../services/f4-service.js';
import {
  esc, formatDateTime, profileCopy, eventDescription, eventNewStatus, eventSector
} from './activity-utils.js';

mountAppShell({ activePage: 'notificacoes', title: 'Notificações' });

const profile = getActiveProfile();
const visible = getVisibleF4(profile);
const [heading, description] = profileCopy(profile, 'notificacoes');

document.querySelector('#activityTitle').textContent = heading;
document.querySelector('#activityDescription').textContent = description;

const READ_KEY = `f4-notification-read-v1-${profile.id}`;

function readSet() {
  try {
    const value = JSON.parse(localStorage.getItem(READ_KEY) || '[]');
    return new Set(Array.isArray(value) ? value : []);
  } catch {
    return new Set();
  }
}

function saveRead(set) {
  localStorage.setItem(READ_KEY, JSON.stringify([...set]));
}

let readIds = readSet();
let activeFilter = 'all';

function actionCopy(item) {
  if (profile.id === 'supplier') {
    if (item.status === 'Rejeitada') return ['Nova versão necessária', `A ${getF4Code(item)} foi rejeitada. Corrija o conteúdo antes de reenviar.`];
    if (item.status === 'Devolvida') return ['F4 devolvida para correção', `A ${getF4Code(item)} precisa ser revisada antes de voltar ao fluxo.`];
    if (item.status === 'Rascunho') return ['F4 em rascunho', `Finalize o preenchimento da ${getF4Code(item)} para iniciar a validação.`];
    return ['Ação necessária', `A ${getF4Code(item)} depende de uma ação do fornecedor.`];
  }
  const labels = {
    commercial: ['Nova validação comercial', `A ${getF4Code(item)} está aguardando sua análise comercial.`],
    technical: ['Nova validação técnica', `A ${getF4Code(item)} está aguardando análise da Engenharia.`],
    manager: ['Decisão do projeto pendente', `A ${getF4Code(item)} chegou à decisão do gerente do projeto.`],
    cve: ['Decisão final pendente', `A ${getF4Code(item)} está aguardando decisão do CVE.`]
  };
  return labels[profile.id] || ['Ação necessária', `A ${getF4Code(item)} requer atenção.`];
}

function currentActionNotification(item) {
  const mine = item.currentAssignee?.profileId === profile.id || item.returnedToProfile === profile.id;
  const supplierRejected = profile.id === 'supplier' && item.currentAssignee?.profileId === 'supplier' && item.status === 'Rejeitada';
  if (!mine && !supplierRejected) return null;
  if (['Aprovada'].includes(item.status) || item.currentStep === 'approved') return null;
  const [title, copy] = actionCopy(item);
  return {
    id: `action-${item.id}-${item.currentStep}-${item.updatedAt}`,
    f4: item,
    type: 'action',
    title,
    copy,
    sector: item.currentAssignee?.role || item.sector,
    date: item.currentAssigneeSince || `${item.updatedAt}T12:00:00`,
    icon: '!'
  };
}

function eventNotification(item) {
  const history = item.history || [];
  if (!history.length) return null;
  const entry = history[history.length - 1];
  const status = eventNewStatus(entry, item);
  const finished = ['Aprovada', 'Rejeitada'].includes(status) || entry.step === 'final';
  const rejected = status === 'Rejeitada';
  return {
    id: `event-${item.id}-${entry.snapshotId || entry.date || history.length}`,
    f4: item,
    type: finished ? 'complete' : 'update',
    title: entry.label || `Atualização na ${getF4Code(item)}`,
    copy: eventDescription(entry, item),
    sector: eventSector(entry),
    date: entry.date || `${item.updatedAt}T12:00:00`,
    icon: rejected ? '×' : finished ? '✓' : '↻',
    iconClass: rejected ? 'reject' : finished ? 'complete' : ''
  };
}

const notifications = visible.flatMap(item => {
  const values = [currentActionNotification(item), eventNotification(item)].filter(Boolean);
  const seen = new Set();
  return values.filter(notification => {
    if (seen.has(notification.id)) return false;
    seen.add(notification.id);
    return true;
  });
}).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

function isUnread(notification) {
  return !readIds.has(notification.id);
}

function refreshSummary() {
  document.querySelector('#notificationUnread').textContent = notifications.filter(isUnread).length;
  document.querySelector('#notificationAction').textContent = notifications.filter(n => n.type === 'action').length;
  document.querySelector('#notificationUpdates').textContent = notifications.filter(n => n.type === 'update').length;
  document.querySelector('#notificationDone').textContent = notifications.filter(n => n.type === 'complete').length;
}

function filtered() {
  if (activeFilter === 'all') return notifications;
  if (activeFilter === 'unread') return notifications.filter(isUnread);
  return notifications.filter(notification => notification.type === activeFilter);
}

function markRead(id) {
  readIds.add(id);
  saveRead(readIds);
}

function render() {
  const items = filtered();
  const list = document.querySelector('#notificationList');
  const empty = document.querySelector('#notificationEmpty');
  document.querySelector('#notificationResultCount').textContent = items.length;
  empty.hidden = items.length !== 0;
  list.innerHTML = items.map(notification => `
    <article class="notification-item ${isUnread(notification) ? 'is-unread' : ''}" data-notification-id="${esc(notification.id)}" data-f4-id="${esc(notification.f4.id)}" tabindex="0">
      <span class="notification-icon ${notification.type === 'action' ? 'action' : notification.iconClass || ''}">${esc(notification.icon)}</span>
      <div class="notification-copy">
        <strong>${esc(notification.title)}</strong>
        <p>${esc(notification.copy)}</p>
        <div class="notification-meta"><span>${esc(getF4Code(notification.f4))}</span><span>•</span><span>${esc(notification.f4.project || 'Sem projeto')}</span><span>•</span><span>${esc(notification.sector || 'Sistema')}</span></div>
      </div>
      <time class="notification-time">${formatDateTime(notification.date)}</time>
    </article>`).join('');

  list.querySelectorAll('[data-notification-id]').forEach(item => {
    const open = () => {
      markRead(item.dataset.notificationId);
      refreshSummary();
      openF4(item.dataset.f4Id);
    };
    item.addEventListener('click', open);
    item.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        open();
      }
    });
  });
  refreshSummary();
}

document.querySelectorAll('[data-notification-filter]').forEach(button => {
  button.addEventListener('click', () => {
    activeFilter = button.dataset.notificationFilter;
    document.querySelectorAll('[data-notification-filter]').forEach(item => item.classList.toggle('is-active', item === button));
    render();
  });
});

document.querySelector('#markAllRead').addEventListener('click', () => {
  notifications.forEach(notification => readIds.add(notification.id));
  saveRead(readIds);
  render();
});

render();

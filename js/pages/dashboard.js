import { mountAppShell } from '../core/app-shell.js';
import { getActiveProfile } from '../core/user-session.js';
import { getVisibleF4, getWorkQueue, getAttentionCounts, getF4Code, openF4 } from '../services/f4-service.js';

const profile = getActiveProfile();
mountAppShell({ activePage: 'dashboard', title: 'VISÃO GERAL' });

const data = getVisibleF4(profile);
const team = ['commercial', 'technical'].includes(profile.id);

const welcome = document.querySelector('#welcomeTitle');
if (welcome) welcome.textContent = `Olá, ${profile.name.split(' ')[0]}!`;

const subtitle = document.querySelector('.welcome-block p');
if (team && subtitle) {
  subtitle.textContent = `Visão geral das F4 acompanhadas pela equipe de ${profile.id === 'commercial' ? 'Compras' : 'Engenharia'}`;
}

function count(filter) {
  return data.filter(item => {
    switch (filter) {
      case 'commercial':
        return item.currentStep === 'commercial';
      case 'technical':
        return item.currentStep === 'technical';
      case 'cve':
        return item.currentStep === 'cve';
      case 'returned':
        return item.status === 'Devolvida' && item.returnedToProfile === profile.id;
      case 'approved':
        return item.status === 'Aprovada';
      case 'rejected':
        return item.status === 'Rejeitada';
      default:
        return true;
    }
  }).length;
}

function configureQuickActions() {
  if (!profile.permissions?.viewProjects) return;

  const quickActions = document.querySelector('.quick-actions');
  if (!quickActions || quickActions.querySelector('[data-go="projects"]')) return;

  quickActions.insertAdjacentHTML('beforeend', `
    <button class="quick-card" type="button" data-go="projects">
      <span class="quick-icon">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 5h7l2 2h9v12H3V5Zm2 2v10h14V9h-7.8l-2-2H5Z"/>
        </svg>
      </span>
      <span>Meus projetos</span>
    </button>`);
}

function renderAttentionCounts() {
  const counts = getAttentionCounts(profile);
  Object.entries(counts).forEach(([key, value]) => {
    const target = document.querySelector(`[data-count="${key}"]`);
    if (target) target.textContent = value;
  });
}

configureQuickActions();
renderAttentionCounts();

const tbody = document.querySelector('#workQueueBody');
tbody.innerHTML = getWorkQueue(profile).map(item => `
  <tr data-id="${item.id}" tabindex="0">
    <td><strong>${getF4Code(item)}</strong></td>
    <td>
      <span class="request-title">${item.title}</span>
      <span class="request-description">${item.description}</span>
    </td>
    <td>${item.stage}</td>
    <td>${new Date(`${item.dueDate}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</td>
    <td><span class="status-badge">${item.status}</span></td>
  </tr>`).join('');

tbody.querySelectorAll('tr').forEach(row => {
  row.onclick = () => openF4(row.dataset.id);
});

const flow = document.querySelector('#flowTrack');
const flowDefs = [
  ['all', 'Todas as F4s'],
  ['commercial', 'Validação comercial'],
  ['technical', 'Validação técnica'],
  ['cve', 'Decisão CVE'],
  ['approved', 'Aprovadas'],
  ['rejected', 'Rejeitadas']
];

flow.innerHTML = flowDefs.map(([key, label]) => `
  <button class="flow-stage" data-dashboard-filter="${key}">
    <span class="flow-value">${count(key)}</span>
    <span class="flow-label">${label}</span>
  </button>`).join('');

function go(filter) {
  let query = '';
  if (filter === 'returned') query = '?returned=me';
  else if (filter && filter !== 'all') query = `?flow=${filter}`;
  location.href = `./minhas-f4.html${query}`;
}

document.querySelectorAll('[data-go="minhas-f4"]').forEach(element => {
  element.onclick = () => go('all');
});

document.querySelectorAll('[data-go="returned"]').forEach(element => {
  element.onclick = () => go('returned');
});

document.querySelectorAll('[data-go="projects"]').forEach(element => {
  element.onclick = () => location.href = './projetos.html';
});

document.querySelectorAll('[data-dashboard-filter]').forEach(element => {
  element.onclick = () => go(element.dataset.dashboardFilter);
});

document.querySelectorAll('[data-placeholder-action="Nova F4"]').forEach(element => {
  element.onclick = () => location.href = './nova-f4.html';
});

import { mountAppShell } from '../core/app-shell.js';
import { showToast } from '../core/toast.js';
import { FLOW_SUMMARY } from '../data/f4-data.js';
import { getAttentionCounts, getWorkQueue, openF4 } from '../services/f4-service.js';

mountAppShell({ activePage: 'dashboard', title: 'VISÃO GERAL' });

const attention = getAttentionCounts();
document.querySelector('[data-count="returned"]').textContent = attention.returned;
document.querySelector('[data-count="dueSoon"]').textContent = attention.dueSoon;
document.querySelector('[data-count="approval"]').textContent = attention.approval;

const workQueueBody = document.querySelector('#workQueueBody');
workQueueBody.innerHTML = getWorkQueue().map(item => {
  const deadline = new Date(`${item.dueDate}T12:00:00`);
  const today = new Date('2026-08-25T12:00:00');
  const days = Math.round((deadline - today) / 86400000);
  const label = days === 0 ? 'Hoje' : days === 1 ? 'Amanhã' : deadline.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const deadlineClass = days === 0 ? 'deadline-critical' : days <= 2 ? 'deadline-warning' : '';
  return `
    <tr tabindex="0" data-id="${item.id}" aria-label="Abrir F4 ${item.id}">
      <td><strong>#${item.id}</strong></td>
      <td><span class="request-title">${item.title}</span><span class="request-description">${item.description}</span></td>
      <td>${item.stage}</td>
      <td><span class="deadline ${deadlineClass}">${label}</span></td>
      <td><span class="status-badge ${item.status.toLowerCase().replace(' ', '-').normalize('NFD').replace(/[\u0300-\u036f]/g, '')}">${item.status}</span></td>
    </tr>`;
}).join('');

const flowTrack = document.querySelector('#flowTrack');
flowTrack.innerHTML = FLOW_SUMMARY.map(item => `
  <button class="flow-stage ${item.className}" type="button" data-flow="${item.key}" role="listitem">
    <span class="flow-value">${item.value}</span>
    <span class="flow-label">${item.label}</span>
  </button>`).join('');

function goToMinhas(params = '') { window.location.href = `./minhas-f4.html${params}`; }

document.querySelectorAll('[data-go="minhas-f4"]').forEach(el => el.addEventListener('click', () => goToMinhas()));
document.querySelectorAll('[data-go="returned"]').forEach(el => el.addEventListener('click', () => goToMinhas('?status=Devolvida')));
document.querySelectorAll('[data-go="dueSoon"]').forEach(el => el.addEventListener('click', () => goToMinhas('?due=soon')));
document.querySelectorAll('[data-go="approval"]').forEach(el => el.addEventListener('click', () => goToMinhas('?approval=me')));
document.querySelectorAll('[data-go="nova-f4"]').forEach(el => el.addEventListener('click', () => { window.location.href = './nova-f4.html'; }));
document.querySelectorAll('[data-placeholder-action]').forEach(el => el.addEventListener('click', () => showToast(`${el.dataset.placeholderAction}: tela ainda não implementada.`)));
document.querySelectorAll('#workQueueBody tr').forEach(row => {
  const open = () => openF4(row.dataset.id);
  row.addEventListener('click', open);
  row.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); } });
});
document.querySelectorAll('[data-flow]').forEach(button => {
  button.addEventListener('click', () => {
    const status = button.dataset.flow;
    if (status === 'Em análise') goToMinhas('?status=Submetida');
    else goToMinhas(`?status=${encodeURIComponent(status)}`);
  });
});

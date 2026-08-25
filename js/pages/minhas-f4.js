import { mountAppShell } from '../core/app-shell.js';
import { getAllF4, openF4 } from '../services/f4-service.js';

mountAppShell({ activePage: 'minhas-f4', title: 'Minhas F4' });

const data = getAllF4();
const tableBody = document.querySelector('#tableBody');
const resultCount = document.querySelector('#resultCount');
const emptyState = document.querySelector('#emptyState');
const searchInput = document.querySelector('#searchInput');
const statusFilter = document.querySelector('#statusFilter');
const dateFilter = document.querySelector('#dateFilter');
const sectorFilter = document.querySelector('#sectorFilter');
const statsGrid = document.querySelector('#statsGrid');

const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const statusClass = value => normalize(value).replace(/\s+/g, '-');
const formatDate = iso => new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR');

function syncStats() {
  const counts = data.reduce((acc, item) => { acc[item.status] = (acc[item.status] || 0) + 1; return acc; }, {});
  document.querySelector('[data-stat="Todos"]').textContent = data.length;
  ['Rascunho','Submetida','Devolvida','Aprovada','Rejeitada'].forEach(status => {
    document.querySelector(`[data-stat="${status}"]`).textContent = counts[status] || 0;
  });
}

function filteredData() {
  const query = normalize(searchInput.value.trim());
  const status = statusFilter.value;
  const sector = sectorFilter.value;
  const dateValue = dateFilter.value;
  const params = new URLSearchParams(location.search);
  const dueSoon = params.get('due') === 'soon';
  const approvalMe = params.get('approval') === 'me';
  const today = new Date('2026-08-25T12:00:00');

  return data.filter(item => {
    const haystack = normalize([item.id, item.title, item.description, item.owner, item.responsible, item.sector].join(' '));
    if (query && !haystack.includes(query)) return false;
    if (status !== 'Todos' && item.status !== status) return false;
    if (sector !== 'Todos' && item.sector !== sector) return false;
    if (approvalMe && !item.requiresMyApproval) return false;
    if (dueSoon) {
      const diff = new Date(`${item.dueDate}T12:00:00`) - today;
      if (diff < 0 || diff > 5 * 86400000) return false;
    }
    if (dateValue !== 'Todos') {
      const updated = new Date(`${item.updatedAt}T12:00:00`);
      const diffDays = Math.floor((today - updated) / 86400000);
      if (dateValue === 'Hoje' && diffDays !== 0) return false;
      if (dateValue === '7' && diffDays > 7) return false;
      if (dateValue === '30' && diffDays > 30) return false;
    }
    return true;
  });
}

function render() {
  const items = filteredData();
  resultCount.textContent = items.length;
  emptyState.hidden = items.length !== 0;
  tableBody.innerHTML = items.map(item => `
    <tr class="clickable-row" tabindex="0" data-id="${item.id}" aria-label="Abrir F4 ${item.id}">
      <td class="id-cell">#${item.id}</td>
      <td><span class="f4-title">${item.title}</span><span class="f4-description">${item.description}</span></td>
      <td><span class="status-badge ${statusClass(item.status)}">${item.status}</span></td>
      <td>${formatDate(item.updatedAt)}</td>
      <td>${item.owner}</td>
      <td>${item.responsible}</td>
      <td>${item.sector}</td>
    </tr>`).join('');

  tableBody.querySelectorAll('tr').forEach(row => {
    const open = () => openF4(row.dataset.id);
    row.addEventListener('click', open);
    row.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); } });
  });
}

function selectStat(status) {
  statusFilter.value = status;
  statsGrid.querySelectorAll('.stat-card').forEach(card => {
    const selected = card.dataset.status === status;
    card.classList.toggle('is-selected', selected);
    card.setAttribute('aria-pressed', String(selected));
  });
  render();
}

statsGrid.querySelectorAll('.stat-card').forEach(card => card.addEventListener('click', () => selectStat(card.dataset.status)));
[searchInput, statusFilter, dateFilter, sectorFilter].forEach(el => el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', () => {
  if (el === statusFilter) selectStat(statusFilter.value);
  else render();
}));

document.querySelector('#clearFilters').addEventListener('click', () => {
  searchInput.value = '';
  statusFilter.value = 'Todos';
  dateFilter.value = 'Todos';
  sectorFilter.value = 'Todos';
  history.replaceState({}, '', './minhas-f4.html');
  selectStat('Todos');
});

document.querySelector('#newF4Button').addEventListener('click', () => { window.location.href = './nova-f4.html'; });
document.querySelector('#exportButton').addEventListener('click', () => {
  const rows = filteredData();
  const header = ['ID','F4','Status','Última atualização','Proprietário','Responsável atual','Setor atual'];
  const csv = [header, ...rows.map(i => [i.id,i.title,i.status,formatDate(i.updatedAt),i.owner,i.responsible,i.sector])]
    .map(row => row.map(value => `"${String(value).replaceAll('"','""')}"`).join(';')).join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'minhas-f4.csv';
  a.click();
  URL.revokeObjectURL(url);
});

const params = new URLSearchParams(location.search);
const initialStatus = params.get('status');
if (initialStatus && [...statusFilter.options].some(opt => opt.value === initialStatus)) statusFilter.value = initialStatus;
if (params.get('attention') === '1') statusFilter.value = 'Devolvida';
syncStats();
selectStat(statusFilter.value);

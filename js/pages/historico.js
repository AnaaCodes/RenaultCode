import { mountAppShell } from '../core/app-shell.js';
import { getActiveProfile } from '../core/user-session.js';
import { getVisibleF4, openF4 } from '../services/f4-service.js';
import {
  esc, norm, formatDateTime, statusClass, flattenHistory, profileCopy
} from './activity-utils.js';

mountAppShell({ activePage: 'historico', title: 'Histórico' });

const profile = getActiveProfile();
const f4Items = getVisibleF4(profile);
const allRows = flattenHistory(f4Items);
const [heading, description] = profileCopy(profile, 'historico');

document.querySelector('#activityTitle').textContent = heading;
document.querySelector('#activityDescription').textContent = description;

const search = document.querySelector('#historySearch');
const type = document.querySelector('#historyType');
const period = document.querySelector('#historyPeriod');
const body = document.querySelector('#historyBody');
const empty = document.querySelector('#historyEmpty');
const count = document.querySelector('#historyResultCount');

function rowType(row) {
  const status = norm(row.entry.status);
  if (row.entry.contentChange) return 'content';
  if (status.includes('rejeit')) return 'rejection';
  if (status.includes('devolv')) return 'return';
  if (status.includes('aprov') || status.includes('conclu')) return 'approval';
  return 'update';
}

function withinPeriod(row, days) {
  if (days === 'all') return true;
  const date = new Date(row.date);
  if (Number.isNaN(date.getTime())) return false;
  const limit = new Date();
  limit.setDate(limit.getDate() - Number(days));
  return date >= limit;
}

function filteredRows() {
  const q = norm(search.value);
  return allRows.filter(row => {
    if (type.value !== 'all' && rowType(row) !== type.value) return false;
    if (!withinPeriod(row, period.value)) return false;
    if (!q) return true;
    const haystack = norm([
      row.f4Code, row.f4.title, row.f4.project, row.version, row.title,
      row.description, row.status, row.user, row.sector
    ].join(' '));
    return haystack.includes(q);
  });
}

function render() {
  const rows = filteredRows();
  count.textContent = rows.length;
  empty.hidden = rows.length !== 0;
  body.innerHTML = rows.map(row => `
    <tr data-id="${esc(row.f4.id)}" tabindex="0">
      <td>${formatDateTime(row.date)}</td>
      <td><strong>${esc(row.f4Code)}</strong><span class="muted-line">${esc(row.f4.title)}</span></td>
      <td><span class="version-chip">${esc(row.version)}</span></td>
      <td><strong>${esc(row.title)}</strong><span class="muted-line">${esc(row.description)}</span></td>
      <td><span class="status-badge ${statusClass(row.status)}">${esc(row.status)}</span></td>
      <td><strong>${esc(row.user)}</strong></td>
      <td>${esc(row.sector)}</td>
    </tr>`).join('');

  body.querySelectorAll('tr[data-id]').forEach(row => {
    const open = () => openF4(row.dataset.id);
    row.addEventListener('click', open);
    row.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        open();
      }
    });
  });
}

const uniqueF4 = new Set(allRows.map(row => String(row.f4.id))).size;
document.querySelector('#historyTotal').textContent = allRows.length;
document.querySelector('#historyF4Count').textContent = uniqueF4;
document.querySelector('#historyApprovals').textContent = allRows.filter(row => rowType(row) === 'approval').length;
document.querySelector('#historyReturns').textContent = allRows.filter(row => ['return', 'rejection'].includes(rowType(row))).length;

[search, type, period].forEach(element => element.addEventListener(element === search ? 'input' : 'change', render));
document.querySelector('#historyClear').addEventListener('click', () => {
  search.value = '';
  type.value = 'all';
  period.value = 'all';
  render();
});

render();

import { F4_DATA } from '../data/f4-data.js';

export function getAllF4() { return [...F4_DATA]; }
export function getF4ById(id) { return F4_DATA.find(item => item.id === String(id)); }
export function getByStatus(status) { return status && status !== 'Todos' ? F4_DATA.filter(item => item.status === status) : [...F4_DATA]; }
export function getAttentionCounts() {
  const today = new Date('2026-08-25T12:00:00');
  const fiveDays = 5 * 24 * 60 * 60 * 1000;
  return {
    returned: F4_DATA.filter(item => item.status === 'Devolvida').length,
    dueSoon: F4_DATA.filter(item => {
      const diff = new Date(`${item.dueDate}T12:00:00`) - today;
      return diff >= 0 && diff <= fiveDays && !['Aprovada', 'Rejeitada'].includes(item.status);
    }).length,
    approval: F4_DATA.filter(item => item.requiresMyApproval).length
  };
}
export function getWorkQueue() {
  const priority = status => ({ Devolvida: 0, Submetida: 1, Rascunho: 2, Aprovada: 3, Rejeitada: 4 }[status] ?? 5);
  return [...F4_DATA]
    .sort((a, b) => priority(a.status) - priority(b.status) || a.dueDate.localeCompare(b.dueDate))
    .slice(0, 4);
}
export function openF4(id) { window.location.href = `./f4.html?id=${encodeURIComponent(id)}`; }

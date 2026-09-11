import { F4_DATA } from '../data/f4-data.js';
import { getActiveProfile } from '../core/user-session.js';

const STATE_PREFIX = 'f4-workflow-state-';
const CREATED_ITEMS_KEY = 'f4-created-items-v1';

export function generateF4Code(supplier, orderNumber, year = 2026) {
  const normalized = String(supplier || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z]/g, '');
  const prefix = normalized.substring(0, 3).toUpperCase().padEnd(3, 'X');
  return `${prefix}${String(orderNumber).padStart(3, '0')}/${String(year).slice(-2)}`;
}
export function getF4Code(f4) { return generateF4Code(f4?.supplier, f4?.orderNumber, f4?.year); }

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}
function stateKey(id) { return `${STATE_PREFIX}${id}`; }

function getCreatedItems() {
  try {
    const items = JSON.parse(localStorage.getItem(CREATED_ITEMS_KEY) || '[]');
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

function saveCreatedItems(items) {
  localStorage.setItem(CREATED_ITEMS_KEY, JSON.stringify(items));
}

function getBaseF4ById(id) {
  return [...F4_DATA, ...getCreatedItems()].find(item => String(item.id) === String(id));
}

export function createF4(record) {
  if (!record?.id) throw new Error('A nova F4 precisa possuir um ID.');
  const items = getCreatedItems();
  const existingIndex = items.findIndex(item => String(item.id) === String(record.id));
  const payload = clone(record);
  if (existingIndex >= 0) items[existingIndex] = payload;
  else items.push(payload);
  saveCreatedItems(items);
  localStorage.removeItem(stateKey(record.id));
  return clone(payload);
}

export function getNextF4OrderNumber() {
  const values = [...F4_DATA, ...getCreatedItems()]
    .map(item => Number(item.orderNumber))
    .filter(Number.isFinite);
  return (values.length ? Math.max(...values) : 0) + 1;
}

export function getWorkflowState(f4) {
  if (!f4) return null;
  try {
    const saved = JSON.parse(localStorage.getItem(stateKey(f4.id)) || 'null');
    return saved ? { ...clone(f4), ...saved } : clone(f4);
  } catch { return clone(f4); }
}

export function saveWorkflowState(f4) {
  const base = getBaseF4ById(f4.id);
  if (!base) return;
  const fields = [
    'title','description','project','status','updatedAt','responsible','sector','stage','currentStep',
    'returnedToProfile','returnOrigin','currentAssigneeSince','currentAssignee','assignedProfiles','history',
    'currentVersion','finalVersion','versioningSchema','versionSnapshots','validationCycle','activeSignatures',
    'signatureAudit','finalSignatures','finalApprovedAt','rejectedVersion','contentOverrides'
  ];
  const payload = Object.fromEntries(
    fields
      .filter(key => f4[key] !== undefined)
      .map(key => [key, clone(f4[key])])
  );
  localStorage.setItem(stateKey(f4.id), JSON.stringify(payload));
}

export function getAllF4() {
  const created = getCreatedItems();
  const createdIds = new Set(created.map(item => String(item.id)));
  return [...F4_DATA.filter(item => !createdIds.has(String(item.id))), ...created].map(getWorkflowState);
}
export function getF4ById(id) { return getWorkflowState(getBaseF4ById(id)); }
export function getByStatus(status) { return getAllF4().filter(item => !status || status === 'Todos' || item.status === status); }

export function getVisibleF4(profile = getActiveProfile()) {
  const all = getAllF4();
  if (profile.permissions?.viewAllF4 || profile.id === 'manager' || profile.id === 'cve') return all;
  if (profile.id === 'supplier') return all.filter(item => item.supplier === profile.name);
  return all.filter(item => item.assignedProfiles?.includes(profile.id) || item.currentAssignee?.profileId === profile.id);
}

export function isAssignedToProfile(item, profile = getActiveProfile()) {
  return item.currentAssignee?.profileId === profile.id || item.returnedToProfile === profile.id;
}

export function getAttentionCounts(profile = getActiveProfile()) {
  const data = getVisibleF4(profile);
  const now = new Date();
  return {
    returned: data.filter(i => i.status === 'Devolvida' && i.returnedToProfile === profile.id).length,
    dueSoon: data.filter(i => {
      const diff = new Date(`${i.dueDate}T12:00:00`) - now;
      return diff >= 0 && diff <= 5 * 86400000 && !['Aprovada','Rejeitada'].includes(i.status);
    }).length,
    approval: data.filter(i => i.currentAssignee?.profileId === profile.id && ['commercial','technical','manager','cve'].includes(i.currentStep)).length
  };
}

export function getWorkQueue(profile = getActiveProfile()) {
  return getVisibleF4(profile)
    .filter(i => !['Aprovada','Rejeitada'].includes(i.status))
    .sort((a,b) => {
      const aMine = isAssignedToProfile(a, profile) ? 0 : 1;
      const bMine = isAssignedToProfile(b, profile) ? 0 : 1;
      return aMine - bMine || String(a.dueDate).localeCompare(String(b.dueDate));
    }).slice(0, 5);
}

export function openF4(id) { window.location.href = `./f4.html?id=${encodeURIComponent(id)}`; }

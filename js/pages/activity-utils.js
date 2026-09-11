import { getF4Code } from '../services/f4-service.js';

export const STEP_LABELS = {
  creation: 'Criação da F4',
  supplier: 'Fornecedor',
  commercial: 'Validação comercial',
  technical: 'Validação técnica',
  manager: 'Decisão do gerente',
  cve: 'Decisão do CVE',
  final: 'Conclusão do fluxo',
  approved: 'Aprovada',
  rejected: 'Rejeitada'
};

export const STEP_SECTORS = {
  creation: 'Fornecedor',
  supplier: 'Fornecedor',
  commercial: 'Compras',
  technical: 'Engenharia',
  manager: 'Gerência de Projeto',
  cve: 'CVE',
  final: 'Sistema'
};

export function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function norm(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function formatDate(value) {
  if (!value) return '—';
  const date = new Date(String(value).length === 10 ? `${value}T12:00:00` : value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return formatDate(value);
  return date.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

export function statusClass(status) {
  const value = norm(status);
  if (value.includes('aprov')) return 'aprovada';
  if (value.includes('rejeit')) return 'rejeitada';
  if (value.includes('devolv')) return 'devolvida';
  if (value.includes('rascunho')) return 'rascunho';
  if (value.includes('submet') || value.includes('validacao') || value.includes('decisao')) return 'submetida';
  return 'em-analise';
}

export function eventNewStatus(entry, f4) {
  if (entry?.newStatus) return entry.newStatus;
  if (entry?.status === 'Devolvida' || entry?.status === 'Rejeitada') return entry.status;
  if (entry?.step === 'final' || entry?.status === 'Concluída') return f4?.status === 'Rejeitada' ? 'Rejeitada' : 'Aprovada';
  if (entry?.status === 'Aprovada') {
    const next = {
      commercial: 'Em validação técnica',
      technical: 'Em decisão do gerente',
      manager: 'Em decisão do CVE',
      cve: 'Aprovada'
    };
    return next[entry.step] || entry.status;
  }
  if (entry?.status === 'Em andamento') {
    const inProgress = {
      creation: 'Rascunho',
      commercial: 'Em validação comercial',
      technical: 'Em validação técnica',
      manager: 'Em decisão do gerente',
      cve: 'Em decisão do CVE'
    };
    return inProgress[entry.step] || entry.status;
  }
  return entry?.status || f4?.status || '—';
}

export function eventDescription(entry, f4) {
  if (entry?.description) return entry.description;
  if (entry?.rejectionReason) return `Motivo da rejeição: ${entry.rejectionReason}`;
  if (entry?.guidance) return entry.guidance;
  if (entry?.status === 'Devolvida') return `F4 devolvida para ${entry.returnedTo || 'correção'}.`;
  if (entry?.status === 'Rejeitada') return 'F4 não aprovada nesta etapa de validação.';
  if (entry?.status === 'Aprovada') return `${entry.label || STEP_LABELS[entry.step] || 'Etapa'} aprovada.`;
  if (entry?.status === 'Concluída') return 'Fluxo da F4 concluído.';
  if (entry?.status === 'Em andamento' || entry?.status === 'Pendente') return `${entry.label || STEP_LABELS[entry.step] || 'Etapa'} iniciada.`;
  return f4?.description || 'Registro de alteração da F4.';
}

export function eventSector(entry) {
  return entry?.sector || STEP_SECTORS[entry?.step] || 'Sistema';
}

export function flattenHistory(items) {
  return items.flatMap(f4 => (f4.history || []).map((entry, index) => ({
    id: `${f4.id}-${entry.snapshotId || index}-${entry.date || ''}`,
    f4,
    f4Code: getF4Code(f4),
    entry,
    version: entry.version || f4.currentVersion || '1.0.0',
    title: entry.label || STEP_LABELS[entry.step] || 'Alteração da F4',
    description: eventDescription(entry, f4),
    status: eventNewStatus(entry, f4),
    user: entry.by || (entry.step === 'creation' ? f4.supplier : 'Sistema'),
    sector: eventSector(entry),
    date: entry.date || f4.updatedAt
  }))).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
}

export function profileCopy(profile, page) {
  const content = {
    supplier: {
      historico: ['Histórico das minhas F4', 'Consulte todas as alterações registradas nas suas solicitações, incluindo devoluções, validações e mudanças de versão.'],
      pendencias: ['Minhas pendências', 'Veja o que precisa ser corrigido, concluído ou enviado para manter suas F4 em andamento.'],
      notificacoes: ['Notificações das minhas F4', 'Acompanhe devoluções, mudanças de etapa, aprovações e outras atualizações das suas solicitações.']
    },
    commercial: {
      historico: ['Histórico da validação comercial', 'Consulte as alterações das F4 que passaram ou estão passando pela equipe Comercial.'],
      pendencias: ['Pendências da validação comercial', 'Priorize as F4 que aguardam sua análise comercial e acompanhe prazos próximos.'],
      notificacoes: ['Notificações da validação comercial', 'Receba uma visão organizada das F4 que chegaram à sua etapa ou tiveram mudanças relevantes.']
    },
    technical: {
      historico: ['Histórico da Engenharia', 'Consulte as alterações das F4 acompanhadas pela validação técnica e os registros das etapas anteriores.'],
      pendencias: ['Pendências da Engenharia', 'Veja as F4 que aguardam validação técnica e as solicitações que exigem atenção por prazo.'],
      notificacoes: ['Notificações da Engenharia', 'Acompanhe novas F4 para validação técnica, devoluções e mudanças no fluxo.']
    },
    manager: {
      historico: ['Histórico dos projetos', 'Acompanhe as alterações das F4 vinculadas aos projetos e o histórico completo das decisões do fluxo.'],
      pendencias: ['Pendências dos projetos', 'Identifique decisões de projeto aguardando sua ação e F4 com prazos críticos.'],
      notificacoes: ['Notificações dos projetos', 'Acompanhe movimentações, validações e decisões das F4 dos projetos sob sua visão.']
    },
    cve: {
      historico: ['Histórico geral das F4', 'Consulte a rastreabilidade completa das F4, versões, decisões e mudanças realizadas durante o processo.'],
      pendencias: ['Pendências para decisão do CVE', 'Priorize as F4 que chegaram à decisão final e acompanhe solicitações com prazo crítico.'],
      notificacoes: ['Notificações do fluxo F4', 'Acompanhe movimentações relevantes do processo, decisões pendentes e conclusões das F4.']
    }
  };
  return content[profile.id]?.[page] || content.supplier[page];
}

export function relativeDeadline(dueDate) {
  if (!dueDate) return { label: 'Sem prazo', days: null, overdue: false, dueSoon: false };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${dueDate}T12:00:00`);
  due.setHours(0, 0, 0, 0);
  const days = Math.ceil((due - today) / 86400000);
  if (days < 0) return { label: `${Math.abs(days)} dia${Math.abs(days) === 1 ? '' : 's'} em atraso`, days, overdue: true, dueSoon: false };
  if (days === 0) return { label: 'Vence hoje', days, overdue: false, dueSoon: true };
  if (days <= 5) return { label: `Vence em ${days} dia${days === 1 ? '' : 's'}`, days, overdue: false, dueSoon: true };
  return { label: `Vence em ${days} dias`, days, overdue: false, dueSoon: false };
}

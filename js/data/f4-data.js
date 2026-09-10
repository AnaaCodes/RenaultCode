export const F4_DATA = [
  {
    id: '0023', supplier: 'Alfa Componentes', orderNumber: 23, year: 2026,
    title: 'Alteração de fornecedor — Peça A', description: 'Adequação contratual para peça A.',
    project: 'HJF — Kardian 2027', status: 'Devolvida', updatedAt: '2026-09-08', dueDate: '2026-09-12',
    owner: 'Alfa Componentes', responsible: 'Alfa Componentes', sector: 'Fornecedor', stage: 'Correção pelo fornecedor',
    currentStep: 'supplier', returnedToProfile: 'supplier', returnOrigin: 'technical', currentAssigneeSince: '2026-09-08T14:10:00',
    currentAssignee: { profileId: 'supplier', name: 'Alfa Componentes', role: 'Fornecedor' },
    assignedProfiles: ['commercial', 'technical'],
    history: [
      { step: 'creation', label: 'Criação', date: '2026-09-02T09:20:00', status: 'Concluída', by: 'Alfa Componentes' },
      { step: 'commercial', label: 'Validação comercial', date: '2026-09-04T11:00:00', status: 'Aprovada', by: 'Carlos Braatz' },
      { step: 'technical', label: 'Validação técnica', date: '2026-09-08T14:10:00', status: 'Devolvida', by: 'Mariana Silva', returnedTo: 'Fornecedor' }
    ]
  },
  {
    id: '0028', supplier: 'Beta Industrial', orderNumber: 28, year: 2026,
    title: 'Revisão contratual — Fornecedor B', description: 'Revisão de condição comercial e prazo contratual.',
    project: 'X52 — Stepway 2027', status: 'Em validação comercial', updatedAt: '2026-09-09', dueDate: '2026-09-14',
    owner: 'Carlos Braatz', responsible: 'Carlos Braatz', sector: 'Compras', stage: 'Validação comercial',
    currentStep: 'commercial', currentAssigneeSince: '2026-09-09T08:30:00',
    currentAssignee: { profileId: 'commercial', name: 'Carlos Braatz', role: 'Compras · Validação comercial' },
    assignedProfiles: ['commercial'],
    history: [
      { step: 'creation', label: 'Criação', date: '2026-09-08T16:05:00', status: 'Concluída', by: 'Beta Industrial' },
      { step: 'commercial', label: 'Validação comercial', date: '2026-09-09T08:30:00', status: 'Em andamento', by: 'Carlos Braatz' }
    ]
  },
  {
    id: '0031', supplier: 'Gama Sistemas', orderNumber: 31, year: 2026,
    title: 'Alteração de peça — Componente C', description: 'Ajuste técnico para substituição do componente.',
    project: 'D94 — Oroch 2028', status: 'Em validação técnica', updatedAt: '2026-09-09', dueDate: '2026-09-15',
    owner: 'Alfa Componentes', responsible: 'Mariana Silva', sector: 'Engenharia', stage: 'Validação técnica',
    currentStep: 'technical', currentAssigneeSince: '2026-09-09T13:40:00',
    currentAssignee: { profileId: 'technical', name: 'Mariana Silva', role: 'Engenharia · Validação técnica' },
    assignedProfiles: ['commercial', 'technical'],
    history: [
      { step: 'creation', label: 'Criação', date: '2026-09-05T10:15:00', status: 'Concluída', by: 'Gama Sistemas' },
      { step: 'commercial', label: 'Validação comercial', date: '2026-09-09T10:10:00', status: 'Aprovada', by: 'Carlos Braatz' },
      { step: 'technical', label: 'Validação técnica', date: '2026-09-09T13:40:00', status: 'Em andamento', by: 'Mariana Silva' }
    ]
  },
  {
    id: '0019', supplier: 'Delta Serviços', orderNumber: 19, year: 2026,
    title: 'Atualização de contrato — Serviço D', description: 'Atualização de escopo e vigência contratual.',
    project: 'HJF — Kardian 2027', status: 'Aprovada', updatedAt: '2026-09-03', dueDate: '2026-09-03',
    owner: 'Delta Serviços', responsible: 'Alfa Componentes', sector: 'CVE', stage: 'Aprovada',
    currentStep: 'approved', currentAssigneeSince: '2026-09-03T17:20:00',
    currentAssignee: { profileId: 'cve', name: 'Analice Mendes', role: 'CVE · Decisão final' },
    assignedProfiles: ['commercial', 'technical', 'manager', 'cve'],
    history: [
      { step: 'creation', label: 'Criação', date: '2026-08-24T09:00:00', status: 'Concluída', by: 'Delta Serviços' },
      { step: 'commercial', label: 'Validação comercial', date: '2026-08-27T11:30:00', status: 'Aprovada', by: 'Carlos Braatz' },
      { step: 'technical', label: 'Validação técnica', date: '2026-08-29T15:20:00', status: 'Aprovada', by: 'Mariana Silva' },
      { step: 'manager', label: 'Decisão do gerente de projeto', date: '2026-09-01T14:00:00', status: 'Aprovada', by: 'Marcos Oliveira' },
      { step: 'cve', label: 'Decisão do CVE', date: '2026-09-03T17:20:00', status: 'Aprovada', by: 'Alfa Componentes' },
      { step: 'final', label: 'Aprovada', date: '2026-09-03T17:20:00', status: 'Concluída' }
    ]
  },
  {
    id: '0022', supplier: 'Epsilon Peças', orderNumber: 22, year: 2026,
    title: 'Revisão contratual — Peça E', description: 'Ajuste de condição comercial para nova vigência.',
    project: 'X52 — Stepway 2027', status: 'Rascunho', updatedAt: '2026-09-07', dueDate: '2026-09-18',
    owner: 'Epsilon Peças', responsible: 'Epsilon Peças', sector: 'Fornecedor', stage: 'Criação',
    currentStep: 'creation', currentAssigneeSince: '2026-09-07T09:00:00',
    currentAssignee: { profileId: 'supplier', name: 'Epsilon Peças', role: 'Fornecedor' },
    assignedProfiles: [], history: [
      { step: 'creation', label: 'Criação', date: '2026-09-07T09:00:00', status: 'Em andamento', by: 'Epsilon Peças' }
    ]
  },
  {
    id: '0033', supplier: 'Zeta Soluções', orderNumber: 33, year: 2026,
    title: 'Mudança de fornecedor — Serviço F', description: 'Troca do fornecedor responsável pelo serviço.',
    project: 'EVB — Compact EV 2028', status: 'Rejeitada', updatedAt: '2026-09-05', dueDate: '2026-09-05',
    owner: 'Zeta Soluções', responsible: 'Alfa Componentes', sector: 'CVE', stage: 'Rejeitada',
    currentStep: 'rejected', currentAssigneeSince: '2026-09-05T16:45:00',
    currentAssignee: { profileId: 'cve', name: 'Analice Mendes', role: 'CVE · Decisão final' },
    assignedProfiles: ['commercial', 'technical', 'manager', 'cve'],
    history: [
      { step: 'creation', label: 'Criação', date: '2026-08-28T08:10:00', status: 'Concluída', by: 'Zeta Soluções' },
      { step: 'commercial', label: 'Validação comercial', date: '2026-08-30T13:00:00', status: 'Aprovada', by: 'Carlos Braatz' },
      { step: 'technical', label: 'Validação técnica', date: '2026-09-01T10:30:00', status: 'Aprovada', by: 'Mariana Silva' },
      { step: 'manager', label: 'Decisão do gerente de projeto', date: '2026-09-03T14:20:00', status: 'Aprovada', by: 'Marcos Oliveira' },
      { step: 'cve', label: 'Decisão do CVE', date: '2026-09-05T16:45:00', status: 'Rejeitada', by: 'Alfa Componentes', guidance: 'Impacto econômico acima do limite aceito para o escopo apresentado.' },
      { step: 'final', label: 'Cancelada', date: '2026-09-05T16:45:00', status: 'Concluída' }
    ]
  },
  {
    id: '0034', supplier: 'Sigma Comercial', orderNumber: 34, year: 2026,
    title: 'Inclusão de cláusula — Contrato G', description: 'Inclusão de cláusula de reajuste contratual.',
    project: 'HJF — Kardian 2027', status: 'Em decisão do gerente', updatedAt: '2026-09-10', dueDate: '2026-09-16',
    owner: 'Sigma Comercial', responsible: 'Marcos Oliveira', sector: 'Gerência do projeto', stage: 'Decisão do gerente de projeto',
    currentStep: 'manager', currentAssigneeSince: '2026-09-10T09:15:00',
    currentAssignee: { profileId: 'manager', name: 'Marcos Oliveira', role: 'Gerente do projeto' },
    assignedProfiles: ['commercial', 'technical', 'manager'],
    history: [
      { step: 'creation', label: 'Criação', date: '2026-09-03T10:00:00', status: 'Concluída', by: 'Sigma Comercial' },
      { step: 'commercial', label: 'Validação comercial', date: '2026-09-07T11:45:00', status: 'Aprovada', by: 'Carlos Braatz' },
      { step: 'technical', label: 'Validação técnica', date: '2026-09-09T15:10:00', status: 'Aprovada', by: 'Mariana Silva' },
      { step: 'manager', label: 'Decisão do gerente de projeto', date: '2026-09-10T09:15:00', status: 'Em andamento', by: 'Marcos Oliveira' }
    ]
  },
  {
    id: '0035', supplier: 'Omega Tecnologia', orderNumber: 35, year: 2026,
    title: 'Revisão de valor — Fornecedor H', description: 'Readequação do valor global do contrato.',
    project: 'D94 — Oroch 2028', status: 'Devolvida', updatedAt: '2026-09-09', dueDate: '2026-09-13',
    owner: 'Omega Tecnologia', responsible: 'Carlos Braatz', sector: 'Compras', stage: 'Correção comercial',
    currentStep: 'commercial', returnedToProfile: 'commercial', returnOrigin: 'manager', currentAssigneeSince: '2026-09-09T16:00:00',
    currentAssignee: { profileId: 'commercial', name: 'Carlos Braatz', role: 'Compras · Validação comercial' },
    assignedProfiles: ['commercial', 'technical', 'manager'],
    history: [
      { step: 'creation', label: 'Criação', date: '2026-08-29T10:10:00', status: 'Concluída', by: 'Omega Tecnologia' },
      { step: 'commercial', label: 'Validação comercial', date: '2026-09-01T09:00:00', status: 'Aprovada', by: 'Carlos Braatz' },
      { step: 'technical', label: 'Validação técnica', date: '2026-09-05T10:20:00', status: 'Aprovada', by: 'Mariana Silva' },
      { step: 'manager', label: 'Decisão do gerente de projeto', date: '2026-09-09T16:00:00', status: 'Devolvida', by: 'Marcos Oliveira', returnedTo: 'Compras', guidance: 'Revisar a composição comercial do SET antes de seguir para decisão.' }
    ]
  },
  {
    id: '0036', supplier: 'Nexus Serviços', orderNumber: 36, year: 2026,
    title: 'Renovação contratual — Serviço I', description: 'Renovação do contrato por novo período de vigência.',
    project: 'X52 — Stepway 2027', status: 'Em decisão do CVE', updatedAt: '2026-09-10', dueDate: '2026-09-17',
    owner: 'Nexus Serviços', responsible: 'Alfa Componentes', sector: 'CVE', stage: 'Decisão do CVE',
    currentStep: 'cve', currentAssigneeSince: '2026-09-10T10:40:00',
    currentAssignee: { profileId: 'cve', name: 'Analice Mendes', role: 'CVE · Decisão final' },
    assignedProfiles: ['commercial', 'technical', 'manager', 'cve'],
    history: [
      { step: 'creation', label: 'Criação', date: '2026-09-01T14:30:00', status: 'Concluída', by: 'Nexus Serviços' },
      { step: 'commercial', label: 'Validação comercial', date: '2026-09-04T12:00:00', status: 'Aprovada', by: 'Carlos Braatz' },
      { step: 'technical', label: 'Validação técnica', date: '2026-09-07T09:20:00', status: 'Aprovada', by: 'Mariana Silva' },
      { step: 'manager', label: 'Decisão do gerente de projeto', date: '2026-09-09T16:20:00', status: 'Aprovada', by: 'Marcos Oliveira' },
      { step: 'cve', label: 'Decisão do CVE', date: '2026-09-10T10:40:00', status: 'Em andamento', by: 'Alfa Componentes' }
    ]
  },
  {
    id: '0037', supplier: 'Atlas Componentes', orderNumber: 37, year: 2026,
    title: 'Cancelamento de item — Contrato J', description: 'Retirada de item que não será mais fornecido.',
    project: 'EVB — Compact EV 2028', status: 'Devolvida', updatedAt: '2026-09-10', dueDate: '2026-09-18',
    owner: 'Atlas Componentes', responsible: 'Mariana Silva', sector: 'Engenharia', stage: 'Correção técnica',
    currentStep: 'technical', returnedToProfile: 'technical', returnOrigin: 'cve', currentAssigneeSince: '2026-09-10T11:20:00',
    currentAssignee: { profileId: 'technical', name: 'Mariana Silva', role: 'Engenharia · Validação técnica' },
    assignedProfiles: ['commercial', 'technical', 'manager', 'cve'],
    history: [
      { step: 'creation', label: 'Criação', date: '2026-08-31T13:00:00', status: 'Concluída', by: 'Atlas Componentes' },
      { step: 'commercial', label: 'Validação comercial', date: '2026-09-02T15:00:00', status: 'Aprovada', by: 'Carlos Braatz' },
      { step: 'technical', label: 'Validação técnica', date: '2026-09-05T09:00:00', status: 'Aprovada', by: 'Mariana Silva' },
      { step: 'manager', label: 'Decisão do gerente de projeto', date: '2026-09-07T14:00:00', status: 'Aprovada', by: 'Marcos Oliveira' },
      { step: 'cve', label: 'Decisão do CVE', date: '2026-09-10T11:20:00', status: 'Devolvida', by: 'Alfa Componentes', returnedTo: 'Engenharia', guidance: 'Validar novamente o impacto técnico da referência substituta.' }
    ]
  }
];

export const FLOW_SUMMARY = [
  { key: 'Em validação comercial', label: 'Validação comercial', value: 0, className: 'submitted-stage' },
  { key: 'Em validação técnica', label: 'Validação técnica', value: 0, className: 'analysis-stage' },
  { key: 'Em decisão do CVE', label: 'Decisão do CVE', value: 0, className: 'draft-stage' },
  { key: 'Aprovada', label: 'Aprovadas', value: 0, className: 'approved-stage' },
  { key: 'Rejeitada', label: 'Rejeitadas', value: 0, className: 'rejected-stage' }
];

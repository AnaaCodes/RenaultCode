export const PROJECTS = [
  {
    id: 'HJF', name: 'Kardian 2027', status: 'Em andamento', statusTone: 'good', phase: 'Validação', sop: '03/2027',
    tags: ['B-SUV', 'Kardian / Stepway', 'Plataforma CMF'], totals: { f4: 24, approval: 4, returned: 3, suppliers: 9, impact: 182000 },
    progress: 72, milestones: [['Conceito','03/2024'],['Desenvolvimento','08/2024'],['Industrialização','02/2026'],['Validação','08/2026'],['SOP','03/2027']]
  },
  {
    id: 'X52', name: 'Stepway 2027', status: 'Atenção', statusTone: 'warn', phase: 'Desenvolvimento', sop: '11/2027',
    tags: ['B-SUV', 'Stepway', 'Plataforma CMF'], totals: { f4: 18, approval: 2, returned: 1, suppliers: 6, impact: 125000 },
    progress: 35, milestones: [['Conceito','01/2024'],['Desenvolvimento','09/2024'],['Industrialização','03/2026'],['Validação','10/2026'],['SOP','11/2027']]
  },
  {
    id: 'D94', name: 'Oroch 2028', status: 'Em andamento', statusTone: 'good', phase: 'Industrialização', sop: '06/2028',
    tags: ['Pick-up', 'Oroch', 'Plataforma Dacia'], totals: { f4: 22, approval: 1, returned: 1, suppliers: 8, impact: 210000 },
    progress: 58, milestones: [['Conceito','03/2024'],['Desenvolvimento','12/2024'],['Industrialização','06/2026'],['Validação','01/2028'],['SOP','06/2028']]
  },
  {
    id: 'EVB', name: 'Compact EV 2028', status: 'Crítico', statusTone: 'critical', phase: 'Conceito', sop: '09/2028',
    tags: ['Hatch', 'Veículo Elétrico', 'Plataforma AmpR'], totals: { f4: 22, approval: 0, returned: 0, suppliers: 5, impact: 125000 },
    progress: 16, milestones: [['Conceito','03/2024'],['Desenvolvimento','11/2024'],['Industrialização','07/2026'],['Validação','02/2028'],['SOP','09/2028']]
  }
];

export const PRIORITY_F4 = [
  ['ALF023/26','HJF — Kardian 2027','Alteração de fornecedor','Fornecedor A','Ajuste solicitado','Hoje','Devolvida','Você'],
  ['BET028/26','X52 — Stepway 2027','Revisão contratual','Fornecedor B','Minha aprovação','28/08','Submetida','Carlos Binatz'],
  ['GAM031/26','D94 — Oroch 2028','Alteração de peça','Fornecedor C','Em análise','01/09','Em análise','Mariana Silva'],
  ['OME035/26','EVB — Compact EV 2028','Revisão de valor','Fornecedor H','Aguardando aprovação','05/09','Aguardando','Você'],
  ['DEL017/26','HJF — Kardian 2027','Inclusão de novo componente','Fornecedor D','Em análise','10/09','Em análise','Roberto Lima']
];

export const MOVEMENTS = [
  ['red','Hoje, 10:24','F4 ALF023/26 devolvida ao fornecedor','Por Paula Brito'],
  ['blue','Ontem, 16:18','F4 BET028/26 enviada para aprovação','Por Carlos Binatz'],
  ['blue','25/08/2026, 14:32','F4 GAM031/26 teve o status alterado','Por Mariana Silva'],
  ['purple','24/08/2026, 09:15','Comentário adicionado na F4 OME035/26','“Impacto no custo total...” por Ana Costa'],
  ['purple','22/08/2026, 08:47','F4 DEL017/26 criada','Por Roberto Lima']
];

export const RISKS = [
  ['critical','EVB — Compact EV 2028','3 F4 devolvidas que precisam de ajuste.'],
  ['warn','X52 — Stepway 2027','2 F4 com prazo próximo de vencimento.'],
  ['warn','D94 — Oroch 2028','Impacto econômico acima do previsto.']
];

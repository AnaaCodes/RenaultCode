import { mountAppShell } from '../core/app-shell.js';
import { PROJECTS } from '../data/project-data.js';
import { getAllF4, getF4Code, openF4 } from '../services/f4-service.js';

const shellMounted = mountAppShell({ activePage: 'projetos', title: 'Detalhes do projeto' });

if (shellMounted) {
  const params = new URLSearchParams(window.location.search);
  const projectId = params.get('id');
  const project = PROJECTS.find(item => item.id === projectId);

  const hero = document.querySelector('#projectHero');
  const summary = document.querySelector('#projectSummary');
  const generalInfo = document.querySelector('#projectGeneralInfo');
  const lifecycle = document.querySelector('#projectLifecycle');
  const sectorNav = document.querySelector('#sectorNav');
  const sectorSections = document.querySelector('#sectorSections');
  const finalizedPanel = document.querySelector('#projectFinalized');
  const notFound = document.querySelector('#projectNotFound');
  const breadcrumb = document.querySelector('#breadcrumbProject');

  const escapeHtml = value => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const normalize = value => String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  const money = value => new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0
  }).format(Number(value || 0));

  const formatDate = value => value
    ? new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR')
    : '—';

  const statusClass = value => normalize(value).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const isFinalized = item => ['approved', 'rejected'].includes(item.currentStep) || ['Aprovada', 'Rejeitada'].includes(item.status);

  const projectF4 = project
    ? getAllF4().filter(item => String(item.project || '').startsWith(`${project.id} —`))
    : [];

  const SECTORS = [
    {
      id: 'supplier',
      title: 'Fornecedor',
      subtitle: 'Criação e correções',
      owner: 'Fornecedores do projeto',
      role: 'Criação da F4, complementação de informações e correções solicitadas durante o fluxo.',
      steps: ['creation', 'supplier'],
      tone: 'purple',
      icon: 'F'
    },
    {
      id: 'commercial',
      title: 'Comercial',
      subtitle: 'Compras · Validação comercial',
      owner: 'Carlos Braatz',
      role: 'Validação de condições comerciais, impactos econômicos, contratos e informações de compra.',
      steps: ['commercial'],
      tone: 'yellow',
      icon: 'C'
    },
    {
      id: 'technical',
      title: 'Engenharia',
      subtitle: 'Validação técnica',
      owner: 'Mariana Silva',
      role: 'Validação técnica de referências, capacidade, implementação, peso e impactos de engenharia.',
      steps: ['technical'],
      tone: 'blue',
      icon: 'E'
    },
    {
      id: 'manager',
      title: 'Gerência de Projeto',
      subtitle: 'Decisão do projeto',
      owner: 'Marcos Oliveira',
      role: 'Consolidação dos impactos no programa e decisão do projeto antes do encaminhamento ao CVE.',
      steps: ['manager'],
      tone: 'purple',
      icon: 'G'
    },
    {
      id: 'cve',
      title: 'CVE',
      subtitle: 'Decisão final',
      owner: 'Analice Mendes',
      role: 'Governança da decisão final, conformidade do fluxo e aprovação definitiva da F4.',
      steps: ['cve'],
      tone: 'green',
      icon: 'CVE'
    }
  ];

  function latestMovement(items) {
    const dates = items
      .map(item => item.currentAssigneeSince || (item.updatedAt ? `${item.updatedAt}T12:00:00` : null))
      .filter(Boolean)
      .sort((a, b) => new Date(b) - new Date(a));
    return dates[0] ? new Date(dates[0]).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Sem movimentação ativa';
  }

  function dueTone(date, status) {
    if (!date || ['Aprovada', 'Rejeitada'].includes(status)) return '';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(`${date}T12:00:00`);
    const diff = Math.ceil((due - today) / 86400000);
    if (diff < 0) return 'is-overdue';
    if (diff <= 5) return 'is-due-soon';
    return '';
  }

  function activeForSector(sector) {
    return projectF4.filter(item => !isFinalized(item) && sector.steps.includes(item.currentStep));
  }

  function touchedSector(item, sector) {
    return sector.steps.includes(item.currentStep) || (item.history || []).some(entry => sector.steps.includes(entry.step));
  }

  function renderF4Rows(items, emptyTitle = 'Nenhuma F4 ativa neste setor', emptyText = 'Quando uma F4 chegar a esta etapa, ela aparecerá automaticamente aqui.') {
    if (!items.length) {
      return `<div class="sector-empty-state"><strong>${escapeHtml(emptyTitle)}</strong><span>${escapeHtml(emptyText)}</span></div>`;
    }

    return `
      <div class="sector-table-wrap">
        <table class="sector-f4-table">
          <thead>
            <tr>
              <th>F4</th>
              <th>Solicitação</th>
              <th>Fornecedor</th>
              <th>Status</th>
              <th>Responsável atual</th>
              <th>Prazo</th>
              <th>Atualização</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${items.map(item => `
              <tr class="sector-f4-row" data-f4-id="${escapeHtml(item.id)}" tabindex="0">
                <td><strong class="sector-f4-code">${escapeHtml(getF4Code(item))}</strong></td>
                <td><span class="sector-f4-title">${escapeHtml(item.title)}</span><small>${escapeHtml(item.stage || item.description)}</small></td>
                <td>${escapeHtml(item.supplier || '—')}</td>
                <td><span class="project-status-badge ${statusClass(item.status)}">${escapeHtml(item.status)}</span></td>
                <td><strong class="sector-assignee">${escapeHtml(item.currentAssignee?.name || item.responsible || '—')}</strong><small>${escapeHtml(item.currentAssignee?.role || item.sector || '')}</small></td>
                <td class="${dueTone(item.dueDate, item.status)}">${formatDate(item.dueDate)}</td>
                <td>${formatDate(item.updatedAt)}</td>
                <td><button class="sector-open-f4" type="button" data-open-f4="${escapeHtml(item.id)}" aria-label="Abrir ${escapeHtml(getF4Code(item))}">→</button></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }

  function attachF4Handlers(scope = document) {
    scope.querySelectorAll('[data-open-f4]').forEach(button => {
      button.addEventListener('click', event => {
        event.stopPropagation();
        openF4(button.dataset.openF4);
      });
    });

    scope.querySelectorAll('.sector-f4-row[data-f4-id]').forEach(row => {
      const open = () => openF4(row.dataset.f4Id);
      row.addEventListener('click', open);
      row.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          open();
        }
      });
    });
  }

  function renderProject() {
    if (!project) {
      hero.hidden = true;
      summary.hidden = true;
      document.querySelector('.project-overview-panel').hidden = true;
      document.querySelector('.project-sectors-area').hidden = true;
      finalizedPanel.hidden = true;
      notFound.hidden = false;
      return;
    }

    document.title = `${project.id} — ${project.name} | Sistema F4`;
    breadcrumb.textContent = `${project.id} — ${project.name}`;

    const activeItems = projectF4.filter(item => !isFinalized(item));
    const waitingDecision = activeItems.filter(item => ['commercial', 'technical', 'manager', 'cve'].includes(item.currentStep));
    const returned = activeItems.filter(item => item.status === 'Devolvida');
    const suppliers = new Set(projectF4.map(item => item.supplier).filter(Boolean));
    const finalized = projectF4.filter(isFinalized);
    const platform = project.tags.find(tag => normalize(tag).startsWith('plataforma')) || '—';
    const segment = project.tags[0] || '—';
    const family = project.tags[1] || '—';

    hero.innerHTML = `
      <div class="project-hero-main">
        <a class="project-back-link" href="./projetos.html" aria-label="Voltar para projetos">← Voltar para projetos</a>
        <div class="project-hero-title-row">
          <div>
            <p class="eyebrow">Projeto veicular</p>
            <h1 id="projectTitle">${escapeHtml(project.id)} — ${escapeHtml(project.name)}</h1>
          </div>
          <span class="project-health-badge ${escapeHtml(project.statusTone)}"><i></i>${escapeHtml(project.status)}</span>
        </div>
        <div class="project-hero-tags">${project.tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join('')}</div>
      </div>
      <div class="project-hero-side">
        <div><span>Fase atual</span><strong>${escapeHtml(project.phase)}</strong></div>
        <div><span>SOP previsto</span><strong>${escapeHtml(project.sop)}</strong></div>
        <div><span>Progresso</span><strong>${escapeHtml(project.progress)}%</strong></div>
      </div>`;

    const summaryCards = [
      ['F4 totais', project.totals?.f4 ?? projectF4.length, `${projectF4.length} registros carregados nesta visão`, 'purple'],
      ['F4 ativas', activeItems.length, 'Em andamento no fluxo atual', 'blue'],
      ['Aguardando decisão', waitingDecision.length, 'Comercial, Engenharia, Gerência ou CVE', 'yellow'],
      ['Devolvidas', returned.length, 'Precisam de revisão antes de seguir', 'red'],
      ['Fornecedores', project.totals?.suppliers ?? suppliers.size, `${suppliers.size} presentes nos registros carregados`, 'gray'],
      ['Impacto econômico', money(project.totals?.impact), 'Estimativa consolidada do projeto', 'green']
    ];

    summary.innerHTML = summaryCards.map(([label, value, help, tone]) => `
      <article class="project-detail-stat ${tone}">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
        <small>${escapeHtml(help)}</small>
      </article>`).join('');

    const generalGroups = [
      {
        title: 'Programa',
        items: [
          ['Código do projeto', project.id],
          ['Veículo', project.name],
          ['Segmento', segment],
          ['Família / programa', family]
        ]
      },
      {
        title: 'Planejamento',
        items: [
          ['Fase atual', project.phase],
          ['SOP previsto', project.sop],
          ['Progresso do projeto', `${project.progress}%`],
          ['Plataforma', platform.replace(/^Plataforma\s*/i, '') || platform]
        ]
      },
      {
        title: 'Governança',
        items: [
          ['Gerente do projeto', 'Marcos Oliveira'],
          ['Responsável comercial', 'Carlos Braatz'],
          ['Responsável técnico', 'Mariana Silva'],
          ['Responsável CVE', 'Analice Mendes']
        ]
      }
    ];

    generalInfo.innerHTML = generalGroups.map(group => `
      <article class="project-general-card">
        <h3>${escapeHtml(group.title)}</h3>
        <dl>${group.items.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl>
      </article>`).join('');

    lifecycle.innerHTML = `
      <div class="lifecycle-heading">
        <div><h3>Cronograma do projeto</h3><p>Marcos do ciclo de desenvolvimento até o SOP.</p></div>
        <strong>${escapeHtml(project.progress)}%</strong>
      </div>
      <div class="lifecycle-progress" style="--detail-progress:${Number(project.progress || 0)}%"><span></span></div>
      <div class="lifecycle-steps">
        ${project.milestones.map((milestone, index) => {
          const completed = index <= Math.floor((Number(project.progress || 0) / 100) * (project.milestones.length - 1));
          return `<div class="lifecycle-step ${completed ? 'is-complete' : ''}"><i></i><strong>${escapeHtml(milestone[0])}</strong><small>${escapeHtml(milestone[1])}</small></div>`;
        }).join('')}
      </div>`;

    sectorNav.innerHTML = SECTORS.map(sector => {
      const active = activeForSector(sector);
      return `
        <button class="sector-nav-card" type="button" data-sector-target="sector-${sector.id}">
          <span class="sector-nav-icon ${sector.tone}">${escapeHtml(sector.icon)}</span>
          <span><strong>${escapeHtml(sector.title)}</strong><small>${active.length} F4 ${active.length === 1 ? 'ativa' : 'ativas'}</small></span>
        </button>`;
    }).join('');

    sectorSections.innerHTML = SECTORS.map(sector => {
      const active = activeForSector(sector);
      const touched = projectF4.filter(item => touchedSector(item, sector));
      return `
        <article class="sector-panel" id="sector-${sector.id}">
          <header class="sector-panel-header">
            <div class="sector-heading-main">
              <span class="sector-large-icon ${sector.tone}">${escapeHtml(sector.icon)}</span>
              <div>
                <div class="sector-title-line"><h3>${escapeHtml(sector.title)}</h3><span class="sector-active-pill ${active.length ? 'has-items' : ''}">${active.length} ativa${active.length === 1 ? '' : 's'}</span></div>
                <p>${escapeHtml(sector.subtitle)}</p>
              </div>
            </div>
            <div class="sector-kpis">
              <div><span>Responsável</span><strong>${escapeHtml(sector.owner)}</strong></div>
              <div><span>F4 que passaram pela área</span><strong>${touched.length}</strong></div>
              <div><span>Última movimentação</span><strong>${escapeHtml(latestMovement(active))}</strong></div>
            </div>
          </header>
          <div class="sector-role-note"><span>Atuação do setor</span><p>${escapeHtml(sector.role)}</p></div>
          ${renderF4Rows(active)}
        </article>`;
    }).join('');

    sectorNav.querySelectorAll('[data-sector-target]').forEach(button => {
      button.addEventListener('click', () => {
        document.querySelector(`#${button.dataset.sectorTarget}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    finalizedPanel.innerHTML = `
      <div class="project-section-heading finalized-heading">
        <div>
          <p class="eyebrow">Encerradas</p>
          <h2 id="projectFinalizedTitle">F4s concluídas no projeto</h2>
          <p>F4s aprovadas ou rejeitadas que já encerraram o fluxo de decisão.</p>
        </div>
        <span class="finalized-count">${finalized.length}</span>
      </div>
      ${renderF4Rows(finalized, 'Nenhuma F4 concluída neste projeto', 'As F4s aprovadas ou rejeitadas aparecerão aqui ao final do fluxo.')}`;

    attachF4Handlers(sectorSections);
    attachF4Handlers(finalizedPanel);
  }

  renderProject();
}

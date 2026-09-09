import { mountAppShell } from '../core/app-shell.js';
import { showToast } from '../core/toast.js';
import { PROJECTS, PRIORITY_F4, MOVEMENTS, RISKS } from '../data/project-data.js';

if (mountAppShell({ activePage: 'projetos', title: 'Projetos' })) {
  const money = value => {
    const absolute = Math.abs(value);
    const sign = value < 0 ? '-' : '';

    if (absolute >= 1_000_000) {
      const compact = (absolute / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
      return `${sign}R$ ${compact} mi`;
    }

    if (absolute >= 1_000) {
      const compact = (absolute / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
      return `${sign}R$ ${compact} mil`;
    }

    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0
    }).format(value);
  };

  const normalizePhase = phase => phase.trim().toLocaleLowerCase('pt-BR');

  const phaseMatches = (project, filter) => {
    const phase = normalizePhase(project.phase);
    const status = normalizePhase(project.status);

    switch (filter) {
      case 'creation':
        return phase === 'em criação' || phase === 'criacao' || phase === 'criação' || phase === 'conceito';
      case 'development':
        return phase === 'em desenvolvimento' || phase === 'desenvolvimento';
      case 'industrialization':
        return phase === 'industrialização' || phase === 'industrializacao';
      case 'validation':
        return phase === 'validação' || phase === 'validacao';
      case 'closed':
        return phase === 'encerrado' || status === 'encerrado' || status === 'concluído' || status === 'concluido';
      case 'impact':
        return Number(project.totals?.impact || 0) !== 0;
      case 'active':
      default:
        return !phaseMatches(project, 'closed');
    }
  };

  const summary = {
    active: PROJECTS.filter(project => phaseMatches(project, 'active')).length,
    creation: PROJECTS.filter(project => phaseMatches(project, 'creation')).length,
    development: PROJECTS.filter(project => phaseMatches(project, 'development')).length,
    industrialization: PROJECTS.filter(project => phaseMatches(project, 'industrialization')).length,
    validation: PROJECTS.filter(project => phaseMatches(project, 'validation')).length,
    closed: PROJECTS.filter(project => phaseMatches(project, 'closed')).length,
    impact: PROJECTS.reduce((sum, project) => sum + project.totals.impact, 0)
  };

  Object.entries(summary).forEach(([key, value]) => {
    const target = document.querySelector(`[data-summary="${key}"]`);
    if (!target) return;
    target.textContent = key === 'impact' ? money(value) : value;
  });

  const projectsGrid = document.querySelector('#projectsGrid');

  const renderProjects = projects => {
    if (!projects.length) {
      projectsGrid.innerHTML = `
        <div class="projects-empty-state" role="status">
          <strong>Nenhum projeto nesta fase</strong>
          <span>Não há projetos correspondentes ao filtro selecionado.</span>
        </div>`;
      return;
    }

    projectsGrid.innerHTML = projects.map(project => `
      <article class="project-card" data-project-id="${project.id}">
        <div class="project-card-top">
          <div class="project-heading">
            <div class="project-title-row">
              <h3>${project.id} — ${project.name}</h3>
              <span class="project-health ${project.statusTone}"><i></i>${project.status}</span>
            </div>
            <div class="project-tags">${project.tags.map(tag => `<span>${tag}</span>`).join('')}</div>
          </div>
          <dl class="project-meta">
            <div><dt>Fase atual</dt><dd>${project.phase}</dd></div>
            <div><dt>SOP previsto</dt><dd><span aria-hidden="true">▣</span> ${project.sop}</dd></div>
          </dl>
        </div>

        <div class="project-metrics">
          <div><span>F4 totais</span><strong>${project.totals.f4}</strong></div>
          <div><span>Aguardando aprovação</span><strong>${project.totals.approval}</strong></div>
          <div><span>Devolvidas</span><strong>${project.totals.returned}</strong></div>
          <div><span>Fornecedores</span><strong>${project.totals.suppliers}</strong></div>
          <div><span>Impacto econômico</span><strong>${money(project.totals.impact)}</strong></div>
        </div>

        <div class="project-progress-row">
          <div class="project-timeline" style="--project-progress:${project.progress}%">
            <div class="timeline-line"><span></span></div>
            <div class="timeline-steps">
              ${project.milestones.map((milestone, index) => `<div class="timeline-step ${index <= Math.floor((project.progress / 100) * 4) ? 'done' : ''}"><i></i><span>${milestone[0]}</span><small>${milestone[1]}</small></div>`).join('')}
            </div>
          </div>
          <button class="project-open-button" type="button" data-open-project="${project.id}">Ver projeto <span>→</span></button>
        </div>
      </article>`).join('');

    projectsGrid.querySelectorAll('[data-open-project]').forEach(button => {
      button.addEventListener('click', () => {
        const project = PROJECTS.find(item => item.id === button.dataset.openProject);
        showToast(`${project.id} — ${project.name}: este projeto será aberto.`);
      });
    });
  };

  const applyProjectFilter = filter => {
    const filtered = PROJECTS.filter(project => phaseMatches(project, filter));
    renderProjects(filtered);

    document.querySelectorAll('[data-project-filter]').forEach(card => {
      const selected = card.dataset.projectFilter === filter;
      card.classList.toggle('is-active', selected);
      card.setAttribute('aria-pressed', String(selected));
    });
  };

  document.querySelectorAll('[data-project-filter]').forEach(card => {
    card.addEventListener('click', () => applyProjectFilter(card.dataset.projectFilter));
  });

  applyProjectFilter('active');

  const priorityBody = document.querySelector('#priorityBody');
  priorityBody.innerHTML = PRIORITY_F4.map(row => `
    <tr>
      <td><strong>${row[0]}</strong></td><td>${row[1]}</td><td>${row[2]}</td><td>${row[3]}</td><td>${row[4]}</td>
      <td class="${row[5] === 'Hoje' ? 'deadline-today' : ''}">${row[5]}</td>
      <td><span class="priority-status ${row[6].toLowerCase().replaceAll(' ', '-')}">${row[6]}</span></td><td>${row[7]}</td>
    </tr>`).join('');

  document.querySelector('#movementsList').innerHTML = MOVEMENTS.map(item => `
    <li><span class="movement-dot ${item[0]}"></span><time>${item[1]}</time><div><strong>${item[2]}</strong><small>${item[3]}</small></div><span class="movement-arrow">›</span></li>`).join('');

  document.querySelector('#risksList').innerHTML = RISKS.map(item => `
    <li><span class="risk-icon ${item[0]}">${item[0] === 'critical' ? '!' : '▲'}</span><strong>${item[1]}</strong><span>${item[2]}</span><span class="movement-arrow">›</span></li>`).join('');

  document.querySelector('#newProjectButton')?.addEventListener('click', () => showToast('Novo projeto: fluxo de criação ainda não implementado nesta demonstração.'));
  document.querySelectorAll('[data-placeholder-project]').forEach(button => button.addEventListener('click', () => showToast(`${button.dataset.placeholderProject}: visualização completa ainda não implementada.`)));
}

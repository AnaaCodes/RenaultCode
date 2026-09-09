import {
  mountAppShell
} from '../core/app-shell.js';

import {
  getActiveProfile
} from '../core/user-session.js';

import {
  getAllF4,
  getF4Code,
  openF4
} from '../services/f4-service.js';


/* =========================================================
   ESTRUTURA DA PÁGINA
   ========================================================= */

const activeProfile =
  getActiveProfile();

const isManager =
  activeProfile.id === 'manager';

mountAppShell({
  activePage: 'minhas-f4',
  title: isManager ? 'Acompanhar F4s' : 'Minhas F4'
});


/* =========================================================
   DADOS
   ========================================================= */

const data = getAllF4();


/* =========================================================
   ELEMENTOS
   ========================================================= */

const tableBody =
  document.querySelector('#tableBody');

const resultCount =
  document.querySelector('#resultCount');

const emptyState =
  document.querySelector('#emptyState');

const searchInput =
  document.querySelector('#searchInput');

const statusFilter =
  document.querySelector('#statusFilter');

const dateFilter =
  document.querySelector('#dateFilter');

const sectorFilter =
  document.querySelector('#sectorFilter');

const statsGrid =
  document.querySelector('#statsGrid');

let activeManagerFilter = 'all';


/* =========================================================
   HELPERS
   ========================================================= */

const normalize = value =>
  String(value ?? '')
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      ''
    )
    .toLowerCase();


const statusClass = value =>
  normalize(value)
    .replace(/\s+/g, '-');


const formatDate = iso =>
  new Date(
    `${iso}T12:00:00`
  ).toLocaleDateString('pt-BR');


const isFinalStatus = item =>
  ['Aprovada', 'Rejeitada']
    .includes(item.status);


const managerFilterMatches =
  (item, filter) => {
    switch (filter) {
      case 'draft':
        // Para o gerente, Draft representa todas as F4 ainda em andamento.
        return !isFinalStatus(item);

      case 'submitted':
        // Submetidas: F4 que aguardam validação.
        return item.status === 'Submetida';

      case 'technical':
        return (
          item.status === 'Submetida' &&
          item.sector === 'Engenharia'
        );

      case 'commercial':
        return (
          item.status === 'Submetida' &&
          ['Compras', 'Comercial', 'Financeiro']
            .includes(item.sector)
        );

      case 'rejected':
        return item.status === 'Rejeitada';

      case 'approved':
        return item.status === 'Aprovada';

      case 'approval':
        return Boolean(item.requiresMyApproval);

      case 'all':
      default:
        return true;
    }
  };


/* =========================================================
   VISÃO DO GERENTE
   ========================================================= */

function configureManagerView() {
  if (!isManager) return;

  document.title =
    'Acompanhar F4s | Sistema F4';

  const eyebrow =
    document.querySelector('.page-heading .eyebrow');

  const pageTitle =
    document.querySelector('#pageTitle');

  const description =
    document.querySelector('.page-description');

  const summaryTitle =
    document.querySelector('#summaryTitle');

  if (eyebrow) {
    eyebrow.textContent = 'Acompanhamento';
  }

  if (pageTitle) {
    pageTitle.textContent = 'Acompanhe as F4 dos seus projetos';
  }

  if (description) {
    description.textContent =
      'Monitore o fluxo das F4, acompanhe as etapas de análise e identifique rapidamente o que precisa da sua aprovação.';
  }

  if (summaryTitle) {
    summaryTitle.textContent = 'Visão geral das F4';
  }

  statsGrid.classList.add('manager-stats-grid');

  statsGrid.innerHTML = `
    <button class="stat-card is-selected" type="button" data-manager-filter="all" aria-pressed="true">
      <span class="stat-topline"><span class="stat-label">Todas as F4</span></span>
      <strong class="stat-value" data-manager-stat="all">0</strong>
      <span class="stat-help">Todas as F4 acompanhadas</span>
    </button>

    <button class="stat-card" type="button" data-manager-filter="draft" aria-pressed="false">
      <span class="stat-topline"><span class="stat-label">Draft</span><span class="status-dot draft"></span></span>
      <strong class="stat-value" data-manager-stat="draft">0</strong>
      <span class="stat-help">F4 ainda em andamento</span>
    </button>

    <button class="stat-card" type="button" data-manager-filter="submitted" aria-pressed="false">
      <span class="stat-topline"><span class="stat-label">Submetidas</span><span class="status-dot submitted"></span></span>
      <strong class="stat-value" data-manager-stat="submitted">0</strong>
      <span class="stat-help">Aguardando validação</span>
    </button>

    <button class="stat-card" type="button" data-manager-filter="technical" aria-pressed="false">
      <span class="stat-topline"><span class="stat-label">Análise técnica</span><span class="status-dot technical"></span></span>
      <strong class="stat-value" data-manager-stat="technical">0</strong>
      <span class="stat-help">Validação da engenharia</span>
    </button>

    <button class="stat-card" type="button" data-manager-filter="commercial" aria-pressed="false">
      <span class="stat-topline"><span class="stat-label">Análise comercial</span><span class="status-dot commercial"></span></span>
      <strong class="stat-value" data-manager-stat="commercial">0</strong>
      <span class="stat-help">Validação comercial</span>
    </button>

    <button class="stat-card" type="button" data-manager-filter="rejected" aria-pressed="false">
      <span class="stat-topline"><span class="stat-label">Rejeitadas</span><span class="status-dot rejected"></span></span>
      <strong class="stat-value" data-manager-stat="rejected">0</strong>
      <span class="stat-help">Encerradas sem aprovação</span>
    </button>

    <button class="stat-card" type="button" data-manager-filter="approved" aria-pressed="false">
      <span class="stat-topline"><span class="stat-label">Aprovadas</span><span class="status-dot approved"></span></span>
      <strong class="stat-value" data-manager-stat="approved">0</strong>
      <span class="stat-help">Processo concluído</span>
    </button>

    <button class="stat-card manager-approval-card" type="button" data-manager-filter="approval" aria-pressed="false">
      <span class="stat-topline"><span class="stat-label">Aguardando sua aprovação</span><span class="status-dot approval"></span></span>
      <strong class="stat-value" data-manager-stat="approval">0</strong>
      <span class="stat-help">Requerem sua decisão</span>
    </button>
  `;

  statusFilter.innerHTML = `
    <option value="all">Todos os fluxos</option>
    <option value="draft">Draft — em andamento</option>
    <option value="submitted">Submetidas — aguardando validação</option>
    <option value="technical">Análise técnica</option>
    <option value="commercial">Análise comercial</option>
    <option value="rejected">Rejeitadas</option>
    <option value="approved">Aprovadas</option>
    <option value="approval">Aguardando sua aprovação</option>
  `;
}


/* =========================================================
   ESTATÍSTICAS
   ========================================================= */

function syncStats() {
  if (isManager) {
    [
      'all',
      'draft',
      'submitted',
      'technical',
      'commercial',
      'rejected',
      'approved',
      'approval'
    ].forEach(filter => {
      const element =
        document.querySelector(
          `[data-manager-stat="${filter}"]`
        );

      if (!element) return;

      element.textContent =
        data.filter(item =>
          managerFilterMatches(item, filter)
        ).length;
    });

    return;
  }

  const counts =
    data.reduce(
      (accumulator, item) => {
        accumulator[item.status] =
          (
            accumulator[item.status] ||
            0
          ) + 1;

        return accumulator;
      },
      {}
    );

  document.querySelector(
    '[data-stat="Todos"]'
  ).textContent = data.length;

  [
    'Rascunho',
    'Submetida',
    'Devolvida',
    'Aprovada',
    'Rejeitada'
  ].forEach(status => {
    const element =
      document.querySelector(
        `[data-stat="${status}"]`
      );

    if (element) {
      element.textContent =
        counts[status] || 0;
    }
  });
}


/* =========================================================
   FILTROS
   ========================================================= */

function filteredData() {
  const query =
    normalize(
      searchInput.value.trim()
    );

  const status =
    statusFilter.value;

  const sector =
    sectorFilter.value;

  const dateValue =
    dateFilter.value;

  const params =
    new URLSearchParams(
      location.search
    );

  const dueSoon =
    params.get('due') === 'soon';

  const approvalMe =
    params.get('approval') === 'me';

  const today =
    new Date(
      '2026-08-25T12:00:00'
    );

  return data.filter(item => {
    const f4Code =
      getF4Code(item);

    const haystack =
      normalize([
        f4Code,
        item.id,
        item.supplier,
        item.title,
        item.description,
        item.owner,
        item.responsible,
        item.sector,
        item.stage,
        item.status
      ].join(' '));

    if (
      query &&
      !haystack.includes(query)
    ) {
      return false;
    }

    if (isManager) {
      if (
        !managerFilterMatches(
          item,
          activeManagerFilter
        )
      ) {
        return false;
      }
    } else if (
      status !== 'Todos' &&
      item.status !== status
    ) {
      return false;
    }

    if (
      sector !== 'Todos' &&
      item.sector !== sector
    ) {
      return false;
    }

    if (
      approvalMe &&
      !item.requiresMyApproval
    ) {
      return false;
    }

    if (dueSoon) {
      const difference =
        new Date(
          `${item.dueDate}T12:00:00`
        ) - today;

      if (
        difference < 0 ||
        difference >
          5 * 86400000
      ) {
        return false;
      }
    }

    if (
      dateValue !== 'Todos'
    ) {
      const updated =
        new Date(
          `${item.updatedAt}T12:00:00`
        );

      const differenceInDays =
        Math.floor(
          (today - updated) /
          86400000
        );

      if (
        dateValue === 'Hoje' &&
        differenceInDays !== 0
      ) {
        return false;
      }

      if (
        dateValue === '7' &&
        differenceInDays > 7
      ) {
        return false;
      }

      if (
        dateValue === '30' &&
        differenceInDays > 30
      ) {
        return false;
      }
    }

    return true;
  });
}


/* =========================================================
   RENDERIZAÇÃO DA TABELA
   ========================================================= */

function render() {
  const items =
    filteredData();

  resultCount.textContent =
    items.length;

  emptyState.hidden =
    items.length !== 0;

  tableBody.innerHTML =
    items
      .map(item => {
        const f4Code =
          getF4Code(item);

        return `
          <tr
            class="clickable-row"
            tabindex="0"
            data-id="${item.id}"
            aria-label="Abrir F4 ${f4Code}"
          >
            <td class="id-cell">
              ${f4Code}
            </td>

            <td>
              <span class="f4-title">
                ${item.title}
              </span>

              <span class="f4-description">
                ${item.description}
              </span>
            </td>

            <td>
              <span
                class="status-badge ${statusClass(item.status)}"
              >
                ${item.status}
              </span>
            </td>

            <td>
              ${formatDate(item.updatedAt)}
            </td>

            <td>
              ${item.owner}
            </td>

            <td>
              ${item.responsible}
            </td>

            <td>
              ${item.sector}
            </td>
          </tr>
        `;
      })
      .join('');

  tableBody
    .querySelectorAll('tr')
    .forEach(row => {
      const open = () =>
        openF4(
          row.dataset.id
        );

      row.addEventListener(
        'click',
        open
      );

      row.addEventListener(
        'keydown',
        event => {
          if (
            event.key === 'Enter' ||
            event.key === ' '
          ) {
            event.preventDefault();
            open();
          }
        }
      );
    });
}


/* =========================================================
   SELEÇÃO DOS CARDS
   ========================================================= */

function selectSupplierStat(status) {
  statusFilter.value =
    status;

  statsGrid
    .querySelectorAll('.stat-card')
    .forEach(card => {
      const selected =
        card.dataset.status ===
        status;

      card.classList.toggle(
        'is-selected',
        selected
      );

      card.setAttribute(
        'aria-pressed',
        String(selected)
      );
    });

  render();
}


function selectManagerStat(filter) {
  activeManagerFilter = filter;
  statusFilter.value = filter;

  statsGrid
    .querySelectorAll('.stat-card')
    .forEach(card => {
      const selected =
        card.dataset.managerFilter ===
        filter;

      card.classList.toggle(
        'is-selected',
        selected
      );

      card.setAttribute(
        'aria-pressed',
        String(selected)
      );
    });

  render();
}


/* =========================================================
   EVENTOS DOS CARDS
   ========================================================= */

function bindStatEvents() {
  statsGrid
    .querySelectorAll('.stat-card')
    .forEach(card => {
      card.addEventListener(
        'click',
        () => {
          if (isManager) {
            selectManagerStat(
              card.dataset.managerFilter
            );
          } else {
            selectSupplierStat(
              card.dataset.status
            );
          }
        }
      );
    });
}


/* =========================================================
   EVENTOS DOS FILTROS
   ========================================================= */

[
  searchInput,
  statusFilter,
  dateFilter,
  sectorFilter
].forEach(element => {
  const eventName =
    element.tagName === 'INPUT'
      ? 'input'
      : 'change';

  element.addEventListener(
    eventName,
    () => {
      if (
        element === statusFilter
      ) {
        if (isManager) {
          selectManagerStat(
            statusFilter.value
          );
        } else {
          selectSupplierStat(
            statusFilter.value
          );
        }
      } else {
        render();
      }
    }
  );
});


/* =========================================================
   LIMPAR FILTROS
   ========================================================= */

document
  .querySelector('#clearFilters')
  .addEventListener(
    'click',
    () => {
      searchInput.value = '';

      if (isManager) {
        activeManagerFilter = 'all';
        statusFilter.value = 'all';
      } else {
        statusFilter.value = 'Todos';
      }

      dateFilter.value =
        'Todos';

      sectorFilter.value =
        'Todos';

      history.replaceState(
        {},
        '',
        './minhas-f4.html'
      );

      if (isManager) {
        selectManagerStat('all');
      } else {
        selectSupplierStat('Todos');
      }
    }
  );


/* =========================================================
   EXPORTAÇÃO / NOVA F4
   ========================================================= */

const exportButton =
  document.querySelector('#exportButton');

exportButton?.addEventListener(
  'click',
  () => {
    window.alert(
      'A exportação será disponibilizada em uma próxima etapa.'
    );
  }
);

const newF4Button =
  document.querySelector('#newF4Button');

newF4Button?.addEventListener(
  'click',
  () => {
    window.location.href =
      './nova-f4.html';
  }
);


/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

configureManagerView();
syncStats();
bindStatEvents();

const initialParams =
  new URLSearchParams(location.search);

if (
  isManager &&
  initialParams.get('approval') === 'me'
) {
  selectManagerStat('approval');
} else {
  render();
}

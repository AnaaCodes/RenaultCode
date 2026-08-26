import {
  mountAppShell
} from '../core/app-shell.js';

import {
  getAllF4,
  getF4Code,
  openF4
} from '../services/f4-service.js';


/* =========================================================
   ESTRUTURA DA PÁGINA
   ========================================================= */

mountAppShell({
  activePage: 'minhas-f4',
  title: 'Minhas F4'
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


/* =========================================================
   ESTATÍSTICAS
   ========================================================= */

function syncStats() {
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

    document.querySelector(
      `[data-stat="${status}"]`
    ).textContent =
      counts[status] || 0;

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

    /*
     * Agora o código da F4 e o fornecedor
     * também entram na pesquisa.
     */

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
        item.sector
      ].join(' '));


    if (
      query &&
      !haystack.includes(query)
    ) {
      return false;
    }


    if (
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


  /*
   * Toda a linha abre a F4.
   */

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

function selectStat(status) {
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


/* =========================================================
   EVENTOS DOS CARDS
   ========================================================= */

statsGrid
  .querySelectorAll('.stat-card')
  .forEach(card => {

    card.addEventListener(
      'click',
      () =>
        selectStat(
          card.dataset.status
        )
    );

  });


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
        selectStat(
          statusFilter.value
        );
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

      statusFilter.value =
        'Todos';

      dateFilter.value =
        'Todos';

      sectorFilter.value =
        'Todos';


      history.replaceState(
        {},
        '',
        './minhas-f4.html'
      );


      selectStat('Todos');
    }
  );


/* =========================================================
   NOVA F4
   ========================================================= */

document
  .querySelector('#newF4Button')
  .addEventListener(
    'click',
    () => {

      window.location.href =
        './nova-f4.html';

    }
  );


/* =========================================================
   EXPORTAR CSV
   ========================================================= */

document
  .querySelector('#exportButton')
  .addEventListener(
    'click',
    () => {

      const rows =
        filteredData();


      const header = [
        'Código F4',
        'F4',
        'Fornecedor',
        'Status',
        'Última atualização',
        'Proprietário',
        'Responsável atual',
        'Setor atual'
      ];


      const csvRows =
        rows.map(item => [
          getF4Code(item),
          item.title,
          item.supplier,
          item.status,
          formatDate(
            item.updatedAt
          ),
          item.owner,
          item.responsible,
          item.sector
        ]);


      const csv =
        [
          header,
          ...csvRows
        ]
          .map(row =>
            row
              .map(value =>
                `"${String(value)
                  .replaceAll(
                    '"',
                    '""'
                  )}"`
              )
              .join(';')
          )
          .join('\n');


      const blob =
        new Blob(
          [
            `\uFEFF${csv}`
          ],
          {
            type:
              'text/csv;charset=utf-8'
          }
        );


      const url =
        URL.createObjectURL(
          blob
        );


      const anchor =
        document.createElement(
          'a'
        );


      anchor.href = url;

      anchor.download =
        'minhas-f4.csv';


      anchor.click();


      URL.revokeObjectURL(
        url
      );
    }
  );


/* =========================================================
   FILTROS RECEBIDOS PELA URL
   ========================================================= */

const params =
  new URLSearchParams(
    location.search
  );


const initialStatus =
  params.get('status');


if (
  initialStatus &&
  [
    ...statusFilter.options
  ].some(
    option =>
      option.value ===
      initialStatus
  )
) {
  statusFilter.value =
    initialStatus;
}


if (
  params.get('attention') === '1'
) {
  statusFilter.value =
    'Devolvida';
}


/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

syncStats();

selectStat(
  statusFilter.value
);
import {
  mountAppShell
} from '../core/app-shell.js';

import {
  showToast
} from '../core/toast.js';

import {
  FLOW_SUMMARY
} from '../data/f4-data.js';

import {
  getAttentionCounts,
  getWorkQueue,
  getF4Code,
  openF4
} from '../services/f4-service.js';


/* =========================================================
   ESTRUTURA
   ========================================================= */

mountAppShell({
  activePage: 'dashboard',
  title: 'VISÃO GERAL'
});


/* =========================================================
   CONTADORES
   ========================================================= */

const attention =
  getAttentionCounts();


document.querySelector(
  '[data-count="returned"]'
).textContent =
  attention.returned;


document.querySelector(
  '[data-count="dueSoon"]'
).textContent =
  attention.dueSoon;


document.querySelector(
  '[data-count="approval"]'
).textContent =
  attention.approval;


/* =========================================================
   FILA DE TRABALHO
   ========================================================= */

const workQueueBody =
  document.querySelector(
    '#workQueueBody'
  );


workQueueBody.innerHTML =
  getWorkQueue()
    .map(item => {

      const f4Code =
        getF4Code(item);


      const deadline =
        new Date(
          `${item.dueDate}T12:00:00`
        );


      const today =
        new Date(
          '2026-08-25T12:00:00'
        );


      const days =
        Math.round(
          (
            deadline -
            today
          ) /
          86400000
        );


      const label =
        days === 0
          ? 'Hoje'
          : days === 1
            ? 'Amanhã'
            : deadline
                .toLocaleDateString(
                  'pt-BR',
                  {
                    day: '2-digit',
                    month: '2-digit'
                  }
                );


      const deadlineClass =
        days === 0
          ? 'deadline-critical'
          : days <= 2
            ? 'deadline-warning'
            : '';


      const statusClass =
        item.status
          .toLowerCase()
          .normalize('NFD')
          .replace(
            /[\u0300-\u036f]/g,
            ''
          )
          .replace(
            /\s+/g,
            '-'
          );


      return `
        <tr
          tabindex="0"
          data-id="${item.id}"
          aria-label="Abrir F4 ${f4Code}"
        >

          <td>
            <strong>
              ${f4Code}
            </strong>
          </td>

          <td>
            <span class="request-title">
              ${item.title}
            </span>

            <span class="request-description">
              ${item.description}
            </span>
          </td>

          <td>
            ${item.stage}
          </td>

          <td>
            <span
              class="deadline ${deadlineClass}"
            >
              ${label}
            </span>
          </td>

          <td>
            <span
              class="status-badge ${statusClass}"
            >
              ${item.status}
            </span>
          </td>

        </tr>
      `;
    })
    .join('');


/* =========================================================
   FLUXO
   ========================================================= */

const flowTrack =
  document.querySelector(
    '#flowTrack'
  );


flowTrack.innerHTML =
  FLOW_SUMMARY
    .map(item => `
      <button
        class="flow-stage ${item.className}"
        type="button"
        data-flow="${item.key}"
        role="listitem"
      >

        <span class="flow-value">
          ${item.value}
        </span>

        <span class="flow-label">
          ${item.label}
        </span>

      </button>
    `)
    .join('');


/* =========================================================
   NAVEGAÇÃO
   ========================================================= */

function goToMinhas(
  params = ''
) {
  window.location.href =
    `./minhas-f4.html${params}`;
}


/* MINHAS F4 */

document
  .querySelectorAll(
    '[data-go="minhas-f4"]'
  )
  .forEach(element => {

    element.addEventListener(
      'click',
      () =>
        goToMinhas()
    );

  });


/* DEVOLVIDAS */

document
  .querySelectorAll(
    '[data-go="returned"]'
  )
  .forEach(element => {

    element.addEventListener(
      'click',
      () =>
        goToMinhas(
          '?status=Devolvida'
        )
    );

  });


/* PRÓXIMAS DO PRAZO */

document
  .querySelectorAll(
    '[data-go="dueSoon"]'
  )
  .forEach(element => {

    element.addEventListener(
      'click',
      () =>
        goToMinhas(
          '?due=soon'
        )
    );

  });


/* MINHAS APROVAÇÕES */

document
  .querySelectorAll(
    '[data-go="approval"]'
  )
  .forEach(element => {

    element.addEventListener(
      'click',
      () =>
        goToMinhas(
          '?approval=me'
        )
    );

  });


/* NOVA F4 */

document
  .querySelectorAll(
    '[data-go="nova-f4"]'
  )
  .forEach(element => {

    element.addEventListener(
      'click',
      () => {

        window.location.href =
          './nova-f4.html';

      }
    );

  });


/* PLACEHOLDERS */

document
  .querySelectorAll(
    '[data-placeholder-action]'
  )
  .forEach(element => {

    element.addEventListener(
      'click',
      () => {

        showToast(
          `${element.dataset.placeholderAction}: tela ainda não implementada.`
        );

      }
    );

  });


/* =========================================================
   ABRIR F4 PELA FILA
   ========================================================= */

document
  .querySelectorAll(
    '#workQueueBody tr'
  )
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


/* =========================================================
   FILTRO PELO FLUXO
   ========================================================= */

document
  .querySelectorAll(
    '[data-flow]'
  )
  .forEach(button => {

    button.addEventListener(
      'click',
      () => {

        const status =
          button.dataset.flow;


        if (
          status === 'Em análise'
        ) {
          goToMinhas(
            '?status=Submetida'
          );
        } else {
          goToMinhas(
            `?status=${encodeURIComponent(status)}`
          );
        }

      }
    );

  });
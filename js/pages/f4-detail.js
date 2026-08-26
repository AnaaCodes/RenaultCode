import {
  mountAppShell
} from '../core/app-shell.js';

import {
  getF4ById,
  getF4Code
} from '../services/f4-service.js';


/* =========================================================
   ESTRUTURA
   ========================================================= */

mountAppShell({
  activePage: 'minhas-f4',
  title: 'Detalhes da F4'
});


/* =========================================================
   IDENTIFICAÇÃO DO REGISTRO
   ========================================================= */

const params =
  new URLSearchParams(
    location.search
  );


const f4 =
  getF4ById(
    params.get('id')
  );


const content =
  document.querySelector(
    '#detailContent'
  );


/* =========================================================
   F4 NÃO ENCONTRADA
   ========================================================= */

if (!f4) {

  content.innerHTML = `
    <section
      class="card detail-card"
    >

      <h3>
        F4 não encontrada
      </h3>

      <p
        class="detail-description"
      >
        O registro informado não existe nesta demonstração.
      </p>

      <p>
        <a
          class="back-link"
          href="./minhas-f4.html"
        >
          ← Voltar para Minhas F4
        </a>
      </p>

    </section>
  `;

}


/* =========================================================
   F4 ENCONTRADA
   ========================================================= */

else {

  const f4Code =
    getF4Code(f4);


  const statusClass =
    f4.status
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


  const updatedAt =
    new Date(
      `${f4.updatedAt}T12:00:00`
    )
      .toLocaleDateString(
        'pt-BR'
      );


  const dueDate =
    new Date(
      `${f4.dueDate}T12:00:00`
    )
      .toLocaleDateString(
        'pt-BR'
      );


  content.innerHTML = `

    <section
      class="detail-heading"
    >

      <div>

        <a
          class="back-link"
          href="./minhas-f4.html"
        >
          ← Voltar para Minhas F4
        </a>


        <h2>
          ${f4Code} — ${f4.title}
        </h2>


        <p
          class="detail-subtitle"
        >
          ${f4.description}
        </p>

      </div>


      <span
        class="status-badge ${statusClass}"
      >
        ${f4.status}
      </span>

    </section>


    <div
      class="detail-grid"
    >


      <section
        class="card detail-card"
      >

        <h3>
          Informações da solicitação
        </h3>


        <div
          class="detail-fields"
        >


          <div
            class="detail-field"
          >
            <span>
              Código F4
            </span>

            <strong>
              ${f4Code}
            </strong>
          </div>


          <div
            class="detail-field"
          >
            <span>
              Fornecedor
            </span>

            <strong>
              ${f4.supplier}
            </strong>
          </div>


          <div
            class="detail-field"
          >
            <span>
              Proprietário
            </span>

            <strong>
              ${f4.owner}
            </strong>
          </div>


          <div
            class="detail-field"
          >
            <span>
              Responsável atual
            </span>

            <strong>
              ${f4.responsible}
            </strong>
          </div>


          <div
            class="detail-field"
          >
            <span>
              Setor atual
            </span>

            <strong>
              ${f4.sector}
            </strong>
          </div>


          <div
            class="detail-field"
          >
            <span>
              Etapa atual
            </span>

            <strong>
              ${f4.stage}
            </strong>
          </div>


          <div
            class="detail-field"
          >
            <span>
              Última atualização
            </span>

            <strong>
              ${updatedAt}
            </strong>
          </div>


          <div
            class="detail-field"
          >
            <span>
              Prazo
            </span>

            <strong>
              ${dueDate}
            </strong>
          </div>


        </div>

      </section>


      <aside
        class="card detail-card"
      >

        <h3>
          Fluxo
        </h3>


        <div
          class="process-list"
        >

          <div
            class="process-item done"
          >
            <span
              class="process-dot"
            ></span>

            F4 criada
          </div>


          <div
            class="process-item done"
          >
            <span
              class="process-dot"
            ></span>

            Informações registradas
          </div>


          <div
            class="process-item current"
          >
            <span
              class="process-dot"
            ></span>

            ${f4.stage}
          </div>


          <div
            class="process-item"
          >
            <span
              class="process-dot"
            ></span>

            Conclusão
          </div>

        </div>

      </aside>

    </div>
  `;
}
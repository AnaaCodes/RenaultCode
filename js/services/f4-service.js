import { F4_DATA } from '../data/f4-data.js';


/* =========================================================
   CONSULTAS
   ========================================================= */

export function getAllF4() {
  return [...F4_DATA];
}


export function getF4ById(id) {
  return F4_DATA.find(
    item => String(item.id) === String(id)
  );
}


export function getByStatus(status) {
  if (!status || status === 'Todos') {
    return [...F4_DATA];
  }

  return F4_DATA.filter(
    item => item.status === status
  );
}


/* =========================================================
   GERAÇÃO DO CÓDIGO F4

   Exemplo:
   Alfa Componentes
   orderNumber = 23
   year = 2026

   Resultado:
   ALF023/26
   ========================================================= */

export function generateF4Code(
  supplier,
  orderNumber,
  year = 2026
) {
  if (!supplier) {
    return '';
  }

  if (
    orderNumber === undefined ||
    orderNumber === null
  ) {
    return '';
  }


  /*
   * Remove acentos:
   * "Álfa" -> "Alfa"
   */
  const normalizedSupplier = String(supplier)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

    /*
     * Remove espaços, números e caracteres especiais.
     */
    .replace(/[^a-zA-Z]/g, '');


  /*
   * Obtém as três primeiras letras do fornecedor.
   */
  const supplierPrefix = normalizedSupplier
    .substring(0, 3)
    .toUpperCase()
    .padEnd(3, 'X');


  /*
   * Garante pelo menos três caracteres.
   *
   * 1  -> 001
   * 23 -> 023
   * 123 -> 123
   */
  const formattedOrder = String(orderNumber)
    .padStart(3, '0');


  /*
   * 2026 -> 26
   */
  const formattedYear = String(year)
    .slice(-2);


  return `${supplierPrefix}${formattedOrder}/${formattedYear}`;
}


/* =========================================================
   CÓDIGO DE UM OBJETO F4
   ========================================================= */

export function getF4Code(f4) {
  if (!f4) {
    return '';
  }

  return generateF4Code(
    f4.supplier,
    f4.orderNumber,
    f4.year
  );
}


/* =========================================================
   CONTADORES DE ATENÇÃO
   ========================================================= */

export function getAttentionCounts() {
  const today = new Date(
    '2026-08-25T12:00:00'
  );

  const fiveDays =
    5 * 24 * 60 * 60 * 1000;

  return {
    returned: F4_DATA.filter(
      item => item.status === 'Devolvida'
    ).length,

    dueSoon: F4_DATA.filter(item => {
      const dueDate = new Date(
        `${item.dueDate}T12:00:00`
      );

      const difference =
        dueDate - today;

      return (
        difference >= 0 &&
        difference <= fiveDays &&
        ![
          'Aprovada',
          'Rejeitada'
        ].includes(item.status)
      );
    }).length,

    approval: F4_DATA.filter(
      item => item.requiresMyApproval
    ).length
  };
}


/* =========================================================
   FILA DE TRABALHO
   ========================================================= */

export function getWorkQueue() {
  const priority = status => ({
    Devolvida: 0,
    Submetida: 1,
    Rascunho: 2,
    Aprovada: 3,
    Rejeitada: 4
  }[status] ?? 5);


  return [...F4_DATA]
    .sort((a, b) => {
      const statusPriority =
        priority(a.status) -
        priority(b.status);

      if (statusPriority !== 0) {
        return statusPriority;
      }

      return a.dueDate.localeCompare(
        b.dueDate
      );
    })
    .slice(0, 4);
}


/* =========================================================
   NAVEGAÇÃO
   ========================================================= */

export function openF4(id) {
  window.location.href =
    `./f4.html?id=${encodeURIComponent(id)}`;
}
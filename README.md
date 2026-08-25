# Renault F4 — Front-end integrado

Projeto front-end que integra as telas **Visão Geral**, **Minhas F4** e **Detalhes da F4** em uma única estrutura reutilizável.

## Estrutura

- `index.html` — Visão Geral
- `minhas-f4.html` — Gerenciamento e filtros
- `f4.html` — Detalhes de uma F4
- `css/` — tokens, layout, componentes e estilos por página
- `js/components/` — sidebar e header compartilhados
- `js/core/` — comportamento global da aplicação
- `js/data/` — dados demonstrativos
- `js/services/` — funções de acesso e navegação das F4
- `js/pages/` — lógica específica de cada página
- `assets/` — logo, imagens e ícones

## Como executar com VS Code + Vite

1. Abra esta pasta no VS Code.
2. Abra o terminal integrado.
3. Execute `npm install`.
4. Execute `npm run dev`.
5. Abra o endereço mostrado pelo Vite, normalmente `http://localhost:5173`.

## Alternativa com Live Server

Também é possível executar `index.html` usando a extensão **Live Server**. Como o projeto usa módulos JavaScript, ele deve ser servido por HTTP; não abra os HTML diretamente com `file://`.

## Navegação já integrada

- Visão Geral → Minhas F4
- Cards de prioridade → Minhas F4 já filtrada
- Cards do fluxo → Minhas F4 já filtrada
- Linhas de F4 → Detalhes da F4
- Estado recolhido da sidebar é mantido entre páginas via `localStorage`

As telas Nova F4, Histórico, Notificações e Configurações estão indicadas como futuras páginas e exibem uma mensagem demonstrativa.

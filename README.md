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


## Alternativa para visualização com Live Server

Tamb�m é possível executar `index.html` usando a extensão **Live Server**. Como o projeto usa módulos JavaScript, ele deve ser servido por HTTP; não abra os HTML diretamente com `file://`.
Ao instalar a extenção basta selecionar essa opção que se localiza na barra lateral inferior direita.
<img width="619" height="186" alt="{7F682B7B-48D9-4469-AB3C-8A08C097C50A}" src="https://github.com/user-attachments/assets/adee4f94-1ad3-4625-a2e4-0a15b1fcb467" />

## Navegação já integrada

- Visão Geral → Minhas F4
- Cards de prioridade → Minhas F4 já filtrada
- Cards do fluxo → Minhas F4 já filtrada
- Linhas de F4 → Detalhes da F4
- Estado recolhido da sidebar é mantido entre páginas via `localStorage`

As telas Nova F4, Histórico, Notificações e Configurações estão indicadas como futuras páginas e exibem uma mensagem demonstrativa.

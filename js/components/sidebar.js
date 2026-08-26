const navItems = [
  {
    id: 'dashboard',
    label: 'Visão geral',
    href: './index.html',
    icon: './assets/icons/visao-geral.png'
  },

  {
    id: 'nova-f4',
    label: 'Nova F4',
    href: './nova-f4.html',
    icon: './assets/icons/nova-f4.png'
  },
  
  { id: 'minhas-f4', label: 'Minhas F4', href: './minhas-f4.html', icon: './assets/icons/minhas-f4.png' },
  { id: 'pendencias', label: 'Pendências', href: './minhas-f4.html?attention=1', icon: './assets/icons/pendencias.png' },
  { id: 'historico', label: 'Histórico', href: '#', icon: './assets/icons/historico.png', placeholder: true },
  { id: 'notificacoes', label: 'Notificações', href: '#', icon: './assets/icons/notificacoes.png', placeholder: true }
];

export function renderSidebar(activePage) {
  const mount = document.querySelector('#sidebarMount');
  mount.innerHTML = `
    <aside class="sidebar" id="sidebar" aria-label="Navegação principal">
      <button class="brand-toggle" id="brandToggle" type="button" aria-label="Recolher barra lateral" aria-controls="sidebar" aria-expanded="true" title="Recolher menu">
        <img class="brand-logo" src="./assets/images/logo-renault.png" alt="Renault Geely do Brasil">
      </button>
      <nav class="sidebar-nav" aria-label="Menu F4">
        ${navItems.map(item => `
          <a class="nav-item ${activePage === item.id ? 'active' : ''}" href="${item.href}" ${activePage === item.id ? 'aria-current="page"' : ''} ${item.placeholder ? `data-placeholder="${item.label}"` : ''} title="${item.label}">
            <span class="nav-icon"><img src="${item.icon}" alt=""></span>
            <span class="nav-label">${item.label}</span>
          </a>`).join('')}
        <div class="nav-spacer" aria-hidden="true"></div>
        <a class="nav-item nav-settings" href="#" data-placeholder="Configurações" title="Configurações">
          <span class="nav-icon"><img src="./assets/icons/configuracoes.png" alt=""></span>
          <span class="nav-label">Configurações</span>
        </a>
      </nav>
    </aside>`;
}

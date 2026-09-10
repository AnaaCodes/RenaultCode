import { getActiveProfile, hasPermission } from '../core/user-session.js';

const navItems = [
  { id: 'dashboard', label: 'Visão geral', href: './index.html', icon: './assets/icons/visao-geral.png' },
  { id: 'nova-f4', label: 'Nova F4', href: './nova-f4.html', icon: './assets/icons/nova-f4.png', permission: 'createF4' },
  { id: 'minhas-f4', label: 'Minhas F4', href: './minhas-f4.html', icon: './assets/icons/minhas-f4.png' },
  { id: 'projetos', label: 'Projetos', href: './projetos.html', icon: './assets/icons/projetos.svg', permission: 'viewProjects' },
  { id: 'pendencias', label: 'Pendências', href: './minhas-f4.html?returned=me', icon: './assets/icons/pendencias.png' },
  { id: 'historico', label: 'Histórico', href: '#', icon: './assets/icons/historico.png', placeholder: true },
  { id: 'notificacoes', label: 'Notificações', href: '#', icon: './assets/icons/notificacoes.png', placeholder: true }
];

function f4Label(profile) {
  if (profile.id === 'supplier') return 'Minhas F4';
  if (['commercial','technical'].includes(profile.id)) return 'Controle de F4s';
  return 'Acompanhar F4s';
}

export function renderSidebar(activePage) {
  const mount = document.querySelector('#sidebarMount');
  const profile = getActiveProfile();
  const visible = navItems.filter(item => !item.permission || hasPermission(item.permission));
  mount.innerHTML = `
    <aside class="sidebar" id="sidebar" aria-label="Navegação principal">
      <button class="brand-toggle" id="brandToggle" type="button" aria-label="Recolher barra lateral" aria-controls="sidebar" aria-expanded="true" title="Recolher menu"><img class="brand-logo" src="./assets/images/logo-renault.png" alt="Renault Geely do Brasil"></button>
      <nav class="sidebar-nav" aria-label="Menu F4">
        ${visible.map(item => { const label = item.id === 'minhas-f4' ? f4Label(profile) : item.label; return `
          <a class="nav-item ${activePage === item.id ? 'active' : ''}" href="${item.href}" ${activePage === item.id ? 'aria-current="page"' : ''} ${item.placeholder ? `data-placeholder="${item.label}"` : ''} title="${label}">
            <span class="nav-icon"><img src="${item.icon}" alt=""></span><span class="nav-label">${label}</span>
          </a>`; }).join('')}
        <div class="nav-spacer" aria-hidden="true"></div>
        <a class="nav-item nav-settings" href="#" data-placeholder="Configurações" title="Configurações"><span class="nav-icon"><img src="./assets/icons/configuracoes.png" alt=""></span><span class="nav-label">Configurações</span></a>
      </nav>
    </aside>`;
}

import { getActiveProfile, hasPermission } from '../core/user-session.js';
import { t } from '../core/i18n.js';

const navItems = [
  { id: 'dashboard', labelKey: 'nav.overview', fallback: 'Visão geral', href: './index.html', icon: './assets/icons/visao-geral.png' },
  { id: 'nova-f4', labelKey: 'nav.newF4', fallback: 'Nova F4', href: './nova-f4.html', icon: './assets/icons/nova-f4.png', permission: 'createF4' },
  { id: 'minhas-f4', labelKey: 'nav.myF4', fallback: 'Minhas F4', href: './minhas-f4.html', icon: './assets/icons/minhas-f4.png' },
  { id: 'projetos', labelKey: 'nav.projects', fallback: 'Projetos', href: './projetos.html', icon: './assets/icons/projetos.svg', permission: 'viewProjects' },
  { id: 'pendencias', labelKey: 'nav.pending', fallback: 'Pendências', href: './pendencias.html', icon: './assets/icons/pendencias.png' },
  { id: 'historico', labelKey: 'nav.history', fallback: 'Histórico', href: './historico.html', icon: './assets/icons/historico.png' },
  { id: 'notificacoes', labelKey: 'nav.notifications', fallback: 'Notificações', href: './notificacoes.html', icon: './assets/icons/notificacoes.png' }
];

function f4Label(profile) {
  if (profile.id === 'supplier') return t('nav.myF4', 'Minhas F4');
  if (['commercial', 'technical'].includes(profile.id)) return t('nav.controlF4', 'Controle de F4s');
  return t('nav.trackF4', 'Acompanhar F4s');
}

export function renderSidebar(activePage) {
  const mount = document.querySelector('#sidebarMount');
  const profile = getActiveProfile();
  const visible = navItems.filter(item => !item.permission || hasPermission(item.permission));
  mount.innerHTML = `
    <aside class="sidebar" id="sidebar" aria-label="${t('sidebar.mainNavigation', 'Navegação principal')}">
      <button class="brand-toggle" id="brandToggle" type="button" aria-label="${t('sidebar.collapse', 'Recolher barra lateral')}" aria-controls="sidebar" aria-expanded="true" title="${t('sidebar.collapseTitle', 'Recolher menu')}"><img class="brand-logo" src="./assets/images/logo-renault.png" alt="Renault Geely do Brasil"></button>
      <nav class="sidebar-nav" aria-label="${t('sidebar.menu', 'Menu F4')}">
        ${visible.map(item => {
          const label = item.id === 'minhas-f4' ? f4Label(profile) : t(item.labelKey, item.fallback);
          return `
          <a class="nav-item ${activePage === item.id ? 'active' : ''}" href="${item.href}" ${activePage === item.id ? 'aria-current="page"' : ''} title="${label}">
            <span class="nav-icon"><img src="${item.icon}" alt=""></span><span class="nav-label">${label}</span>
          </a>`;
        }).join('')}
        <div class="nav-spacer" aria-hidden="true"></div>
        <a class="nav-item nav-settings ${activePage === 'perfil' ? 'active' : ''}" href="./perfil.html#configuracoes" ${activePage === 'perfil' ? 'aria-current="page"' : ''} title="${t('nav.settings', 'Configurações')}"><span class="nav-icon"><img src="./assets/icons/configuracoes.png" alt=""></span><span class="nav-label">${t('nav.settings', 'Configurações')}</span></a>
      </nav>
    </aside>`;
}

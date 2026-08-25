import { renderSidebar } from '../components/sidebar.js';
import { renderHeader } from '../components/header.js';
import { showToast } from './toast.js';

export function mountAppShell({ activePage, title }) {
  renderSidebar(activePage);
  renderHeader(title);

  const appShell = document.querySelector('#appShell');
  const brandToggle = document.querySelector('#brandToggle');
  const menuButton = document.querySelector('#menuButton');
  const overlay = document.querySelector('#sidebarOverlay');
  const mobileQuery = window.matchMedia('(max-width: 1000px)');

  const applySavedDesktopState = () => {
    if (mobileQuery.matches) {
      appShell.classList.remove('sidebar-collapsed');
      return;
    }
    const collapsed = localStorage.getItem('f4-sidebar-collapsed') === 'true';
    appShell.classList.toggle('sidebar-collapsed', collapsed);
    brandToggle.setAttribute('aria-expanded', String(!collapsed));
    brandToggle.title = collapsed ? 'Expandir menu' : 'Recolher menu';
  };

  const closeMobile = () => {
    appShell.classList.remove('mobile-sidebar-open');
    menuButton?.setAttribute('aria-expanded', 'false');
  };

  brandToggle.addEventListener('click', () => {
    if (mobileQuery.matches) {
      closeMobile();
      return;
    }
    const collapsed = appShell.classList.toggle('sidebar-collapsed');
    localStorage.setItem('f4-sidebar-collapsed', String(collapsed));
    brandToggle.setAttribute('aria-expanded', String(!collapsed));
    brandToggle.title = collapsed ? 'Expandir menu' : 'Recolher menu';
  });

  menuButton?.addEventListener('click', () => {
    const open = appShell.classList.toggle('mobile-sidebar-open');
    menuButton.setAttribute('aria-expanded', String(open));
  });
  overlay?.addEventListener('click', closeMobile);
  mobileQuery.addEventListener('change', () => {
    closeMobile();
    applySavedDesktopState();
  });

  document.querySelectorAll('[data-placeholder]').forEach(element => {
    element.addEventListener('click', event => {
      event.preventDefault();
      showToast(`${element.dataset.placeholder}: tela ainda não implementada nesta demonstração.`);
    });
  });

  applySavedDesktopState();
}

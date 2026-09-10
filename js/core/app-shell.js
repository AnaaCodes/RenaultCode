import { renderSidebar } from '../components/sidebar.js';
import { renderHeader } from '../components/header.js';
import { showToast } from './toast.js';
import { getActiveProfile, hasPermission, setActiveProfile } from './user-session.js';

function redirectForProfile(profile) {
  window.location.href = profile.homePage || './index.html';
}

function setupProfileSwitcher() {
  const switcher = document.querySelector('#profileSwitcher');
  const button = document.querySelector('#profileButton');
  const menu = document.querySelector('#profileMenu');
  const options = [...(menu?.querySelectorAll('[data-profile-id]') || [])];

  if (!switcher || !button || !menu || !options.length) return;

  let closeTimer = null;

  const openMenu = () => {
    if (closeTimer) window.clearTimeout(closeTimer);
    menu.hidden = false;
    requestAnimationFrame(() => switcher.classList.add('is-open'));
    button.setAttribute('aria-expanded', 'true');
  };

  const closeMenu = () => {
    switcher.classList.remove('is-open');
    button.setAttribute('aria-expanded', 'false');
    window.setTimeout(() => {
      if (!switcher.classList.contains('is-open')) menu.hidden = true;
    }, 150);
  };

  const scheduleClose = () => {
    closeTimer = window.setTimeout(closeMenu, 110);
  };

  button.addEventListener('click', event => {
    event.stopPropagation();
    if (menu.hidden) openMenu();
    else closeMenu();
  });

  switcher.addEventListener('mouseenter', () => {
    if (closeTimer) window.clearTimeout(closeTimer);
  });
  switcher.addEventListener('mouseleave', scheduleClose);

  options.forEach(option => option.addEventListener('click', () => {
    const nextProfile = option.dataset.profileId;
    if (setActiveProfile(nextProfile)) redirectForProfile(getActiveProfile());
  }));

  document.addEventListener('click', event => {
    if (!switcher.contains(event.target)) closeMenu();
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !menu.hidden) {
      closeMenu();
      button.focus();
    }
  });
}

function applyRolePermissions() {
  if (!hasPermission('createF4')) {
    document.querySelectorAll('[data-requires-permission="createF4"]').forEach(element => element.remove());
  }
}

export function mountAppShell({ activePage, title }) {
  if (activePage === 'nova-f4' && !hasPermission('createF4')) {
    window.location.replace('./index.html');
    return false;
  }

  if (activePage === 'projetos' && !hasPermission('viewProjects')) {
    window.location.replace('./index.html');
    return false;
  }

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

  setupProfileSwitcher();
  applyRolePermissions();
  applySavedDesktopState();
  return true;
}

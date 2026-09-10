import { getActiveProfile, getOtherProfiles } from '../core/user-session.js';

function avatarMarkup(profile, className = 'profile-avatar') {
  if (profile.avatar) {
    return `<img class="${className}" src="${profile.avatar}" alt="Foto de perfil de ${profile.name}">`;
  }

  return `<span class="${className} profile-avatar-initials" aria-hidden="true">${profile.initials}</span>`;
}

export function renderHeader(title) {
  const mount = document.querySelector('#headerMount');
  const current = getActiveProfile();
  const alternatives = getOtherProfiles();

  mount.innerHTML = `
    <header class="topbar">
      <div class="topbar-left">
        <button class="menu-button" id="menuButton" type="button" aria-label="Abrir menu" aria-controls="sidebar" aria-expanded="false">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v2H4V6Zm0 5h16v2H4v-2Zm0 5h16v2H4v-2Z"/></svg>
        </button>
        <div class="title-lockup">
          <span class="title-accent" aria-hidden="true"></span>
          <h1>${title}</h1>
        </div>
      </div>

      <div class="profile-switcher" id="profileSwitcher">
        <button class="profile" id="profileButton" type="button" aria-label="Trocar perfil" aria-haspopup="menu" aria-expanded="false" aria-controls="profileMenu">
          <div class="profile-text">
            <span class="profile-name">${current.name}</span>
            <span class="profile-role">${current.role}</span>
          </div>
          ${avatarMarkup(current)}
          <svg class="profile-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5H7Z"/></svg>
        </button>

        <div class="profile-menu" id="profileMenu" role="menu" aria-label="Trocar perfil" hidden>
          <p class="profile-menu-label">Trocar perfil</p>
          ${alternatives.map(profile => `
            <button class="profile-menu-option" type="button" role="menuitem" data-profile-id="${profile.id}">
              <span class="profile-menu-avatar">${avatarMarkup(profile, 'profile-avatar')}</span>
              <span class="profile-menu-copy">
                <strong>${profile.name}</strong>
                <small>${profile.role}</small>
              </span>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.3 5.3 10.7 4l8 8-8 8-1.4-1.3 6.7-6.7-6.7-6.7Z"/></svg>
            </button>`).join('')}
        </div>
      </div>
    </header>`;
}

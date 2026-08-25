export function renderHeader(title) {
  const mount = document.querySelector('#headerMount');
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
      <button class="profile" type="button" data-placeholder="Perfil" aria-label="Abrir menu do perfil">
        <div class="profile-text">
          <span class="profile-name">Analice Mendes</span>
          <span class="profile-role">Engenharia</span>
        </div>
        <img src="./assets/images/profile.jpg" alt="Foto de perfil de Analice Mendes">
        <svg class="profile-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5H7Z"/></svg>
      </button>
    </header>`;
}

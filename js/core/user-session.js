const STORAGE_KEY = 'f4-active-profile';

export const USER_PROFILES = {
  supplier: {
    id: 'supplier',
    name: 'Analice Mendes',
    role: 'Fornecedor',
    avatar: './assets/images/profile.jpg',
    initials: 'AM',
    permissions: {
      createF4: true,
      viewMyF4: true,
      viewProjects: false
    }
  },
  manager: {
    id: 'manager',
    name: 'Marcos Oliveira',
    role: 'Gerente do projeto',
    avatar: null,
    initials: 'MO',
    permissions: {
      createF4: false,
      viewMyF4: false,
      viewProjects: true
    }
  }
};

export function getActiveProfileId() {
  const saved = localStorage.getItem(STORAGE_KEY);
  return USER_PROFILES[saved] ? saved : 'supplier';
}

export function getActiveProfile() {
  return USER_PROFILES[getActiveProfileId()];
}

export function getAlternateProfile() {
  return getActiveProfileId() === 'manager' ? USER_PROFILES.supplier : USER_PROFILES.manager;
}

export function setActiveProfile(profileId) {
  if (!USER_PROFILES[profileId]) return false;
  localStorage.setItem(STORAGE_KEY, profileId);
  window.dispatchEvent(new CustomEvent('f4:profile-changed', { detail: USER_PROFILES[profileId] }));
  return true;
}

export function hasPermission(permission) {
  return Boolean(getActiveProfile().permissions?.[permission]);
}

const STORAGE_KEY = 'f4-active-profile';

export const USER_PROFILES = {
  supplier: {
    id: 'supplier',
    name: 'Alfa Componentes',
    role: 'Fornecedor',
    team: 'Fornecedor',
    avatar: './assets/images/alfa-componentes.svg',
    initials: 'AC',
    homePage: './index.html',
    permissions: {
      createF4: true,
      viewProjects: false,
      viewAllF4: false,
      reviewTechnical: false,
      reviewCommercial: false,
      reviewManager: false,
      reviewCVE: false
    }
  },

  manager: {
    id: 'manager',
    name: 'Marcos Oliveira',
    role: 'Gerente do projeto',
    team: 'Gerência de Projeto',
    avatar: null,
    initials: 'MO',
    homePage: './index.html',
    permissions: {
      createF4: false,
      viewProjects: true,
      viewAllF4: true,
      reviewTechnical: false,
      reviewCommercial: false,
      reviewManager: true,
      reviewCVE: false
    }
  },

  commercial: {
    id: 'commercial',
    name: 'Carlos Braatz',
    role: 'Validação comercial',
    team: 'Equipe de Compras',
    avatar: null,
    initials: 'CB',
    homePage: './index.html',
    permissions: {
      createF4: false,
      viewProjects: false,
      viewAllF4: false,
      reviewTechnical: false,
      reviewCommercial: true,
      reviewManager: false,
      reviewCVE: false
    }
  },

  technical: {
    id: 'technical',
    name: 'Mariana Silva',
    role: 'Validação técnica',
    team: 'Equipe de Engenharia',
    avatar: null,
    initials: 'MS',
    homePage: './index.html',
    permissions: {
      createF4: false,
      viewProjects: false,
      viewAllF4: false,
      reviewTechnical: true,
      reviewCommercial: false,
      reviewManager: false,
      reviewCVE: false
    }
  },

  cve: {
    id: 'cve',
    name: 'Analice Mendes',
    role: 'CVE',
    team: 'CVE',
    avatar: './assets/images/profile.jpg',
    initials: 'AM',
    homePage: './index.html',
    permissions: {
      createF4: false,
      viewProjects: true,
      viewAllF4: true,
      reviewTechnical: false,
      reviewCommercial: false,
      reviewManager: false,
      reviewCVE: true
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

export function getOtherProfiles() {
  const id = getActiveProfileId();
  return Object.values(USER_PROFILES).filter(profile => profile.id !== id);
}

export function getAlternateProfile() {
  return getOtherProfiles()[0];
}

export function setActiveProfile(profileId) {
  if (!USER_PROFILES[profileId]) return false;

  localStorage.setItem(STORAGE_KEY, profileId);
  window.dispatchEvent(new CustomEvent('f4:profile-changed', {
    detail: USER_PROFILES[profileId]
  }));
  return true;
}

export function hasPermission(permission) {
  return Boolean(getActiveProfile().permissions?.[permission]);
}

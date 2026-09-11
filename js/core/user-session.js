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
    contact: {
      fullName: 'Alfa Componentes',
      email: 'contato@alfacomponentes.com.br',
      phone: 'Não informado',
      city: 'Brasil',
      country: 'Brasil',
      timezone: 'America/Sao_Paulo'
    },
    corporate: {
      company: 'Alfa Componentes',
      department: 'Conta fornecedor',
      position: 'Fornecedor',
      unit: 'Brasil',
      accessProfile: 'Fornecedor externo',
      account: 'ALCOR-ALF',
      scope: 'F4s vinculadas à Alfa Componentes'
    },
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
    contact: {
      fullName: 'Marcos Oliveira',
      email: 'marcos.oliveira@renault.com.br',
      phone: 'Não informado',
      city: 'Brasil',
      country: 'Brasil',
      timezone: 'America/Sao_Paulo'
    },
    corporate: {
      company: 'Renault Geely do Brasil',
      department: 'Gerência de Projeto',
      position: 'Gerente do projeto',
      unit: 'Brasil',
      accessProfile: 'Gerente de Projeto',
      account: 'MOLIVEIRA',
      scope: 'Projetos e F4s vinculadas aos projetos sob sua responsabilidade'
    },
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
    contact: {
      fullName: 'Carlos Braatz',
      email: 'carlos.braatz@renault.com.br',
      phone: 'Não informado',
      city: 'Brasil',
      country: 'Brasil',
      timezone: 'America/Sao_Paulo'
    },
    corporate: {
      company: 'Renault Geely do Brasil',
      department: 'Equipe de Compras',
      position: 'Validação comercial',
      unit: 'Brasil',
      accessProfile: 'Validador Comercial',
      account: 'CBRAATZ',
      scope: 'F4s em validação comercial e processos sob responsabilidade de Compras'
    },
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
    contact: {
      fullName: 'Mariana Silva',
      email: 'mariana.silva@renault.com.br',
      phone: 'Não informado',
      city: 'Brasil',
      country: 'Brasil',
      timezone: 'America/Sao_Paulo'
    },
    corporate: {
      company: 'Renault Geely do Brasil',
      department: 'Equipe de Engenharia',
      position: 'Validação técnica',
      unit: 'Brasil',
      accessProfile: 'Validador Técnico',
      account: 'MSILVA',
      scope: 'F4s em validação técnica e processos sob responsabilidade da Engenharia'
    },
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
    contact: {
      fullName: 'Analice Mendes',
      email: 'analice.mendes@renault.com.br',
      phone: 'Não informado',
      city: 'Brasil',
      country: 'Brasil',
      timezone: 'America/Sao_Paulo'
    },
    corporate: {
      company: 'Renault Geely do Brasil',
      department: 'CVE',
      position: 'CVE',
      unit: 'Brasil',
      accessProfile: 'CVE',
      account: 'AMENDES',
      scope: 'Visão global das F4s, projetos e decisão final do fluxo CVE'
    },
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

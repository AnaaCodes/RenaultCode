const ACTIVE_PROFILE_KEY = 'f4-active-profile';
const LANGUAGE_PREFIX = 'f4-language:';

export const SUPPORTED_LANGUAGES = Object.freeze({
  'pt-BR': { code: 'pt-BR', short: 'PT-BR', label: 'Português (Brasil)', nativeLabel: 'Português (Brasil)' },
  'en-US': { code: 'en-US', short: 'EN', label: 'English', nativeLabel: 'English' }
});

const shared = {
  'pt-BR': {
    'nav.overview': 'Visão geral',
    'nav.newF4': 'Nova F4',
    'nav.myF4': 'Minhas F4',
    'nav.controlF4': 'Controle de F4s',
    'nav.trackF4': 'Acompanhar F4s',
    'nav.projects': 'Projetos',
    'nav.pending': 'Pendências',
    'nav.history': 'Histórico',
    'nav.notifications': 'Notificações',
    'nav.settings': 'Configurações',
    'header.openMenu': 'Abrir menu',
    'header.profile': 'Abrir meu perfil',
    'header.switchProfile': 'Trocar perfil',
    'header.switchProfileMenu': 'Abrir troca de perfil',
    'sidebar.mainNavigation': 'Navegação principal',
    'sidebar.menu': 'Menu F4',
    'sidebar.collapse': 'Recolher barra lateral',
    'sidebar.collapseTitle': 'Recolher menu'
  },
  'en-US': {
    'nav.overview': 'Overview',
    'nav.newF4': 'New F4',
    'nav.myF4': 'My F4s',
    'nav.controlF4': 'F4 control',
    'nav.trackF4': 'Track F4s',
    'nav.projects': 'Projects',
    'nav.pending': 'Pending',
    'nav.history': 'History',
    'nav.notifications': 'Notifications',
    'nav.settings': 'Settings',
    'header.openMenu': 'Open menu',
    'header.profile': 'Open my profile',
    'header.switchProfile': 'Switch profile',
    'header.switchProfileMenu': 'Open profile switcher',
    'sidebar.mainNavigation': 'Main navigation',
    'sidebar.menu': 'F4 menu',
    'sidebar.collapse': 'Collapse sidebar',
    'sidebar.collapseTitle': 'Collapse menu'
  }
};

function activeProfileId() {
  return localStorage.getItem(ACTIVE_PROFILE_KEY) || 'supplier';
}

export function getCurrentLanguage(profileId = activeProfileId()) {
  const saved = localStorage.getItem(`${LANGUAGE_PREFIX}${profileId}`);
  return SUPPORTED_LANGUAGES[saved] ? saved : 'pt-BR';
}

export function setCurrentLanguage(language, profileId = activeProfileId()) {
  if (!SUPPORTED_LANGUAGES[language]) return false;
  localStorage.setItem(`${LANGUAGE_PREFIX}${profileId}`, language);
  document.documentElement.lang = language;
  window.dispatchEvent(new CustomEvent('f4:language-changed', { detail: { profileId, language } }));
  return true;
}

export function applyDocumentLanguage() {
  document.documentElement.lang = getCurrentLanguage();
}

export function t(key, fallback = key, language = getCurrentLanguage()) {
  return shared[language]?.[key] ?? shared['pt-BR']?.[key] ?? fallback;
}

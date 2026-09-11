import { mountAppShell } from '../core/app-shell.js';
import { getActiveProfile, getActiveProfileId } from '../core/user-session.js';
import { getCurrentLanguage, setCurrentLanguage, SUPPORTED_LANGUAGES } from '../core/i18n.js';
import { showToast } from '../core/toast.js';

const CONTACT_OVERRIDES_KEY = 'f4-profile-contact-overrides';
const SETTINGS_KEY = 'f4-profile-preferences';

const copy = {
  'pt-BR': {
    pageTitle: 'Meu perfil',
    account: 'Conta do usuário',
    active: 'Conta ativa',
    profileCode: 'Identificação da conta',
    currentAccess: 'Acesso atual',
    personalKicker: 'Dados pessoais',
    personalTitle: 'Informações de contato',
    edit: 'Editar informações',
    cancel: 'Cancelar',
    save: 'Salvar alterações',
    fullName: 'Nome / identificação',
    email: 'E-mail',
    phone: 'Telefone',
    city: 'Localização',
    country: 'País',
    timezone: 'Fuso horário',
    corporateKicker: 'Dados corporativos',
    corporateTitle: 'Vínculo e organização',
    synced: 'Dados corporativos',
    company: 'Empresa',
    department: 'Setor',
    position: 'Função',
    unit: 'Unidade',
    accessProfile: 'Perfil de acesso',
    accountId: 'Conta corporativa',
    scope: 'Escopo de visualização',
    accessKicker: 'Acesso',
    accessTitle: 'Permissões do perfil',
    enabled: 'Habilitado',
    commonAccess: 'Acompanhamento de F4',
    commonAccessDesc: 'Consulta às F4s disponíveis para este perfil, histórico, pendências e notificações.',
    createF4: 'Criar novas F4s',
    createF4Desc: 'Permissão para iniciar e editar solicitações F4.',
    projects: 'Acessar projetos',
    projectsDesc: 'Visualização da área de projetos e F4s associadas.',
    global: 'Visualização global',
    globalDesc: 'Acesso ampliado às F4s dentro do fluxo de gestão.',
    reviewCommercial: 'Validação comercial',
    reviewCommercialDesc: 'Pode aprovar, devolver ou rejeitar a etapa comercial.',
    reviewTechnical: 'Validação técnica',
    reviewTechnicalDesc: 'Pode aprovar, devolver ou rejeitar a etapa técnica.',
    reviewManager: 'Decisão do gerente',
    reviewManagerDesc: 'Pode registrar a decisão da Gerência de Projeto.',
    reviewCVE: 'Decisão CVE',
    reviewCVEDesc: 'Pode concluir a etapa CVE e aprovar a versão final.',
    languageKicker: 'Idioma da interface',
    languageTitle: 'Escolha seu idioma',
    languageDescription: 'Esta preferência fica vinculada ao seu perfil e é aplicada aos componentes compartilhados do sistema.',
    portugueseDetail: 'Português do Brasil',
    englishDetail: 'English interface',
    settingsKicker: 'Preferências',
    settingsTitle: 'Notificações e alertas',
    emailNotifications: 'Notificações por e-mail',
    emailNotificationsDesc: 'Receber por e-mail atualizações importantes das suas F4s.',
    deadlineAlerts: 'Alertas de prazo',
    deadlineAlertsDesc: 'Avisar quando uma F4 estiver próxima do prazo ou atrasada.',
    statusUpdates: 'Mudanças de status',
    statusUpdatesDesc: 'Notificar movimentações e mudanças de etapa do processo.',
    decisionAlerts: 'Decisões e validações',
    decisionAlertsDesc: 'Destacar aprovações, devoluções e rejeições relacionadas ao seu perfil.',
    securityKicker: 'Segurança',
    securityTitle: 'Sessão e autenticação',
    authentication: 'Autenticação',
    authenticationDesc: 'Método de acesso configurado para esta conta.',
    corporateSession: 'Sessão corporativa',
    sessionStatus: 'Status da sessão',
    sessionStatusDesc: 'Situação atual do acesso ao sistema.',
    activeSession: 'Ativa',
    languageSession: 'Idioma atual',
    languageSessionDesc: 'Idioma preferencial desta conta.',
    contactSaved: 'Informações de contato atualizadas.',
    preferencesSaved: 'Preferência atualizada.',
    languageSaved: 'Idioma alterado para Português (Brasil).',
    notProvided: 'Não informado'
  },
  'en-US': {
    pageTitle: 'My profile',
    account: 'User account',
    active: 'Active account',
    profileCode: 'Account identification',
    currentAccess: 'Current access',
    personalKicker: 'Personal information',
    personalTitle: 'Contact information',
    edit: 'Edit information',
    cancel: 'Cancel',
    save: 'Save changes',
    fullName: 'Name / identification',
    email: 'Email',
    phone: 'Phone',
    city: 'Location',
    country: 'Country',
    timezone: 'Time zone',
    corporateKicker: 'Corporate information',
    corporateTitle: 'Organization and role',
    synced: 'Corporate data',
    company: 'Company',
    department: 'Department',
    position: 'Role',
    unit: 'Unit',
    accessProfile: 'Access profile',
    accountId: 'Corporate account',
    scope: 'Visibility scope',
    accessKicker: 'Access',
    accessTitle: 'Profile permissions',
    enabled: 'Enabled',
    commonAccess: 'F4 tracking',
    commonAccessDesc: 'Access to F4s available to this profile, history, pending items and notifications.',
    createF4: 'Create new F4s',
    createF4Desc: 'Permission to start and edit F4 requests.',
    projects: 'Access projects',
    projectsDesc: 'View projects and their associated F4s.',
    global: 'Global visibility',
    globalDesc: 'Expanded access to F4s across the management flow.',
    reviewCommercial: 'Commercial validation',
    reviewCommercialDesc: 'Can approve, return or reject the commercial validation step.',
    reviewTechnical: 'Technical validation',
    reviewTechnicalDesc: 'Can approve, return or reject the technical validation step.',
    reviewManager: 'Project manager decision',
    reviewManagerDesc: 'Can register the Project Management decision.',
    reviewCVE: 'CVE decision',
    reviewCVEDesc: 'Can complete the CVE stage and approve the final version.',
    languageKicker: 'Interface language',
    languageTitle: 'Choose your language',
    languageDescription: 'This preference is linked to your profile and applied to the system shared components.',
    portugueseDetail: 'Brazilian Portuguese',
    englishDetail: 'English interface',
    settingsKicker: 'Preferences',
    settingsTitle: 'Notifications and alerts',
    emailNotifications: 'Email notifications',
    emailNotificationsDesc: 'Receive important F4 updates by email.',
    deadlineAlerts: 'Deadline alerts',
    deadlineAlertsDesc: 'Get notified when an F4 is close to its deadline or overdue.',
    statusUpdates: 'Status changes',
    statusUpdatesDesc: 'Receive notifications about process movements and stage changes.',
    decisionAlerts: 'Decisions and validations',
    decisionAlertsDesc: 'Highlight approvals, returns and rejections related to your profile.',
    securityKicker: 'Security',
    securityTitle: 'Session and authentication',
    authentication: 'Authentication',
    authenticationDesc: 'Access method configured for this account.',
    corporateSession: 'Corporate session',
    sessionStatus: 'Session status',
    sessionStatusDesc: 'Current system access status.',
    activeSession: 'Active',
    languageSession: 'Current language',
    languageSessionDesc: 'Preferred language for this account.',
    contactSaved: 'Contact information updated.',
    preferencesSaved: 'Preference updated.',
    languageSaved: 'Language changed to English.',
    notProvided: 'Not provided'
  }
};

const profile = getActiveProfile();
const profileId = getActiveProfileId();
const language = getCurrentLanguage(profileId);
const tr = key => copy[language]?.[key] ?? copy['pt-BR'][key] ?? key;

mountAppShell({ activePage: 'perfil', title: tr('pageTitle') });
document.title = `${tr('pageTitle')} | Sistema F4`;

function safeParse(key, fallback = {}) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
  catch { return fallback; }
}

function contactData() {
  const overrides = safeParse(CONTACT_OVERRIDES_KEY);
  return { ...profile.contact, ...(overrides[profileId] || {}) };
}

function saveContactData(next) {
  const overrides = safeParse(CONTACT_OVERRIDES_KEY);
  overrides[profileId] = { ...(overrides[profileId] || {}), ...next };
  localStorage.setItem(CONTACT_OVERRIDES_KEY, JSON.stringify(overrides));
}

const defaultPreferences = {
  emailNotifications: true,
  deadlineAlerts: true,
  statusUpdates: true,
  decisionAlerts: true
};

function getPreferences() {
  const all = safeParse(SETTINGS_KEY);
  return { ...defaultPreferences, ...(all[profileId] || {}) };
}

function setPreference(key, value) {
  const all = safeParse(SETTINGS_KEY);
  all[profileId] = { ...defaultPreferences, ...(all[profileId] || {}), [key]: value };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(all));
}

function avatarMarkup() {
  if (profile.avatar) return `<img src="${profile.avatar}" alt="${profile.name}">`;
  return profile.initials;
}

function displayValue(value) {
  if (!value || ['Não informado', 'Not provided'].includes(value)) return tr('notProvided');
  return value;
}

function infoItem(label, value, wide = false) {
  return `<div class="profile-info-item${wide ? ' wide' : ''}"><span>${label}</span><strong>${displayValue(value)}</strong></div>`;
}

function renderHero() {
  document.querySelector('#profileHero').innerHTML = `
    <div class="profile-hero-avatar">${avatarMarkup()}</div>
    <div class="profile-hero-copy">
      <p class="profile-kicker">${tr('account')}</p>
      <h2 id="profileName">${profile.name}</h2>
      <p>${profile.role} · ${profile.team}</p>
      <div class="profile-hero-meta">
        <span class="profile-hero-chip"><span class="status-dot"></span>${tr('active')}</span>
        <span class="profile-hero-chip">${profile.corporate.company}</span>
      </div>
    </div>
    <div class="profile-hero-id">
      <span>${tr('profileCode')}</span>
      <strong>${profile.corporate.account}</strong>
      <small>${tr('currentAccess')}: ${profile.corporate.accessProfile}</small>
    </div>`;
}

function renderTexts() {
  const map = {
    personalKicker: 'personalKicker', personalTitle: 'personalTitle', editContactButton: 'edit',
    emailEditLabel: 'email', phoneEditLabel: 'phone', cityEditLabel: 'city', cancelContactButton: 'cancel', saveContactButton: 'save',
    corporateKicker: 'corporateKicker', corporateTitle: 'corporateTitle', corporateSync: 'synced',
    accessKicker: 'accessKicker', accessTitle: 'accessTitle', languageKicker: 'languageKicker', languageTitle: 'languageTitle',
    languageDescription: 'languageDescription', settingsKicker: 'settingsKicker', settingsTitle: 'settingsTitle',
    securityKicker: 'securityKicker', securityTitle: 'securityTitle'
  };
  Object.entries(map).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = tr(key);
  });
}

function renderPersonalInfo() {
  const contact = contactData();
  document.querySelector('#personalInfo').innerHTML = [
    infoItem(tr('fullName'), contact.fullName),
    infoItem(tr('email'), contact.email),
    infoItem(tr('phone'), contact.phone),
    infoItem(tr('city'), contact.city),
    infoItem(tr('country'), contact.country),
    infoItem(tr('timezone'), contact.timezone)
  ].join('');

  document.querySelector('#emailInput').value = contact.email || '';
  document.querySelector('#phoneInput').value = ['Não informado', 'Not provided'].includes(contact.phone) ? '' : (contact.phone || '');
  document.querySelector('#cityInput').value = contact.city || '';
}

function renderCorporateInfo() {
  const data = profile.corporate;
  document.querySelector('#corporateInfo').innerHTML = [
    infoItem(tr('company'), data.company),
    infoItem(tr('department'), data.department),
    infoItem(tr('position'), data.position),
    infoItem(tr('unit'), data.unit),
    infoItem(tr('accessProfile'), data.accessProfile),
    infoItem(tr('accountId'), data.account),
    infoItem(tr('scope'), data.scope, true)
  ].join('');
}

const permissionIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 20 5v6c0 5.2-3.4 9.5-8 11-4.6-1.5-8-5.8-8-11V5l8-3Zm0 2.1L6 6.3V11c0 4.1 2.5 7.5 6 8.8 3.5-1.3 6-4.7 6-8.8V6.3l-6-2.2Zm-1 4.4 1.4 1.4-2.7 2.7 1.4 1.4 5.5-5.5 1.4 1.4-6.9 6.9-4.2-4.2 1.4-1.4 2.7 2.7 4.1-4.1-1.4-1.4-2.7 2.7Z"/></svg>`;

function permissionRow(title, description) {
  return `<div class="permission-item"><span class="permission-icon">${permissionIcon}</span><span class="permission-copy"><strong>${title}</strong><small>${description}</small></span><span class="permission-state">${tr('enabled')}</span></div>`;
}

function renderPermissions() {
  const p = profile.permissions || {};
  const rows = [permissionRow(tr('commonAccess'), tr('commonAccessDesc'))];
  if (p.createF4) rows.push(permissionRow(tr('createF4'), tr('createF4Desc')));
  if (p.viewProjects) rows.push(permissionRow(tr('projects'), tr('projectsDesc')));
  if (p.viewAllF4) rows.push(permissionRow(tr('global'), tr('globalDesc')));
  if (p.reviewCommercial) rows.push(permissionRow(tr('reviewCommercial'), tr('reviewCommercialDesc')));
  if (p.reviewTechnical) rows.push(permissionRow(tr('reviewTechnical'), tr('reviewTechnicalDesc')));
  if (p.reviewManager) rows.push(permissionRow(tr('reviewManager'), tr('reviewManagerDesc')));
  if (p.reviewCVE) rows.push(permissionRow(tr('reviewCVE'), tr('reviewCVEDesc')));
  document.querySelector('#permissionList').innerHTML = rows.join('');
}

function renderLanguages() {
  const current = getCurrentLanguage(profileId);
  const labels = {
    'pt-BR': { detail: tr('portugueseDetail') },
    'en-US': { detail: tr('englishDetail') }
  };

  document.querySelector('#languageOptions').innerHTML = Object.values(SUPPORTED_LANGUAGES).map(item => `
    <button class="language-option ${current === item.code ? 'is-active' : ''}" type="button" data-language="${item.code}" aria-pressed="${current === item.code}">
      <span class="language-code">${item.short}</span>
      <span class="language-name"><strong>${item.nativeLabel}</strong><small>${labels[item.code].detail}</small></span>
      <span class="language-check" aria-hidden="true">✓</span>
    </button>`).join('');

  document.querySelectorAll('[data-language]').forEach(button => {
    button.addEventListener('click', () => {
      const next = button.dataset.language;
      if (next === current) return;
      if (setCurrentLanguage(next, profileId)) window.location.reload();
    });
  });
}

function renderSettings() {
  const preferences = getPreferences();
  const definitions = [
    ['emailNotifications', 'emailNotifications', 'emailNotificationsDesc'],
    ['deadlineAlerts', 'deadlineAlerts', 'deadlineAlertsDesc'],
    ['statusUpdates', 'statusUpdates', 'statusUpdatesDesc'],
    ['decisionAlerts', 'decisionAlerts', 'decisionAlertsDesc']
  ];

  document.querySelector('#settingsList').innerHTML = definitions.map(([key, title, description]) => `
    <div class="setting-row">
      <span class="setting-copy"><strong>${tr(title)}</strong><small>${tr(description)}</small></span>
      <button class="setting-switch" type="button" role="switch" aria-checked="${Boolean(preferences[key])}" data-setting="${key}" aria-label="${tr(title)}"></button>
    </div>`).join('');

  document.querySelectorAll('[data-setting]').forEach(button => {
    button.addEventListener('click', () => {
      const next = button.getAttribute('aria-checked') !== 'true';
      button.setAttribute('aria-checked', String(next));
      setPreference(button.dataset.setting, next);
      showToast(tr('preferencesSaved'));
    });
  });
}

function renderSecurity() {
  const currentLanguage = SUPPORTED_LANGUAGES[getCurrentLanguage(profileId)]?.nativeLabel || 'Português (Brasil)';
  document.querySelector('#securityList').innerHTML = `
    <div class="security-row"><span class="security-copy"><strong>${tr('authentication')}</strong><small>${tr('authenticationDesc')}</small></span><span class="security-value">${tr('corporateSession')}</span></div>
    <div class="security-row"><span class="security-copy"><strong>${tr('sessionStatus')}</strong><small>${tr('sessionStatusDesc')}</small></span><span class="security-value ok">${tr('activeSession')}</span></div>
    <div class="security-row"><span class="security-copy"><strong>${tr('languageSession')}</strong><small>${tr('languageSessionDesc')}</small></span><span class="security-value">${currentLanguage}</span></div>`;
}

function setupContactForm() {
  const form = document.querySelector('#contactForm');
  const editButton = document.querySelector('#editContactButton');
  const cancelButton = document.querySelector('#cancelContactButton');

  const close = () => {
    form.hidden = true;
    editButton.hidden = false;
    renderPersonalInfo();
  };

  editButton.addEventListener('click', () => {
    form.hidden = false;
    editButton.hidden = true;
    document.querySelector('#emailInput').focus();
  });

  cancelButton.addEventListener('click', close);

  form.addEventListener('submit', event => {
    event.preventDefault();
    saveContactData({
      email: document.querySelector('#emailInput').value.trim(),
      phone: document.querySelector('#phoneInput').value.trim() || (language === 'pt-BR' ? 'Não informado' : 'Not provided'),
      city: document.querySelector('#cityInput').value.trim()
    });
    renderPersonalInfo();
    form.hidden = true;
    editButton.hidden = false;
    showToast(tr('contactSaved'));
  });
}

renderHero();
renderTexts();
renderPersonalInfo();
renderCorporateInfo();
renderPermissions();
renderLanguages();
renderSettings();
renderSecurity();
setupContactForm();

if (window.location.hash === '#configuracoes') {
  requestAnimationFrame(() => document.querySelector('#configuracoes')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
}

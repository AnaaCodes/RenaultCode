import { mountAppShell } from '../core/app-shell.js';
import { showToast } from '../core/toast.js';

mountAppShell({ activePage: 'nova-f4', title: 'NOVA F4' });

const form = document.querySelector('#newF4Form');
const saveDraftButton = document.querySelector('#saveDraftButton');
const autosaveStatus = document.querySelector('#autosaveStatus');
const description = document.querySelector('#description');
const changeCause = document.querySelector('#changeCause');
const descriptionCount = document.querySelector('#descriptionCount');
const causeCount = document.querySelector('#causeCount');

const DRAFT_KEY = 'f4-new-draft-step-1';

function updateCounters() {
  descriptionCount.textContent = description.value.length;
  causeCount.textContent = changeCause.value.length;
}

function getFormData() {
  return Object.fromEntries(new FormData(form).entries());
}

function fillForm(data) {
  Object.entries(data).forEach(([name, value]) => {
    const fields = form.elements[name];
    if (!fields) return;

    if (fields instanceof RadioNodeList) {
      [...fields].forEach(field => {
        field.checked = field.value === value;
      });
      return;
    }

    fields.value = value;
  });

  updateCounters();
}

function setSavedMessage(date = new Date()) {
  autosaveStatus.textContent = `Rascunho salvo às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`;
}

function saveDraft({ notify = true } = {}) {
  const payload = {
    savedAt: new Date().toISOString(),
    values: getFormData()
  };

  localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
  setSavedMessage(new Date(payload.savedAt));

  if (notify) showToast('Rascunho salvo neste navegador.');
}

function restoreDraft() {
  const raw = localStorage.getItem(DRAFT_KEY);
  if (!raw) return;

  try {
    const payload = JSON.parse(raw);
    if (payload?.values) fillForm(payload.values);
    if (payload?.savedAt) setSavedMessage(new Date(payload.savedAt));
  } catch {
    localStorage.removeItem(DRAFT_KEY);
  }
}

function clearValidation() {
  form.querySelectorAll('.form-field.is-invalid').forEach(field => field.classList.remove('is-invalid'));
}

function validateRequiredFields() {
  clearValidation();

  const requiredFields = [...form.querySelectorAll('[required]')];
  const invalidFields = requiredFields.filter(field => !field.value.trim());

  invalidFields.forEach(field => field.closest('.form-field')?.classList.add('is-invalid'));

  if (invalidFields.length) {
    invalidFields[0].focus();
    showToast('Preencha os campos obrigatórios antes de continuar.');
    return false;
  }

  return true;
}

form.addEventListener('input', event => {
  event.target.closest('.form-field')?.classList.remove('is-invalid');
  updateCounters();
  autosaveStatus.textContent = 'Alterações ainda não salvas.';
});

form.addEventListener('change', () => {
  autosaveStatus.textContent = 'Alterações ainda não salvas.';
});

saveDraftButton.addEventListener('click', () => saveDraft());

form.addEventListener('submit', event => {
  event.preventDefault();

  if (!validateRequiredFields()) return;

  saveDraft({ notify: false });
  showToast('Dados gerais validados. A etapa Fornecedor será conectada na próxima implementação.');
});

restoreDraft();
updateCounters();

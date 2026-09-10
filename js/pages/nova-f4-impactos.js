import { mountAppShell } from '../core/app-shell.js';
import { showToast } from '../core/toast.js';

mountAppShell({ activePage: 'nova-f4', title: 'NOVA F4' });

const form = document.querySelector('#impactForm');
const saveDraftButton = document.querySelector('#saveDraftButton');
const autosaveStatus = document.querySelector('#autosaveStatus');
const offerCurrency = document.querySelector('#offerCurrency');
const units = document.querySelector('#units');
const annualVolume = document.querySelector('#annualVolume');
const volumeUnit = document.querySelector('#volumeUnit');
const capacityMessage = document.querySelector('#capacityMessage');
const forexNote = document.querySelector('#forexNote');
const technicalValues = document.querySelector('#technicalValues');
const additionalCurrency2 = document.querySelector('#additionalCurrency2');
const additionalCurrency3 = document.querySelector('#additionalCurrency3');
const DRAFT_KEY = 'f4-new-draft-step-3';

const moneySymbols = { EUR: '€', BRL: 'R$', USD: 'US$' };

const impactConfig = [
  { key: 'tooling', radio: 'toolingImpact', amount: 'toolingAmount' },
  { key: 'set', radio: 'setImpact', amount: 'setAmount' },
  { key: 'massProduction', radio: 'massProductionImpact', amount: 'massProductionAmount' },
  { key: 'aftersales', radio: 'aftersalesImpact', amount: 'aftersalesAmount' },
  { key: 'packaging', radio: 'packagingImpact', amount: 'packagingAmount' }
];

function numberValue(nameOrElement) {
  const element = typeof nameOrElement === 'string' ? form.elements[nameOrElement] : nameOrElement;
  const value = Number.parseFloat(element?.value || '0');
  return Number.isFinite(value) ? value : 0;
}

function formatMoney(value, currency, decimals = 2) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value || 0);
}

function currentUnitLabel() {
  const unit = units.value || 'Peça';
  return unit.toLocaleLowerCase('pt-BR');
}

function updateCurrencyPresentation() {
  const currency = offerCurrency.value || 'EUR';
  document.querySelectorAll('[data-currency-label]').forEach(label => {
    label.textContent = currency;
  });

  const firstTechnicalCurrency = form.elements.technicalCurrency1;
  firstTechnicalCurrency.value = currency;
  volumeUnit.textContent = `${units.value || 'Peça'}/ano`;
  calculateSummary();
}

function updateImpactState(config) {
  const selected = form.querySelector(`input[name="${config.radio}"]:checked`)?.value;
  const input = form.elements[config.amount];
  if (!input) return;

  const enabled = selected === 'Sim';
  input.disabled = !enabled;
  if (!enabled) input.value = '0';
  input.closest('.form-field')?.classList.remove('is-invalid');
}

function updateTechnicalState() {
  const enabled = form.querySelector('input[name="technicalImpact"]:checked')?.value === 'Sim';
  const multiCurrency = form.querySelector('input[name="multiCurrency"]:checked')?.value === 'Sim';

  form.elements.technicalCurrency1.disabled = !enabled;
  form.elements.technicalAmount1.disabled = !enabled;
  technicalValues.classList.toggle('is-disabled', !enabled);

  additionalCurrency2.hidden = !(enabled && multiCurrency);
  additionalCurrency3.hidden = !(enabled && multiCurrency);

  for (const index of [2, 3]) {
    const currency = form.elements[`technicalCurrency${index}`];
    const amount = form.elements[`technicalAmount${index}`];
    currency.disabled = !(enabled && multiCurrency);
    amount.disabled = !(enabled && multiCurrency);
    if (currency.disabled) {
      currency.value = '';
      amount.value = '0';
    }
  }

  if (!enabled) form.elements.technicalAmount1.value = '0';
  forexNote.hidden = !(enabled && multiCurrency);
  calculateSummary();
}

function technicalAmountInOfferCurrency() {
  if (form.querySelector('input[name="technicalImpact"]:checked')?.value !== 'Sim') return 0;
  const targetCurrency = offerCurrency.value;
  let total = 0;

  for (const index of [1, 2, 3]) {
    const currency = form.elements[`technicalCurrency${index}`];
    const amount = form.elements[`technicalAmount${index}`];
    if (!currency || currency.disabled || currency.value !== targetCurrency) continue;
    total += numberValue(amount);
  }

  return total;
}

function calculateSummary() {
  const currency = offerCurrency.value || 'EUR';
  const technical = technicalAmountInOfferCurrency();
  const massProduction = form.querySelector('input[name="massProductionImpact"]:checked')?.value === 'Sim' ? numberValue('massProductionAmount') : 0;
  const aftersales = form.querySelector('input[name="aftersalesImpact"]:checked')?.value === 'Sim' ? numberValue('aftersalesAmount') : 0;
  const tooling = form.querySelector('input[name="toolingImpact"]:checked')?.value === 'Sim' ? numberValue('toolingAmount') : 0;
  const set = form.querySelector('input[name="setImpact"]:checked')?.value === 'Sim' ? numberValue('setAmount') : 0;
  const packaging = form.querySelector('input[name="packagingImpact"]:checked')?.value === 'Sim' ? numberValue('packagingAmount') : 0;
  const volume = numberValue(annualVolume);

  const unitImpact = technical + massProduction + aftersales;
  const annualImpact = unitImpact * volume;
  const initialCosts = tooling + set + packaging;

  document.querySelector('#unitImpactResult').textContent = `${formatMoney(unitImpact, currency, 3)} / ${currentUnitLabel()}`;
  document.querySelector('#annualImpactResult').textContent = `${formatMoney(annualImpact, currency, 2)} / ano`;
  document.querySelector('#initialCostsResult').textContent = formatMoney(initialCosts, currency, 2);

  document.querySelector('#annualImpactEur').textContent = currency === 'EUR'
    ? `EUR/ano: ${formatMoney(annualImpact, 'EUR', 2)}`
    : 'EUR/ano: aguardando taxa FOREX';
  document.querySelector('#initialCostsEur').textContent = currency === 'EUR'
    ? `EUR: ${formatMoney(initialCosts, 'EUR', 2)}`
    : 'EUR: aguardando taxa FOREX';
}

function getFormData() {
  return Object.fromEntries(new FormData(form).entries());
}

function fillForm(values) {
  Object.entries(values || {}).forEach(([name, value]) => {
    const fields = form.elements[name];
    if (!fields) return;

    if (fields instanceof RadioNodeList) {
      [...fields].forEach(field => { field.checked = field.value === value; });
    } else {
      fields.value = value;
    }
  });

  impactConfig.forEach(updateImpactState);
  updateTechnicalState();
  updateCurrencyPresentation();
  const capacity = form.querySelector('input[name="capacityImpact"]:checked')?.value;
  capacityMessage.hidden = capacity !== 'Sim';
}

function setSavedMessage(date = new Date()) {
  autosaveStatus.textContent = `Rascunho salvo às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`;
}

function saveDraft({ notify = true } = {}) {
  const payload = { savedAt: new Date().toISOString(), values: getFormData() };
  localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
  setSavedMessage(new Date(payload.savedAt));
  if (notify) showToast('Rascunho dos impactos salvo neste navegador.');
}

function restoreDraft() {
  const raw = localStorage.getItem(DRAFT_KEY);
  if (!raw) return;
  try {
    const payload = JSON.parse(raw);
    fillForm(payload.values);
    if (payload.savedAt) setSavedMessage(new Date(payload.savedAt));
  } catch {
    localStorage.removeItem(DRAFT_KEY);
  }
}

function clearValidation() {
  form.querySelectorAll('.is-invalid').forEach(element => element.classList.remove('is-invalid'));
}

function validateForm() {
  clearValidation();
  let firstInvalid = null;

  [offerCurrency, units, annualVolume].forEach(field => {
    const invalid = !field.value || (field === annualVolume && numberValue(field) <= 0);
    if (!invalid) return;
    const wrapper = field.closest('.form-field');
    wrapper?.classList.add('is-invalid');
    firstInvalid ||= field;
  });

  impactConfig.forEach(config => {
    const yes = form.querySelector(`input[name="${config.radio}"]:checked`)?.value === 'Sim';
    const amount = form.elements[config.amount];
    if (yes && numberValue(amount) <= 0) {
      amount.closest('.form-field')?.classList.add('is-invalid');
      firstInvalid ||= amount;
    }
  });

  const technicalYes = form.querySelector('input[name="technicalImpact"]:checked')?.value === 'Sim';
  if (technicalYes) {
    const multi = form.querySelector('input[name="multiCurrency"]:checked')?.value === 'Sim';
    const indexes = multi ? [1, 2] : [1];
    indexes.forEach(index => {
      const currency = form.elements[`technicalCurrency${index}`];
      const amount = form.elements[`technicalAmount${index}`];
      if (!currency?.value || numberValue(amount) <= 0) {
        currency?.closest('.form-field')?.classList.add('is-invalid');
        amount?.closest('.form-field')?.classList.add('is-invalid');
        firstInvalid ||= amount || currency;
      }
    });

    if (multi) {
      const thirdCurrency = form.elements.technicalCurrency3;
      const thirdAmount = form.elements.technicalAmount3;
      const thirdWasStarted = Boolean(thirdCurrency?.value) || numberValue(thirdAmount) > 0;
      if (thirdWasStarted && (!thirdCurrency?.value || numberValue(thirdAmount) <= 0)) {
        thirdCurrency?.closest('.form-field')?.classList.add('is-invalid');
        thirdAmount?.closest('.form-field')?.classList.add('is-invalid');
        firstInvalid ||= thirdAmount || thirdCurrency;
      }

      const selectedCurrencies = [1, 2, 3]
        .map(index => form.elements[`technicalCurrency${index}`]?.value)
        .filter(Boolean);
      if (new Set(selectedCurrencies).size !== selectedCurrencies.length) {
        [1, 2, 3].forEach(index => form.elements[`technicalCurrency${index}`]?.closest('.form-field')?.classList.add('is-invalid'));
        firstInvalid ||= form.elements.technicalCurrency2;
        showToast('As moedas do impacto técnico devem ser diferentes entre si.');
        return false;
      }
    }
  }

  const capacity = form.querySelector('input[name="capacityImpact"]:checked');
  if (!capacity) {
    document.querySelector('.capacity-choice')?.classList.add('is-invalid');
    firstInvalid ||= form.querySelector('input[name="capacityImpact"]');
  }

  if (firstInvalid) {
    firstInvalid.focus?.();
    showToast('Revise os campos obrigatórios e os impactos marcados como “Sim”.');
    return false;
  }

  return true;
}

impactConfig.forEach(config => {
  form.querySelectorAll(`input[name="${config.radio}"]`).forEach(radio => {
    radio.addEventListener('change', () => {
      updateImpactState(config);
      calculateSummary();
    });
  });
});

form.querySelectorAll('input[name="technicalImpact"], input[name="multiCurrency"]').forEach(input => {
  input.addEventListener('change', updateTechnicalState);
});

form.querySelectorAll('input[name="capacityImpact"]').forEach(input => {
  input.addEventListener('change', () => {
    capacityMessage.hidden = input.value !== 'Sim' || !input.checked;
    document.querySelector('.capacity-choice')?.classList.remove('is-invalid');
  });
});

offerCurrency.addEventListener('change', updateCurrencyPresentation);
units.addEventListener('change', updateCurrencyPresentation);

form.addEventListener('input', event => {
  event.target.closest('.form-field')?.classList.remove('is-invalid');
  autosaveStatus.textContent = 'Alterações ainda não salvas.';
  calculateSummary();
});

form.addEventListener('change', () => {
  autosaveStatus.textContent = 'Alterações ainda não salvas.';
  calculateSummary();
});

saveDraftButton.addEventListener('click', () => saveDraft());

form.addEventListener('submit', event => {
  event.preventDefault();
  if (!validateForm()) return;
  saveDraft({ notify: false });
  showToast('Impactos validados. Abrindo o detalhamento.');
  window.setTimeout(() => {
    window.location.href = './nova-f4-impactos-detalhes.html';
  }, 250);
});

impactConfig.forEach(updateImpactState);
updateTechnicalState();
updateCurrencyPresentation();
restoreDraft();

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
const stepper = document.querySelector('#formStepper');
const stepperShell = document.querySelector('#stepperShell');
const steps = stepper ? [...stepper.querySelectorAll('.step')] : [];


let stepperFrame = null;

function getScrollBehavior() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}

function updateStepperPresentation() {
  if (!stepper || !stepperShell || !steps.length) return;

  const viewport = stepper.getBoundingClientRect();
  const viewportCenter = viewport.left + (viewport.width / 2);
  const fadeDistance = Math.max(viewport.width * .53, 1);

  steps.forEach(step => {
    const rect = step.getBoundingClientRect();
    const itemCenter = rect.left + (rect.width / 2);
    const distance = Math.abs(itemCenter - viewportCenter);
    const normalizedDistance = Math.min(distance / fadeDistance, 1);

    // As etapas próximas das extremidades perdem ênfase.
    // A etapa ativa permanece totalmente nítida.
    const emphasis = step.classList.contains('is-active')
      ? 1
      : Math.max(.28, 1 - (normalizedDistance * .76));

    step.style.setProperty('--step-emphasis', emphasis.toFixed(3));
  });

  const maxScroll = Math.max(stepper.scrollWidth - stepper.clientWidth, 0);
  stepperShell.classList.toggle('has-left-overflow', stepper.scrollLeft > 4);
  stepperShell.classList.toggle('has-right-overflow', stepper.scrollLeft < maxScroll - 4);
}

function requestStepperUpdate() {
  if (stepperFrame !== null) return;

  stepperFrame = requestAnimationFrame(() => {
    stepperFrame = null;
    updateStepperPresentation();
  });
}

function scrollStepperBy(direction) {
  if (!stepper) return;

  const activeWidth = steps[0]?.getBoundingClientRect().width || 210;
  const gap = Number.parseFloat(getComputedStyle(stepper).columnGap) || 16;

  stepper.scrollBy({
    left: direction * (activeWidth + gap),
    behavior: getScrollBehavior()
  });
}

function setupStepperNavigation() {
  if (!stepper || !stepperShell) return;

  stepper.addEventListener('scroll', requestStepperUpdate, { passive: true });

  // Drag-to-scroll com o mouse: clicar em qualquer área do stepper e arrastar.
  // O preventDefault + user-select:none no CSS impedem que o navegador
  // selecione os textos em vez de movimentar a navegação.
  let isDragging = false;
  let dragPointerId = null;
  let dragStartX = 0;
  let dragStartScroll = 0;

  stepper.addEventListener('pointerdown', event => {
    // No touch, mantemos o scroll nativo do navegador, que já é mais fluido.
    if (event.pointerType === 'touch') return;

    // Aceita apenas o botão principal do mouse/caneta.
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    event.preventDefault();

    isDragging = true;
    dragPointerId = event.pointerId;
    dragStartX = event.clientX;
    dragStartScroll = stepper.scrollLeft;

    stepper.classList.add('is-dragging');
    stepper.setPointerCapture?.(event.pointerId);
  });

  stepper.addEventListener('pointermove', event => {
    if (!isDragging || event.pointerId !== dragPointerId) return;

    event.preventDefault();
    const distance = event.clientX - dragStartX;
    stepper.scrollLeft = dragStartScroll - distance;
  });

  const finishDrag = event => {
    if (!isDragging) return;
    if (dragPointerId !== null && event.pointerId !== dragPointerId) return;

    isDragging = false;
    stepper.classList.remove('is-dragging');

    if (dragPointerId !== null && stepper.hasPointerCapture?.(dragPointerId)) {
      stepper.releasePointerCapture(dragPointerId);
    }

    dragPointerId = null;
    requestStepperUpdate();
  };

  stepper.addEventListener('pointerup', finishDrag);
  stepper.addEventListener('pointercancel', finishDrag);
  stepper.addEventListener('lostpointercapture', () => {
    isDragging = false;
    dragPointerId = null;
    stepper.classList.remove('is-dragging');
  });

  stepper.addEventListener('wheel', event => {
    const maxScroll = stepper.scrollWidth - stepper.clientWidth;
    if (maxScroll <= 0) return;

    const verticalIntent = Math.abs(event.deltaY) > Math.abs(event.deltaX);
    if (!verticalIntent) return;

    const movingRight = event.deltaY > 0;
    const canMove = movingRight
      ? stepper.scrollLeft < maxScroll - 1
      : stepper.scrollLeft > 1;

    if (!canMove) return;

    event.preventDefault();
    stepper.scrollLeft += event.deltaY;
  }, { passive: false });

  stepper.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      scrollStepperBy(1);
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      scrollStepperBy(-1);
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      stepper.scrollTo({ left: 0, behavior: getScrollBehavior() });
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      stepper.scrollTo({ left: stepper.scrollWidth, behavior: getScrollBehavior() });
    }
  });

  if ('ResizeObserver' in window) {
    const resizeObserver = new ResizeObserver(requestStepperUpdate);
    resizeObserver.observe(stepper);
  } else {
    window.addEventListener('resize', requestStepperUpdate, { passive: true });
  }

  const activeStep = stepper.querySelector('.step.is-active');
  if (activeStep && !activeStep.matches(':first-child')) {
    activeStep.scrollIntoView({ behavior: 'auto', inline: 'center', block: 'nearest' });
  }

  if ('MutationObserver' in window) {
    const activeStepObserver = new MutationObserver(() => {
      const currentStep = stepper.querySelector('.step.is-active, .step[aria-current="step"]');
      currentStep?.scrollIntoView({
        behavior: getScrollBehavior(),
        inline: 'center',
        block: 'nearest'
      });
      requestStepperUpdate();
    });

    steps.forEach(step => {
      activeStepObserver.observe(step, {
        attributes: true,
        attributeFilter: ['class', 'aria-current']
      });
    });
  }

  requestStepperUpdate();
}

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

setupStepperNavigation();
restoreDraft();
updateCounters();

import { track } from './analytics.js';
import { formatMoney, initShared } from './shared.js';

initShared({ activity: false });
track('checkout_view');

const form = document.querySelector('#checkout-form');
const submitBtn = document.querySelector('#checkout-submit');
const error = document.querySelector('#checkout-error');
const amount = document.querySelector('[data-total]');
const manualAmount = document.querySelector('#manual-transfer-amount');
const pricingStrike = document.querySelector('#pricing-strike');
const couponActiveBadge = document.querySelector('#coupon-active-badge');

const couponAccordion = document.querySelector('#coupon-accordion');
const couponToggle = document.querySelector('#coupon-toggle');
const couponInput = document.querySelector('#coupon');
const couponButton = document.querySelector('#coupon-check');
const couponStatus = document.querySelector('#coupon-status');

// Method Selector elements
const methodPaystackBtn = document.querySelector('#method-paystack');
const methodManualBtn = document.querySelector('#method-manual');
const paystackPanel = document.querySelector('#paystack-panel');
const manualPanel = document.querySelector('#manual-panel');
let selectedMethod = 'paystack';

// Manual Transfer elements
const copyAccountBtn = document.querySelector('#copy-account-btn');
const manualSubmitBtn = document.querySelector('#manual-submit-btn');
const manualError = document.querySelector('#manual-error');
const manualEntryStep = document.querySelector('#manual-entry-step');
const manualSubmittedState = document.querySelector('#manual-submitted-state');
const submittedRef = document.querySelector('#submitted-ref');

const incomingClaim = new URLSearchParams(location.search).get('claim') || sessionStorage.getItem('gretex_coupon_claim') || '';
let appliedCode = '';
let appliedClaim = '';

// Segmented Payment Method Switching
function setPaymentMethod(method) {
  selectedMethod = method;
  if (method === 'paystack') {
    methodPaystackBtn?.classList.add('is-active');
    methodPaystackBtn?.setAttribute('aria-checked', 'true');
    methodManualBtn?.classList.remove('is-active');
    methodManualBtn?.setAttribute('aria-checked', 'false');

    if (paystackPanel) {
      paystackPanel.hidden = false;
      paystackPanel.classList.add('is-visible');
    }
    if (manualPanel) {
      manualPanel.hidden = true;
      manualPanel.classList.remove('is-visible');
    }
    track('payment_method_selected', { method: 'paystack' });
  } else {
    methodManualBtn?.classList.add('is-active');
    methodManualBtn?.setAttribute('aria-checked', 'true');
    methodPaystackBtn?.classList.remove('is-active');
    methodPaystackBtn?.setAttribute('aria-checked', 'false');

    if (manualPanel) {
      manualPanel.hidden = false;
      manualPanel.classList.add('is-visible');
    }
    if (paystackPanel) {
      paystackPanel.hidden = true;
      paystackPanel.classList.remove('is-visible');
    }
    track('payment_method_selected', { method: 'manual_transfer' });
  }
}

methodPaystackBtn?.addEventListener('click', () => setPaymentMethod('paystack'));
methodManualBtn?.addEventListener('click', () => setPaymentMethod('manual_transfer'));

// Copy Account Number Interaction
if (copyAccountBtn) {
  copyAccountBtn.addEventListener('click', async () => {
    const accNumEl = document.querySelector('#manual-account-number');
    const labelEl = document.querySelector('#copy-btn-label');
    const textToCopy = accNumEl?.textContent?.trim() || '5556829717';

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = textToCopy;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      if (labelEl) labelEl.textContent = 'COPIED ✓';
      copyAccountBtn.classList.add('is-copied');
      setTimeout(() => {
        if (labelEl) labelEl.textContent = 'COPY ACCOUNT NUMBER';
        copyAccountBtn.classList.remove('is-copied');
      }, 2000);
    } catch {
      if (labelEl) labelEl.textContent = 'COPIED ✓';
      setTimeout(() => {
        if (labelEl) labelEl.textContent = 'COPY ACCOUNT NUMBER';
      }, 2000);
    }
  });
}

// Toggle coupon accordion
if (couponToggle && couponAccordion) {
  couponToggle.addEventListener('click', () => {
    const isOpen = couponAccordion.classList.toggle('is-open');
    couponToggle.setAttribute('aria-expanded', String(isOpen));
    if (isOpen && couponInput) {
      setTimeout(() => couponInput.focus(), 60);
    }
  });
}

function updatePricingDisplay(isDiscounted, discountedAmount = 7500) {
  const formattedStandard = formatMoney(10000);
  const formattedDiscounted = formatMoney(discountedAmount);

  if (isDiscounted) {
    if (pricingStrike) pricingStrike.hidden = false;
    if (couponActiveBadge) couponActiveBadge.hidden = false;
    if (amount) amount.textContent = formattedDiscounted;
    if (manualAmount) manualAmount.textContent = formattedDiscounted;
  } else {
    if (pricingStrike) pricingStrike.hidden = true;
    if (couponActiveBadge) couponActiveBadge.hidden = true;
    if (amount) amount.textContent = formattedStandard;
    if (manualAmount) manualAmount.textContent = formattedStandard;
  }
}

if (incomingClaim) {
  if (couponAccordion && couponToggle) {
    couponAccordion.classList.add('is-open');
    couponToggle.setAttribute('aria-expanded', 'true');
  }
  validateClaim(incomingClaim);
}

async function validateClaim(claim) {
  try {
    const response = await fetch('/api/coupon/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ claim })
    });
    const body = await response.json();
    if (!response.ok || body.pricing?.applied !== true) throw new Error();
    appliedClaim = claim;
    updatePricingDisplay(true, body.pricing.amount);
    if (couponStatus) {
      couponStatus.textContent = 'FOUNDING ACCESS UNLOCKED ✓ 25% savings applied.';
      couponStatus.dataset.state = 'success';
    }
  } catch {
    sessionStorage.removeItem('gretex_coupon_claim');
    updatePricingDisplay(false);
    if (couponStatus) {
      couponStatus.textContent = "That code isn't valid.";
      couponStatus.dataset.state = 'error';
    }
  }
}

if (couponButton && couponInput) {
  couponButton.addEventListener('click', async () => {
    const code = couponInput.value.trim().toUpperCase();
    if (!code) {
      couponInput.focus();
      return;
    }

    couponButton.disabled = true;
    if (error) error.textContent = '';
    track('coupon_check');

    try {
      const response = await fetch('/api/coupon/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);

      if (body.pricing?.applied) {
        appliedCode = body.pricing.code;
        appliedClaim = '';
        updatePricingDisplay(true, body.pricing.amount);
        couponStatus.textContent = 'FOUNDING ACCESS UNLOCKED ✓ GRETEXOS25 applied (₦10,000 → ' + formatMoney(body.pricing.amount) + ')';
        couponStatus.dataset.state = 'success';
        track('coupon_applied');
      } else {
        appliedCode = '';
        appliedClaim = '';
        updatePricingDisplay(false);
        couponStatus.textContent = "That code isn't valid.";
        couponStatus.dataset.state = 'error';
      }
    } catch {
      if (couponStatus) {
        couponStatus.textContent = "That code isn't valid.";
        couponStatus.dataset.state = 'error';
      }
    } finally {
      couponButton.disabled = false;
    }
  });

  couponInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      couponButton.click();
    }
  });
}

function validateBuyerFields() {
  const firstNameInput = form?.querySelector('[name=firstName]');
  const emailInput = form?.querySelector('[name=email]');
  const whatsappInput = form?.querySelector('[name=whatsapp]');

  if (!firstNameInput?.value.trim()) {
    showError('Please enter your first name.');
    firstNameInput?.focus();
    return false;
  }

  if (!emailInput?.value.trim() || !emailInput.checkValidity()) {
    showError('Please enter a valid email address.');
    emailInput?.focus();
    return false;
  }

  if (!whatsappInput?.value.trim()) {
    showError('Please enter your WhatsApp number with country code.');
    whatsappInput?.focus();
    return false;
  }

  return true;
}

// Option A: Paystack Flow
if (form) {
  form.addEventListener('submit', async event => {
    event.preventDefault();

    if (selectedMethod === 'manual_transfer') {
      handleManualTransfer();
      return;
    }

    if (!validateBuyerFields()) return;

    // Prevent double initialization
    if (submitBtn.disabled) return;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-icon" aria-hidden="true"></span> PREPARING SECURE PAYMENT...';
    if (error) error.textContent = '';
    track('payment_started');

    try {
      const formData = new FormData(form);
      const values = {
        firstName: formData.get('firstName'),
        email: formData.get('email'),
        whatsapp: formData.get('whatsapp')
      };
      const source = new URLSearchParams(location.search).get('source') || 'direct';

      const response = await fetch('/api/payment/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          couponCode: appliedCode,
          couponClaim: appliedClaim,
          paymentMethod: 'paystack',
          source
        })
      });

      const body = await response.json();
      if (!response.ok || !body.authorizationUrl) {
        throw new Error(body.error || "We couldn't start your payment. Please try again.");
      }

      submitBtn.classList.add('is-success');
      submitBtn.textContent = 'PAYMENT READY ✓ OPENING PAYSTACK...';
      track('payment_redirect');

      setTimeout(() => {
        location.assign(body.authorizationUrl);
      }, 350);
    } catch (cause) {
      showError(cause.message || "We couldn't start your payment. Please try again.");
      track('payment_failed', { reason: 'initialize' });
      submitBtn.classList.remove('is-success');
      submitBtn.innerHTML = '<span>CONTINUE TO SECURE PAYMENT →</span>';
      submitBtn.disabled = false;
    }
  });
}

// Option B: Manual Bank Transfer Flow
async function handleManualTransfer() {
  if (!validateBuyerFields()) return;

  if (manualSubmitBtn?.disabled) return;
  manualSubmitBtn.disabled = true;
  manualSubmitBtn.innerHTML = '<span class="spinner-icon" aria-hidden="true"></span> SUBMITTING TRANSFER...';
  if (manualError) manualError.textContent = '';
  track('manual_payment_submitted');

  try {
    const formData = new FormData(form);
    const firstName = formData.get('firstName');
    const email = formData.get('email');
    const whatsapp = formData.get('whatsapp');
    const transferPayerName = formData.get('transferPayerName') || firstName;
    const transferReference = formData.get('transferReference') || '';
    const source = new URLSearchParams(location.search).get('source') || 'direct';

    const response = await fetch('/api/payment/initialize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName,
        email,
        whatsapp,
        payerName: transferPayerName,
        transferReference,
        couponCode: appliedCode,
        couponClaim: appliedClaim,
        paymentMethod: 'manual_transfer',
        source
      })
    });

    const body = await response.json();
    if (!response.ok) {
      throw new Error(body.error || "We couldn't submit your transfer details. Please try again.");
    }

    // Display TRANSFER SUBMITTED state without auto-activating or redirecting
    if (manualEntryStep) manualEntryStep.hidden = true;
    if (manualSubmittedState) {
      manualSubmittedState.hidden = false;
      if (submittedRef) submittedRef.textContent = body.reference;
    }
    track('manual_payment_pending', { reference: body.reference });
  } catch (cause) {
    if (manualError) {
      manualError.textContent = cause.message || "We couldn't submit your transfer details. Please try again.";
      manualError.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    manualSubmitBtn.disabled = false;
    manualSubmitBtn.innerHTML = '<span>I\'VE MADE THE TRANSFER →</span>';
  }
}

if (manualSubmitBtn) {
  manualSubmitBtn.addEventListener('click', handleManualTransfer);
}

function showError(message) {
  if (selectedMethod === 'manual_transfer' && manualError) {
    manualError.textContent = message;
    manualError.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } else if (error) {
    error.textContent = message;
    error.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

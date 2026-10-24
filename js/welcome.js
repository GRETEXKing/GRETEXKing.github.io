import { track } from './analytics.js';
import { initShared } from './shared.js';

initShared();
const reference = new URLSearchParams(location.search).get('reference') || new URLSearchParams(location.search).get('trxref');
const checking = document.querySelector('#checking');
const unverified = document.querySelector('#unverified');
const verified = document.querySelector('#verified');

if (!reference) {
  checking.hidden = true;
  unverified.hidden = false;
} else {
  verify(reference);
}

async function verify(value) {
  try {
    const response = await fetch(`/api/payment/verify?reference=${encodeURIComponent(value)}`, { headers: { Accept: 'application/json' } });
    const body = await response.json();
    if (!response.ok || body.verified !== true) throw new Error();
    document.querySelector('[data-buyer-name]').textContent = body.firstName;
    checking.hidden = true;
    verified.hidden = false;
    track('payment_success');
    track('welcome_verified');
  } catch {
    checking.hidden = true;
    unverified.hidden = false;
  }
}

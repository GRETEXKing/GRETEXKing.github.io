import { track } from './analytics.js';

const money = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 });
export const formatMoney = value => money.format(value);

export function initShared({ activity = true } = {}) {
  document.documentElement.classList.add('js');
  requestAnimationFrame(() => document.body.classList.add('is-ready'));
  document.querySelectorAll('[data-track]').forEach(link => link.addEventListener('click', () => track('cta_click', { location: link.dataset.track })));
  if (activity) loadActivity();
}

async function loadActivity() {
  const host = document.querySelector('[data-activity]');
  if (!host) return;
  try {
    const response = await fetch('/api/activity/recent', { headers: { Accept: 'application/json' } });
    const body = await response.json();
    if (!response.ok || !body.activity?.length) return;
    const event = body.activity[0];
    host.innerHTML = `<span>${escapeHtml(event.type.replaceAll('_', ' '))}</span><strong>${escapeHtml(event.message)}</strong>`;
    host.hidden = false;
  } catch {}
}

function escapeHtml(value) {
  const node = document.createElement('span');
  node.textContent = String(value);
  return node.innerHTML;
}

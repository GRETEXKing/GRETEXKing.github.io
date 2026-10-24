import { track } from './analytics.js';
import { initShared } from './shared.js';

initShared({ activity: false });
track('sales_view');

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const stateLabels = ['Stuck', 'Structured', 'Moving', 'Measured', 'Done'];
const nextLabels = ['Undefined', 'Milestones set', 'Write checkout page', 'Review progress', 'Complete'];
const progressValues = [0, 18, 42, 74, 100];
const stateNodes = [...document.querySelectorAll('.state-sequence span')];
let stateIndex = reducedMotion ? 2 : 0;

function renderState() {
  document.querySelector('[data-state-label]').textContent = stateLabels[stateIndex];
  document.querySelector('[data-next-label]').textContent = nextLabels[stateIndex];
  document.querySelector('[data-progress-label]').textContent = `${progressValues[stateIndex]}%`;
  document.querySelector('[data-progress-bar]').style.width = `${progressValues[stateIndex]}%`;
  stateNodes.forEach((node, index) => node.classList.toggle('is-active', index === stateIndex));
}
renderState();
if (!reducedMotion) setInterval(() => { stateIndex = (stateIndex + 1) % stateLabels.length; renderState(); }, 2600);

const sticky = document.querySelector('[data-sticky-conversion]');
const hero = document.querySelector('.sell-hero');
const heroObserver = new IntersectionObserver(([entry]) => { sticky.hidden = entry.isIntersecting; }, { threshold: .12 });
heroObserver.observe(hero);

document.querySelectorAll('details').forEach(detail => detail.addEventListener('toggle', () => {
  if (detail.open) track('faq_open');
}));

const dialog = document.querySelector('[data-proof-dialog]');
const dialogImage = dialog.querySelector('img');
let proofTrigger = null;
document.querySelectorAll('[data-proof-image]').forEach(button => button.addEventListener('click', () => {
  proofTrigger = button;
  dialogImage.src = button.dataset.proofImage;
  dialogImage.alt = button.querySelector('img')?.alt || 'Expanded verified GRETEX result';
  dialog.showModal();
  track('proof_view');
}));
document.querySelector('[data-proof-close]').addEventListener('click', closeProof);
dialog.addEventListener('click', event => { if (event.target === dialog) closeProof(); });
dialog.addEventListener('close', () => proofTrigger?.focus());
function closeProof() { dialog.close(); }

const days = document.querySelector('.days');
for (let day = 1; day <= 30; day += 1) {
  const node = document.createElement('span');
  node.textContent = day;
  days.append(node);
}

const couponButton = document.querySelector('[data-coupon-check]');
const couponResult = document.querySelector('[data-coupon-result]');
couponButton.addEventListener('click', discoverCoupon);

async function discoverCoupon() {
  couponButton.disabled = true;
  couponButton.firstChild.textContent = 'Checking availability… ';
  couponResult.hidden = true;
  track('coupon_check');
  try {
    const response = await fetch('/api/coupon/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discover: true })
    });
    const body = await response.json();
    if (!response.ok) throw new Error();
    couponResult.hidden = false;
    if (body.available === true && body.claim) {
      sessionStorage.setItem('gretex_coupon_claim', body.claim);
      couponResult.dataset.state = 'active';
      couponResult.innerHTML = `<strong>25% founding access unlocked</strong><span>Use the secure activation link below to continue at ₦7,500. Availability is rechecked before payment.</span>`;
      document.querySelectorAll('[data-current-price]').forEach(node => node.textContent = '₦7,500');
      document.querySelector('[data-sticky-state]').textContent = '₦7,500 · COUPON ACTIVE';
      document.querySelectorAll('[data-purchase-link]').forEach(link => {
        link.href = `/checkout?claim=${encodeURIComponent(body.claim)}`;
        if (link.dataset.track === 'mid') link.firstChild.textContent = 'Activate for ₦7,500';
      });
      track('coupon_applied');
    } else {
      couponResult.dataset.state = 'standard';
      couponResult.innerHTML = `<strong>Founding coupons unavailable</strong><span>GRETEX OS is still available at ₦10,000.</span>`;
    }
  } catch {
    couponResult.hidden = false;
    couponResult.dataset.state = 'standard';
    couponResult.innerHTML = `<strong>Availability check paused</strong><span>We couldn't confirm coupon availability. The standard ₦10,000 release remains available.</span>`;
  } finally {
    couponButton.disabled = false;
    couponButton.firstChild.textContent = 'Check founding coupon availability ';
  }
}

const activity = document.querySelector('[data-activity]');
const dismissed = sessionStorage.getItem('gretex_activity_dismissed') === '1';
activity.querySelector('button').addEventListener('click', () => {
  activity.hidden = true;
  sessionStorage.setItem('gretex_activity_dismissed', '1');
});
if (!dismissed) loadActivity();

async function loadActivity() {
  try {
    const response = await fetch('/api/activity/recent', { headers: { Accept: 'application/json' } });
    const body = await response.json();
    if (!response.ok || !body.activity?.length) return;
    let index = Number(sessionStorage.getItem('gretex_activity_index') || 0) % body.activity.length;
    const present = () => {
      if (sessionStorage.getItem('gretex_activity_dismissed') === '1') return;
      const event = body.activity[index];
      activity.querySelectorAll('[data-event-content]').forEach(node => node.remove());
      const content = document.createElement('div');
      content.dataset.eventContent = '';
      const label = document.createElement('span');
      label.textContent = event.type === 'PURCHASE' ? 'GRETEX OS ACTIVATED' : event.type === 'RESULT' ? 'GRETEX RESULT' : 'VERIFIED PROOF';
      const message = document.createElement('strong');
      message.textContent = event.message;
      content.append(label, message);
      activity.prepend(content);
      activity.hidden = false;
      index = (index + 1) % body.activity.length;
      sessionStorage.setItem('gretex_activity_index', String(index));
      if (!reducedMotion) setTimeout(() => { activity.hidden = true; }, 6000);
    };
    setTimeout(present, 10000);
    if (!reducedMotion) setInterval(present, 36000);
  } catch {}
}

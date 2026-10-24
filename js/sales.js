import { track } from './analytics.js';
import { initShared } from './shared.js';

initShared({ activity: false });
track('sales_view');

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const stateLabels = ['Stuck', 'Structured', 'Moving', 'Measured', 'Done'];
const nextLabels = ['Undefined', 'Milestones set', 'Write checkout page', 'Review progress', 'Complete'];
const progressValues = [0, 32, 58, 76, 100];
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

const revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
  if (entry.isIntersecting) {
    entry.target.classList.add('is-visible');
    revealObserver.unobserve(entry.target);
  }
}), { threshold: .16, rootMargin: '0px 0px -8% 0px' });
document.querySelectorAll('[data-reveal]').forEach(node => reducedMotion ? node.classList.add('is-visible') : revealObserver.observe(node));

const nav = document.querySelector('[data-sales-nav]');
const navLinks = [...nav.querySelectorAll('nav a')];
const navTargets = navLinks.map(link => document.querySelector(link.hash)).filter(Boolean);
const navObserver = new IntersectionObserver(entries => entries.forEach(entry => {
  if (!entry.isIntersecting) return;
  navLinks.forEach(link => link.classList.toggle('is-active', link.hash === `#${entry.target.id}`));
}), { rootMargin: '-32% 0px -58% 0px' });
navTargets.forEach(section => navObserver.observe(section));

document.querySelectorAll('[data-diagnosis]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-diagnosis]').forEach(item => item.classList.toggle('is-active', item === button));
  const [problem, response] = button.dataset.diagnosis.split('|');
  document.querySelector('[data-diagnosis-problem]').textContent = problem;
  document.querySelector('[data-diagnosis-response]').textContent = response;
  track('diagnosis_select');
}));

const cycleSection = document.querySelector('[data-cycle-section]');
const cycleObserver = new IntersectionObserver(([entry]) => {
  if (entry.isIntersecting) cycleSection.classList.add('is-broken');
}, { threshold: .45 });
cycleObserver.observe(cycleSection);

const productDemo = document.querySelector('[data-product-demo]');
const demoSteps = [...productDemo.querySelectorAll('.processing-rail span')];
const demoObserver = new IntersectionObserver(([entry]) => {
  if (!entry.isIntersecting) return;
  productDemo.classList.add('is-processed');
  if (!reducedMotion) demoSteps.forEach((step, index) => setTimeout(() => step.classList.add('is-active'), index * 260));
  demoObserver.unobserve(productDemo);
}, { threshold: .42 });
demoObserver.observe(productDemo);

const stackTotals = [25, 40, 55, 65, 65, 90].map(value => value * 1000);
const offerCards = [...document.querySelectorAll('[data-offer-card]')];
const stackTotal = document.querySelector('[data-stack-total]');
const stackFill = document.querySelector('[data-stack-fill]');
const stackCount = document.querySelector('[data-stack-count]');
let currentStack = 25 * 1000;
function animateStack(next) {
  const start = currentStack;
  const started = performance.now();
  const render = now => {
    const progress = reducedMotion ? 1 : Math.min(1, (now - started) / 520);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = Math.round(start + (next - start) * eased);
    stackTotal.textContent = `₦${value.toLocaleString('en-NG')}`;
    if (progress < 1) requestAnimationFrame(render); else currentStack = next;
  };
  requestAnimationFrame(render);
}
function activateOffer(card) {
  const index = Number(card.dataset.stackIndex);
  offerCards.forEach(item => item.classList.toggle('is-active', item === card));
  stackCount.textContent = String(index + 1).padStart(2, '0');
  stackFill.style.width = `${((index + 1) / offerCards.length) * 100}%`;
  animateStack(stackTotals[index]);
}
offerCards.forEach(card => {
  card.addEventListener('click', () => activateOffer(card));
  card.addEventListener('focus', () => activateOffer(card));
});
const offerObserver = new IntersectionObserver(entries => entries.forEach(entry => {
  if (entry.isIntersecting) activateOffer(entry.target);
}), { threshold: .62, rootMargin: '-10% 0px -25% 0px' });
offerCards.forEach(card => offerObserver.observe(card));

const labButtons = [...document.querySelectorAll('[data-lab-day]')];
labButtons.forEach(button => button.addEventListener('click', () => {
  labButtons.forEach(item => item.classList.toggle('is-active', item === button));
  const day = Number(button.dataset.labDay);
  document.querySelector('[data-lab-current]').textContent = `Day ${day}`;
  document.querySelector('[data-lab-status]').textContent = button.querySelector('span').textContent;
  document.querySelector('[data-lab-progress]').style.width = `${(day / 30) * 100}%`;
  document.querySelectorAll('.days span').forEach((node, index) => node.classList.toggle('is-complete', index < day));
}));

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
labButtons[0]?.click();

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
    if (body.expiresAt) startCountdown(body.expiresAt);
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

const releaseBar = document.querySelector('[data-release-bar]');
let countdownTimer;
function startCountdown(expiresAt) {
  const deadline = Date.parse(expiresAt);
  if (!Number.isFinite(deadline) || deadline <= Date.now()) return;
  releaseBar.hidden = false;
  const tick = () => {
    const remaining = Math.max(0, deadline - Date.now());
    const daysLeft = Math.floor(remaining / 86400000);
    const hoursLeft = Math.floor((remaining % 86400000) / 3600000);
    const minutesLeft = Math.floor((remaining % 3600000) / 60000);
    document.querySelector('[data-countdown]').textContent = `${String(daysLeft).padStart(2, '0')}D : ${String(hoursLeft).padStart(2, '0')}H : ${String(minutesLeft).padStart(2, '0')}M`;
    if (remaining === 0) {
      clearInterval(countdownTimer);
      releaseBar.hidden = true;
    }
  };
  tick();
  countdownTimer = setInterval(tick, 30000);
}

const finalClose = document.querySelector('[data-final-close]');
const finalStatus = document.querySelector('[data-final-status]');
const finalObserver = new IntersectionObserver(([entry]) => {
  if (!entry.isIntersecting) return;
  const states = ['Moving', 'Done ✓'];
  if (reducedMotion) {
    finalStatus.textContent = states[1];
    finalClose.classList.add('is-complete');
  } else {
    states.forEach((state, index) => setTimeout(() => {
      finalStatus.textContent = state;
      if (index === states.length - 1) finalClose.classList.add('is-complete');
    }, 500 + (index * 850)));
  }
  finalObserver.unobserve(finalClose);
}, { threshold: .35 });
finalObserver.observe(finalClose);

const backTop = document.querySelector('[data-back-top]');
const scrollRing = document.querySelector('[data-scroll-ring]');
let scrollFrame = 0;
function renderScroll() {
  scrollFrame = 0;
  const maximum = document.documentElement.scrollHeight - innerHeight;
  const progress = maximum > 0 ? scrollY / maximum : 0;
  nav.classList.toggle('is-scrolled', scrollY > 40);
  backTop.classList.toggle('is-visible', scrollY > innerHeight * 1.25);
  scrollRing.style.strokeDashoffset = String(119.4 * (1 - progress));
}
addEventListener('scroll', () => {
  if (!scrollFrame) scrollFrame = requestAnimationFrame(renderScroll);
}, { passive: true });
renderScroll();
backTop.addEventListener('click', () => scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' }));

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

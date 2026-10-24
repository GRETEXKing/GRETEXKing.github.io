const allowed = new Set(['sales_view','cta_click','checkout_view','coupon_check','coupon_applied','payment_started','payment_success','payment_failed','welcome_verified','proof_view','faq_open']);

export function track(name, properties = {}) {
  if (!allowed.has(name)) return;
  const safe = {};
  if (typeof properties.location === 'string') safe.location = properties.location.slice(0, 40);
  if (typeof properties.reason === 'string') safe.reason = properties.reason.slice(0, 40);
  document.dispatchEvent(new CustomEvent('gretex:analytics', { detail: { name, ...safe } }));
}

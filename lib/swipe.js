/** Ponto real do evento. No touchend, `touches` está vazio — usar changedTouches. */
export function pointFromEvent(e) {
  if (!e) return null;
  const t = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]);
  if (t && typeof t.clientX === 'number') return { x: t.clientX, y: t.clientY };
  if (typeof e.clientX === 'number' && typeof e.clientY === 'number') {
    return { x: e.clientX, y: e.clientY };
  }
  return null;
}

/** Horizontal nítido acima do limiar. Rolagem (dy >= dx) não conta. */
export function swipeDirection(start, end, threshold) {
  if (!start || !end) return null;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (Math.abs(dx) < threshold) return null;
  if (Math.abs(dx) <= Math.abs(dy)) return null;
  return dx < 0 ? 'left' : 'right';
}

export function isInteractiveTarget(el) {
  if (!el) return false;
  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.tagName === 'BUTTON') {
    return true;
  }
  if (el.isContentEditable) return true;
  if (typeof el.closest === 'function') {
    return !!el.closest('input, textarea, select, button, a, [contenteditable="true"]');
  }
  return false;
}

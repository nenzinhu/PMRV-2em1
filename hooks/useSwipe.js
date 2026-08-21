'use client';

import { useEffect, useRef } from 'react';

export function useSwipe({ onSwipeLeft, onSwipeRight, threshold = 60, preventScrollOnSwipe = false } = {}) {
  const start = useRef({ x: 0, y: 0 });
  const moving = useRef(false);

  useEffect(() => {
    function getClientX(e) {
      if (typeof TouchEvent !== 'undefined' && e instanceof TouchEvent && e.touches && e.touches[0]) {
        return e.touches[0].clientX;
      }
      return e.clientX || 0;
    }

    function onPointerDown(e) {
      start.current = { x: getClientX(e), y: e.clientY || 0 };
      moving.current = false;
    }

    function onPointerMove(e) {
      if (!moving.current && start.current.x !== 0) {
        const dx = Math.abs(getClientX(e) - start.current.x);
        const dy = Math.abs((e.clientY || 0) - start.current.y);
        if (dx > dy && dx > 10) moving.current = true;
      }
      if (moving.current && preventScrollOnSwipe) e.preventDefault();
    }

    function onPointerUp(e) {
      if (!moving.current) return;
      const dx = getClientX(e) - start.current.x;
      if (Math.abs(dx) >= threshold) {
        if (dx < 0) onSwipeLeft && onSwipeLeft();
        else onSwipeRight && onSwipeRight();
      }
      moving.current = false;
    }

    const node = typeof window !== 'undefined' ? window : null;
    if (!node) return;

    node.addEventListener('touchstart', onPointerDown, { passive: true });
    node.addEventListener('touchmove', onPointerMove, { passive: !preventScrollOnSwipe });
    node.addEventListener('touchend', onPointerUp);
    node.addEventListener('touchcancel', onPointerUp);

    node.addEventListener('mousedown', onPointerDown);
    node.addEventListener('mousemove', onPointerMove);
    node.addEventListener('mouseup', onPointerUp);
    node.addEventListener('mouseleave', () => { moving.current = false; });

    return () => {
      node.removeEventListener('touchstart', onPointerDown);
      node.removeEventListener('touchmove', onPointerMove);
      node.removeEventListener('touchend', onPointerUp);
      node.removeEventListener('touchcancel', onPointerUp);
      node.removeEventListener('mousedown', onPointerDown);
      node.removeEventListener('mousemove', onPointerMove);
      node.removeEventListener('mouseup', onPointerUp);
      node.removeEventListener('mouseleave', () => { moving.current = false; });
    };
  }, [onSwipeLeft, onSwipeRight, threshold, preventScrollOnSwipe]);
}

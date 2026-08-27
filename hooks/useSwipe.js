'use client';

import { useEffect, useRef } from 'react';
import { isInteractiveTarget, pointFromEvent, swipeDirection } from '@/lib/swipe';

export function useSwipe({
  onSwipeLeft,
  onSwipeRight,
  threshold = 140,
  preventScrollOnSwipe = false,
  allowMouse = false,
  enabled = true,
} = {}) {
  const start = useRef(null);
  const last = useRef(null);
  const moving = useRef(false);
  const leftRef = useRef(onSwipeLeft);
  const rightRef = useRef(onSwipeRight);
  leftRef.current = onSwipeLeft;
  rightRef.current = onSwipeRight;

  useEffect(() => {
    if (!enabled) return;

    function onPointerDown(e) {
      if (isInteractiveTarget(e.target)) {
        start.current = null;
        return;
      }
      const p = pointFromEvent(e);
      if (!p) return;
      start.current = p;
      last.current = p;
      moving.current = false;
    }

    function onPointerMove(e) {
      if (!start.current) return;
      const p = pointFromEvent(e);
      if (!p) return;
      last.current = p;
      const dx = Math.abs(p.x - start.current.x);
      const dy = Math.abs(p.y - start.current.y);
      if (dx > dy && dx > 10) moving.current = true;
      if (moving.current && preventScrollOnSwipe) e.preventDefault();
    }

    function onPointerUp(e) {
      if (!start.current || !moving.current) {
        start.current = null;
        moving.current = false;
        return;
      }
      const end = pointFromEvent(e) || last.current;
      const dir = swipeDirection(start.current, end, threshold);
      start.current = null;
      last.current = null;
      moving.current = false;
      if (dir === 'left') leftRef.current && leftRef.current();
      if (dir === 'right') rightRef.current && rightRef.current();
    }

    const node = window;
    node.addEventListener('touchstart', onPointerDown, { passive: true });
    node.addEventListener('touchmove', onPointerMove, { passive: !preventScrollOnSwipe });
    node.addEventListener('touchend', onPointerUp);
    node.addEventListener('touchcancel', onPointerUp);

    if (allowMouse) {
      node.addEventListener('mousedown', onPointerDown);
      node.addEventListener('mousemove', onPointerMove);
      node.addEventListener('mouseup', onPointerUp);
    }

    return () => {
      node.removeEventListener('touchstart', onPointerDown);
      node.removeEventListener('touchmove', onPointerMove);
      node.removeEventListener('touchend', onPointerUp);
      node.removeEventListener('touchcancel', onPointerUp);
      if (allowMouse) {
        node.removeEventListener('mousedown', onPointerDown);
        node.removeEventListener('mousemove', onPointerMove);
        node.removeEventListener('mouseup', onPointerUp);
      }
    };
  }, [threshold, preventScrollOnSwipe, allowMouse, enabled]);
}

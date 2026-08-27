'use client';

import { useRef } from 'react';
import { gsap, prefersReducedMotion, registerGsap, useGSAP } from '@/lib/gsap-register';

registerGsap();

export default function PageStage({ aba, children }) {
  const stageRef = useRef(null);

  useGSAP(
    () => {
      const el = stageRef.current;
      if (!el) return;
      if (prefersReducedMotion()) {
        gsap.set(el, { autoAlpha: 1, y: 0 });
        return;
      }

      gsap.fromTo(
        el,
        { autoAlpha: 0, y: 22 },
        { autoAlpha: 1, y: 0, duration: 0.48, ease: 'pmrv' }
      );

      const cards = el.querySelectorAll('.ds-card, .ds-card-danger, .estilo-glass');
      if (cards.length) {
        gsap.from(cards, {
          autoAlpha: 0,
          y: 18,
          stagger: 0.07,
          duration: 0.42,
          delay: 0.06,
          ease: 'pmrv',
        });
      }
    },
    { dependencies: [aba], scope: stageRef, revertOnUpdate: true }
  );

  return (
    <div ref={stageRef} className="page-stage">
      {children}
    </div>
  );
}

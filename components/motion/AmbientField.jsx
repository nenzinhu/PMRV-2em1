'use client';

import { useRef } from 'react';
import { gsap, Observer, prefersReducedMotion, registerGsap, useGSAP } from '@/lib/gsap-register';

registerGsap();

export default function AmbientField() {
  const rootRef = useRef(null);
  const orbARef = useRef(null);
  const orbBRef = useRef(null);
  const glowRef = useRef(null);

  useGSAP(
    (_, contextSafe) => {
      if (prefersReducedMotion()) return;

      const a = orbARef.current;
      const b = orbBRef.current;
      const glow = glowRef.current;
      if (!a || !b || !glow) return;

      gsap.to(a, {
        x: 48,
        y: 36,
        scale: 1.12,
        duration: 9,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });
      gsap.to(b, {
        x: -40,
        y: -28,
        scale: 1.08,
        duration: 11,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      const xTo = gsap.quickTo(glow, 'x', { duration: 0.8, ease: 'power3' });
      const yTo = gsap.quickTo(glow, 'y', { duration: 0.8, ease: 'power3' });

      const observer = Observer.create({
        target: document.documentElement,
        type: 'pointer',
        onMove: contextSafe((self) => {
          const x = (self.x / window.innerWidth - 0.5) * 80;
          const y = (self.y / window.innerHeight - 0.5) * 80;
          xTo(x);
          yTo(y);
        }),
      });

      return () => observer.kill();
    },
    { scope: rootRef }
  );

  return (
    <div ref={rootRef} className="ambient-field" aria-hidden="true">
      <div ref={orbARef} className="ambient-orb ambient-orb-a" />
      <div ref={orbBRef} className="ambient-orb ambient-orb-b" />
      <div ref={glowRef} className="ambient-glow" />
      <div className="ambient-grid" />
      <div className="ambient-vignette" />
    </div>
  );
}

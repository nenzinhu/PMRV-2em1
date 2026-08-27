'use client';

import { useRef } from 'react';
import { gsap, Observer, prefersReducedMotion, registerGsap, useGSAP } from '@/lib/gsap-register';

registerGsap();

export default function BrandLockup() {
  const wrapRef = useRef(null);
  const logoRef = useRef(null);
  const titleRef = useRef(null);
  const shineRef = useRef(null);

  useGSAP(
    (_, contextSafe) => {
      const wrap = wrapRef.current;
      const logo = logoRef.current;
      const title = titleRef.current;
      if (!wrap || !logo || !title) return;

      if (prefersReducedMotion()) return;

      gsap.fromTo(
        title,
        { y: 8, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: 'pmrv' }
      );
      gsap.fromTo(
        logo,
        { scale: 0.78, opacity: 0, rotation: -8 },
        { scale: 1, opacity: 1, rotation: 0, duration: 0.55, ease: 'pmrv' }
      );
      if (shineRef.current) {
        gsap.fromTo(
          shineRef.current,
          { xPercent: -130 },
          { xPercent: 180, duration: 1.7, delay: 0.15, ease: 'power2.inOut' }
        );
      }

      const rotTo = gsap.quickTo(logo, 'rotationY', { duration: 0.45, ease: 'power3' });
      const yTo = gsap.quickTo(logo, 'y', { duration: 0.45, ease: 'power3' });

      const observer = Observer.create({
        target: wrap,
        type: 'pointer',
        onMove: contextSafe((self) => {
          const rect = wrap.getBoundingClientRect();
          if (!rect.width) return;
          const nx = (self.x - rect.left) / rect.width - 0.5;
          rotTo(nx * 18);
          yTo(nx * -2);
        }),
      });

      const onLeave = contextSafe(() => {
        rotTo(0);
        yTo(0);
      });
      wrap.addEventListener('pointerleave', onLeave);

      return () => {
        observer.kill();
        wrap.removeEventListener('pointerleave', onLeave);
      };
    },
    { scope: wrapRef }
  );

  return (
    <div ref={wrapRef} className="brand-lockup flex items-center gap-2 sm:gap-3 min-w-0 flex-1 pr-2">
      <div className="brand-logo-wrap shrink-0" style={{ perspective: '420px' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={logoRef}
          src="/logo-pmrv-sc.png"
          alt="Brasão do Comando de Polícia Militar Rodoviária de Santa Catarina"
          className="brand-logo will-change-transform"
        />
      </div>
      <div className="relative min-w-0">
        <div ref={shineRef} className="brand-shine" aria-hidden="true" />
        <h1 ref={titleRef} className="brand-title">
          <span className="brand-title-text">POLICIA MILITAR RODOVIARIA ESTADUAL DE SC</span>
        </h1>
      </div>
    </div>
  );
}

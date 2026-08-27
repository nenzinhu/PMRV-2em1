'use client';

import { useRef } from 'react';
import { gsap, Observer, SplitText, prefersReducedMotion, registerGsap, useGSAP } from '@/lib/gsap-register';

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

      const split = SplitText.create(title, { type: 'chars', aria: 'auto' });
      gsap.from(split.chars, {
        y: 12,
        autoAlpha: 0,
        stagger: 0.028,
        duration: 0.42,
        ease: 'pmrv',
      });
      gsap.from(logo, {
        scale: 0.72,
        autoAlpha: 0,
        rotation: -10,
        duration: 0.55,
        ease: 'pmrv',
      });
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
    <div ref={wrapRef} className="brand-lockup flex items-center gap-2 sm:gap-3">
      <div className="brand-logo-wrap" style={{ perspective: '420px' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={logoRef}
          src="/logo-pmrv-sc.svg"
          alt="Brasão PMRV-SC"
          className="w-8 h-8 sm:w-10 sm:h-10 rounded-md shadow-sm will-change-transform"
        />
      </div>
      <div className="leading-tight relative overflow-hidden">
        <div ref={shineRef} className="brand-shine" aria-hidden="true" />
        <h1
          ref={titleRef}
          className="text-sm sm:text-base md:text-lg font-mono font-semibold tracking-tight uppercase text-white"
        >
          Relato Policial
        </h1>
        <p className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-white/80">
          PMRV-SC
        </p>
      </div>
    </div>
  );
}

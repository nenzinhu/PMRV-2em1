'use client';

import { useRef } from 'react';
import { gsap, prefersReducedMotion, registerGsap, useGSAP } from '@/lib/gsap-register';

registerGsap();

export default function Stepper({ currentStep, ehVitima }) {
  const stepsMap = ehVitima ? [1, 2, 3, 4, 5] : [1, 2, 3, 5];
  const activeIndex = stepsMap.indexOf(currentStep);
  const totalActive = stepsMap.length;
  const ratio = totalActive <= 1 ? 1 : activeIndex / (totalActive - 1);
  const barRef = useRef(null);
  const rowRef = useRef(null);

  const dots = [
    { n: 1, label: '1', show: true },
    { n: 2, label: '2', show: true },
    { n: 3, label: '3', show: true },
    { n: 4, label: '4', show: ehVitima },
    { n: 5, label: '✓', show: true },
  ];

  function dotClass(n) {
    if (n === currentStep) return 'bg-pmrv border-pmrv shadow-[0_0_0_4px_rgba(0,132,72,0.15)]';
    if (stepsMap.indexOf(n) !== -1 && stepsMap.indexOf(n) < activeIndex)
      return 'bg-step-done border-charcoal';
    return 'bg-step-idle border-charcoal';
  }

  useGSAP(
    () => {
      const bar = barRef.current;
      if (!bar) return;
      if (prefersReducedMotion()) {
        gsap.set(bar, { scaleX: ratio });
        return;
      }
      gsap.to(bar, { scaleX: ratio, duration: 0.45, ease: 'pmrv' });
      const activeDot = rowRef.current?.querySelector('[data-step-active="true"]');
      if (activeDot) {
        gsap.fromTo(activeDot, { scale: 0.86 }, { scale: 1, duration: 0.35, ease: 'back.out(1.4)' });
      }
    },
    { dependencies: [currentStep, ehVitima, ratio], scope: rowRef }
  );

  return (
    <div className="max-w-xl mx-auto px-3 sm:px-6 py-4 sm:py-5">
      <div ref={rowRef} className="flex items-center justify-between relative">
        <div className="absolute left-0 top-1/2 w-full h-0.5 bg-step-idle -translate-y-1/2 z-0" />
        <div className="absolute left-0 top-1/2 w-full h-0.5 -translate-y-1/2 z-0 overflow-hidden">
          <div
            ref={barRef}
            id="stepper-progress"
            className="h-full w-full bg-pmrv origin-left"
            style={{ transform: `scaleX(${ratio})` }}
            aria-hidden="true"
          />
        </div>
        {dots
          .filter((d) => d.show)
          .map((d) => (
            <div
              key={d.n}
              data-step-active={d.n === currentStep ? 'true' : 'false'}
              className={`step-dot z-10 w-8 h-8 sm:w-9 sm:h-9 ${dotClass(d.n)} flex items-center justify-center font-mono font-semibold text-xs sm:text-sm border-2`}
            >
              {d.label}
            </div>
          ))}
      </div>
    </div>
  );
}

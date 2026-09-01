'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { showToast } from '@/components/Toast';
import { Flip, gsap, prefersReducedMotion, registerGsap, useGSAP } from '@/lib/gsap-register';

registerGsap();

const TABS = [
  { key: 'envolvidos', label: 'Envolvidos', icon: '👥' },
  { key: 'relato', label: 'Relato', icon: '📝' },
  { key: 'resumo', label: 'Resumo', icon: '📋' },
  { key: 'salvar', label: 'Salvar', icon: '💾' },
];

function tabAriaLabel(tab) {
  return tab.key === 'resumo' ? 'Aba Resumo Dinâmico' : `Aba ${tab.label}`;
}

function placePill(row, pill, active) {
  if (!row || !pill) return;
  const el = row.querySelector(`[data-tab="${active}"]`);
  if (!el || !el.offsetWidth) return;
  pill.style.left = `${el.offsetLeft}px`;
  pill.style.width = `${el.offsetWidth}px`;
}

export default function MobileNav({ active, onChange }) {
  const [pressing, setPressing] = useState(null);
  const [lastActive, setLastActive] = useState(active);
  const mobileRowRef = useRef(null);
  const mobilePillRef = useRef(null);
  const desktopRowRef = useRef(null);
  const desktopPillRef = useRef(null);
  const firstFlip = useRef(true);

  // Navegação por teclado (setas direita/esquerda, Home, End) — heurística de acessibilidade
  const onTablistKeyDown = useCallback(
    (e) => {
      const idx = TABS.findIndex((t) => t.key === active);
      let next = null;
      if (e.key === 'ArrowRight') next = TABS[(idx + 1) % TABS.length].key;
      else if (e.key === 'ArrowLeft') next = TABS[(idx - 1 + TABS.length) % TABS.length].key;
      else if (e.key === 'Home') next = TABS[0].key;
      else if (e.key === 'End') next = TABS[TABS.length - 1].key;
      else return;
      e.preventDefault();
      onChange(next);
      document.querySelector(`[data-tab="${next}"]`)?.focus();
    },
    [active, onChange]
  );

  const tabProps = (tab) => {
    const isActive = active === tab.key;
    return {
      role: 'tab',
      id: `pmrv-tab-${tab.key}`,
      'aria-selected': isActive,
      'aria-controls': 'pmrv-tabpanel',
      tabIndex: isActive ? 0 : -1,
    };
  };

  const measure = useCallback(() => {
    placePill(mobileRowRef.current, mobilePillRef.current, active);
    placePill(desktopRowRef.current, desktopPillRef.current, active);
  }, [active]);

  useGSAP(
    () => {
      const skipMotion = prefersReducedMotion() || firstFlip.current;
      const mobileState = mobilePillRef.current ? Flip.getState(mobilePillRef.current) : null;
      const desktopState = desktopPillRef.current ? Flip.getState(desktopPillRef.current) : null;
      measure();
      if (firstFlip.current) {
        firstFlip.current = false;
        return;
      }
      if (skipMotion) return;
      if (mobileState && mobilePillRef.current) {
        Flip.from(mobileState, { duration: 0.42, ease: 'pmrv' });
      }
      if (desktopState && desktopPillRef.current) {
        Flip.from(desktopState, { duration: 0.42, ease: 'pmrv' });
      }
    },
    { dependencies: [active, measure] }
  );

  useEffect(() => {
    const onResize = () => measure();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, [measure]);

  useEffect(() => {
    if (active !== lastActive) {
      setLastActive(active);
      const tab = TABS.find((t) => t.key === active);
      if (tab) showToast(`${tab.label}`, 'info', 1200);
      const icon = document.querySelector(`[data-tab="${active}"] .tab-icon, [data-desktop-tab="${active}"] .tab-icon`);
      if (icon && !prefersReducedMotion()) {
        gsap.fromTo(icon, { y: 6, scale: 0.86 }, { y: 0, scale: 1, duration: 0.35, ease: 'back.out(1.5)' });
      }
    }
  }, [active, lastActive]);

  return (
    <div id="pmrv-tabs">
      <nav className="hidden md:block border-t border-white/15" aria-label="Navegação principal" role="tablist" aria-orientation="horizontal" onKeyDown={onTablistKeyDown}>
        <div className="mx-auto max-w-5xl px-4">
          <div ref={desktopRowRef} className="relative flex items-center gap-1">
            <div ref={desktopPillRef} className="nav-pill nav-pill-desktop" aria-hidden="true" />
            {TABS.map((tab) => {
              const isActive = active === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  data-desktop-tab={tab.key}
                  data-tab={tab.key}
                  {...tabProps(tab)}
                  aria-label={tabAriaLabel(tab)}
                  onClick={() => onChange(tab.key)}
                  className={`relative z-10 flex items-center gap-1.5 px-2.5 lg:px-4 py-2.5 text-[11px] lg:text-xs font-mono font-semibold uppercase tracking-wider whitespace-nowrap transition-colors ${
                    isActive ? 'text-white font-bold' : 'text-white/85 hover:text-white'
                  }`}
                >
                  <span className="tab-icon" aria-hidden="true">{tab.icon}</span>
                  <span>
                    {tab.label}
                    {tab.key === 'resumo' ? ' Dinâmico' : ''}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 nav-dock"
        aria-label="Navegação no celular"
        role="tablist"
        aria-orientation="horizontal"
        onKeyDown={onTablistKeyDown}
      >
        <div className="mx-auto max-w-md">
          <div ref={mobileRowRef} className="relative flex items-center justify-between px-2 pb-2 pt-1">
            <div ref={mobilePillRef} className="nav-pill" aria-hidden="true" />
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                data-tab={tab.key}
                {...tabProps(tab)}
                aria-label={tabAriaLabel(tab)}
                onClick={() => onChange(tab.key)}
                onTouchStart={() => setPressing(tab.key)}
                onTouchEnd={() => setPressing(null)}
                onMouseDown={() => setPressing(tab.key)}
                onMouseUp={() => setPressing(null)}
                onMouseLeave={() => setPressing(null)}
                className={`relative z-10 flex-1 flex flex-col items-center gap-0.5 py-2 text-[11px] font-mono font-semibold uppercase tracking-wide transition-colors ${
                  active === tab.key ? 'text-white font-bold' : 'text-white/75 hover:text-white/95'
                } ${pressing === tab.key ? 'tab-press' : ''}`}
              >
                <span className="tab-icon text-lg leading-none" aria-hidden="true">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
}

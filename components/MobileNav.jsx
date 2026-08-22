'use client';

import { useState, useEffect, useCallback } from 'react';
import { showToast } from '@/components/Toast';

const TABS = [
  { key: 'envolvidos', label: 'Envolvidos', icon: '👥' },
  { key: 'relato', label: 'Relato', icon: '📝' },
  { key: 'resumo', label: 'Resumo', icon: '📋' },
];

export default function MobileNav({ active, onChange }) {
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const [pressing, setPressing] = useState(null);
  const [lastActive, setLastActive] = useState(active);

  const measure = useCallback(() => {
    const el = document.querySelector(`[data-tab="${active}"]`);
    if (!el) return;
    setIndicator({
      left: el.offsetLeft,
      width: el.offsetWidth,
    });
  }, [active]);

  useEffect(() => {
    measure();
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
    }
  }, [active, lastActive]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-charcoal/90 backdrop-blur-md border-t border-white/10" aria-label="Navegação principal">
      <div className="mx-auto max-w-md">
        <div className="relative flex items-center justify-between px-2 pb-2 pt-1">
          <div
            className="absolute top-1 bottom-1 rounded-full bg-white/10 transition-all duration-300 ease-out"
            style={{
              left: indicator.left,
              width: indicator.width,
            }}
            aria-hidden="true"
          />
          {TABS.map((tab) => (
            <button
              key={tab.key}
              data-tab={tab.key}
              aria-label={`Aba ${tab.label}`}
              aria-pressed={active === tab.key}
              onClick={() => onChange(tab.key)}
              onTouchStart={() => setPressing(tab.key)}
              onTouchEnd={() => setPressing(null)}
              onMouseDown={() => setPressing(tab.key)}
              onMouseUp={() => setPressing(null)}
              onMouseLeave={() => setPressing(null)}
              className={`relative z-10 flex-1 flex flex-col items-center gap-0.5 py-2 text-[11px] font-mono font-semibold uppercase tracking-wider transition-colors duration-200 ${
                active === tab.key ? 'text-white' : 'text-white/60 hover:text-white/80'
              } ${pressing === tab.key ? 'tab-press' : ''}`}
            >
              <span className="text-lg leading-none" aria-hidden="true">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}

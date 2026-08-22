'use client';

import { useEffect, useState } from 'react';

let toastCounter = 0;

export function showToast(message, type = 'info', duration = 3000) {
  const id = ++toastCounter;
  const event = new CustomEvent('pmrv-toast', { detail: { id, message, type, duration } });
  window.dispatchEvent(event);
}

export default function Toast() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    function onToast(e) {
      const { id, message, type, duration } = e.detail;
      setToasts((prev) => [...prev, { id, message, type }]);
      if (duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, duration);
      }
    }
    window.addEventListener('pmrv-toast', onToast);
    return () => window.removeEventListener('pmrv-toast', onToast);
  }, []);

  if (!toasts.length) return null;

  const palette = {
    info: 'bg-pmrv text-white border-pmrv',
    success: 'bg-green-600 text-white border-green-700',
    error: 'bg-brick text-white border-brick',
    warning: 'bg-gold text-pmrv border-gold',
  };

  return (
    <div className="fixed bottom-24 left-0 right-0 z-[70] flex flex-col items-center gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto px-4 py-2 border-2 shadow-[4px_4px_0_#2B2B2B] font-mono text-xs uppercase tracking-wider animate-slideUp ${palette[t.type] || palette.info}`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}

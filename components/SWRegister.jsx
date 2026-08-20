'use client';

import { useEffect } from 'react';

export default function SWRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => console.error(err));
    }

    function updateOnlineStatus() {
      const indicator = document.getElementById('offline-indicator');
      if (indicator) indicator.classList.toggle('hidden', navigator.onLine);
    }

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);
  return null;
}

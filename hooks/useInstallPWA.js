'use client';

import { useEffect, useState } from 'react';

export function useInstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [supportsInstall, setSupportsInstall] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator && window.navigator.standalone === true);
    setIsStandalone(standalone);
    setIsInstalled(standalone);

    const onBeforeInstall = (e) => {
      if (e?.target?.tagName === 'BUTTON') return;
      e?.preventDefault?.();
      setDeferredPrompt(e);
      setSupportsInstall(true);
    };

    const onAppInstalled = () => {
      setDeferredPrompt(null);
      setSupportsInstall(false);
      setIsInstalled(true);
      setIsStandalone(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    try {
      const result = await deferredPrompt.userChoice;
      if (result?.outcome === 'accepted') {
        setIsInstalled(true);
      }
    } catch {
      // ignore
    }
    setDeferredPrompt(null);
    setSupportsInstall(false);
  };

  return { install, isInstalled, isStandalone, supportsInstall };
}

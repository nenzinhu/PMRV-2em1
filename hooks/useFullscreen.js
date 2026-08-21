'use client';

import { useEffect, useRef, useState } from 'react';

export function useFullscreen() {
  const elRef = useRef(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onFullscreenChange = () => {
      const full = !!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement);
      setActive(full);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    document.addEventListener('msfullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
      document.removeEventListener('msfullscreenchange', onFullscreenChange);
    };
  }, []);

  const enter = async () => {
    const el = elRef.current;
    if (!el) return;
    try {
      if (el.requestFullscreen) await el.requestFullscreen();
      else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
      else if (el.msRequestFullscreen) await el.msRequestFullscreen();
    } catch (e) {
      console.error(e);
    }
  };

  const exit = async () => {
    try {
      if (document.exitFullscreen) await document.exitFullscreen();
      else if (document.webkitExitFullscreen) await document.webkitExitFullscreen();
      else if (document.msExitFullscreen) await document.msExitFullscreen();
    } catch (e) {
      console.error(e);
    }
  };

  const toggle = async () => {
    if (active) await exit();
    else await enter();
  };

  return { elRef, active, toggle };
}

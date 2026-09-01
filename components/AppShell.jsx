'use client';

import { useState, useEffect, useCallback } from 'react';
import RelatoPolicial from '@/components/RelatoPolicial';
import Envolvidos from '@/components/Envolvidos';
import ResumoDinamica from '@/components/ResumoDinamica';
import SalvarOcorrencia from '@/components/SalvarOcorrencia';
import ThemeConfig from '@/components/theme/ThemeConfig';
import MobileNav from '@/components/MobileNav';
import AIProviderPicker from '@/components/AIProviderPicker';
import Toast from '@/components/Toast';
import AmbientField from '@/components/motion/AmbientField';
import BrandLockup from '@/components/motion/BrandLockup';
import PageStage from '@/components/motion/PageStage';
import { useFullscreen } from '@/hooks/useFullscreen';
import { useInstallPWA } from '@/hooks/useInstallPWA';
import { useGpsLocation } from '@/hooks/useGpsLocation';
import { ABAS, abaFromSearchParam } from '@/lib/aba';
import { aplicarDinamicaNoRascunho } from '@/lib/relato-draft';
import { gpsLocationLabel } from '@/lib/gps-label';

function syncAbaUrl(aba) {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.set('aba', aba);
  window.history.replaceState(window.history.state, '', url);
}

export default function AppShell({ initialAba = 'envolvidos' }) {
  const [aba, setAbaState] = useState(() => abaFromSearchParam(initialAba));
  const [themeOpen, setThemeOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { elRef, active: fsActive, toggle: toggleFs } = useFullscreen();
  const { install, supportsInstall, isInstalled, isStandalone } = useInstallPWA();
  const { gpsOn, gpsInfo, toggle: toggleGps } = useGpsLocation();

  const setAba = useCallback((next) => {
    const resolved = abaFromSearchParam(next);
    setAbaState(resolved);
    syncAbaUrl(resolved);
  }, []);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem('PMRV_THEME_CONFIG');
      if (raw) {
        const t = JSON.parse(raw);
        const root = document.documentElement;
        if (t.primary) root.style.setProperty('--ds-primary', t.primary);
        if (t.accent) root.style.setProperty('--ds-accent', t.accent);
        if (t.background) root.style.setProperty('--ds-bg', t.background);
        if (t.surface) root.style.setProperty('--ds-surface', t.surface);
        if (t.text) root.style.setProperty('--ds-text', t.text);
        if (t.mode === 'dark') root.classList.add('dark');
      }
    } catch {
      /* tema salvo inválido — mantém o padrão */
    }
    function onGpsToggle() {
      toggleGps();
    }
    function onNavigate(e) {
      const target = e.detail;
      if (target && ABAS.includes(target)) {
        setAba(target);
      }
    }
    function onSetDinamica(e) {
      const texto = e.detail;
      if (typeof texto === 'string') {
        aplicarDinamicaNoRascunho(texto);
        window.dispatchEvent(new CustomEvent('pmrv-relato-dinamica'));
        const el = document.getElementById('pmrv_dinamica_texto');
        if (el) {
          el.value = texto;
          el.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
    }

    window.addEventListener('gps-toggle', onGpsToggle);
    window.addEventListener('navigate-to', onNavigate);
    window.addEventListener('set-dinamica', onSetDinamica);

    return () => {
      window.removeEventListener('gps-toggle', onGpsToggle);
      window.removeEventListener('navigate-to', onNavigate);
      window.removeEventListener('set-dinamica', onSetDinamica);
    };
  }, [setAba, toggleGps]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('gps-change', {
        detail: gpsOn ? { ...(gpsInfo || {}), ligado: true } : { ligado: false },
      })
    );
  }, [gpsOn, gpsInfo]);

  const locationLabel = gpsLocationLabel(gpsInfo);
  const showLocation = gpsOn && !!locationLabel;

  return (
    <>
      <div ref={elRef} className="relative min-h-screen flex flex-col">
        <AmbientField />
        <header className="app-header text-white sticky top-0 z-50">
          <div className="relative mx-auto max-w-5xl flex justify-between items-center px-3 sm:px-4">
            <BrandLockup />
            <div className="flex items-center gap-1 sm:gap-2">
              {mounted && !gpsOn && (
                <button
                  type="button"
                  onClick={toggleGps}
                  className="header-chip cursor-pointer"
                  title="Ativar GPS"
                  aria-label="Ativar GPS"
                >
                  📍 GPS
                </button>
              )}
              {mounted && gpsOn && !showLocation && !gpsInfo?.erro && (
                <span className="header-chip">
                  📍 …
                </span>
              )}
              {mounted && showLocation && (
                <button
                  type="button"
                  onClick={() => {
                    const loc = locationLabel || '';
                    if (!loc) return;
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                      navigator.clipboard.writeText(loc).catch(() => {});
                    }
                  }}
                  className="header-chip max-w-[40vw] sm:max-w-xs cursor-pointer"
                  title="Toque para copiar a localização"
                  aria-label={`Copiar localização: ${locationLabel}`}
                >
                  <span className="truncate">📍 {locationLabel}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setThemeOpen(true)}
                className="header-chip"
                title="Personalizar tema"
                aria-label="Abrir personalização de tema"
              >
                🎨 Tema
              </button>
              <AIProviderPicker compact />
              {supportsInstall && !isInstalled && !isStandalone && (
                <button
                  type="button"
                  onClick={install}
                  className="header-chip"
                  title="Instalar o app"
                  aria-label="Instalar aplicativo"
                >
                  ⤓ Instalar
                </button>
              )}
              <button
                type="button"
                onClick={toggleFs}
                className="header-chip hidden sm:inline-flex"
                title={fsActive ? 'Sair da tela cheia' : 'Modo imersivo'}
                aria-label={fsActive ? 'Sair da tela cheia' : 'Entrar em modo imersivo'}
              >
                {fsActive ? '⛶' : '⛶'}
              </button>
            </div>
          </div>
          <MobileNav active={aba} onChange={setAba} />
        </header>

        <main className="relative z-10 w-full flex-1 pb-24 md:pb-0" role="main">
          <PageStage aba={aba}>
            {aba === 'envolvidos' ? (
              <Envolvidos gpsInfo={gpsOn ? gpsInfo : null} />
            ) : aba === 'relato' ? (
              <RelatoPolicial gpsOn={gpsOn} gpsInfo={gpsOn ? gpsInfo : null} />
            ) : aba === 'resumo' ? (
              <ResumoDinamica />
            ) : (
              <SalvarOcorrencia />
            )}
          </PageStage>
        </main>
      </div>

      {themeOpen && (
        <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={() => setThemeOpen(false)} aria-hidden="true" />
          <div className="relative w-full sm:max-w-lg max-h-[90vh] overflow-y-auto ds-card !rounded-t-2xl sm:!rounded-2xl animate-slideUp" role="dialog" aria-label="Personalizar tema" aria-modal="true">
            <ThemeConfig onClose={() => setThemeOpen(false)} />
          </div>
        </div>
      )}
      <Toast />
    </>
  );
}

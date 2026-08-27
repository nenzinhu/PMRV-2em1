'use client';

import { useState, useEffect, useCallback } from 'react';
import RelatoPolicial from '@/components/RelatoPolicial';
import Envolvidos from '@/components/Envolvidos';
import ResumoDinamica from '@/components/ResumoDinamica';
import ThemeConfig from '@/components/theme/ThemeConfig';
import MobileNav from '@/components/MobileNav';
import Toast from '@/components/Toast';
import { useFullscreen } from '@/hooks/useFullscreen';
import { useInstallPWA } from '@/hooks/useInstallPWA';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useGpsLocation } from '@/hooks/useGpsLocation';
import { abaFromSearchParam } from '@/lib/aba';
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
  const isMobile = useIsMobile();
  const { gpsOn, gpsInfo, toggle: toggleGps } = useGpsLocation();

  const setAba = useCallback((next) => {
    const resolved = abaFromSearchParam(next);
    setAbaState(resolved);
    syncAbaUrl(resolved);
  }, []);

  useEffect(() => {
    setMounted(true);
    function onGpsToggle() {
      toggleGps();
    }
    function onNavigate(e) {
      const target = e.detail;
      if (target && ['envolvidos', 'relato', 'resumo'].includes(target)) {
        setAba(target);
      }
    }
    function onSetDinamica(e) {
      const texto = e.detail;
      if (typeof texto === 'string') {
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
      <div ref={elRef} className="min-h-screen flex flex-col">
        <header className="text-white sticky top-0 z-50 border-b-[3px] border-brick" style={{ backgroundColor: 'var(--ds-primary)' }}>
          <div className="mx-auto max-w-5xl flex justify-between items-center px-3 sm:px-4">
            <div className="flex items-center gap-2 sm:gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-pmrv-sc.svg"
                alt="Brasão PMRV-SC"
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-md shadow-sm"
              />
              <div className="leading-tight">
                <h1 className="text-sm sm:text-base md:text-lg font-mono font-semibold tracking-tight uppercase text-white">
                  Relato Policial
                </h1>
                <p className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-white/80">
                  PMRV-SC
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              {mounted && !gpsOn && (
                <button
                  type="button"
                  onClick={toggleGps}
                  className="inline-flex items-center gap-1 bg-white/10 hover:bg-white/20 border border-white/30 text-white text-[10px] font-mono font-semibold uppercase tracking-wider px-2 py-1 rounded cursor-pointer"
                  title="Ativar GPS"
                  aria-label="Ativar GPS"
                >
                  📍 GPS
                </button>
              )}
              {mounted && gpsOn && !showLocation && !gpsInfo?.erro && (
                <span className="inline-flex items-center gap-1 bg-white/10 border border-white/30 text-white text-[10px] font-mono font-semibold uppercase tracking-wider px-2 py-1 rounded">
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
                  className="hidden sm:inline-flex items-center gap-1 max-w-xs bg-white/10 hover:bg-white/20 border border-white/30 text-white text-[10px] font-mono font-semibold uppercase tracking-wider px-2 py-1 rounded cursor-pointer"
                  title="Toque para copiar a localização"
                  aria-label={`Copiar localização: ${locationLabel}`}
                >
                  <span className="truncate">📍 {locationLabel}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setThemeOpen(true)}
                className="inline-flex items-center gap-1 bg-white/10 hover:bg-white/20 border border-white/30 text-white text-[10px] font-mono font-semibold uppercase tracking-wider px-2 py-1 rounded"
                title="Personalizar tema"
                aria-label="Abrir personalização de tema"
              >
                🎨 Tema
              </button>
              {supportsInstall && !isInstalled && !isStandalone && (
                <button
                  type="button"
                  onClick={install}
                  className="inline-flex items-center gap-1 bg-white/10 hover:bg-white/20 border border-white/30 text-white text-[10px] font-mono font-semibold uppercase tracking-wider px-2 py-1 rounded"
                  title="Instalar o app"
                  aria-label="Instalar aplicativo"
                >
                  ⤓ Instalar
                </button>
              )}
              <button
                type="button"
                onClick={toggleFs}
                className="hidden sm:inline-flex items-center gap-1 bg-white/10 hover:bg-white/20 border border-white/30 text-white text-[10px] font-mono font-semibold uppercase tracking-wider px-2 py-1 rounded"
                title={fsActive ? 'Sair da tela cheia' : 'Modo imersivo'}
                aria-label={fsActive ? 'Sair da tela cheia' : 'Entrar em modo imersivo'}
              >
                {fsActive ? '⛶' : '⛶'}
              </button>
            </div>
          </div>
          {mounted && showLocation && isMobile && (
            <div className="px-3 pb-2 sm:hidden">
              <button
                type="button"
                onClick={() => {
                  const loc = locationLabel || '';
                  if (!loc) return;
                  if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(loc).catch(() => {});
                  }
                }}
                  className="gps-chip inline-flex items-center gap-1 max-w-full bg-white/10 hover:bg-white/20 border border-white/30 text-white text-[10px] font-mono font-semibold uppercase tracking-wider px-2 py-1 rounded"
                  title="Toque para copiar a localização"
                  aria-label={`Localização atual: ${locationLabel}. Toque para copiar.`}
                >
                  <span className="truncate">📍 {locationLabel}</span>
                </button>
            </div>
          )}
          <MobileNav active={aba} onChange={setAba} />
        </header>

        <main className="w-full flex-1 pb-24 md:pb-0" role="main">
          {isMobile ? (
            <div className="page-slide" key={aba}>
              {aba === 'envolvidos' ? (
                <Envolvidos gpsInfo={gpsOn ? gpsInfo : null} />
              ) : aba === 'relato' ? (
                <RelatoPolicial gpsOn={gpsOn} gpsInfo={gpsOn ? gpsInfo : null} />
              ) : (
                <ResumoDinamica />
              )}
            </div>
          ) : (
            <>
              {aba === 'envolvidos' ? (
                <Envolvidos gpsInfo={gpsOn ? gpsInfo : null} />
              ) : aba === 'relato' ? (
                <RelatoPolicial gpsOn={gpsOn} gpsInfo={gpsOn ? gpsInfo : null} />
              ) : (
                <ResumoDinamica />
              )}
            </>
          )}
        </main>
      </div>

      {themeOpen && (
        <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-pmrv/80" onClick={() => setThemeOpen(false)} aria-hidden="true" />
          <div className="relative w-full sm:max-w-lg max-h-[90vh] overflow-y-auto bg-white border-t-2 sm:border-2 border-charcoal shadow-[6px_6px_0_#2B2B2B] rounded-t-2xl sm:rounded-none animate-slideUp" role="dialog" aria-label="Personalizar tema" aria-modal="true">
            <ThemeConfig onClose={() => setThemeOpen(false)} />
          </div>
        </div>
      )}
      <Toast />
    </>
  );
}

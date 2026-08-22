'use client';

import { useState, useEffect } from 'react';
import RelatoPolicial from '@/components/RelatoPolicial';
import Envolvidos from '@/components/Envolvidos';
import ResumoDinamica from '@/components/ResumoDinamica';
import SWRegister from '@/components/SWRegister';
import ThemeConfig from '@/components/theme/ThemeConfig';
import MobileNav from '@/components/MobileNav';
import Toast from '@/components/Toast';
import { useSwipe } from '@/hooks/useSwipe';
import { useFullscreen } from '@/hooks/useFullscreen';
import { useInstallPWA } from '@/hooks/useInstallPWA';
import { useIsMobile } from '@/hooks/useIsMobile';
import './globals.css';

export default function RootLayout() {
  const [aba, setAba] = useState('envolvidos');
  const [gpsInfo, setGpsInfo] = useState(null);
  const [themeOpen, setThemeOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { elRef, active: fsActive, toggle: toggleFs } = useFullscreen();
  const { install, supportsInstall, isInstalled, isStandalone } = useInstallPWA();
  const isMobile = useIsMobile();

  useSwipe({
    threshold: 180,
    onSwipeLeft: () => {
      if (aba === 'envolvidos') setAba('relato');
      else if (aba === 'relato') setAba('resumo');
    },
    onSwipeRight: () => {
      if (aba === 'resumo') setAba('relato');
      else if (aba === 'relato') setAba('envolvidos');
    },
  });

  useEffect(() => {
    setMounted(true);
    function onGpsChange(e) {
      setGpsInfo(e.detail || null);
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

    window.addEventListener('gps-change', onGpsChange);
    window.addEventListener('navigate-to', onNavigate);
    window.addEventListener('set-dinamica', onSetDinamica);

    return () => {
      window.removeEventListener('gps-change', onGpsChange);
      window.removeEventListener('navigate-to', onNavigate);
      window.removeEventListener('set-dinamica', onSetDinamica);
    };
  }, [aba]);

  const showLocation = gpsInfo && gpsInfo.rodovia;
  const locationLabel = showLocation
    ? `${gpsInfo.rodovia} KM ${typeof gpsInfo.km === 'number' ? gpsInfo.km.toFixed(3).replace('.', ',') : gpsInfo.km || ''}`
    : '';

  return (
    <html lang="pt-BR">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" type="image/svg+xml" href="/favicon-pmrv-sc.svg" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#008448" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="PM RV-SC" />
        <meta name="application-name" content="Relato Policial" />
        <meta name="apple-itunes-app" content="app-id=" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <title>Relato Policial — PMSC</title>
        <meta name="description" content="Sistema de Relatórios da Polícia Militar de Santa Catarina" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className="bg-bone text-charcoal antialiased font-sans">
        <SWRegister />

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
                    className="inline-flex items-center gap-1 bg-white/10 hover:bg-white/20 border border-white/30 text-white text-[10px] font-mono font-semibold uppercase tracking-wider px-2 py-1 rounded cursor-pointer"
                    title="Toque para copiar a localização"
                    aria-label={`Copiar localização: ${locationLabel}`}
                  >
                    📍 {isMobile ? '' : locationLabel}
                  </button>
                )}
                {mounted && showLocation && isMobile && (
                  <span className="sm:hidden text-white text-[10px] font-mono font-semibold uppercase tracking-wider px-2 py-1" aria-hidden="true">
                    📍
                  </span>
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
                  className="gps-chip inline-flex items-center gap-1 bg-white/10 hover:bg-white/20 border border-white/30 text-white text-[10px] font-mono font-semibold uppercase tracking-wider px-2 py-1 rounded"
                  title="Toque para copiar a localização"
                  aria-label={`Localização atual: ${locationLabel}. Toque para copiar.`}
                >
                  📍 {locationLabel}
                </button>
              </div>
            )}
          </header>

          {isMobile && mounted && (
            <MobileNav active={aba} onChange={setAba} />
          )}

          <main className={`w-full flex-1 ${isMobile ? 'pb-24' : ''}`} role="main">
            {isMobile ? (
              <div className="page-slide" key={aba}>
                {aba === 'envolvidos' ? <Envolvidos /> : aba === 'relato' ? <RelatoPolicial /> : <ResumoDinamica />}
              </div>
            ) : (
              <>
                {aba === 'envolvidos' ? <Envolvidos /> : aba === 'relato' ? <RelatoPolicial /> : <ResumoDinamica />}
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
      </body>
    </html>
  );
}

'use client';

import { useState, useEffect } from 'react';
import RelatoPolicial from '@/components/RelatoPolicial';
import Envolvidos from '@/components/Envolvidos';
import ResumoDinamica from '@/components/ResumoDinamica';
import SWRegister from '@/components/SWRegister';
import ThemeConfig from '@/components/theme/ThemeConfig';
import { useSwipe } from '@/hooks/useSwipe';
import { useFullscreen } from '@/hooks/useFullscreen';
import './globals.css';

function formatKMFromNumber(km) {
  if (typeof km !== 'number') return '';
  const fixed = km.toFixed(3);
  return fixed.replace('.', ',');
}

export default function RootLayout() {
  const [aba, setAba] = useState('envolvidos');
  const [gpsInfo, setGpsInfo] = useState(null);
  const [themeOpen, setThemeOpen] = useState(false);
  const { elRef, active: fsActive, toggle: toggleFs } = useFullscreen();

  useSwipe({
    threshold: 140,
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
  }, [gpsInfo]);

  const showLocation = gpsInfo && gpsInfo.rodovia && !gpsInfo.foraDaRodovia;
  const locationLabel = showLocation
    ? `${gpsInfo.rodovia} KM ${formatKMFromNumber(gpsInfo.km)}`
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
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
        <meta name="apple-mobile-web-app-title" content="PM SC" />
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
            <div className="max-w-5xl mx-auto flex justify-between items-center px-3 sm:px-4">
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
                {showLocation && (
                  <span className="hidden sm:inline-flex items-center gap-1 bg-white/10 border border-white/30 text-white text-[10px] font-mono font-semibold uppercase tracking-wider px-2 py-1 rounded">
                    📍 {locationLabel}
                  </span>
                )}
                {showLocation && (
                  <span className="sm:hidden bg-white/10 border border-white/30 text-white text-[10px] font-mono font-semibold uppercase tracking-wider px-2 py-1 rounded">
                    📍
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setThemeOpen(true)}
                  className="inline-flex items-center gap-1 bg-white/10 hover:bg-white/20 border border-white/30 text-white text-[10px] font-mono font-semibold uppercase tracking-wider px-2 py-1 rounded"
                  title="Personalizar tema"
                >
                  🎨 Tema
                </button>
                <button
                  type="button"
                  onClick={toggleFs}
                  className="inline-flex items-center gap-1 bg-white/10 hover:bg-white/20 border border-white/30 text-white text-[10px] font-mono font-semibold uppercase tracking-wider px-2 py-1 rounded"
                  title={fsActive ? 'Sair da tela cheia' : 'Modo imersivo'}
                >
                  {fsActive ? '⛶' : '⛶'}
                </button>
                <span
                  id="offline-indicator"
                  className="hidden bg-brick text-white text-[10px] px-2 py-1 font-mono font-semibold uppercase tracking-wider animate-pulse"
                >
                  Offline
                </span>
              </div>
            </div>
          </header>

          <nav className="text-white sticky top-[57px] sm:top-[65px] z-40" style={{ backgroundColor: 'var(--ds-primary)' }}>
            <div className="max-w-5xl mx-auto flex">
              <button
                onClick={() => setAba('envolvidos')}
                className={`flex-1 py-3 font-mono font-semibold uppercase tracking-wider text-xs sm:text-sm border-b-4 transition ${
                  aba === 'envolvidos'
                    ? 'border-gold text-white bg-pmrv-dark'
                    : 'border-transparent text-white/80 hover:bg-pmrv-dark'
                }`}
              >
                Envolvidos
              </button>
              <button
                onClick={() => setAba('relato')}
                className={`flex-1 py-3 font-mono font-semibold uppercase tracking-wider text-xs sm:text-sm border-b-4 transition ${
                  aba === 'relato'
                    ? 'border-gold text-white bg-pmrv-dark'
                    : 'border-transparent text-white/80 hover:bg-pmrv-dark'
                }`}
              >
                Relato Policial
              </button>
              <button
                onClick={() => setAba('resumo')}
                className={`flex-1 py-3 font-mono font-semibold uppercase tracking-wider text-xs sm:text-sm border-b-4 transition ${
                  aba === 'resumo'
                    ? 'border-gold text-white bg-pmrv-dark'
                    : 'border-transparent text-white/80 hover:bg-pmrv-dark'
                }`}
              >
                Resumo da Dinâmica
              </button>
            </div>
          </nav>

          <main className="w-full flex-1">
            {aba === 'envolvidos' ? <Envolvidos /> : aba === 'relato' ? <RelatoPolicial /> : <ResumoDinamica />}
          </main>
        </div>

        {themeOpen && <ThemeConfig onClose={() => setThemeOpen(false)} />}
      </body>
    </html>
  );
}

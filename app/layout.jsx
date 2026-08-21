'use client';

import { useState } from 'react';
import RelatoPolicial from '@/components/RelatoPolicial';
import Envolvidos from '@/components/Envolvidos';
import SWRegister from '@/components/SWRegister';
import './globals.css';

export default function RootLayout() {
  const [aba, setAba] = useState('envolvidos'); // Envolvidos primeiro

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
      </head>
      <body className="bg-bone text-charcoal antialiased font-sans pb-10">
        <SWRegister />

        <header className="bg-pmrv text-white sticky top-0 z-50 border-b-[3px] border-brick">
          <div className="max-w-xl mx-auto flex justify-between items-center px-4">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-pmrv-sc.svg"
                alt="Brasão PMRV-SC"
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-md shadow-sm"
              />
              <div className="leading-tight">
                <h1 className="text-base sm:text-lg font-mono font-semibold tracking-tight uppercase text-white">
                  Relato Policial
                </h1>
                <p className="text-[9px] sm:text-[10px] font-mono uppercase tracking-wider text-white/80">
                  PMRV-SC
                </p>
              </div>
            </div>
            <span
              id="offline-indicator"
              className="hidden bg-brick text-white text-[10px] px-2 py-1 font-mono font-semibold uppercase tracking-wider animate-pulse"
            >
              Offline
            </span>
          </div>
        </header>

        <nav className="bg-pmrv text-white sticky top-[57px] sm:top-[65px] z-40">
          <div className="max-w-xl mx-auto flex">
            <button
              onClick={() => setAba('envolvidos')}
              className={`flex-1 py-3 font-mono font-semibold uppercase tracking-wider text-sm border-b-4 transition ${
                aba === 'envolvidos'
                  ? 'border-gold text-white bg-pmrv-dark'
                  : 'border-transparent text-white/80 hover:bg-pmrv-dark'
              }`}
            >
              Envolvidos
            </button>
            <button
              onClick={() => setAba('relato')}
              className={`flex-1 py-3 font-mono font-semibold uppercase tracking-wider text-sm border-b-4 transition ${
                aba === 'relato'
                  ? 'border-gold text-white bg-pmrv-dark'
                  : 'border-transparent text-white/80 hover:bg-pmrv-dark'
              }`}
            >
              Relato Policial
            </button>
          </div>
        </nav>

        {aba === 'envolvidos' ? <Envolvidos /> : <RelatoPolicial />}
      </body>
    </html>
  );
}

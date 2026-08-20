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
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#0A0A0A" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
        <meta name="apple-mobile-web-app-title" content="PMRv P19" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <title>Relato Policial Padrão</title>
        <meta name="description" content="Sistema de Relatórios PMRv Posto 19" />
      </head>
      <body className="bg-bone text-charcoal antialiased font-sans pb-10">
        <SWRegister />

        <header className="bg-white border-b-2 border-charcoal sticky top-0 z-50">
          <div className="max-w-xl mx-auto flex justify-between items-center px-4">
            <div className="flex items-center gap-3">
              <span className="w-4 h-4 bg-gold border-2 border-pmrv" aria-hidden="true" />
              <h1 className="text-base sm:text-lg font-mono font-semibold tracking-tight uppercase text-pmrv">
                Relato Policial Padrão
              </h1>
            </div>
            <span
              id="offline-indicator"
              className="hidden bg-brick text-white text-[10px] px-2 py-1 font-mono font-semibold uppercase tracking-wider animate-pulse"
            >
              Offline
            </span>
          </div>
        </header>

        <nav className="bg-white border-b-2 border-charcoal sticky top-[60px] sm:top-[68px] z-40">
          <div className="max-w-xl mx-auto flex">
            <button
              onClick={() => setAba('envolvidos')}
              className={`flex-1 py-3 font-mono font-semibold uppercase tracking-wider text-sm border-b-4 transition ${
                aba === 'envolvidos'
                  ? 'border-pmrv text-white bg-pmrv'
                  : 'border-transparent text-charcoal hover:bg-bone'
              }`}
            >
              Envolvidos
            </button>
            <button
              onClick={() => setAba('relato')}
              className={`flex-1 py-3 font-mono font-semibold uppercase tracking-wider text-sm border-b-4 transition ${
                aba === 'relato'
                  ? 'border-pmrv text-white bg-pmrv'
                  : 'border-transparent text-charcoal hover:bg-bone'
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

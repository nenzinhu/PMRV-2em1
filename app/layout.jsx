import SWRegister from '@/components/SWRegister';
import './globals.css';

export const metadata = {
  title: 'Relato Policial — PMSC',
  description: 'Sistema de Relatórios da Polícia Militar de Santa Catarina',
  applicationName: 'Relato Policial',
  appleWebApp: {
    capable: true,
    title: 'PM RV-SC',
    statusBarStyle: 'black-translucent',
  },
};

export default function RootLayout({ children }) {
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
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className="bg-bone text-charcoal antialiased font-sans">
        <SWRegister />
        {children}
      </body>
    </html>
  );
}

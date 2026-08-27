import SWRegister from '@/components/SWRegister';
import './globals.css';

export const metadata = {
  title: 'POLICIA MILITAR RODOVIARIA ESTADUAL DE SC',
  description: 'Sistema de Relatórios da Polícia Militar Rodoviária de Santa Catarina',
  applicationName: 'PMRV-SC PADRONIZAÇÃO',
  appleWebApp: {
    capable: true,
    title: 'PMRV-SC PADRONIZAÇÃO',
    statusBarStyle: 'black-translucent',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#008448" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="PMRV-SC PADRONIZAÇÃO" />
        <meta name="application-name" content="PMRV-SC PADRONIZAÇÃO" />
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

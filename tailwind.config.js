/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['IBM Plex Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        // Paleta extraída do brasão PMRV-SC (watermarked_img)
        pmrv: 'var(--ds-primary)',
        'pmrv-dark': 'var(--ds-primary)',
        charcoal: 'var(--ds-text)',
        bone: 'var(--ds-bg)',
        gold: 'var(--ds-accent)',
        brick: 'var(--ds-danger)',
        'brick-dark': 'var(--ds-danger)',
        'step-idle': 'var(--ds-muted)',
        'step-done': 'var(--ds-primary)',
        'pm-green': '#4ade80',
        whatsapp: '#25D366',
        'pm-gray': '#cbd5e1',
      },
    },
  },
  plugins: [],
};
